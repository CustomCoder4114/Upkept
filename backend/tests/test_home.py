from datetime import date

from app.services.home import SummaryItem, next_refill, summary_text
from app.services.reminder_rules import HOME_ALERT_DAYS, is_home, planned_reminder_dates, urgency

TODAY = date(2026, 11, 25)  # a Wednesday


def test_colours_match_the_home_list_design():
    assert urgency("food", 1) == "red"            # milk, tomorrow
    assert urgency("food", 2) == "amber"          # yoghurt, 2 days
    assert urgency("food", 90) == "green"         # unga, 3 months
    assert urgency("medicine", 12) == "amber"     # paracetamol
    assert urgency("medicine", -3) == "expired"   # cough syrup
    assert urgency("household_item", 9) == "amber"  # gas refill
    assert urgency("household_item", 60) == "green"  # water filter
    assert urgency("household_item", 2) == "red"
    # documents are unchanged
    assert urgency("car_insurance", 5) == "red"
    assert urgency("passport", 180) == "amber"


def test_home_categories():
    assert is_home("kitchen") and is_home("medicines") and is_home("household")
    assert not is_home("insurance")


def test_alert_each_is_on_the_day_for_food():
    dates = planned_reminder_dates("food", date(2026, 11, 26), TODAY, HOME_ALERT_DAYS["food"])
    assert dates == [(date(2026, 11, 26), 0)]


def test_summary_matches_the_design():
    title, body = summary_text([
        SummaryItem("Yoghurt", 2), SummaryItem("Milk", 1), SummaryItem("Cough syrup", -3)], TODAY)
    assert title == "Home: 3 things this week"
    assert body == "Milk tomorrow, yoghurt on Friday. Cough syrup has expired."


def test_summary_limits_and_wording():
    items = [SummaryItem(f"Item{i}", i) for i in range(5)]
    _, body = summary_text(items, TODAY)
    assert body == "Item0 today, item1 tomorrow, item2 on Friday and 2 more."
    _, body = summary_text([SummaryItem("KRA return", 6), SummaryItem("A", -1), SummaryItem("B", -2)], TODAY)
    assert body == "KRA return on Tuesday. 2 things have expired."
    assert summary_text([], TODAY) is None
    assert summary_text([SummaryItem("Milk", 0)], TODAY)[0] == "Home: 1 thing this week"


def test_refill_estimate_learns_from_real_use():
    # first refill with no history: 30-day default
    assert next_refill(None, None, TODAY) == (30, date(2026, 12, 25))
    # no estimate yet, last one lasted 40 days -> 40
    assert next_refill(date(2026, 10, 16), None, TODAY)[0] == 40
    # estimate 30, actually lasted 40 -> moves part of the way: 34
    assert next_refill(date(2026, 10, 16), 30, TODAY)[0] == 34
    # a same-day double tap doesn't wreck the estimate
    assert next_refill(TODAY, 30, TODAY)[0] == 30
