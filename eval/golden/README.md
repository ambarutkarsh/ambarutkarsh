# Golden Dataset (owned deliverable)

Target: **200+ curated Q/A pairs** across all 25 intents, each with source clause(s),
covering every persona and including multi-hop questions that exercise the knowledge graph.

- **Owner:** named product/compliance SME (assign in Phase 1; hard dependency for every
  downstream evaluation gate).
- **Format:** one JSON object per line, schema as in `sample.jsonl`.
- **Review:** every pair is SME-reviewed; regulated figures must match the current IRDAI
  Master Circular (see "Facts to Verify" in the build doc) before the pair is admitted.
- **Diversity:** check coverage via embedding clustering before sign-off.

`sample.jsonl` illustrates the schema only. It is synthetic and NOT part of the golden set.
