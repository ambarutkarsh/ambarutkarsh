"""Hybrid retriever: BM25 + dense fused via weighted RRF (build doc Section 5).

Implements the orchestrator's Retriever port. A cross-encoder reranker slots in
behind the Reranker protocol when the BGE-reranker-v2-m3 service lands (the
single highest-impact retrieval upgrade per the build doc); until then the
identity reranker preserves fused order.

Chunk metadata (product, clause, version) lives in a shared catalog written by
the ingestion pipeline; retrieval filters by product scope before returning
grounding items. Ranking uses the fused RRF order, but each item's score is its
dense cosine similarity to the query: RRF scores are rank-based and carry no
absolute meaning, while the cosine is the confidence signal the orchestrator's
grounding threshold (GROUNDING_SCORE_THRESHOLD) is calibrated against.
"""

from typing import Any, Protocol

from app.retrieval.bm25 import BM25Index
from app.retrieval.rrf import rrf_fuse
from app.retrieval.types import GroundingItem
from app.retrieval.vectors import Embedder, InMemoryVectorStore, cosine


class Reranker(Protocol):
    def rerank(self, query: str, items: list[GroundingItem]) -> list[GroundingItem]: ...


class IdentityReranker:
    def rerank(self, query: str, items: list[GroundingItem]) -> list[GroundingItem]:
        return items


class HybridRetriever:
    def __init__(
        self,
        bm25: BM25Index,
        vectors: InMemoryVectorStore,
        embedder: Embedder,
        catalog: dict[str, dict[str, Any]],
        reranker: Reranker | None = None,
        k_each: int = 50,
        top_n: int = 6,
        w_dense: float = 0.7,
        w_sparse: float = 0.3,
    ) -> None:
        self._bm25 = bm25
        self._vectors = vectors
        self._embedder = embedder
        self._catalog = catalog
        self._reranker = reranker or IdentityReranker()
        self._k_each = k_each
        self._top_n = top_n
        self._w_dense = w_dense
        self._w_sparse = w_sparse

    async def retrieve(self, query: str, product_code: str) -> list[GroundingItem]:
        query_vector = self._embedder.embed(query)
        sparse = [doc_id for doc_id, _ in self._bm25.search(query, k=self._k_each)]
        dense = [
            doc_id
            for doc_id, score in self._vectors.search(query_vector, k=self._k_each)
            if score > 0.0
        ]
        fused = rrf_fuse(sparse, dense, w_dense=self._w_dense, w_sparse=self._w_sparse)

        items: list[GroundingItem] = []
        for doc_id, _rrf_score in fused:
            meta = self._catalog.get(doc_id)
            if meta is None:
                continue
            product = meta.get("product")
            if product not in (None, "*", product_code):
                continue
            items.append(
                GroundingItem(
                    source="rag",
                    text=meta["text"],
                    score=cosine(query_vector, self._vectors.vector(doc_id)),
                    doc_id=meta.get("doc_id"),
                    clause=meta.get("clause"),
                    version=meta.get("version"),
                    effective_date=meta.get("effective_date"),
                )
            )
            if len(items) >= self._top_n:
                break
        return self._reranker.rerank(query, items)
