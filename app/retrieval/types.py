"""Grounding item types shared by retrieval, graph, and the customer doc."""

from typing import Literal

from pydantic import BaseModel

from app.api.schemas import Citation


class GroundingItem(BaseModel):
    """A single citable piece of evidence the generator may rely on."""

    source: Literal["rag", "graph", "customer_doc"]
    text: str
    score: float = 1.0
    doc_id: str | None = None
    clause: str | None = None
    path: str | None = None  # graph traversal path, e.g. Policy-HAS_RULE->NCB
    field: str | None = None  # customer_doc field name
    version: str | None = None
    effective_date: str | None = None

    def to_citation(self) -> Citation:
        span = self.text if len(self.text) <= 200 else self.text[:197] + "..."
        return Citation(
            source=self.source,
            doc_id=self.doc_id,
            clause=self.clause,
            path=self.path,
            field=self.field,
            value=self.text if self.source == "customer_doc" else None,
            span=span if self.source == "rag" else None,
        )
