from datetime import date

from app.services.ai_reader import find_dates, read_document, read_with_rules, redact, unredact

TODAY = date(2026, 11, 21)

JUBILEE = """JUBILEE INSURANCE COMPANY OF KENYA LIMITED
CERTIFICATE OF INSURANCE - MOTOR PRIVATE (COMPREHENSIVE)
Policy No: 4471-208-55
Vehicle Reg: KDA 123X
Period of cover from: 3 March 2026
Expiry date: 3 March 2027
Annual premium: KES 42,000.00
"""


def test_reads_aminas_certificate():
    r = read_document(JUBILEE, today=TODAY)
    assert r.kind.value == "car_insurance"
    assert r.category.value == "insurance"
    assert r.number.value == "4471-208-55"
    assert r.starts_on.value == "2026-03-03"
    assert r.ends_on.value == "2027-03-03" and r.ends_on.confidence >= 0.8
    assert r.amount.value == "42000.00" and r.currency.value == "KES"
    assert "JUBILEE" in (r.issuer.value or "")
    assert r.is_confident()
    assert r.warnings == []


def test_confident_rules_result_never_calls_ai():
    # provider=anthropic but no network: if this tried the API it would fail
    r = read_document(JUBILEE, today=TODAY, provider="anthropic", api_key="sk-test")
    assert r.provider == "rules"


def test_redaction_hides_numbers_but_keeps_dates():
    text = "Passport No: AK1234567 valid until 2027-10-15, policy 4471-208-55, amount 420"
    red, mapping = redact(text)
    assert "AK1234567" not in red and "4471-208-55" not in red
    assert "2027-10-15" in red and "420" in red
    assert unredact("[NUM1]", mapping) == "AK1234567"


def test_date_formats():
    found = [d for _, d in find_dates("Issued 03/02/2026. Expires March 3, 2027. Renew by 2027-02-01")]
    assert date(2026, 2, 3) in found  # day-first by default
    assert date(2027, 3, 3) in found
    assert date(2027, 2, 1) in found
    us = [d for _, d in find_dates("03/02/2026", month_first=True)]
    assert us == [date(2026, 3, 2)]


def test_end_before_start_is_flagged():
    r = read_document("Warranty\nPurchase date: 10 Jan 2027\nValid until: 10 Jan 2026", today=TODAY)
    assert any("before the start" in w for w in r.warnings)
    assert r.ends_on.confidence < 0.7


def test_missing_end_date_is_flagged():
    r = read_document("Some receipt with no dates KES 500", today=TODAY)
    assert r.ends_on.value is None
    assert any("end date" in w for w in r.warnings)


def test_unlabelled_dates_get_low_confidence():
    r = read_with_rules("Netflix subscription\n12 Jan 2026\n12 Feb 2026")
    assert r.kind.value == "subscription"
    assert r.ends_on.value == "2026-02-12"
    assert r.ends_on.confidence < 0.7
