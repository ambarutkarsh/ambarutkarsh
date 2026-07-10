import json

import httpx
import pytest

from app.handoff.base import HandoffRequest
from app.handoff.factory import get_handoff_provider
from app.handoff.null import NullHandoffProvider
from app.handoff.salesforce import SalesforceConfig, SalesforceHandoffProvider


def make_request(**overrides) -> HandoffRequest:
    defaults = dict(
        session_id="s1",
        policy_ref_token="ref-1",
        reason="irate",
        intent="I_OBJ_CLAIM",
        sentiment_label="irate",
        transcript_summary="user: claim rejected | bot: [masked]",
        channel_pref="live_transfer",
    )
    defaults.update(overrides)
    return HandoffRequest(**defaults)  # type: ignore[arg-type]


async def test_null_provider_records_and_creates():
    provider = NullHandoffProvider()
    result = await provider.create(make_request())
    assert result.status == "created"
    assert result.provider_ref.startswith("null-")
    assert provider.requests[0].reason == "irate"


def test_factory_defaults_to_null(monkeypatch):
    monkeypatch.delenv("HANDOFF_PROVIDER", raising=False)
    assert isinstance(get_handoff_provider(), NullHandoffProvider)


def test_factory_rejects_unknown_provider():
    with pytest.raises(ValueError):
        get_handoff_provider("zendesk")


def sf_provider(handler) -> SalesforceHandoffProvider:
    config = SalesforceConfig(
        base_url="https://insurer.example.com",
        client_id="cid",
        client_secret="secret",
        queue_ids={"irate": "00G-queue-irate"},
    )
    client = httpx.AsyncClient(
        base_url=config.base_url, transport=httpx.MockTransport(handler)
    )
    return SalesforceHandoffProvider(config, client=client)


async def test_salesforce_creates_case_with_mapped_fields():
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/services/oauth2/token":
            return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
        assert request.url.path == "/services/data/v61.0/sobjects/Case"
        assert request.headers["Authorization"] == "Bearer tok"
        seen.update(json.loads(request.content))
        return httpx.Response(201, json={"id": "500ABC", "success": True})

    result = await sf_provider(handler).create(make_request())
    assert result.status == "created"
    assert result.provider_ref == "500ABC"
    assert seen["Priority"] == "High"           # irate maps to High
    assert seen["OwnerId"] == "00G-queue-irate"  # routed to the irate queue
    assert "claim rejected" in seen["Description"]


async def test_salesforce_failure_returns_failed_not_raise():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"error": "boom"})

    result = await sf_provider(handler).create(make_request())
    assert result.status == "failed"
    assert result.detail


async def test_salesforce_status_maps_case_status():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/services/oauth2/token":
            return httpx.Response(200, json={"access_token": "tok"})
        return httpx.Response(200, json={"Status": "Working"})

    result = await sf_provider(handler).status("500ABC")
    assert result.status == "transferred"
