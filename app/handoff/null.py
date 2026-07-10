"""No-op handoff provider for tests and local dev: logs, never leaves the box."""

import logging
import uuid

from app.handoff.base import HandoffRequest, HandoffResult

logger = logging.getLogger(__name__)


class NullHandoffProvider:
    def __init__(self) -> None:
        self.requests: list[HandoffRequest] = []

    async def create(self, req: HandoffRequest) -> HandoffResult:
        self.requests.append(req)
        ref = f"null-{uuid.uuid4().hex[:12]}"
        logger.info("handoff.null.created ref=%s reason=%s", ref, req.reason)
        return HandoffResult(provider_ref=ref, status="created", detail="null provider")

    async def status(self, provider_ref: str) -> HandoffResult:
        return HandoffResult(provider_ref=provider_ref, status="created", detail="null provider")
