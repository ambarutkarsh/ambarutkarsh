"""Launch-scope language gate: English only (build doc Sections 1 and 11).

This is a deterministic script-range detector, not a statistical language
identifier. It only needs to answer one question reliably: "is this message
English enough to serve, or must we show the English-only notice?" A model-based
detector can replace it behind the same function signature in a later phase.
"""

import unicodedata
from dataclasses import dataclass

# Unicode block ranges for scripts we explicitly recognise as non-English input.
_SCRIPT_RANGES: dict[str, tuple[tuple[int, int], ...]] = {
    "hi": ((0x0900, 0x097F),),  # Devanagari (Hindi, Marathi)
    "bn": ((0x0980, 0x09FF),),  # Bengali
    "ta": ((0x0B80, 0x0BFF),),  # Tamil
    "te": ((0x0C00, 0x0C7F),),  # Telugu
    "kn": ((0x0C80, 0x0CFF),),  # Kannada
    "ml": ((0x0D00, 0x0D7F),),  # Malayalam
    "gu": ((0x0A80, 0x0AFF),),  # Gujarati
    "pa": ((0x0A00, 0x0A7F),),  # Gurmukhi (Punjabi)
    "ur": ((0x0600, 0x06FF), (0x0750, 0x077F)),  # Arabic script (Urdu)
}

_NON_LATIN_THRESHOLD = 0.3


@dataclass(frozen=True)
class LanguageResult:
    detected: str
    supported: bool


def detect_language(text: str) -> LanguageResult:
    """Classify a message as English-supported or not.

    Counts alphabetic characters by script. If more than 30% of letters fall in a
    recognised non-Latin script, the message is treated as that language; other
    non-Latin-dominant text is "und". Empty or symbol-only input passes as English
    so numeric answers ("2", policy numbers) never trip the gate.
    """
    letters = [ch for ch in text if unicodedata.category(ch).startswith("L")]
    if not letters:
        return LanguageResult(detected="en", supported=True)

    script_counts: dict[str, int] = {}
    non_latin = 0
    for ch in letters:
        cp = ord(ch)
        if cp < 0x0250:  # Basic Latin + Latin-1 + Latin Extended A/B
            continue
        non_latin += 1
        for lang, ranges in _SCRIPT_RANGES.items():
            if any(lo <= cp <= hi for lo, hi in ranges):
                script_counts[lang] = script_counts.get(lang, 0) + 1
                break

    if non_latin / len(letters) <= _NON_LATIN_THRESHOLD:
        return LanguageResult(detected="en", supported=True)

    if script_counts:
        detected = max(script_counts, key=lambda k: script_counts[k])
        return LanguageResult(detected=detected, supported=False)
    return LanguageResult(detected="und", supported=False)
