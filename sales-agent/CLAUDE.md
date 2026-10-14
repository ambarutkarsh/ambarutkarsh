# Closer: guide for Claude Code

This folder is Ambar's cold-email agent for two products: RetentionOS (renewal/retention
software for health insurers worldwide) and Class (a 6-month AI Product Management course,
plus Class Pro: all artifacts for 5,000). Ambar wants low effort: do things for them, ask
one question at a time, and keep explanations short.

## When opened
Silently check: does `.venv/` exist, does `.env` exist, and what does `closer check` say?
Then tell Ambar in two or three lines what is ready and what single thing to do next.

## Commands (run inside the venv: `source .venv/bin/activate`)
closer check | status | research <product> [--count N] | find-emails | write | outbox |
approve <id|all --product X> | reject <id> | send | replies | run [--once] | dashboard

## Things Ambar may ask
- "Find more insurers in <country>": run `closer research retentionos --count N`. For a one-off
  focus, you can also research with your own web tools and write a CSV, then `closer import`.
- "Show me what's waiting": `closer outbox`, or suggest `closer dashboard`.
- "Change the pitch / offer / countries": edit `products/<product>/product.yaml` or `knowledge.md`.
- "Make the emails shorter / different": edit `playbook/writing_rules.md`.
- "Add another product": copy a `products/` folder and fill it in with Ambar.

## Rules
- Never put secrets in chat or commit `.env`. Ambar edits `.env` themselves.
- Never invent customers, results or testimonials in knowledge files.
- Never turn off `require_approval` or raise daily limits without Ambar asking.
- Run `pytest` after changing anything in `closer/`.
