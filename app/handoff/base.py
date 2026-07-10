"""Provider-agnostic human handoff interface (build doc Section 7).

The orchestrator depends only on this Protocol; no CRM SDK is imported by the
pipeline. Swapping CRMs or stubbing in tests requires no pipeline change.
The transcript summary is PII-masked BEFORE a HandoffRequest is constructed.
"""

from typing import Any, Literal, Protocol

from pydantic import BaseModel, Field

HandoffReason = Literal[
    "low_confidence",
    "irate",
    "out_of_scope",
    "user_requested",
    "portability_query",
    "system_degraded",
]


class HandoffRequest(BaseModel):
    session_id: str
    policy_ref_token: str  # reference token, never raw PII
    reason: HandoffReason
    intent: str | None = None
    sentiment_label: str | None = None
    transcript_summary: str  # PII-masked summary, not raw transcript
    channel_pref: Literal["live_transfer", "callback", "ticket"] = "ticket"
    metadata: dict[str, Any] = Field(default_factory=dict)


class HandoffResult(BaseModel):
    provider_ref: str  # e.g. Salesforce Case Id
    status: Literal["created", "queued", "transferred", "failed"]
    eta_seconds: int | None = None
    detail: str | None = None


class HandoffProvider(Protocol):
    async def create(self, req: HandoffRequest) -> HandoffResult: ...

    async def status(self, provider_ref: str) -> HandoffResult: ...
