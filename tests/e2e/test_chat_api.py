"""End-to-end pipeline tests through the FastAPI surface.

Uses the deterministic dev wiring (extractive generator + substring NLI), so
validation is exercised for real: the happy path passes because the reply is a
literal quote of grounding evidence, and the hallucination test fails NLI,
exhausts the refine pass, and must refuse + escalate.
"""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.analytics.events import InMemoryEmitter
from app.api.routes import create_app
from app.handoff.null import NullHandoffProvider
from app.orchestrator import templates
from app.testing.fixtures import DEMO_POLICY_TOKEN, build_dev_orchestrator
from app.testing.stubs import ExtractiveGenerator

ADVERSARIAL = Path(__file__).resolve().parents[2] / "eval" / "adversarial"


def load_seeds(name: str) -> list[dict]:
    path = ADVERSARIAL / name
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


@pytest.fixture()
def env():
    handoff = NullHandoffProvider()
    emitter = InMemoryEmitter()
    orchestrator = build_dev_orchestrator(handoff=handoff, emitter=emitter)
    client = TestClient(create_app(orchestrator))
    return client, handoff, emitter


def post_chat(client: TestClient, message: str, session_id: str = "s1") -> dict:
    response = client.post(
        "/chat",
        json={
            "session_id": session_id,
            "policy_context_token": DEMO_POLICY_TOKEN,
            "message": message,
        },
    )
    assert response.status_code == 200
    return response.json()


def test_healthz(env):
    client, _, _ = env
    assert client.get("/healthz").json() == {"status": "ok"}


def test_grounded_premium_answer_with_citations(env):
    client, _, emitter = env
    data = post_chat(client, "Why did my premium go up this year?")
    assert data["validation"]["grounded"] is True
    assert data["validation"]["faithfulness"] >= 0.95
    assert any(c["source"] == "rag" for c in data["citations"])
    assert "renewal premium" in data["reply"].lower()
    assert emitter.of_type("answer_delivered")


def test_relational_intent_includes_graph_citation(env):
    client, _, _ = env
    data = post_chat(client, "What is my no-claim bonus status?")
    assert data["intent"]["name"] == "I_NCB"
    assert any(c["source"] == "graph" and c["clause"] == "6.1" for c in data["citations"])
    assert any(c["source"] == "customer_doc" for c in data["citations"])


def test_non_english_gets_notice_and_handoff_offer(env):
    client, _, _ = env
    for seed in load_seeds("non_english.jsonl"):
        data = post_chat(client, seed["message"])
        assert data["language"]["supported"] is False
        assert data["reply"] == templates.ENGLISH_ONLY_NOTICE
        assert data["action"]["type"] == "offer_handoff"


def test_portability_bait_deflects_and_never_advises(env):
    client, handoff, _ = env
    for i, seed in enumerate(load_seeds("portability_bait.jsonl")):
        data = post_chat(client, seed["message"], session_id=f"port-{i}")
        assert data["intent"]["name"] == "I_PORTABILITY_BAIT"
        assert data["reply"] == templates.PORTABILITY_DEFLECTION
    assert all(req.reason == "portability_query" for req in handoff.requests)


def test_injection_seeds_are_refused(env):
    client, _, _ = env
    for seed in load_seeds("injection.jsonl"):
        data = post_chat(client, seed["message"])
        assert data["reply"] == templates.INJECTION_REFUSAL


def test_irate_customer_escalates_with_masked_transcript(env):
    client, handoff, emitter = env
    for i, seed in enumerate(load_seeds("irate.jsonl")):
        data = post_chat(client, seed["message"], session_id=f"irate-{i}")
        assert data["escalation"]["handoff_ref"], seed["message"]
        assert data["escalation"]["status"] == "created"
    assert emitter.of_type("handoff_created")


def test_handoff_payload_is_pii_masked(env):
    client, handoff, _ = env
    post_chat(client, "USELESS service!!! I am furious. My number is 9876543210, call me!")
    assert handoff.requests
    summary = handoff.requests[-1].transcript_summary
    assert "9876543210" not in summary
    assert "[PHONE]" in summary


def test_out_of_scope_redirects(env):
    client, _, _ = env
    data = post_chat(client, "What is the weather in Mumbai today?")
    assert data["intent"]["name"] == "I_OOS"
    assert data["reply"] == templates.OUT_OF_SCOPE_REDIRECT


def test_hallucinating_generator_is_refused_and_escalated():
    """A generator that keeps emitting an unsupported claim must never reach the user."""
    handoff = NullHandoffProvider()
    generator = ExtractiveGenerator(
        hallucinate="Your premium is guaranteed to stay flat for ten years."
    )
    orchestrator = build_dev_orchestrator(generator=generator, handoff=handoff)
    client = TestClient(create_app(orchestrator))
    data = post_chat(client, "Why did my premium go up this year?")
    assert data["reply"] == templates.LOW_GROUNDING_REFUSAL
    assert data["escalation"]["status"] == "created"
    assert handoff.requests[-1].reason == "low_confidence"
    assert len(generator.calls) == 2  # initial draft + one refine pass, then refuse


def test_retention_intent_shows_only_permitted_offers(env):
    client, _, emitter = env
    data = post_chat(client, "My premium is too expensive, I might not renew.")
    assert data["intent"]["name"] in ("I_OBJ_PREMIUM", "I_CHURN_INTENT")
    shown = emitter.of_type("retention_offer_shown")
    assert shown
    from app.orchestrator.retention import permitted_offers_for
    from app.understanding.intents import Intent

    permitted = permitted_offers_for(Intent(data["intent"]["name"]))
    assert set(shown[-1].payload["offers"]) <= {o.value for o in permitted}
