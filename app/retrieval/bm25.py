"""Okapi BM25 index (build doc Section 5: the sparse leg of hybrid retrieval).

Pure-Python and dependency-free so it runs identically in dev, CI, and
production. The corpus (policy wordings, CIS, FAQ) is small enough that an
in-process index is the right production shape; it is rebuilt from the
governed ingestion pipeline on every KB promotion (Section 17).
"""

import math
import re
from typing import Any

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


class BM25Index:
    def __init__(self, k1: float = 1.5, b: float = 0.75) -> None:
        self._k1 = k1
        self._b = b
        self._doc_tokens: dict[str, dict[str, int]] = {}
        self._doc_len: dict[str, int] = {}
        self._df: dict[str, int] = {}
        self._payloads: dict[str, dict[str, Any]] = {}

    def add(self, doc_id: str, text: str, payload: dict[str, Any] | None = None) -> None:
        if doc_id in self._doc_tokens:
            raise ValueError(f"duplicate doc_id: {doc_id}")
        tokens = tokenize(text)
        counts: dict[str, int] = {}
        for token in tokens:
            counts[token] = counts.get(token, 0) + 1
        self._doc_tokens[doc_id] = counts
        self._doc_len[doc_id] = len(tokens)
        for token in counts:
            self._df[token] = self._df.get(token, 0) + 1
        self._payloads[doc_id] = payload or {}

    def payload(self, doc_id: str) -> dict[str, Any]:
        return self._payloads[doc_id]

    def __len__(self) -> int:
        return len(self._doc_tokens)

    def search(self, query: str, k: int = 10) -> list[tuple[str, float]]:
        n_docs = len(self._doc_tokens)
        if n_docs == 0:
            return []
        avg_len = sum(self._doc_len.values()) / n_docs
        scores: dict[str, float] = {}
        for token in set(tokenize(query)):
            df = self._df.get(token)
            if not df:
                continue
            idf = math.log(1 + (n_docs - df + 0.5) / (df + 0.5))
            for doc_id, counts in self._doc_tokens.items():
                tf = counts.get(token)
                if not tf:
                    continue
                norm = 1 - self._b + self._b * self._doc_len[doc_id] / avg_len
                scores[doc_id] = scores.get(doc_id, 0.0) + idf * (
                    tf * (self._k1 + 1) / (tf + self._k1 * norm)
                )
        ranked = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
        return ranked[:k]
