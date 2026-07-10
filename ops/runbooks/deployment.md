# Deployment Runbook (skeleton, finalized in Phase 7)

From build doc Section 22.

## Topology
- **GPU node:** 1x H100 80GB for Qwen3-32B-FP8 (base + LoRA adapter). Optional second
  node (2x H100 or 1x H200 141GB) for the Llama-3.3-70B fallback. Reranker, NLI, and
  embeddings share an L40S-class GPU.
- **Datastores:** Qdrant, Neo4j, Redis, Postgres as separate containers; Qdrant and
  Neo4j need persistent volumes.

## Model serving
Pull Qwen3-32B-FP8 to persistent storage; FP8 requires Hopper/Ada. Verify the pinned
vLLM version loads it (Facts to Verify), then:

```
vllm serve Qwen/Qwen3-32B-FP8 --gpu-memory-utilization 0.9 --max-model-len 32768 \
  --enable-lora --lora-modules renewassist-tone-intent=/models/adapters/renewassist
```

Tune `--max-model-len` and concurrency against the Section 15 capacity model
(KV cache bounds concurrency, not compute).

## Health and readiness
vLLM `/health`, Qdrant readiness, Neo4j bolt, orchestrator `/healthz`; readiness gates
traffic. Circuit breakers and the degradation ladder are in `app/resilience/`.

## Network policy
Outbound allowlist: only the Salesforce handoff adapter may reach Salesforce; internal
policy APIs allowlisted; no other egress from the model tier.

## Rollback
Versioned images, model directories, adapter versions, and KB versions; keep previous
tags; blue-green swap at nginx. KB promotions follow the Section 17 governance loop.

## Go-live blocker
Section 18 compliance sign-off must be recorded before production traffic.
