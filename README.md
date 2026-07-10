# RenewAssist

An on-premise, IRDAI-compliant, English-only health insurance **renewal support chatbot** for the
authenticated post-login customer journey.

Knowledge architecture is **hybrid**:

| Layer | Mechanism | Responsibility |
|---|---|---|
| Facts / policy terms | RAG (BM25 + BGE-M3 + reranker over Qdrant) | Ground every factual claim in a citable chunk |
| Relational reasoning | Knowledge graph (Neo4j, GraphRAG) | Multi-hop eligibility / retention logic with clause provenance |
| Customer's own policy | Scoped long-context | Full individual policy doc loaded after auth |
| Tone + intent | LoRA adapter (vLLM-served) | Empathetic de-escalation and intent/slot accuracy. Never facts. |

Every answer passes a Generate-Validate-Check-Refine loop: atomic claim extraction, claim-level
NLI entailment against the grounding set (threshold 0.95), and a deterministic constraint checker
that hard-blocks portability/competitor advice, premium guarantees, and medical advice.
Human handoff sits behind a provider-agnostic `HandoffProvider` interface with a Salesforce
adapter; no CRM SDK is imported by the pipeline.

## Repository layout

See the build document (Section 19). Highlights:

- `app/orchestrator/` - LangGraph-style pipeline and dialogue state
- `app/handoff/` - `HandoffProvider` protocol, Salesforce adapter, Null adapter
- `app/validation/` - claim extraction, faithfulness scoring, constraint checker
- `app/guardrails/` - input scanning and PII masking
- `app/resilience/` - circuit breakers and the degradation ladder
- `ingestion/` - parsing/chunking for the RAG index and graph build
- `eval/golden/`, `eval/adversarial/` - evaluation datasets (golden set is an owned deliverable)
- `tests/` - unit, retrieval, graph, validation, guardrails, handoff, e2e

## Getting started

```bash
uv sync        # install pinned deps (Python 3.11)
make check     # ruff + mypy + pytest
make up        # docker compose skeleton (data tier; GPU services are profile-gated)
```

## Build phases

Phased plan and acceptance gates are tracked in `PROGRESS.md`. Working agreement for
AI-assisted development is in `CLAUDE.md`. Compliance sign-off (Section 18 of the build
doc) is a hard blocker before production.
