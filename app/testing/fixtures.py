"""Synthetic dev/test fixtures. No real customer data, no real PII.

Regulated figures here are PLACEHOLDERS for pipeline tests only; production
facts enter exclusively through the governed KB ingestion process (build doc
Section 17) and the compliance sign-off gate (Section 18).
"""

from app.analytics.events import InMemoryEmitter
from app.context.loader import StaticPolicyDocLoader
from app.graph.ontology import GraphFact, Provenance
from app.guardrails.input_scan import HeuristicInputScanner
from app.handoff.null import NullHandoffProvider
from app.orchestrator.pipeline import Orchestrator, PipelineDeps
from app.retrieval.types import GroundingItem
from app.testing.stubs import (
    ExtractiveGenerator,
    SentenceClaimExtractor,
    StaticGraph,
    StaticRetriever,
    SubstringNLI,
)
from app.understanding.classifier import KeywordIntentClassifier
from app.understanding.intents import Intent
from app.understanding.sentiment import KeywordFrustrationDetector
from app.validation.constraints import ConstraintChecker

DEMO_POLICY_TOKEN = "ref-demo-policy"

DEMO_CORPUS: dict[str, list[GroundingItem]] = {
    "premium": [
        GroundingItem(
            source="rag",
            doc_id="prod_brochure_v3",
            clause="4.2",
            score=0.92,
            text="Your renewal premium is shown in your renewal notice and reflects "
            "the premium table for your age band and sum insured.",
        )
    ],
    "grace": [
        GroundingItem(
            source="rag",
            doc_id="policy_wording_v3",
            clause="7.1",
            score=0.9,
            text="A grace period applies for renewal payment as per the policy terms, "
            "and continuity benefits are protected if you renew within the grace period.",
        )
    ],
    "emi": [
        GroundingItem(
            source="rag",
            doc_id="prod_brochure_v3",
            clause="5.3",
            score=0.88,
            text="Premium can be paid in monthly or quarterly installments where the "
            "product permits an installment facility.",
        )
    ],
}

DEMO_GRAPH_FACTS = {
    Intent.I_NCB: [
        GraphFact(
            path="Policy-HAS_RULE->NCB-GRANTS->CumulativeBonus",
            statement="The no-claim bonus can be taken as a cumulative bonus or as a "
            "premium discount, at the policyholder's express choice.",
            provenance=Provenance(doc_id="policy_wording_v3", clause="6.1", version="v3"),
        )
    ]
}

DEMO_CUSTOMER_DOC = [
    GroundingItem(
        source="customer_doc",
        field="cumulative_bonus_balance",
        score=1.0,
        text="Your cumulative bonus balance is 20% of the sum insured.",
    ),
    GroundingItem(
        source="customer_doc",
        field="renewal_due_date",
        score=1.0,
        text="Your policy renewal is due on the date shown in your renewal notice.",
    ),
]


def build_dev_orchestrator(
    generator: ExtractiveGenerator | None = None,
    handoff: NullHandoffProvider | None = None,
    emitter: InMemoryEmitter | None = None,
) -> Orchestrator:
    deps = PipelineDeps(
        input_scanner=HeuristicInputScanner(),
        classifier=KeywordIntentClassifier(),
        sentiment=KeywordFrustrationDetector(),
        retriever=StaticRetriever(DEMO_CORPUS),
        graph=StaticGraph(DEMO_GRAPH_FACTS),
        generator=generator or ExtractiveGenerator(),
        claim_extractor=SentenceClaimExtractor(),
        nli=SubstringNLI(),
        constraint_checker=ConstraintChecker(),
        handoff=handoff or NullHandoffProvider(),
        emitter=emitter or InMemoryEmitter(),
    )
    loader = StaticPolicyDocLoader({DEMO_POLICY_TOKEN: DEMO_CUSTOMER_DOC})
    return Orchestrator(deps, loader)
