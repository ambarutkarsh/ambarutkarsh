"""Salesforce adapter for HandoffProvider (build doc Section 7).

Creates a Case via the Salesforce REST API using the OAuth client-credentials
flow. This module is the ONLY component permitted to reach Salesforce; the
deployment's outbound allowlist enforces that at the network layer. Record
types, queue ids, and endpoints are configuration, not code. Failures return
status="failed" so the orchestrator can queue the handoff durably (Section 14)
instead of dropping it.
"""

import time
from typing import Any

import httpx
from pydantic import BaseModel, Field

from app.handoff.base import HandoffRequest, HandoffResult

_STATUS_MAP: dict[str, str] = {
    "New": "created",
    "Queued": "queued",
    "Working": "transferred",
    "Escalated": "transferred",
    "Closed": "created",
}


class SalesforceConfig(BaseModel):
    base_url: str  # e.g. https://insurer.my.salesforce.com
    client_id: str
    client_secret: str
    api_version: str = "v61.0"
    case_record_type_id: str | None = None
    # Map HandoffReason -> queue (OwnerId). Confirmed with the Salesforce admin.
    queue_ids: dict[str, str] = Field(default_factory=dict)
    timeout_seconds: float = 10.0


class SalesforceHandoffProvider:
    def __init__(self, config: SalesforceConfig, client: httpx.AsyncClient | None = None) -> None:
        self._config = config
        self._client = client or httpx.AsyncClient(
            base_url=config.base_url, timeout=config.timeout_seconds
        )
        self._token: str | None = None
        self._token_expires_at: float = 0.0

    async def _get_token(self) -> str:
        if self._token and time.monotonic() < self._token_expires_at:
            return self._token
        resp = await self._client.post(
            "/services/oauth2/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self._config.client_id,
                "client_secret": self._config.client_secret,
            },
        )
        resp.raise_for_status()
        payload = resp.json()
        self._token = str(payload["access_token"])
        # Salesforce does not always return expires_in for this flow; be conservative.
        self._token_expires_at = time.monotonic() + float(payload.get("expires_in", 600)) - 60
        return self._token

    def _case_body(self, req: HandoffRequest) -> dict[str, Any]:
        body: dict[str, Any] = {
            "Subject": f"RenewAssist handoff: {req.reason}",
            "Description": req.transcript_summary,  # already PII-masked upstream
            "Origin": "Chat",
            "Priority": "High" if req.reason in ("irate", "system_degraded") else "Medium",
        }
        if self._config.case_record_type_id:
            body["RecordTypeId"] = self._config.case_record_type_id
        queue_id = self._config.queue_ids.get(req.reason)
        if queue_id:
            body["OwnerId"] = queue_id
        return body

    async def create(self, req: HandoffRequest) -> HandoffResult:
        try:
            token = await self._get_token()
            resp = await self._client.post(
                f"/services/data/{self._config.api_version}/sobjects/Case",
                json=self._case_body(req),
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            case_id = str(resp.json()["id"])
            return HandoffResult(provider_ref=case_id, status="created")
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            return HandoffResult(provider_ref="", status="failed", detail=str(exc))

    async def status(self, provider_ref: str) -> HandoffResult:
        try:
            token = await self._get_token()
            resp = await self._client.get(
                f"/services/data/{self._config.api_version}/sobjects/Case/{provider_ref}",
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            sf_status = str(resp.json().get("Status", "New"))
            mapped = _STATUS_MAP.get(sf_status, "queued")
            return HandoffResult(provider_ref=provider_ref, status=mapped)  # type: ignore[arg-type]
        except (httpx.HTTPError, ValueError) as exc:
            return HandoffResult(provider_ref=provider_ref, status="failed", detail=str(exc))
