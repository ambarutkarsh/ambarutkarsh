from app.analytics.events import AnalyticsEvent, InMemoryEmitter, assign_variant


def test_assignment_is_deterministic():
    assert assign_variant("ref-abc") == assign_variant("ref-abc")


def test_assignment_splits_population():
    variants = {assign_variant(f"ref-{i}") for i in range(200)}
    assert variants == {"assisted", "control"}


def test_holdout_pct_zero_means_all_assisted():
    assert all(assign_variant(f"ref-{i}", holdout_pct=0) == "assisted" for i in range(50))


def test_emitter_collects_typed_events():
    emitter = InMemoryEmitter()
    emitter.emit(AnalyticsEvent(type="refusal", session_id="s1"))
    emitter.emit(AnalyticsEvent(type="answer_delivered", session_id="s1"))
    assert len(emitter.of_type("refusal")) == 1
    assert len(emitter.of_type("answer_delivered")) == 1
