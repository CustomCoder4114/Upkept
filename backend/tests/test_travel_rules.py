from datetime import date

from app.services.travel_rules import (TravelDoc, Traveller, add_months, check_trip, load_validity_rules,
                                       months_between)

JUNE_START, JUNE_END = date(2027, 6, 14), date(2027, 6, 28)


def amina(passport_ends=date(2027, 10, 15), visa=None):
    docs = [TravelDoc("passport", passport_ends)]
    if visa:
        docs.append(TravelDoc("visa", visa[1], visa[0]))
    return Traveller("Amina", "KE", docs)


def test_london_october_passport_is_fine(content_dir):
    """The design showed 'Not ready' here. The UK only needs validity for the stay."""
    rules, default = load_validity_rules(content_dir)
    result = check_trip("GB", JUNE_START, JUNE_END, [amina(visa=("GB", date(2027, 12, 1)))], rules, default)
    assert result.status == "ready"
    assert not [i for i in result.issues if i.severity == "blocker"]
    assert result.ready_travellers == ["Amina"]


def test_london_without_visa_is_a_check_not_a_blocker(content_dir):
    rules, default = load_validity_rules(content_dir)
    result = check_trip("GB", JUNE_START, JUNE_END, [amina()], rules, default)
    assert result.status == "check"
    assert [i.code for i in result.issues if i.severity != "tip"] == ["visa_missing"]
    assert result.issues[0].fix_by == date(2027, 5, 15)  # matches "apply by 15 May"


def test_six_month_country_flags_october_passport(content_dir):
    rules, default = load_validity_rules(content_dir)
    result = check_trip("TH", JUNE_START, JUNE_END, [amina(visa=("TH", date(2027, 12, 1)))], rules, default)
    assert result.status == "not_ready"
    issue = next(i for i in result.issues if i.code == "passport_validity")
    assert issue.message == "Passport: only 4 months left on arrival"
    assert issue.fix_by == date(2027, 4, 30)


def test_passport_expiring_during_trip_is_always_blocked(content_dir):
    rules, default = load_validity_rules(content_dir)
    result = check_trip("GB", JUNE_START, JUNE_END, [amina(passport_ends=date(2027, 6, 20))], rules, default)
    assert any(i.message == "Passport: expires during the trip" for i in result.issues)


def test_unknown_country_never_guesses_not_ready(content_dir):
    rules, default = load_validity_rules(content_dir)
    result = check_trip("ZZ", JUNE_START, JUNE_END, [amina(visa=("ZZ", date(2027, 12, 1)))], rules, default)
    assert result.status == "check"
    assert any(i.code == "passport_rule_unknown" for i in result.issues)


def test_missing_passport_blocks(content_dir):
    rules, default = load_validity_rules(content_dir)
    result = check_trip("GB", JUNE_START, JUNE_END, [Traveller("Zawadi", "KE", [])], rules, default)
    assert result.status == "not_ready"


def test_citizens_need_no_visa_for_home(content_dir):
    rules, default = load_validity_rules(content_dir)
    result = check_trip("KE", JUNE_START, JUNE_END, [amina()], rules, default)
    assert not any(i.code.startswith("visa") for i in result.issues)


def test_month_helpers():
    assert add_months(date(2027, 1, 31), 1) == date(2027, 2, 28)
    assert add_months(date(2027, 6, 14), 6) == date(2027, 12, 14)
    assert months_between(date(2027, 6, 14), date(2027, 10, 15)) == 4
    assert months_between(date(2027, 6, 14), date(2027, 10, 13)) == 3
