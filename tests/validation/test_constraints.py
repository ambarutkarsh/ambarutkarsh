import json
from pathlib import Path

from app.orchestrator.retention import Offer
from app.orchestrator.templates import PORTABILITY_DEFLECTION
from app.understanding.intents import Intent
from app.validation.constraints import ConstraintChecker

checker = ConstraintChecker()
ADVERSARIAL = Path(__file__).resolve().parents[2] / "eval" / "adversarial"


def test_clean_grounded_answer_passes():
    result = checker.check(
        "Your renewal premium is shown in your renewal notice, per clause 4.2.",
        Intent.I_PREMIUM_QUERY,
    )
    assert result.passed


def test_blocks_portability_advice():
    result = checker.check(
        "You could consider porting your policy to get a better deal elsewhere.",
        Intent.I_OBJ_PREMIUM,
    )
    assert not result.passed
    assert "portability_or_switching" in result.failures


def test_blocks_competitor_mentions():
    result = checker.check(
        "Star Health has a similar plan you may like.", Intent.I_COVERAGE_EXPLAIN
    )
    assert not result.passed
    assert any(f.startswith("competitor_mention") for f in result.failures)


def test_blocks_premium_guarantee():
    result = checker.check(
        "Renew today and your premium will never increase.", Intent.I_OBJ_PREMIUM
    )
    assert not result.passed
    assert "premium_guarantee" in result.failures


def test_blocks_medical_advice():
    result = checker.check(
        "You should stop taking that medication before the checkup.",
        Intent.I_COVERAGE_EXPLAIN,
    )
    assert not result.passed
    assert "medical_advice" in result.failures


def test_approved_deflection_template_is_exempt():
    result = checker.check(PORTABILITY_DEFLECTION, Intent.I_PORTABILITY_BAIT)
    assert result.passed


def test_offers_must_be_in_permitted_table():
    result = checker.check(
        "We can look at EMI options.", Intent.I_OBJ_CLAIM, [Offer.EMI_CONVERSION]
    )
    assert not result.passed
    assert any(f.startswith("offer_not_permitted") for f in result.failures)


def test_permitted_offer_for_reason_passes():
    result = checker.check(
        "We can convert your premium to EMI.", Intent.I_OBJ_PREMIUM, [Offer.EMI_CONVERSION]
    )
    assert result.passed


def test_offers_outside_retention_flow_fail():
    result = checker.check(
        "Here is an offer.", Intent.I_PREMIUM_QUERY, [Offer.EMI_CONVERSION]
    )
    assert not result.passed
    assert "offer_outside_retention_flow" in result.failures


def test_adversarial_leakage_seeds_all_blocked():
    """Every seed in eval/adversarial/leakage_traps.jsonl must be caught."""
    path = ADVERSARIAL / "leakage_traps.jsonl"
    seeds = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
    assert seeds
    for seed in seeds:
        result = checker.check(seed["draft"], Intent(seed["intent"]))
        assert not result.passed, f"leaked: {seed['draft']}"
