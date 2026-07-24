"""Hybrid retriever + ingestion index tests.

Recall gate note: the Phase 1 acceptance gate (Recall@10 >= 0.80, hybrid+rerank
beats dense-only on nDCG) is measured against the golden set with the real
BGE-M3 embedder and reranker. These tests pin the mechanics on a synthetic
corpus with the deterministic hashing embedder: fusion, product scoping,
normalization, and a recall floor over exact-vocabulary queries.
"""

import pytest

from app.retrieval.hybrid import HybridRetriever
from app.testing.stubs import HashingEmbedder
from ingestion.index import SourceDoc, build_indexes

DOCS = [
    SourceDoc(
        doc_id="wording_v3",
        product="FAMILY_FLOATER",
        version="v3",
        text=(
            "7.1 Grace Period\n"
            "A grace period applies to renewal premium payment and continuity "
            "benefits are protected during the grace period.\n"
            "6.1 Cumulative Bonus\n"
            "The no claim bonus is granted as cumulative bonus or premium discount "
            "at the express choice of the policyholder.\n"
            "9.2 Waiting Periods\n"
            "Pre existing disease waiting periods carry forward on continuous renewal.\n"
        ),
    ),
    SourceDoc(
        doc_id="brochure_v2",
        product="SENIOR_SHIELD",
        version="v2",
        text=(
            "3.1 Installment Facility\n"
            "Premium may be paid in monthly installments under the installment facility.\n"
        ),
    ),
    SourceDoc(
        doc_id="faq_v5",
        product="*",
        version="v5",
        text=(
            "2.4 Payment Modes\n"
            "Renewal payment is accepted by card netbanking and UPI payment modes.\n"
        ),
    ),
]

QUERIES = [
    ("grace period for renewal premium", "wording_v3:0"),
    ("cumulative bonus no claim bonus choice", "wording_v3:1"),
    ("pre existing disease waiting period carry forward", "wording_v3:2"),
    ("payment modes UPI netbanking", "faq_v5:0"),
]


@pytest.fixture()
def retriever() -> HybridRetriever:
    bundle = build_indexes(DOCS, HashingEmbedder(), target_tokens=64, overlap_tokens=8)
    return HybridRetriever(
        bundle.bm25, bundle.vectors, HashingEmbedder(), bundle.catalog, top_n=6
    )


async def test_recall_floor_on_synthetic_corpus(retriever: HybridRetriever):
    hits = 0
    for query, expected_prefix in QUERIES:
        items = await retriever.retrieve(query, "FAMILY_FLOATER")
        doc_id = expected_prefix.split(":")[0]
        if any(item.doc_id == doc_id for item in items):
            hits += 1
    assert hits / len(QUERIES) >= 0.8


async def test_top_hit_is_relevant_and_above_grounding_threshold(retriever: HybridRetriever):
    from app.orchestrator.pipeline import GROUNDING_SCORE_THRESHOLD

    items = await retriever.retrieve("grace period for renewal premium", "FAMILY_FLOATER")
    assert items
    assert items[0].score >= GROUNDING_SCORE_THRESHOLD
    assert items[0].doc_id == "wording_v3"
    assert items[0].clause == "7.1 Grace Period"
    assert items[0].version == "v3"


async def test_product_scope_filters_other_products(retriever: HybridRetriever):
    items = await retriever.retrieve("monthly installments premium", "FAMILY_FLOATER")
    assert all(item.doc_id != "brochure_v2" for item in items)


async def test_corpus_wide_docs_visible_to_all_products(retriever: HybridRetriever):
    items = await retriever.retrieve("payment modes UPI", "SENIOR_SHIELD")
    assert any(item.doc_id == "faq_v5" for item in items)


async def test_junk_query_scores_below_grounding_threshold(retriever: HybridRetriever):
    """Dense retrieval always has nearest neighbours; the contract is that junk
    never scores above the orchestrator's grounding threshold, so the pipeline
    refuses instead of answering from noise."""
    from app.orchestrator.pipeline import GROUNDING_SCORE_THRESHOLD

    items = await retriever.retrieve("submarine warranty spacecraft", "FAMILY_FLOATER")
    assert all(item.score < GROUNDING_SCORE_THRESHOLD for item in items)


async def test_citations_carry_ingestion_metadata(retriever: HybridRetriever):
    items = await retriever.retrieve("cumulative bonus choice", "FAMILY_FLOATER")
    citation = items[0].to_citation()
    assert citation.source == "rag"
    assert citation.doc_id == "wording_v3"
    assert citation.clause and citation.span
