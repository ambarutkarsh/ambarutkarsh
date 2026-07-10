from app.understanding.sentiment import KeywordFrustrationDetector

detector = KeywordFrustrationDetector()


def test_calm_message():
    result = detector.detect("What is my renewal premium?")
    assert result.label == "calm"
    assert not result.high


def test_irate_message_is_high():
    result = detector.detect("This is USELESS! Absolutely pathetic service!!!")
    assert result.label == "irate"
    assert result.high


def test_frustrated_message():
    result = detector.detect("I am really disappointed, this is the third time")
    assert result.label in ("frustrated", "irate")
