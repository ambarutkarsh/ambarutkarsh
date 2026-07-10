"""Heuristic input scanner: first line of the layered injection defense.

This deterministic pattern layer runs in front of (and in Phase 4, alongside)
LLM Guard and a fine-tuned prompt-injection classifier. Per OWASP LLM01 no
single detector is sufficient; structural enforcement (retrieved/customer text
is always DATA) and the hard output constraint checker back this up.
"""

import re
from dataclasses import dataclass, field

_INJECTION_PATTERNS: tuple[str, ...] = (
    r"ignore\s+(?:all\s+|any\s+)?(?:previous|prior|above|earlier)\s+instructions",
    r"disregard\s+(?:your|the|all)\s+(?:rules|instructions|guidelines|system)",
    r"(?:reveal|show|print|repeat)\s+(?:your\s+)?(?:the\s+)?system\s+prompt",
    r"you\s+are\s+(?:now|no\s+longer)\s+",
    r"\bjailbreak\b",
    r"\bDAN\s+mode\b",
    r"act\s+as\s+(?:an?\s+)?(?:unrestricted|unfiltered)",
    r"forget\s+(?:everything|all|your\s+instructions)",
    r"new\s+instructions?\s*:",
    r"\bsudo\b.*\bmode\b",
    r"pretend\s+(?:you\s+are|to\s+be)\s+(?:not\s+)?an?\s+ai",
)

_SECRET_PATTERNS: tuple[str, ...] = (
    r"-----BEGIN\s+(?:RSA\s+|EC\s+)?PRIVATE\s+KEY-----",
    r"\b(?:api[_-]?key|secret[_-]?key|password)\s*[:=]\s*\S{8,}",
)


@dataclass(frozen=True)
class ScanResult:
    blocked: bool
    reasons: list[str] = field(default_factory=list)


class HeuristicInputScanner:
    """Deterministic InputScanner implementation (see app.orchestrator.ports)."""

    def scan(self, message: str) -> ScanResult:
        reasons: list[str] = []
        for pattern in _INJECTION_PATTERNS:
            if re.search(pattern, message, flags=re.IGNORECASE):
                reasons.append("prompt_injection")
                break
        for pattern in _SECRET_PATTERNS:
            if re.search(pattern, message, flags=re.IGNORECASE):
                reasons.append("secret_material")
                break
        return ScanResult(blocked=bool(reasons), reasons=reasons)
