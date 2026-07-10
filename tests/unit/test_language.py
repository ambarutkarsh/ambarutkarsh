from app.understanding.language import detect_language


def test_english_is_supported():
    result = detect_language("Why did my premium go up this year?")
    assert result.detected == "en"
    assert result.supported


def test_empty_and_numeric_pass_as_english():
    assert detect_language("").supported
    assert detect_language("12345 !!").supported


def test_hindi_devanagari_is_unsupported():
    result = detect_language("मेरा प्रीमियम क्यों बढ़ गया?")
    assert result.detected == "hi"
    assert not result.supported


def test_tamil_is_unsupported():
    result = detect_language("என் பிரீமியம் ஏன் அதிகரித்தது?")
    assert result.detected == "ta"
    assert not result.supported


def test_mixed_mostly_english_is_supported():
    result = detect_language("My premium बढ़ गया this year but I want to renew online")
    assert result.supported


def test_unknown_non_latin_script_is_unsupported():
    result = detect_language("为什么我的保费上涨了这么多啊")
    assert not result.supported
    assert result.detected == "und"
