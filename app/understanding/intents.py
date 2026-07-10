"""Intent catalog: the top 25 intents (build doc Section 2)."""

from enum import StrEnum


class Intent(StrEnum):
    # Renewal support
    I_PREMIUM_QUERY = "I_PREMIUM_QUERY"
    I_DUE_DATE = "I_DUE_DATE"
    I_GRACE_RULES = "I_GRACE_RULES"
    I_NCB = "I_NCB"
    I_SI_CHANGE = "I_SI_CHANGE"
    I_RIDERS = "I_RIDERS"
    I_EMI = "I_EMI"
    I_PAYMENT_FAIL = "I_PAYMENT_FAIL"
    I_GST = "I_GST"
    I_RENEWAL_NOTICE = "I_RENEWAL_NOTICE"
    I_POLICY_DOCS = "I_POLICY_DOCS"
    I_WAITING_PERIOD = "I_WAITING_PERIOD"
    I_TAX_80D = "I_TAX_80D"
    I_CONTINUITY = "I_CONTINUITY"
    I_PAYMENT_HOWTO = "I_PAYMENT_HOWTO"
    I_COVERAGE_EXPLAIN = "I_COVERAGE_EXPLAIN"
    I_UPDATE_DETAILS = "I_UPDATE_DETAILS"
    # Retention
    I_OBJ_PREMIUM = "I_OBJ_PREMIUM"
    I_OBJ_CLAIM = "I_OBJ_CLAIM"
    I_OBJ_SERVICE = "I_OBJ_SERVICE"
    I_OBJ_COVERAGE = "I_OBJ_COVERAGE"
    I_CHURN_INTENT = "I_CHURN_INTENT"
    # Handling
    I_OOS = "I_OOS"
    I_ESCALATE = "I_ESCALATE"
    I_PORTABILITY_BAIT = "I_PORTABILITY_BAIT"


RETENTION_INTENTS: frozenset[Intent] = frozenset(
    {
        Intent.I_OBJ_PREMIUM,
        Intent.I_OBJ_CLAIM,
        Intent.I_OBJ_SERVICE,
        Intent.I_OBJ_COVERAGE,
        Intent.I_CHURN_INTENT,
    }
)

# Intents whose answers depend on relationships scattered across clauses; these
# route through the knowledge graph in addition to RAG (build doc Section 4).
RELATIONAL_INTENTS: frozenset[Intent] = frozenset(
    {
        Intent.I_NCB,
        Intent.I_SI_CHANGE,
        Intent.I_RIDERS,
        Intent.I_WAITING_PERIOD,
        Intent.I_CONTINUITY,
        Intent.I_GRACE_RULES,
    }
)

OUT_OF_SCOPE_INTENTS: frozenset[Intent] = frozenset({Intent.I_OOS})
