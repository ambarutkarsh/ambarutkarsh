# RenewAssist Chat Widget

Phase 5 deliverable (build doc Section 6): a self-contained widget (Web Component or a
small React bundle) mounted inside the post-login portal shell. It inherits the portal's
auth session, forwards the signed policy-context token on every request, and never holds
business logic.

Required elements: streamed messages, a persistent "Talk to a human" button, quick-reply
chips, citation affordances, a payment deep-link card, escalation cards, degraded-mode
banner, session-expired re-auth prompt. Accessibility target: WCAG 2.1 AA. No PII in
browser storage. Never render model output that has not passed the backend guardrail pass.

`dev.html` is a developer smoke-page for the REST `/chat` endpoint (run the orchestrator,
then open it via any static server). It is not the production widget.
