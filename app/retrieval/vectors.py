"""Dense retrieval leg: embedder port and an in-memory vector store.

Production uses BGE-M3 embeddings in Qdrant; this store implements the same
search contract in-process so the hybrid retriever, ingestion, and tests are
identical either side of the swap (Phase 1 completes the Qdrant client).
"""

import math
from typing import Any, Protocol


class Embedder(Protocol):
    def embed(self, text: str) -> list[float]: ...


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


class InMemoryVectorStore:
    def __init__(self) -> None:
        self._vectors: dict[str, list[float]] = {}
        self._payloads: dict[str, dict[str, Any]] = {}

    def add(self, doc_id: str, vector: list[float], payload: dict[str, Any] | None = None) -> None:
        if doc_id in self._vectors:
            raise ValueError(f"duplicate doc_id: {doc_id}")
        self._vectors[doc_id] = vector
        self._payloads[doc_id] = payload or {}

    def payload(self, doc_id: str) -> dict[str, Any]:
        return self._payloads[doc_id]

    def vector(self, doc_id: str) -> list[float]:
        return self._vectors[doc_id]

    def __len__(self) -> int:
        return len(self._vectors)

    def search(self, vector: list[float], k: int = 10) -> list[tuple[str, float]]:
        scored = [
            (doc_id, cosine(vector, stored)) for doc_id, stored in self._vectors.items()
        ]
        scored.sort(key=lambda item: (-item[1], item[0]))
        return scored[:k]
