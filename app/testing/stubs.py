"""Deterministic implementations of the pipeline ports for tests and local dev.

These are NOT mocks that fake success: the extractive generator only quotes
grounding text, and the substring NLI only entails claims literally present in
the grounding set, so the validation loop is exercised for real. Production
components replace these per phase behind the same ports.
"""

from collections.abc import Sequence

from app.graph.ontology import GraphFact
from app.retrieval.types import GroundingItem
from app.understanding.intents import Intent
from app.validation.faithfulness import split_into_claims


class StaticRetriever:
    """Returns fixture chunks whose keywords appear in the query."""

    def __init__(self, corpus: dict[str, list[GroundingItem]]) -> None:
        self._corpus = corpus

    async def retrieve(self, query: str, product_code: str) -> list[GroundingItem]:
        lowered = query.lower()
        results: list[GroundingItem] = []
        for keyword, items in self._corpus.items():
            if keyword in lowered:
                results.extend(items)
        return sorted(results, key=lambda i: -i.score)


class StaticGraph:
    def __init__(self, facts: dict[Intent, list[GraphFact]] | None = None) -> None:
        self._facts = facts or {}

    async def traverse(self, intent: Intent, product_code: str) -> list[GraphFact]:
        return list(self._facts.get(intent, []))


class ExtractiveGenerator:
    """Answers by quoting the highest-scoring evidence verbatim.

    Because the reply is a literal quote of grounding text, SubstringNLI can
    verify it, which makes the happy path pass validation honestly. A canned
    unsupported sentence can be injected via `hallucinate` to exercise the
    refine/refuse path in tests.
    """

    def __init__(self, hallucinate: str | None = None) -> None:
        self.hallucinate = hallucinate
        self.calls: list[str] = []

    async def generate(self, prompt: str, adapter: str | None = None) -> str:
        self.calls.append(prompt)
        quotes = self._evidence_texts(prompt)
        reply = " ".join(quotes[:2]) if quotes else "I could not find that in your policy."
        if self.hallucinate:
            reply = f"{reply} {self.hallucinate}"
        return reply

    @staticmethod
    def _evidence_texts(prompt: str) -> list[str]:
        texts: list[str] = []
        remainder = prompt
        while "<evidence" in remainder:
            _, _, remainder = remainder.partition("<evidence")
            block, _, remainder = remainder.partition("</evidence>")
            _, _, body = block.partition(">")
            body = body.strip()
            if body:
                texts.append(body)
        return texts


class SubstringNLI:
    """Entails a claim only if it appears inside some grounding text."""

    async def entails(self, claim: str, grounding: Sequence[GroundingItem]) -> bool:
        needle = claim.lower().rstrip(".")
        return any(needle in item.text.lower() for item in grounding)


class SentenceClaimExtractor:
    def extract(self, text: str) -> list[str]:
        return split_into_claims(text)
