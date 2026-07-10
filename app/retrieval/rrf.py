"""Weighted Reciprocal Rank Fusion for hybrid retrieval (build doc Section 5).

Fuses BM25 (sparse) and dense rankings on ranks, not raw scores, so the two
scoring scales never need calibration. Defaults: k=60, dense 0.7 / sparse 0.3.
"""

from collections.abc import Sequence
from typing import TypeVar

T = TypeVar("T")


def rrf_fuse(
    sparse: Sequence[str],
    dense: Sequence[str],
    *,
    k: int = 60,
    w_dense: float = 0.7,
    w_sparse: float = 0.3,
) -> list[tuple[str, float]]:
    """Fuse two ranked lists of document ids.

    Each list is ordered best-first. Returns (doc_id, fused_score) sorted by
    descending score; ties broken by doc_id for determinism.
    """
    scores: dict[str, float] = {}
    for rank, doc_id in enumerate(sparse):
        scores[doc_id] = scores.get(doc_id, 0.0) + w_sparse / (k + rank + 1)
    for rank, doc_id in enumerate(dense):
        scores[doc_id] = scores.get(doc_id, 0.0) + w_dense / (k + rank + 1)
    return sorted(scores.items(), key=lambda item: (-item[1], item[0]))
