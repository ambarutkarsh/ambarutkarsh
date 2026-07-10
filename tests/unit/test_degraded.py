from app.resilience.degraded import HealthSnapshot, Mode, select_mode


def test_all_healthy_is_full_no_banner():
    decision = select_mode(HealthSnapshot())
    assert decision.mode is Mode.FULL
    assert not decision.show_banner
    assert not decision.queue_handoffs


def test_llm_down_falls_to_retrieval_only():
    decision = select_mode(HealthSnapshot(llm=False))
    assert decision.mode is Mode.RETRIEVAL_ONLY
    assert decision.show_banner


def test_llm_and_retrieval_down_falls_to_static_faq():
    decision = select_mode(HealthSnapshot(llm=False, retrieval=False))
    assert decision.mode is Mode.STATIC_FAQ


def test_nli_down_means_no_unverified_generation():
    decision = select_mode(HealthSnapshot(nli=False))
    assert decision.mode is Mode.EXTRACTIVE_ONLY


def test_graph_down_degrades_relational_answers():
    decision = select_mode(HealthSnapshot(graph=False))
    assert decision.mode is Mode.RAG_ONLY_NO_GRAPH


def test_handoff_down_queues_but_keeps_serving():
    decision = select_mode(HealthSnapshot(handoff=False))
    assert decision.mode is Mode.FULL
    assert decision.queue_handoffs
    assert decision.show_banner
