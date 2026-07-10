"""Deterministic keyword intent classifier.

This is the dev/test fallback implementation of the IntentClassifier port.
Production classification is LLM function-calling with a constrained JSON schema,
shaped by the LoRA tone/intent adapter (Phase 3); it plugs into the same port.
Keyword rules are ordered: guard intents (portability bait, escalation) win over
topic intents so bait phrased as a premium question still deflects.
"""

import re
from dataclasses import dataclass, field
from typing import Any

from app.understanding.intents import Intent


@dataclass(frozen=True)
class IntentResult:
    name: Intent
    confidence: float
    slots: dict[str, Any] = field(default_factory=dict)


_RULES: tuple[tuple[Intent, tuple[str, ...]], ...] = (
    # Guard intents first.
    (
        Intent.I_PORTABILITY_BAIT,
        (
            r"\bport(?:ing|ability)?\b",
            r"switch(?:ing)?\s+(?:to\s+)?(?:another|a\s+different|other)\s+insur",
            r"\b(?:better|cheaper)\s+(?:than\s+you|elsewhere|insurer|company)\b",
            r"\bmove\s+(?:my\s+policy\s+)?to\s+another\b",
        ),
    ),
    (
        Intent.I_ESCALATE,
        (
            r"\b(?:human|agent|representative|real\s+person|call\s*back|callback)\b",
            r"\bspeak\s+to\s+(?:someone|a\s+person)\b",
        ),
    ),
    (Intent.I_CHURN_INTENT, (r"\bcancel\b", r"\bnot\s+renew(?:ing)?\b", r"\blet\s+it\s+lapse\b")),
    (
        Intent.I_OBJ_PREMIUM,
        (r"\b(?:premium|price|cost)\b.*\b(?:up|hike|increase|expensive|high)\b",
         r"\btoo\s+expensive\b", r"\bwhy\s+did\s+my\s+premium\b"),
    ),
    (Intent.I_OBJ_CLAIM, (r"\bclaim\b.*\b(?:rejected|denied|bad|poor|delay)\b",)),
    (Intent.I_PAYMENT_FAIL, (r"\bpayment\s+(?:failed|failure|declined|error)\b",)),
    (Intent.I_EMI, (r"\bemi\b", r"\binstal?lments?\b", r"\bmonthly\s+pay\b")),
    (Intent.I_GRACE_RULES, (r"\bgrace\s+period\b", r"\bmissed?\s+(?:the\s+)?due\s+date\b")),
    (Intent.I_NCB, (r"\bno[\s-]?claim\s+bonus\b", r"\bncb\b", r"\bcumulative\s+bonus\b")),
    (Intent.I_SI_CHANGE, (r"\bsum\s+insured\b", r"\bincrease\s+(?:my\s+)?cover(?:age)?\b")),
    (Intent.I_RIDERS, (r"\briders?\b", r"\badd[\s-]?ons?\b")),
    (Intent.I_WAITING_PERIOD, (r"\bwaiting\s+period\b", r"\bpre[\s-]?existing\b", r"\bped\b")),
    (Intent.I_GST, (r"\bgst\b", r"\btax\s+on\s+premium\b")),
    (Intent.I_TAX_80D, (r"\b80\s*d\b", r"\btax\s+benefit\b")),
    (Intent.I_CONTINUITY, (r"\bcontinuity\b", r"\bbenefits?\s+of\s+renewing\b")),
    (Intent.I_RENEWAL_NOTICE, (r"\brenewal\s+(?:notice|reminder)\b",)),
    (Intent.I_POLICY_DOCS, (r"\bpolicy\s+(?:document|copy|wording)\b", r"\bcis\b")),
    (Intent.I_UPDATE_DETAILS, (r"\bupdate\s+(?:my\s+)?(?:contact|kyc|address|phone|email)\b",)),
    (Intent.I_PAYMENT_HOWTO, (r"\bhow\s+(?:do|can)\s+i\s+pay\b", r"\bpayment\s+modes?\b")),
    (Intent.I_DUE_DATE, (r"\bdue\s+date\b", r"\bwhen\s+.*\b(?:due|renew)\b", r"\bexpiry?\b")),
    (Intent.I_PREMIUM_QUERY, (r"\bpremium\b", r"\bhow\s+much\b.*\b(?:pay|renewal)\b")),
    (Intent.I_COVERAGE_EXPLAIN, (r"\bcover(?:ed|age)?\b", r"\bbenefits?\b")),
)


class KeywordIntentClassifier:
    """Deterministic fallback IntentClassifier (see app.orchestrator.ports)."""

    async def classify(self, message: str, history: list[str] | None = None) -> IntentResult:
        text = message.lower()
        for intent, patterns in _RULES:
            for pattern in patterns:
                if re.search(pattern, text):
                    return IntentResult(name=intent, confidence=0.75)
        return IntentResult(name=Intent.I_OOS, confidence=0.4)
