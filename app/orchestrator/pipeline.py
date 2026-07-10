"""The RenewAssist turn pipeline: Generate-Validate-Check-Refine (Section 11).

Flow per turn:
input scan -> language gate -> scoped customer doc load -> intent + sentiment
-> escalation / out-of-scope / portability routing -> hybrid retrieval (+ graph
for relational intents) -> grounding threshold -> grounded generation -> claim
extraction -> per-claim NLI -> deterministic constraint check -> one refine
pass -> refuse + escalate if still failing -> masked logging + analytics event.

All environment-bound components are injected via the ports in
app.orchestrator.ports, so this logic runs identically under test stubs and
production services.
"""

import logging
from dataclasses import dataclass

from app.analytics.events import AnalyticsEvent, EventEmitter, assign_variant
from app.api.schemas import (
    ActionInfo,
    ChatResponse,
    EscalationInfo,
    IntentInfo,
    LanguageInfo,
    SentimentInfo,
    ValidationInfo,
)
from app.generation.prompts import build_grounded_prompt, build_refine_prompt
from app.guardrails.pii import mask_pii
from app.handoff.base import HandoffProvider, HandoffReason, HandoffRequest
from app.orchestrator import templates
from app.orchestrator.ports import (
    ClaimExtractor,
    FrustrationDetector,
    Generator,
    GraphQuerier,
    InputScanner,
    IntentClassifier,
    NLIModel,
    PolicyDocLoader,
    Retriever,
)
from app.orchestrator.retention import permitted_offers_for
from app.orchestrator.state import DialogueState, SessionContext
from app.retrieval.types import GroundingItem
from app.understanding.classifier import IntentResult
from app.understanding.intents import (
    OUT_OF_SCOPE_INTENTS,
    RELATIONAL_INTENTS,
    RETENTION_INTENTS,
    Intent,
)
from app.understanding.language import detect_language
from app.understanding.sentiment import SentimentResult
from app.validation.constraints import ConstraintChecker
from app.validation.faithfulness import (
    FAITHFULNESS_THRESHOLD,
    Verdict,
    faithfulness_score,
    is_grounded,
)

logger = logging.getLogger(__name__)

GROUNDING_SCORE_THRESHOLD = 0.35
LORA_ADAPTER = "renewassist-tone-intent"


@dataclass
class PipelineDeps:
    input_scanner: InputScanner
    classifier: IntentClassifier
    sentiment: FrustrationDetector
    retriever: Retriever
    graph: GraphQuerier
    generator: Generator
    claim_extractor: ClaimExtractor
    nli: NLIModel
    constraint_checker: ConstraintChecker
    handoff: HandoffProvider
    emitter: EventEmitter


