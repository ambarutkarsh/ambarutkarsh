"""Ports (dependency interfaces) for the orchestrator pipeline.

Every heavyweight or environment-bound component sits behind a Protocol so the
pipeline is testable with deterministic implementations and each phase can swap
in the production component (vLLM, Qdrant hybrid retriever, Neo4j, LLM Guard,
NLI service) without touching pipeline logic.
"""

from collections.abc import Sequence
from typing import Protocol

from app.graph.ontology import GraphFact
from app.guardrails.input_scan import ScanResult
from app.retrieval.types import GroundingItem
from app.understanding.classifier import IntentResult
from app.understanding.intents import Intent
from app.understanding.sentiment import SentimentResult


class InputScanner(Protocol):
    def scan(self, message: str) -> ScanResult: ...


class IntentClassifier(Protocol):
    async def classify(
        self, message: str, history: list[str] | None = None
    ) -> IntentResult: ...


class FrustrationDetector(Protocol):
    def detect(self, message: str, history: list[str] | None = None) -> SentimentResult: ...


class Retriever(Protocol):
    """Hybrid retrieval: BM25 + dense fused via RRF, then reranked."""

    async def retrieve(self, query: str, product_code: str) -> list[GroundingItem]: ...


class GraphQuerier(Protocol):
    async def traverse(self, intent: Intent, product_code: str) -> list[GraphFact]: ...


class Generator(Protocol):
    async def generate(self, prompt: str, adapter: str | None = None) -> str: ...


class ClaimExtractor(Protocol):
    def extract(self, text: str) -> list[str]: ...


class NLIModel(Protocol):
    async def entails(self, claim: str, grounding: Sequence[GroundingItem]) -> bool: ...


class PolicyDocLoader(Protocol):
    """Scoped long-context: fetch the authenticated customer's full policy doc."""

    async def load(self, policy_ref_token: str) -> list[GroundingItem]: ...
