"""Wire schemas for POST /chat and /ws (build doc Section 9)."""

from typing import Any, Literal

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    session_id: str
    policy_context_token: str
    message: str
    locale: str = "en-IN"


class IntentInfo(BaseModel):
    name: str
    confidence: float = Field(ge=0.0, le=1.0)
    slots: dict[str, Any] = Field(default_factory=dict)


class LanguageInfo(BaseModel):
    detected: str
    supported: bool


class Citation(BaseModel):
    source: Literal["rag", "graph", "customer_doc"]
    doc_id: str | None = None
    clause: str | None = None
    span: str | None = None
    path: str | None = None
    field: str | None = None
    value: str | None = None


class ValidationInfo(BaseModel):
    faithfulness: float = Field(ge=0.0, le=1.0)
    grounded: bool
    constraints_passed: bool


class SentimentInfo(BaseModel):
    label: Literal["calm", "neutral", "frustrated", "irate"]
    score: float = Field(ge=0.0, le=1.0)


class ActionInfo(BaseModel):
    type: Literal[
        "none",
        "offer_payment_deeplink",
        "offer_handoff",
        "show_retention_offer",
    ] = "none"
    payload: dict[str, Any] = Field(default_factory=dict)


class EscalationInfo(BaseModel):
    handoff_ref: str | None = None
    status: Literal["created", "queued", "transferred", "failed"] | None = None


class ChatResponse(BaseModel):
    reply: str
    intent: IntentInfo
    language: LanguageInfo
    citations: list[Citation] = Field(default_factory=list)
    validation: ValidationInfo
    sentiment: SentimentInfo
    action: ActionInfo = Field(default_factory=ActionInfo)
    escalation: EscalationInfo = Field(default_factory=EscalationInfo)