class Orchestrator:
    def __init__(self, deps: PipelineDeps, policy_loader: PolicyDocLoader) -> None:
        self._deps = deps
        self._policy_loader = policy_loader

    async def handle_turn(
        self, message: str, ctx: SessionContext, state: DialogueState
    ) -> ChatResponse:
        deps = self._deps

        scan = deps.input_scanner.scan(message)
        if scan.blocked:
            self._emit(ctx, "refusal", {"reasons": scan.reasons})
            return self._template_response(templates.INJECTION_REFUSAL, Intent.I_OOS)

        lang = detect_language(message)
        if not lang.supported:
            return self._template_response(
                templates.ENGLISH_ONLY_NOTICE,
                Intent.I_ESCALATE,
                language=LanguageInfo(detected=lang.detected, supported=False),
                action=ActionInfo(type="offer_handoff"),
            )

        if state.customer_doc is None:
            state.customer_doc = await self._policy_loader.load(ctx.policy_ref_token)

        intent = await deps.classifier.classify(message, state.history)
        sentiment = deps.sentiment.detect(message, state.history)
        self._emit(
            ctx,
            "intent_classified",
            {"intent": intent.name.value, "confidence": intent.confidence},
        )

        if sentiment.high:
            state.consecutive_frustrated_turns += 1
        else:
            state.consecutive_frustrated_turns = 0

        if intent.name is Intent.I_PORTABILITY_BAIT:
            return await self._deflect_portability(ctx, state, message, intent, sentiment)

        if sentiment.high and (
            state.consecutive_frustrated_turns >= 2 or sentiment.label == "irate"
        ):
            return await self._escalate(ctx, state, message, intent, sentiment, "irate")
        if intent.name is Intent.I_ESCALATE:
            return await self._escalate(ctx, state, message, intent, sentiment, "user_requested")

        if intent.name in OUT_OF_SCOPE_INTENTS:
            return self._template_response(
                templates.OUT_OF_SCOPE_REDIRECT, intent.name, sentiment=sentiment
            )

        chunks = await deps.retriever.retrieve(message, ctx.product_code)
        graph_facts = (
            await deps.graph.traverse(intent.name, ctx.product_code)
            if intent.name in RELATIONAL_INTENTS
            else []
        )
        grounding: list[GroundingItem] = (
            chunks
            + [f.to_grounding_item() for f in graph_facts]
            + (state.customer_doc or [])
        )

        max_chunk_score = max((c.score for c in chunks), default=0.0)
        if max_chunk_score < GROUNDING_SCORE_THRESHOLD and not graph_facts:
            self._emit(ctx, "refusal", {"reason": "insufficient_grounding"})
            return await self._escalate(
                ctx, state, message, intent, sentiment, "low_confidence",
                reply=templates.LOW_GROUNDING_REFUSAL,
            )

        offers = (
            sorted(permitted_offers_for(intent.name), key=lambda o: o.value)
            if intent.name in RETENTION_INTENTS
            else []
        )
        prompt = build_grounded_prompt(intent.name, message, grounding, sentiment.label, offers)
        draft = await deps.generator.generate(prompt, adapter=LORA_ADAPTER)

        faithfulness, failed_claims = await self._verify(draft, grounding)
        checks = deps.constraint_checker.check(draft, intent.name, offers)

        if not is_grounded(faithfulness) or not checks.passed:
            refine_prompt = build_refine_prompt(draft, failed_claims, checks.failures, grounding)
            draft = await deps.generator.generate(refine_prompt, adapter=LORA_ADAPTER)
            faithfulness, failed_claims = await self._verify(draft, grounding)
            checks = deps.constraint_checker.check(draft, intent.name, offers)
            if not is_grounded(faithfulness) or not checks.passed:
                self._emit(
                    ctx,
                    "refusal",
                    {"reason": "validation_failed", "faithfulness": faithfulness,
                     "constraints": checks.failures},
                )
                return await self._escalate(
                    ctx, state, message, intent, sentiment, "low_confidence",
                    reply=templates.LOW_GROUNDING_REFUSAL,
                )

        if offers:
            self._emit(
                ctx,
                "retention_offer_shown",
                {"reason": intent.name.value, "offers": [o.value for o in offers]},
            )

        action = ActionInfo()
        if intent.name in (Intent.I_PREMIUM_QUERY, Intent.I_DUE_DATE, Intent.I_PAYMENT_HOWTO):
            action = ActionInfo(type="offer_payment_deeplink")
        elif offers:
            action = ActionInfo(
                type="show_retention_offer", payload={"offers": [o.value for o in offers]}
            )

        logger.info("turn session=%s intent=%s reply=%s",
                    ctx.session_id, intent.name.value, mask_pii(draft))
        self._emit(
            ctx,
            "answer_delivered",
            {"intent": intent.name.value, "faithfulness": faithfulness, "grounded": True},
        )
        state.record_turn(message, draft)
        return ChatResponse(
            reply=draft,
            intent=IntentInfo(
                name=intent.name.value, confidence=intent.confidence, slots=intent.slots
            ),
            language=LanguageInfo(detected="en", supported=True),
            citations=[item.to_citation() for item in grounding],
            validation=ValidationInfo(
                faithfulness=faithfulness, grounded=True, constraints_passed=checks.passed
            ),
            sentiment=SentimentInfo(label=sentiment.label, score=sentiment.score),  # type: ignore[arg-type]
            action=action,
        )

    async def _verify(
        self, draft: str, grounding: list[GroundingItem]
    ) -> tuple[float, list[str]]:
        claims = self._deps.claim_extractor.extract(draft)
        verdicts: list[Verdict] = []
        failed: list[str] = []
        for claim in claims:
            entailed = await self._deps.nli.entails(claim, grounding)
            verdicts.append(Verdict.ENTAILED if entailed else Verdict.NEUTRAL)
            if not entailed:
                failed.append(claim)
        return faithfulness_score(verdicts), failed

    async def _deflect_portability(
        self,
        ctx: SessionContext,
        state: DialogueState,
        message: str,
        intent: IntentResult,
        sentiment: SentimentResult,
    ) -> ChatResponse:
        """Scope statement + offer of a human; never advice about other insurers."""
        result = await self._create_handoff(ctx, state, message, intent, "portability_query")
        response = self._template_response(
            templates.PORTABILITY_DEFLECTION,
            Intent.I_PORTABILITY_BAIT,
            sentiment=sentiment,
            action=ActionInfo(type="offer_handoff"),
        )
        response.escalation = EscalationInfo(
            handoff_ref=result.provider_ref or None, status=result.status
        )
        state.record_turn(message, response.reply)
        return response

    async def _escalate(
        self,
        ctx: SessionContext,
        state: DialogueState,
        message: str,
        intent: IntentResult,
        sentiment: SentimentResult,
        reason: HandoffReason,
        reply: str = templates.ESCALATION_ACK,
    ) -> ChatResponse:
        result = await self._create_handoff(ctx, state, message, intent, reason, sentiment.label)
        if result.status == "failed":
            # Section 14: never silently drop; the durable queue picks this up.
            reply = templates.HANDOFF_QUEUED_NOTICE
        response = self._template_response(
            reply, intent.name, sentiment=sentiment, action=ActionInfo(type="offer_handoff")
        )
        response.escalation = EscalationInfo(
            handoff_ref=result.provider_ref or None,
            status="queued" if result.status == "failed" else result.status,
        )
        state.record_turn(message, response.reply)
        return response

    async def _create_handoff(
        self,
        ctx: SessionContext,
        state: DialogueState,
        message: str,
        intent: IntentResult,
        reason: HandoffReason,
        sentiment_label: str | None = None,
    ):  # -> HandoffResult
        summary = mask_pii(" | ".join([*state.history[-4:], f"user: {message}"]))
        request = HandoffRequest(
            session_id=ctx.session_id,
            policy_ref_token=ctx.policy_ref_token,
            reason=reason,
            intent=intent.name.value,
            sentiment_label=sentiment_label,
            transcript_summary=summary,
            channel_pref="live_transfer" if reason == "irate" else "callback",
        )
        result = await self._deps.handoff.create(request)
        self._emit(
            ctx,
            "handoff_created",
            {"reason": reason, "provider_ref": result.provider_ref, "status": result.status},
        )
        return result

    def _template_response(
        self,
        reply: str,
        intent: Intent,
        language: LanguageInfo | None = None,
        sentiment: SentimentResult | None = None,
        action: ActionInfo | None = None,
    ) -> ChatResponse:
        return ChatResponse(
            reply=reply,
            intent=IntentInfo(name=intent.value, confidence=1.0),
            language=language or LanguageInfo(detected="en", supported=True),
            citations=[],
            validation=ValidationInfo(faithfulness=1.0, grounded=True, constraints_passed=True),
            sentiment=SentimentInfo(
                label=sentiment.label if sentiment else "neutral",  # type: ignore[arg-type]
                score=sentiment.score if sentiment else 0.0,
            ),
            action=action or ActionInfo(),
        )

    def _emit(self, ctx: SessionContext, event_type: str, payload: dict) -> None:
        self._deps.emitter.emit(
            AnalyticsEvent(
                type=event_type,  # type: ignore[arg-type]
                session_id=ctx.session_id,
                variant=assign_variant(ctx.policy_ref_token),
                payload=payload,
            )
        )


__all__ = [
    "FAITHFULNESS_THRESHOLD",
    "GROUNDING_SCORE_THRESHOLD",
    "Orchestrator",
    "PipelineDeps",
]
