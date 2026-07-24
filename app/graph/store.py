"""In-memory policy graph store and the intent-driven traversal querier.

Implements the orchestrator's GraphQuerier port with the same ontology the
Neo4j deployment uses (app.graph.ontology), so swapping to Cypher in Phase 1+
changes the storage call sites, not the traversal semantics or the provenance
guarantee: every returned fact carries the source clause of the edge that
produced it, because edges cannot exist without provenance.
"""

from app.graph.ontology import GraphEdge, GraphFact, GraphNode, NodeType
from app.understanding.intents import Intent

# Which node type answers which relational intent (build doc Section 4).
INTENT_TARGETS: dict[Intent, NodeType] = {
    Intent.I_NCB: NodeType.NCB_RULE,
    Intent.I_RIDERS: NodeType.RIDER,
    Intent.I_WAITING_PERIOD: NodeType.WAITING_PERIOD,
    Intent.I_GRACE_RULES: NodeType.GRACE_RULE,
    Intent.I_SI_CHANGE: NodeType.SI_BAND,
    Intent.I_CONTINUITY: NodeType.BENEFIT,
}


class InMemoryGraphStore:
    def __init__(self) -> None:
        self._nodes: dict[str, GraphNode] = {}
        self._out: dict[str, list[GraphEdge]] = {}

    def add_node(self, node: GraphNode) -> None:
        if node.id in self._nodes:
            raise ValueError(f"duplicate node id: {node.id}")
        self._nodes[node.id] = node
        self._out[node.id] = []

    def add_edge(self, edge: GraphEdge) -> None:
        if edge.source_id not in self._nodes:
            raise KeyError(f"unknown source node: {edge.source_id}")
        if edge.target_id not in self._nodes:
            raise KeyError(f"unknown target node: {edge.target_id}")
        self._out[edge.source_id].append(edge)

    def node(self, node_id: str) -> GraphNode:
        return self._nodes[node_id]

    def paths_to_type(
        self, start_id: str, target: NodeType, max_depth: int = 3
    ) -> list[list[GraphEdge]]:
        """All simple edge-paths from start to any node of the target type."""
        if start_id not in self._nodes:
            return []
        results: list[list[GraphEdge]] = []

        def walk(node_id: str, path: list[GraphEdge], visited: set[str]) -> None:
            if len(path) >= max_depth:
                return
            for edge in self._out[node_id]:
                if edge.target_id in visited:
                    continue
                next_path = [*path, edge]
                if self._nodes[edge.target_id].type is target:
                    results.append(next_path)
                walk(edge.target_id, next_path, visited | {edge.target_id})

        walk(start_id, [], {start_id})
        return results


class StoreGraphQuerier:
    """GraphQuerier implementation over an InMemoryGraphStore."""

    def __init__(self, store: InMemoryGraphStore, product_nodes: dict[str, str]) -> None:
        self._store = store
        self._product_nodes = product_nodes  # product_code -> product node id

    async def traverse(self, intent: Intent, product_code: str) -> list[GraphFact]:
        target = INTENT_TARGETS.get(intent)
        start_id = self._product_nodes.get(product_code)
        if target is None or start_id is None:
            return []
        facts: list[GraphFact] = []
        for path in self._store.paths_to_type(start_id, target):
            path_str = self._store.node(path[0].source_id).name
            for edge in path:
                path_str += f"-{edge.type.value}->{self._store.node(edge.target_id).name}"
            end_node = self._store.node(path[-1].target_id)
            statement = str(end_node.properties.get("statement", end_node.name))
            facts.append(
                GraphFact(path=path_str, statement=statement, provenance=path[-1].provenance)
            )
        return facts
