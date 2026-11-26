from datetime import date

from app.services.recurring import (CalendarSource, add_period, auto_renews, calendar_entries, cancel_by, charges_between,
                                    monthly_cost_minor, roll_forward)

TODAY = date(2026, 11, 25)


def test_month_ends_keep_their_day():
    assert add_period(date(2027, 1, 31), "monthly") == date(2027, 2, 28)
    assert add_period(date(2027, 2, 28), "monthly", anchor_day=31) == date(2027, 3, 31)
    assert add_period(date(2026, 12, 15), "monthly") == date(2027, 1, 15)
    assert add_period(date(2028, 2, 29), "yearly") == date(2029, 2, 28)


def test_passed_charges_roll_forward():
    # Gym charged on the 24th; on the 25th the next charge is 24 December, not "expired"
    assert roll_forward(date(2026, 11, 24), "monthly", TODAY) == date(2026, 12, 24)
    assert roll_forward(date(2026, 8, 3), "monthly", TODAY) == date(2026, 12, 3)  # months behind
    assert roll_forward(date(2026, 11, 25), "monthly", TODAY) == date(2026, 11, 25)  # today stays
    assert roll_forward(date(2026, 3, 3), "yearly", TODAY) == date(2027, 3, 3)
    assert roll_forward(date(2026, 1, 1), "none", TODAY) == date(2026, 1, 1)  # one-off: untouched


def test_charges_in_a_month():
    dec = charges_between(date(2026, 11, 24), "monthly", date(2026, 12, 1), date(2026, 12, 31))
    assert dec == [date(2026, 12, 24)]
    two_months = charges_between(date(2026, 1, 31), "monthly", date(2027, 1, 1), date(2027, 2, 28))
    assert two_months == [date(2027, 1, 31), date(2027, 2, 28)]


def test_costs_and_cancel_date():
    assert monthly_cost_minor(2500_00, "monthly") == 2500_00
    assert monthly_cost_minor(42000_00, "yearly") == 3500_00
    assert monthly_cost_minor(None, "monthly") == 0
    assert cancel_by(date(2026, 12, 24)) == date(2026, 12, 23)


def test_calendar_month():
    items = [
        CalendarSource("1", "Gym", "subscription", date(2026, 11, 24), "monthly", "charge", renews=True),
        CalendarSource("2", "Laptop warranty", "warranty", date(2027, 1, 1), "none", "amber"),
        CalendarSource("3", "Car insurance", "car_insurance", date(2027, 3, 3), "yearly", "green"),
    ]
    dec = calendar_entries(items, date(2026, 12, 1), date(2026, 12, 31))
    assert list(dec) == ["2026-12-24"]
    assert dec["2026-12-24"][0]["type"] == "charge"
    jan = calendar_entries(items, date(2027, 1, 1), date(2027, 1, 31))
    assert [e["title"] for e in jan["2027-01-01"]] == ["Laptop warranty"]
    assert jan["2027-01-01"][0]["type"] == "ends"


def test_only_self_renewing_things_roll():
    assert auto_renews("subscription", "money", "monthly")
    assert auto_renews("other", "digital", "yearly")
    assert not auto_renews("car_insurance", "insurance", "yearly")  # must be renewed by hand
    assert not auto_renews("subscription", "money", "none")
