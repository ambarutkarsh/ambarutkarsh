import json
from pathlib import Path

from app.guardrails.input_scan import HeuristicInputScanner

scanner = HeuristicInputScanner()
ADVERSARIAL = Path(__file__).resolve().parents[2] / "eval" / "adversarial"


def test_normal_renewal_questions_pass():
    for message in (
        "Why did my premium go up?",
        "When is my renewal due?",
        "Can I pay in EMI instead?",
        "My payment failed, please help.",
    ):
        assert not scanner.scan(message).blocked, message


def test_all_injection_seeds_are_blocked():
    path = ADVERSARIAL / "injection.jsonl"
    seeds = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
    assert seeds
    for seed in seeds:
        result = scanner.scan(seed["message"])
        assert result.blocked, f"not blocked: {seed['message']}"
        assert "prompt_injection" in result.reasons


def test_secret_material_is_blocked():
    result = scanner.scan("api_key = sk-live-abcdef123456789")
    assert result.blocked
    assert "secret_material" in result.reasons
