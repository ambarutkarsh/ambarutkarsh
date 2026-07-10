"""Scoped long-context loader (build doc Section 5, component 6).

On session start the authenticated customer's full policy document is fetched
server-side by reference token from internal policy APIs and loaded as
customer_doc grounding items, so their exact terms are present every turn.
This module defines the dev/test implementation; the production loader calls
the insurer's policy service over the internal allowlisted network.
"""

from app.retrieval.types import GroundingItem


class StaticPolicyDocLoader:
    """Serves policy docs from an in-memory map keyed by policy ref token."""

    def __init__(self, docs: dict[str, list[GroundingItem]]) -> None:
        self._docs = docs

    async def load(self, policy_ref_token: str) -> list[GroundingItem]:
        return list(self._docs.get(policy_ref_token, []))
