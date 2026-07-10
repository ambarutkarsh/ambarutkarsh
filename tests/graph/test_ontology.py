import pytest
from pydantic import ValidationError

from app.graph.ontology import EdgeType, GraphEdge, GraphFact, Provenance


def test_edge_requires_provenance():
    with pytest.raises(ValidationError):
        GraphEdge(source_id="p1", target_id="ncb1", type=EdgeType.HAS_RULE)  # type: ignore[call-arg]


def test_provenance_fields_must_be_non_empty():
    with pytest.raises(ValidationError):
        Provenance(doc_id="", clause="6.1", version="v3")


def test_valid_edge_with_provenance():
    edge = GraphEdge(
        source_id="p1",
        target_id="ncb1",
        type=EdgeType.HAS_RULE,
        provenance=Provenance(doc_id="policy_wording_v3", clause="6.1", version="v3"),
    )
    assert edge.provenance.clause == "6.1"


def test_graph_fact_converts_to_citable_grounding_item():
    fact = GraphFact(
        path="Policy-HAS_RULE->NCB",
        statement="NCB is granted per clause 6.1.",
        provenance=Provenance(doc_id="policy_wording_v3", clause="6.1", version="v3"),
    )
    item = fact.to_grounding_item()
    assert item.source == "graph"
    assert item.clause == "6.1"
    assert item.path == "Policy-HAS_RULE->NCB"
    citation = item.to_citation()
    assert citation.source == "graph"
    assert citation.clause == "6.1"
