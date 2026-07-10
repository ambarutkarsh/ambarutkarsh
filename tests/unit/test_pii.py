from app.guardrails.pii import contains_pii, mask_pii


def test_masks_email():
    assert mask_pii("reach me at rohan.k@example.com please") == "reach me at [EMAIL] please"


def test_masks_indian_mobile():
    masked = mask_pii("call me on +91 9876543210")
    assert "9876543210" not in masked
    assert "[PHONE]" in masked


def test_masks_pan():
    assert "[PAN]" in mask_pii("my PAN is ABCDE1234F")


def test_masks_aadhaar():
    masked = mask_pii("aadhaar 1234 5678 9012")
    assert "[AADHAAR]" in masked or "[CARD]" in masked
    assert "5678" not in masked


def test_masks_policy_number():
    masked = mask_pii("policy HLT-12345678 is due")
    assert "12345678" not in masked


def test_clean_text_untouched():
    text = "I want to renew my policy before the due date"
    assert mask_pii(text) == text
    assert not contains_pii(text)
