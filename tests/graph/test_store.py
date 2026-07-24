import pytest

from app.graph.ontology import EdgeType, GraphEdge, GraphNode, NodeType, Provenance
from app.graph.store import InMemoryGraphStore, StoreGraphQuerier
from app.understanding.intents import Intent

PROV = Provenance(doc_id="wording_v3", clause="6.1", version="v3")
PROV_BENEFIT = Provenance(doc_id="wording_v3", clause="6.2", version="v3")


@pytest.fixture()
def store() -> InMemoryGraphStore:
    s = InMemoryGraphStore()
    s.add_node(GraphNode(id="prod", type=NodeType.PRODUCT, name="FamilyFloater"))
    s.add_node(
        GraphNode(
            id="ncb",
            type=NodeType.NCB_RULE,
            name="NCB",
            properties={"statement": "No claim bonus accrues on claim-free renewal."},
        )
    )
    s.add_node(
        GraphNode(
            id="cb",
            type=NodeType.BENEFIT,
            name="CumulativeBonus",
            properties={"statement": "Cumulative bonus is preserved on continuous renewal."},
        )
    )
    s.add_edge(GraphEdge(source_id="prod", target_id="ncb",
                         type=EdgeType.HAS_RULE, provenance=PROV))
    s.add_edge(GraphEdge(source_id="ncb", target_id="cb",
                         type=EdgeType.GRANTS, provenance=PROV_BENEFIT))
    return s


def test_edge_to_unknown_node_rejected(store: InMemoryGraphStore):
    with pytest.raises(KeyError):
        store.add_edge(GraphEdge(source_id="prod", target_id="ghost",
                                 type=EdgeType.HAS_RULE, provenance=PROV))


def test_single_hop_path(store: InMemoryGraphStore):
    paths = store.paths_to_type("prod", NodeType.NCB_RULE)
    assert len(paths) == 1
    assert paths[0][0].provenance.clause == "6.1"


def test_multi_hop_path_found(store: InMemoryGraphStore):
    paths = store.paths_to_type("prod", NodeType.BENEFIT)
    assert len(paths) == 1
    assert [e.type for e in paths[0]] == [EdgeType.HAS_RULE, EdgeType.GRANTS]


async def test_querier_builds_citable_facts(store: InMemoryGraphStore):
    querier = StoreGraphQuerier(store, product_nodes={"FAMILY_FLOATER": "prod"})
    facts = await querier.traverse(Intent.I_CONTINUITY, "FAMILY_FLOATER")
    assert len(facts) == 1
    fact = facts[0]
    assert fact.path == "FamilyFloater-HAS_RULE->NCB-GRANTS->CumulativeBonus"
    assert fact.statement == "Cumulative bonus is preserved on continuous renewal."
    # Provenance comes from the edge that produced the fact: never fabricated.
    assert fact.provenance.clause == "6.2"


async def test_querier_empty_for_unmapped_intent_or_product(store: InMemoryGraphStore):
    querier = StoreGraphQuerier(store, product_nodes={"FAMILY_FLOATER": "prod"})
    assert await querier.traverse(Intent.I_PREMIUM_QUERY, "FAMILY_FLOATER") == []
    assert await querier.traverse(Intent.I_NCB, "UNKNOWN_PRODUCT") == []
