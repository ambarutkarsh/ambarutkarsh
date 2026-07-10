from app.retrieval.rrf import rrf_fuse


def test_doc_in_both_lists_outranks_single_list_docs():
    fused = rrf_fuse(sparse=["a", "b"], dense=["b", "c"])
    ranking = [doc_id for doc_id, _ in fused]
    assert ranking[0] == "b"


def test_dense_weight_dominates_by_default():
    # "d" is top of dense only, "s" is top of sparse only: dense weight 0.7 wins.
    fused = rrf_fuse(sparse=["s"], dense=["d"])
    assert fused[0][0] == "d"


def test_rank_matters_within_a_list():
    fused = rrf_fuse(sparse=[], dense=["first", "second", "third"])
    scores = dict(fused)
    assert scores["first"] > scores["second"] > scores["third"]


def test_deterministic_tie_break():
    fused = rrf_fuse(sparse=["x", "y"], dense=["y", "x"])
    assert fused == rrf_fuse(sparse=["x", "y"], dense=["y", "x"])


def test_empty_inputs():
    assert rrf_fuse(sparse=[], dense=[]) == []
