"""Frustration/sentiment detection for the de-escalation flow (Section 3).

Deterministic lexical detector used as the dev/test implementation of the
sentiment port. A fine-tuned classifier can replace it in Phase 3 behind the
same interface.
"""

import re
from dataclasses import dataclass

_IRATE_MARKERS = (
    "furious", "useless", "worst", "pathetic", "ridiculous", "fed up",
    "sick of", "disgusted", "scam", "cheat", "sue", "ombudsman", "hate",
)
_FRUSTRATED_MARKERS = (
    "frustrated", "annoyed", "again and again", "still not", "third time",
    "twice", "no one", "nobody", "waiting for", "disappointed", "angry",
)


@dataclass(frozen=True)
class SentimentResult:
    label: str  # calm | neutral | frustrated | irate
    score: float

    @property
    def high(self) -> bool:
        return self.label == "irate" or (self.label == "frustrated" and self.score >= 0.8)


class KeywordFrustrationDetector:
    """Deterministic fallback FrustrationDetector (see app.orchestrator.ports)."""

    def detect(self, message: str, history: list[str] | None = None) -> SentimentResult:
        text = message.lower()
        score = 0.0
        irate_hits = sum(1 for marker in _IRATE_MARKERS if marker in text)
        frustrated_hits = sum(1 for marker in _FRUSTRATED_MARKERS if marker in text)
        score += min(irate_hits, 2) * 0.4
        score += min(frustrated_hits, 2) * 0.25
        exclamations = message.count("!")
        score += min(exclamations * 0.1, 0.3)
        caps_words = re.findall(r"\b[A-Z]{3,}\b", message)
        score += min(len(caps_words) * 0.15, 0.3)
        score = min(score, 1.0)

        if score >= 0.8:
            label = "irate"
        elif score >= 0.4:
            label = "frustrated"
        elif score > 0.0:
            label = "neutral"
        else:
            label = "calm"
        return SentimentResult(label=label, score=round(score, 2))
