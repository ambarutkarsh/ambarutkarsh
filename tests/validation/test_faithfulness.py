from app.validation.faithfulness import (
    Verdict,
    faithfulness_score,
    is_grounded,
    split_into_claims,
)


def test_all_entailed_scores_one():
    assert faithfulness_score([Verdict.ENTAILED, Verdict.ENTAILED]) == 1.0


def test_score_is_entailment_rate():
    verdicts = [Verdict.ENTAILED, Verdict.ENTAILED, Verdict.ENTAILED, Verdict.NEUTRAL]
    assert faithfulness_score(verdicts) == 0.75


def test_no_claims_is_vacuously_faithful():
    assert faithfulness_score([]) == 1.0


def test_grounded_threshold_is_095():
    assert is_grounded(0.95)
    assert not is_grounded(0.9499)


def test_split_into_claims_drops_non_claims():
    text = "Certainly! Your grace period protects continuity benefits. Thanks."
    claims = split_into_claims(text)
    assert claims == ["Your grace period protects continuity benefits."]
