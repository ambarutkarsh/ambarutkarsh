"""Dialogue state (hot state lives in Redis in production; this is the shape)."""

from dataclasses import dataclass, field

from app.retrieval.types import GroundingItem


@dataclass
class SessionContext:
    session_id: str
    policy_ref_token: str
    product_code: str = "default"


@dataclass
class DialogueState:
    history: list[str] = field(default_factory=list)
    customer_doc: list[GroundingItem] | None = None
    consecutive_frustrated_turns: int = 0

    def record_turn(self, user_message: str, reply: str) -> None:
        self.history.append(f"user: {user_message}")
        self.history.append(f"bot: {reply}")
