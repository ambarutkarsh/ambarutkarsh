"""Typed analytics event stream and A/B assignment (build doc Section 16)."""

import hashlib
from datetime import UTC, datetime
from typing import Any, Literal, Protocol

from pydantic import BaseModel, Field

EventType = Literal[
    "session_started",
    "intent_classified",
    "answer_delivered",
    "retention_offer_shown",
    "payment_deeplink_clicked",
    "renewal_completed",
    "handoff_created",
    "refusal",
    "degraded_mode",
    "csat_submitted",
]


class AnalyticsEvent(BaseModel):
    type: EventType
    session_id: str
    ts: datetime = Field(default_factory=lambda: datetime.now(UTC))
    variant: Literal["assisted", "control"] | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class EventEmitter(Protocol):
    def emit(self, event: AnalyticsEvent) -> None: ...


class InMemoryEmitter:
    """Dev/test sink. Production emits to Postgres / the analytics pipeline."""

    def __init__(self) -> None:
        self.events: list[AnalyticsEvent] = []

    def emit(self, event: AnalyticsEvent) -> None:
        self.events.append(event)

    def of_type(self, event_type: EventType) -> list[AnalyticsEvent]:
        return [e for e in self.events if e.type == event_type]


def assign_variant(policy_ref: str, holdout_pct: int = 10) -> Literal["assisted", "control"]:
    """Deterministic A/B assignment keyed by policy reference.

    The same policy always lands in the same bucket, so uplift vs. control is
    measurable across sessions. holdout_pct percent of policies are control.
    """
    digest = hashlib.sha256(policy_ref.encode("utf-8")).digest()
    bucket = int.from_bytes(digest[:4], "big") % 100
    return "control" if bucket < holdout_pct else "assisted"
