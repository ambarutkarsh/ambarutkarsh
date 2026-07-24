"""Ingestion: source docs -> chunks -> BM25 + vector indexes + metadata catalog.

Every chunk carries product, clause (its governing header), version, and
effective date, per the KB governance rules (build doc Section 17): retrieval
can be pinned to an effective version, and nothing enters the index without
provenance metadata. The same pass will populate the Neo4j policy graph once
the extraction step lands.
"""

from dataclasses import dataclass
from typing import Any

from app.retrieval.bm25 import BM25Index
from app.retrieval.vectors import Embedder, InMemoryVectorStore
from ingestion.chunking import chunk_text


@dataclass(frozen=True)
class SourceDoc:
    doc_id: str
    product: str  # product code, or "*" for corpus-wide docs (FAQ, rule cards)
    version: str
    text: str
    effective_date: str | None = None


@dataclass(frozen=True)
class IndexBundle:
    bm25: BM25Index
    vectors: InMemoryVectorStore
    catalog: dict[str, dict[str, Any]]


def build_indexes(
    docs: list[SourceDoc],
    embedder: Embedder,
    target_tokens: int = 512,
    overlap_tokens: int = 64,
) -> IndexBundle:
    bm25 = BM25Index()
    vectors = InMemoryVectorStore()
    catalog: dict[str, dict[str, Any]] = {}
    for doc in docs:
        for chunk in chunk_text(doc.text, target_tokens=target_tokens,
                                overlap_tokens=overlap_tokens):
            chunk_id = f"{doc.doc_id}:{chunk.index}"
            meta = {
                "text": chunk.text,
                "doc_id": doc.doc_id,
                "clause": chunk.header or f"chunk-{chunk.index}",
                "product": doc.product,
                "version": doc.version,
                "effective_date": doc.effective_date,
            }
            bm25.add(chunk_id, chunk.text, meta)
            vectors.add(chunk_id, embedder.embed(chunk.text), meta)
            catalog[chunk_id] = meta
    return IndexBundle(bm25=bm25, vectors=vectors, catalog=catalog)
