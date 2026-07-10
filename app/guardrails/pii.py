"""Deterministic PII masker (build doc Section 10).

Runs before ANY write to logs, analytics, Langfuse, or a handoff payload.
Masks Indian-context identifiers: email, mobile numbers, PAN, Aadhaar,
policy numbers, and card-like digit runs. LLM Guard anonymization is layered
on top in Phase 4; this masker is the non-optional floor.
"""

import re

_PATTERNS: tuple[tuple[str, str], ...] = (
    # Order matters: longer/more specific first.
    (r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "[EMAIL]"),
    (r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b", "[CARD]"),  # 16-digit card
    (r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b", "[AADHAAR]"),  # 12-digit Aadhaar
    (r"\b[A-Z]{5}\d{4}[A-Z]\b", "[PAN]"),
    (r"(?:\+91[\s-]?|0)?[6-9]\d{9}\b", "[PHONE]"),
    (r"\b[A-Z]{2,5}[-/]?\d{6,12}\b", "[POLICY_NO]"),
)


def mask_pii(text: str) -> str:
    masked = text
    for pattern, replacement in _PATTERNS:
        masked = re.sub(pattern, replacement, masked)
    return masked


def contains_pii(text: str) -> bool:
    return any(re.search(pattern, text) for pattern, _ in _PATTERNS)
