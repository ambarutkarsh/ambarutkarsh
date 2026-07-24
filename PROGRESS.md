# RenewAssist Progress Ledger

## Current phase
Phase 1 (ingestion, retrieval, graph, golden set) IN PROGRESS. Phase 0 complete,
tagged `phase-0` (tag exists locally; remote rejects tag pushes with 403, so the
tag must be pushed with owner credentials or created via the GitHub UI).

## Phase 1 done so far
- Okapi BM25 index (`app/retrieval/bm25.py`), pure Python, payload-carrying.
- Dense leg: `Embedder` port + in-memory vector store (`app/retrieval/vectors.py`);
  production swaps in BGE-M3 + Qdrant behind the same contract.
- `HybridRetriever` (`app/retrieval/hybrid.py`) implementing the orchestrator's
  Retriever port: BM25 + dense fused via weighted RRF, product-scope filtering,
  `Reranker` port (identity now, BGE-reranker-v2-m3 later). Item score is the dense
  cosine, calibrated against the pipeline's GROUNDING_SCORE_THRESHOLD, so junk
  queries fall below the refusal line instead of being normalized up.
- Ingestion index builder (`ingestion/index.py`): SourceDoc -> header-aware chunks ->
  BM25 + vectors + metadata catalog (product, clause, version, effective_date).
- In-memory policy graph store + `StoreGraphQuerier` (`app/graph/store.py`):
  cycle-safe multi-hop traversal, intent -> node-type routing, facts carry the
  provenance of the edge that produced them.
- Tests: `tests/retrieval/` (BM25, hybrid mechanics + recall floor on synthetic
  corpus), `tests/graph/` (ontology + store + querier).

## Phase 1 remaining (needs infra/SME, not codeable here)
- Real BGE-M3 embeddings + Qdrant client + BGE reranker behind the existing ports.
- Neo4j-backed store + extraction from real policy wordings with provenance.
- Golden dataset (200+ SME-reviewed pairs) and the formal Recall@10 >= 0.80 /
  hybrid-beats-dense-on-nDCG gates measured against it.

## Done
- Repo tree per build doc Section 19; CLAUDE.md working agreement; Makefile
  (`make test|lint|type|check|eval|up|down`); pinned `pyproject.toml` + committed
  `uv.lock`; GitHub Actions CI (ruff + mypy + pytest); docker-compose skeleton
  (data tier + GPU-profile vLLM service).
- API contracts (Section 9): `app/api/schemas.py`, FastAPI `POST /chat` + `GET /healthz`
  (`app/api/routes.py`). Verified live with uvicorn smoke test.
- Orchestrator pipeline (Section 11) in `app/orchestrator/pipeline.py`: input scan ->
  English gate -> scoped customer doc -> intent + sentiment -> escalation/portability/OOS
  routing -> retrieval (+ graph for relational intents) -> grounding threshold -> grounded
  generation -> claim-level NLI -> deterministic constraint check -> one refine pass ->
  refuse + escalate on failure. All heavy components behind Protocols
  (`app/orchestrator/ports.py`) with deterministic dev implementations (`app/testing/`).
- Handoff (Section 7): `HandoffProvider` Protocol, Null adapter, Salesforce adapter
  (OAuth client-credentials, Case create/status, queue mapping, fail-safe results),
  env-based factory. PII-masked transcript summaries enforced in the pipeline.
- Validation: faithfulness scoring (claim entailment rate, 0.95 threshold) and the
  deterministic constraint checker (portability/competitor/premium-guarantee/medical
  advice blocks + Section 12 permitted-offers table with approved-template exemption).
- Guardrails floor: heuristic injection/secret input scanner; deterministic PII masker.
- Retrieval/graph foundations: weighted RRF fusion; grounding item + citation types;
  graph ontology with type-level mandatory clause provenance.
- Resilience (Section 14): circuit breaker; degradation ladder selector.
- Analytics (Section 16): typed event stream, in-memory emitter, deterministic A/B
  assignment; pipeline emits intent/answer/refusal/handoff/retention events.
- Ingestion: header-aware clause-respecting chunker.
- Eval scaffolding: golden-set README + sample schema (synthetic); adversarial seed sets
  (injection, portability bait, irate, non-English, leakage traps) wired into tests.
- Frontend: dev smoke page (`frontend/dev.html`) + Phase 5 spec README.

## Last passing test run (2026-07-24)
```
$ make check
uv run ruff check .   -> All checks passed!
uv run mypy           -> Success: no issues found in 50 source files
uv run pytest -q      -> 95 passed, 1 warning in 0.52s
```

## In progress
- Phase 1 offline slices landed (see above); infra-bound work listed as remaining.

## Blocked / decisions needed
- Golden dataset SME owner must be named before Phase 1 gates can be met.
- "Facts to Verify" (build doc): IRDAI circular figures, vLLM/Qwen3 versions, senior
  premium cap, 80D limits. None of these are encoded as facts anywhere in the code;
  fixtures are placeholder-only by design.

## Next action
Phase 1: real ingestion (parse -> chunk -> BGE-M3 embed -> Qdrant upsert + BM25 index),
Neo4j extraction with provenance, hybrid retriever behind the existing `Retriever` port,
and the golden dataset build. Gate: Recall@10 >= 0.80; hybrid+rerank beats dense-only;
100% graph provenance; 200+ reviewed golden pairs. Test: `pytest tests/retrieval tests/graph`.

## Phase gate history
- `phase-0` (2026-07-10): scaffolding + deterministic pipeline slices; 77 tests green.
