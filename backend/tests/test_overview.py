from datetime import date

from app.services.overview import (MoneyItem, PersonItem, family_attention, person_status, spend_group,
                                   upcoming_charges, yearly_by_group)

TODAY = date(2026, 11, 25)


def money(id_, title, amount, rec, ends, renews=True, decision=None, group="other"):
    return MoneyItem(id_, title, amount, "KES", rec, ends, renews, decision, group)


ITEMS = [
    money("1", "Video streaming", 1100_00, "monthly", date(2026, 11, 27), decision="cancel", group="entertainment"),
    money("2", "Music app", 299_00, "monthly", date(2026, 12, 7), group="entertainment"),
    money("3", "Home internet", 2999_00, "monthly", date(2026, 12, 18), group="internet_phone"),
    money("4", "Gym", 2500_00, "monthly", date(2026, 12, 24), decision="review", group="fitness"),
    money("5", "Car insurance", 42000_00, "yearly", date(2027, 3, 3), renews=False, group="insurance"),
]


def test_next_30_days_matches_the_design():
    charges = upcoming_charges(ITEMS, TODAY)
    assert [c["title"] for c in charges] == ["Video streaming", "Music app", "Home internet", "Gym"]
    assert sum(c["amount_minor"] for c in charges) == 6898_00
    assert charges[0]["plan_decision"] == "cancel"


def test_policy_renewal_shows_when_it_falls_in_the_window():
    charges = upcoming_charges(ITEMS, date(2027, 2, 20))
    renewal = [c for c in charges if c["type"] == "renewal"]
    assert renewal and renewal[0]["title"] == "Car insurance" and renewal[0]["on"] == "2027-03-03"


def test_where_it_goes_per_year():
    groups = yearly_by_group(ITEMS)["KES"]
    assert list(groups) == ["insurance", "internet_phone", "fitness", "entertainment"]
    assert groups["insurance"] == 42000_00
    assert groups["internet_phone"] == 2999_00 * 12
    assert groups["entertainment"] == (1100_00 + 299_00) * 12


def test_spend_group_guess():
    assert spend_group(None, "insurance", "car_insurance") == "insurance"
    assert spend_group(None, "digital", "subscription") == "entertainment"
    assert spend_group("rent", "money", "subscription") == "rent"
    assert spend_group("nonsense", "money", "subscription") == "other"


MUM = [
    PersonItem("a", "Blood pressure tablets", 4, "red", True),
    PersonItem("b", "Medical cover", 19, "amber", False),
    PersonItem("c", "National ID", 900, "green", False),
    PersonItem("d", "Milk", 10, "green", True),
]
ZAWADI = [PersonItem("e", "School fees", 41, "green", False), PersonItem("f", "Passport", 700, "green", False)]
ME = [PersonItem("g", "Driving licence", 23, "amber", False), PersonItem("h", "Video streaming", 2, "charge", False),
      PersonItem("i", "Yoghurt", 20, "amber", True)]  # a far-off Home item doesn't need attention


def test_person_cards():
    mum = person_status(MUM)
    assert (mum["label"], mum["tone"], mum["item_count"]) == ("1 urgent", "red", 4)
    assert mum["next"]["title"] == "Blood pressure tablets"
    z = person_status(ZAWADI)
    assert (z["label"], z["tone"]) == ("All good", "green")
    assert z["next"]["title"] == "School fees"
    me = person_status(ME)
    assert me["label"] == "2 soon"
    assert person_status([])["next"] is None


def test_family_attention_most_urgent_first():
    rows = family_attention([("You", ME), ("Zawadi", ZAWADI), ("Mum", MUM)])
    assert [(r["person"], r["title"]) for r in rows] == [
        ("You", "Video streaming"), ("Mum", "Blood pressure tablets"), ("Mum", "Medical cover"), ("You", "Driving licence")]
