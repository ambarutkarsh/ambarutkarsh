"""Approved reply templates.

Regulated wording lives here, in one reviewable place, and nowhere else.
The constraint checker exempts these exact templates from its forbidden-pattern
scan (the portability deflection legitimately mentions "another insurer"), so
any edit to this file is a compliance-reviewable change (build doc Section 18).
"""

ENGLISH_ONLY_NOTICE = (
    "I'm sorry, I can currently assist in English only. "
    "If you'd prefer to continue in another language, I can connect you to one of "
    "our customer care colleagues right away. Would you like me to arrange that?"
)

PORTABILITY_DEFLECTION = (
    "I can help you with your renewal with us; I'm not able to advise on moving to "
    "another insurer. If you'd like, I can connect you to a customer care colleague, "
    "or help you review your current policy's renewal options."
)

OUT_OF_SCOPE_REDIRECT = (
    "I'm your renewal assistant, so that's outside what I can help with. "
    "I can help with your premium, due date, grace period, no-claim bonus, riders, "
    "EMI options, or payments. Is there anything about your renewal I can help with?"
)

LOW_GROUNDING_REFUSAL = (
    "I want to be accurate about your policy, and I don't have a reliable source for "
    "that answer right now. Let me connect you to a colleague who can confirm the "
    "details for you."
)

INJECTION_REFUSAL = (
    "I can't help with that request. I can help with your policy renewal: premium, "
    "due date, grace period, bonuses, riders, or payments."
)

ESCALATION_ACK = (
    "I understand, and I'm sorry about the trouble. I'm connecting you to one of our "
    "customer care colleagues who can take this forward for you."
)

HANDOFF_QUEUED_NOTICE = (
    "Our team is temporarily hard to reach, so I've logged your request with priority. "
    "A colleague will contact you as soon as possible with the reference number shown."
)

APPROVED_TEMPLATES: frozenset[str] = frozenset(
    {
        ENGLISH_ONLY_NOTICE,
        PORTABILITY_DEFLECTION,
        OUT_OF_SCOPE_REDIRECT,
        LOW_GROUNDING_REFUSAL,
        INJECTION_REFUSAL,
        ESCALATION_ACK,
        HANDOFF_QUEUED_NOTICE,
    }
)
