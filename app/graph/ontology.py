"""Policy knowledge-graph ontology (build doc Sections 4 and 5).

The graph is small and rule-focused: nodes for products, riders, waiting
periods, NCB rules, grace rules, SI bands and loadings; edges carry mandatory
provenance back to a source clause so graph facts remain citable. An edge
without provenance cannot exist: that invariant is enforced here, at the type
level, not just in review.
"""

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field

from app.retrieval.types import GroundingItem


class NodeType(StrEnum):
    PRODUCT = "PRODUCT"
    RIDER = "RIDER"
    WAITING_PERIOD = "WAITING_PERIOD"
    NCB_RULE = "NCB_RULE"
    GRACE_RULE = "GRACE_RULE"
    SI_BAND = "SI_BAND"
    LOADING = "LOADING"
    BENEFIT = "BENEFIT"


class EdgeType(StrEnum):
    HAS_RIDER = "HAS_RIDER"
    HAS_RULE = "HAS_RULE"
    GRANTS = "GRANTS"
    APPLIES_TO = "APPLIES_TO"
    REQUIRES = "REQUIRES"
    EXCLUDES = "EXCLUDES"


class Provenance(BaseModel):
    """Pointer from a graph fact back to the exact source clause."""

    doc_id: str = Field(min_length=1)
    clause: str = Field(min_length=1)
    version: str = Field(min_length=1)


class GraphNode(BaseModel):
    id: str
    type: NodeType
    name: str
    properties: dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    source_id: str
    target_id: str
    type: EdgeType
    provenance: Provenance  # required: no edge without a source clause


class GraphFact(BaseModel):
    """A traversal result presented to the generator as grounding evidence."""

    path: str  # e.g. "Policy-HAS_RULE->NCB-GRANTS->CumulativeBonus"
    statement: str
    provenance: Provenance

    def to_grounding_item(self) -> GroundingItem:
        return GroundingItem(
            source="graph",
            text=self.statement,
            path=self.path,
            doc_id=self.provenance.doc_id,
            clause=self.provenance.clause,
            version=self.provenance.version,
        )
