"""Header-aware chunking for policy documents (build doc Section 5).

Policy wordings are clause-structured; chunks must not straddle clause
boundaries or the citation becomes ambiguous. Strategy: split the document on
headers (markdown headers or numbered clauses like "4.2 Grace Period"), then
pack paragraphs into ~target_tokens chunks with overlap, carrying the governing
header on every chunk. Token counting here is whitespace-word approximation;
the embedder's real tokenizer calibrates the target at index build time.
"""

import re
from dataclasses import dataclass

_HEADER_RE = re.compile(r"^(#{1,6}\s+.+|\d+(?:\.\d+)*[.)]?\s+[A-Z].{0,80})$")


@dataclass(frozen=True)
class Chunk:
    text: str
    header: str
    index: int
    n_tokens: int


def _tokens(text: str) -> int:
    return len(text.split())


def chunk_text(
    text: str,
    target_tokens: int = 512,
    overlap_tokens: int = 64,
) -> list[Chunk]:
    sections: list[tuple[str, list[str]]] = [("", [])]
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if _HEADER_RE.match(line):
            sections.append((line, []))
        else:
            sections[-1][1].append(line)

    chunks: list[Chunk] = []
    for header, lines in sections:
        if not lines:
            continue
        current: list[str] = []
        count = 0
        for line in lines:
            line_tokens = _tokens(line)
            if current and count + line_tokens > target_tokens:
                chunks.append(_make_chunk(current, header, len(chunks)))
                overlap_words = " ".join(current).split()[-overlap_tokens:]
                current = [" ".join(overlap_words)] if overlap_words else []
                count = len(overlap_words)
            current.append(line)
            count += line_tokens
        if current:
            chunks.append(_make_chunk(current, header, len(chunks)))
    return chunks


def _make_chunk(lines: list[str], header: str, index: int) -> Chunk:
    body = " ".join(lines)
    text = f"{header}\n{body}" if header else body
    return Chunk(text=text, header=header, index=index, n_tokens=_tokens(text))
