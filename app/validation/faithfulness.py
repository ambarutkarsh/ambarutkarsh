"""Claim-level faithfulness verification (build doc Section 11).

The response is decomposed into atomic claims; each claim is checked for
entailment against the grounding set (RAG chunks + graph facts + customer doc)
by an NLI model behind the NLIModel port. The reported score is the per-claim
entailment RATE, not an answer-level mean. Threshold for "grounded" is 0.95.
"""

import re
from collections.abc import Sequence
from enum import StrEnum

FAITHFULNESS_THRESHOLD = 0.95


class Verdict(StrEnum):
    ENTAILED = "ENTAILED"
    NEUTRAL = "NEUTRAL"
    CONTRADICTED = "CONTRADICTED"


_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")


def split_into_claims(text: str) -> list[str]:
    """Naive sentence-level claim splitter.

    Dev/test fallback for the ClaimExtractor port; production uses an LLM
    decomposition step (Phase 3). Sentences shorter than 3 words (greetings,
    "Certainly!") are not treated as factual claims.
    """
    sentences = [s.strip() for s in _SENTENCE_SPLIT.split(text.strip()) if s.strip()]
    return [s for s in sentences if len(s.split()) >= 3]


def faithfulness_score(verdicts: Sequence[Verdict]) -> float:
    """Fraction of claims entailed by the grounding set. No claims -> 1.0."""
    if not verdicts:
        return 1.0
    entailed = sum(1 for v in verdicts if v is Verdict.ENTAILED)
    return entailed / len(verdicts)


def is_grounded(score: float, threshold: float = FAITHFULNESS_THRESHOLD) -> bool:
    return score >= threshold
