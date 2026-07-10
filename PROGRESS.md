# RenewAssist Progress Ledger

## Current phase
Phase 0 (scaffolding) COMPLETE, tagged `phase-0`. Several deterministic vertical slices
of later phases are already in place behind ports (see below). Next phase: Phase 1.

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

## Last passing test run (2026-07-10)
```
$ make check
uv run ruff check .   -> All checks passed!
uv run mypy           -> Success: no issues found in 45 source files
uv run pytest -q      -> 77 passed, 1 warning in 1.08s
```

## In progress
- Nothing mid-flight; working tree clean at the phase boundary.

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
