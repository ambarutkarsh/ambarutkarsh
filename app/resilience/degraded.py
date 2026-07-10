"""Degradation ladder (build doc Section 14). The chat fails safe, never blank.

Given a health snapshot of the critical components, select the serving mode:

- LLM down, retrieval up  -> RETRIEVAL_ONLY (extractive grounded answers + handoff offer)
- retrieval down          -> STATIC_FAQ (nothing can be grounded; curated FAQ + handoff)
- NLI down                -> EXTRACTIVE_ONLY (never emit unverified generated claims)
- graph down              -> RAG_ONLY_NO_GRAPH (relational intents get lowered confidence
                             ceiling; multi-hop questions refuse + handoff)
- handoff provider down   -> queue_handoffs=True (durable Postgres queue, never drop)

Any degradation surfaces a service-degraded banner in the UI and emits a
degraded_mode analytics event.
"""

from dataclasses import dataclass
from enum import StrEnum


class Mode(StrEnum):
    FULL = "FULL"
    RETRIEVAL_ONLY = "RETRIEVAL_ONLY"
    EXTRACTIVE_ONLY = "EXTRACTIVE_ONLY"
    RAG_ONLY_NO_GRAPH = "RAG_ONLY_NO_GRAPH"
    STATIC_FAQ = "STATIC_FAQ"


@dataclass(frozen=True)
class HealthSnapshot:
    llm: bool = True
    retrieval: bool = True
    graph: bool = True
    nli: bool = True
    handoff: bool = True


@dataclass(frozen=True)
class DegradedDecision:
    mode: Mode
    queue_handoffs: bool
    show_banner: bool


def select_mode(health: HealthSnapshot) -> DegradedDecision:
    if not health.retrieval:
        mode = Mode.STATIC_FAQ
    elif not health.llm:
        mode = Mode.RETRIEVAL_ONLY
    elif not health.nli:
        mode = Mode.EXTRACTIVE_ONLY
    elif not health.graph:
        mode = Mode.RAG_ONLY_NO_GRAPH
    else:
        mode = Mode.FULL

    queue_handoffs = not health.handoff
    show_banner = mode is not Mode.FULL or queue_handoffs
    return DegradedDecision(mode=mode, queue_handoffs=queue_handoffs, show_banner=show_banner)
