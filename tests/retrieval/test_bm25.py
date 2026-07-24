import pytest

from app.retrieval.bm25 import BM25Index, tokenize


@pytest.fixture()
def index() -> BM25Index:
    idx = BM25Index()
    idx.add("grace", "A grace period of days applies to renewal premium payment", {"c": "7.1"})
    idx.add("ncb", "No claim bonus is granted as cumulative bonus or premium discount")
    idx.add("riders", "Optional riders can be added or removed at renewal")
    return idx


def test_tokenize_lowercases_and_strips_punctuation():
    assert tokenize("Grace-Period, applies!") == ["grace", "period", "applies"]


def test_relevant_doc_ranks_first(index: BM25Index):
    results = index.search("what is the grace period for payment")
    assert results[0][0] == "grace"


def test_rare_term_beats_common_term(index: BM25Index):
    # "riders" appears in one doc; "renewal" in two: the rare term dominates.
    results = index.search("renewal riders")
    assert results[0][0] == "riders"


def test_absent_terms_yield_no_results(index: BM25Index):
    assert index.search("submarine warranty") == []


def test_payload_round_trip(index: BM25Index):
    assert index.payload("grace") == {"c": "7.1"}


def test_duplicate_id_rejected(index: BM25Index):
    with pytest.raises(ValueError):
        index.add("grace", "duplicate")


def test_empty_index_returns_empty():
    assert BM25Index().search("anything") == []
