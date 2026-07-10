"""Retention decision table (build doc Section 12).

Maps a detected churn reason to the offers the bot is PERMITTED to surface.
Anything not in this table is forbidden; the constraint checker enforces that
proposed offers are a subset of the permitted set. Eligibility for a permitted
offer is still resolved per-customer through the knowledge graph, so the bot
never offers something the actual product does not allow.
"""

from enum import StrEnum

from app.understanding.intents import Intent


class Offer(StrEnum):
    EMI_CONVERSION = "EMI_CONVERSION"
    SI_RIGHT_SIZING = "SI_RIGHT_SIZING"
    REMOVE_OPTIONAL_RIDERS = "REMOVE_OPTIONAL_RIDERS"
    ADD_RIDERS = "ADD_RIDERS"
    SECTION_80D_FRAMING = "SECTION_80D_FRAMING"
    LOYALTY_DISCOUNT = "LOYALTY_DISCOUNT"
    EXPLAIN_PORTFOLIO_LOADING = "EXPLAIN_PORTFOLIO_LOADING"
    GRIEVANCE_REDRESSAL = "GRIEVANCE_REDRESSAL"
    OMBUDSMAN_ROUTE = "OMBUDSMAN_ROUTE"
    HUMAN_CALLBACK = "HUMAN_CALLBACK"
    CONTINUITY_BENEFITS = "CONTINUITY_BENEFITS"
    DEDICATED_SUPPORT = "DEDICATED_SUPPORT"
    SI_CHANGE = "SI_CHANGE"
    EXPLAIN_EXISTING_BENEFITS = "EXPLAIN_EXISTING_BENEFITS"
    GRACE_REMINDER = "GRACE_REMINDER"


PERMITTED_OFFERS: dict[Intent, frozenset[Offer]] = {
    Intent.I_OBJ_PREMIUM: frozenset(
        {
            Offer.EMI_CONVERSION,
            Offer.SI_RIGHT_SIZING,
            Offer.REMOVE_OPTIONAL_RIDERS,
            Offer.SECTION_80D_FRAMING,
            Offer.LOYALTY_DISCOUNT,
            Offer.EXPLAIN_PORTFOLIO_LOADING,
        }
    ),
    Intent.I_OBJ_CLAIM: frozenset(
        {
            Offer.GRIEVANCE_REDRESSAL,
            Offer.OMBUDSMAN_ROUTE,
            Offer.HUMAN_CALLBACK,
            Offer.CONTINUITY_BENEFITS,
        }
    ),
    Intent.I_OBJ_SERVICE: frozenset(
        {Offer.HUMAN_CALLBACK, Offer.DEDICATED_SUPPORT, Offer.GRIEVANCE_REDRESSAL}
    ),
    Intent.I_OBJ_COVERAGE: frozenset(
        {
            Offer.ADD_RIDERS,
            Offer.REMOVE_OPTIONAL_RIDERS,
            Offer.SI_CHANGE,
            Offer.EXPLAIN_EXISTING_BENEFITS,
        }
    ),
    Intent.I_CHURN_INTENT: frozenset(
        {
            Offer.CONTINUITY_BENEFITS,
            Offer.GRACE_REMINDER,
            Offer.SECTION_80D_FRAMING,
            Offer.EMI_CONVERSION,
            Offer.HUMAN_CALLBACK,
        }
    ),
}


def permitted_offers_for(intent: Intent) -> frozenset[Offer]:
    return PERMITTED_OFFERS.get(intent, frozenset())
