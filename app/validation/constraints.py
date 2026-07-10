"""Deterministic output constraint checker: the hard gate (build doc Section 11).

Prompt instructions are requests; this checker is enforcement. It rejects any
draft that mentions portability/switching, a competitor, a premium guarantee,
or medical advice, and rejects retention offers outside the permitted table
(Section 12). Approved templates (app.orchestrator.templates) are exempt so the
scope-statement deflection can itself say "another insurer".
"""

import re
from collections.abc import Iterable
from dataclasses import dataclass, field

from app.orchestrator.retention import Offer, permitted_offers_for
from app.orchestrator.templates import APPROVED_TEMPLATES
from app.understanding.intents import RETENTION_INTENTS, Intent

# Competitor list is configuration in production (loaded from the KB governance
# process); this default seed keeps the checker meaningful in dev and tests.
DEFAULT_COMPETITORS: tuple[str, ...] = (
    "star health",
    "hdfc ergo",
    "icici lombard",
    "niva bupa",
    "care health",
    "new india assurance",
    "tata aig",
    "bajaj allianz",
    "aditya birla health",
)

_PORTABILITY_PATTERNS: tuple[str, ...] = (
    r"\bport(?:ing|ability)?\b.{0,40}\bpolicy\b",
    r"\bpolicy\b.{0,40}\bport(?:ing|ability)?\b",
    r"\bportability\b",
    r"\bswitch(?:ing)?\s+(?:to\s+)?(?:another|a\s+different|other)\s+insur",
    r"\bmove\s+(?:your\s+policy\s+)?to\s+another\s+insur",
    r"\bbetter\s+(?:deal|rates?|premium)\s+(?:elsewhere|with\s+another)",
    r"\bconsider\s+(?:other|another)\s+insurers?\b",
)

_PREMIUM_GUARANTEE_PATTERNS: tuple[str, ...] = (
    r"\bpremium\s+will\s+(?:not|never)\s+(?:increase|change|go\s+up|rise)\b",
    r"\bguarantee[ds]?\b.{0,40}\bpremium\b",
    r"\bpremium\b.{0,40}\bguarantee[ds]?\b",
    r"\block(?:ed)?\s*[-\s]?in\s+(?:your\s+)?(?:premium|price|rate)\b",
    r"\bprice\s+will\s+(?:stay|remain)\s+the\s+same\b",
    r"\bwill\s+never\s+pay\s+more\b",
)

_MEDICAL_ADVICE_PATTERNS: tuple[str, ...] = (
    r"\byou\s+should\s+(?:take|stop\s+taking|start\s+taking)\b",
    r"\brecommended?\s+(?:dosage|medication|treatment)\b",
    r"\byou\s+(?:don'?t|do\s+not)\s+need\s+(?:to\s+see\s+)?a\s+doctor\b",
    r"\bi\s+(?:recommend|suggest)\s+(?:taking|this\s+treatment|this\s+medication)\b",
    r"\bsafe\s+to\s+skip\s+(?:your\s+)?(?:medication|treatment)\b",
)


@dataclass(frozen=True)
class CheckResult:
    passed: bool
    failures: list[str] = field(default_factory=list)


def _normalize(text: str) -> str:
    return " ".join(text.split())


class ConstraintChecker:
    def __init__(self, competitors: Iterable[str] = DEFAULT_COMPETITORS) -> None:
        self._competitors = tuple(c.lower() for c in competitors)

    def check(
        self,
        draft: str,
        intent: Intent,
        proposed_offers: Iterable[Offer] = (),
    ) -> CheckResult:
        failures: list[str] = []
        if _normalize(draft) in {_normalize(t) for t in APPROVED_TEMPLATES}:
            return CheckResult(passed=True)

        lowered = draft.lower()

        for pattern in _PORTABILITY_PATTERNS:
            if re.search(pattern, lowered):
                failures.append("portability_or_switching")
                break
        for competitor in self._competitors:
            if competitor in lowered:
                failures.append(f"competitor_mention:{competitor}")
                break
        for pattern in _PREMIUM_GUARANTEE_PATTERNS:
            if re.search(pattern, lowered):
                failures.append("premium_guarantee")
                break
        for pattern in _MEDICAL_ADVICE_PATTERNS:
            if re.search(pattern, lowered):
                failures.append("medical_advice")
                break

        offers = frozenset(proposed_offers)
        if offers:
            if intent not in RETENTION_INTENTS:
                failures.append("offer_outside_retention_flow")
            else:
                illegal = offers - permitted_offers_for(intent)
                if illegal:
                    names = ",".join(sorted(o.value for o in illegal))
                    failures.append(f"offer_not_permitted:{names}")

        return CheckResult(passed=not failures, failures=failures)
