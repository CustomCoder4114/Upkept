from datetime import date, datetime, timezone

from app.services.reminder_rules import (next_escalation, planned_reminder_dates, send_time_utc, timeline_bucket,
                                         urgency)

TODAY = date(2026, 11, 21)


def test_amina_car_insurance_matches_the_design():
    # Ends 3 March 2027 -> reminders 1 Feb, 24 Feb, 2 Mar (30, 7, 1 days before)
    dates = planned_reminder_dates("car_insurance", date(2027, 3, 3), TODAY)
    assert dates == [(date(2027, 2, 1), 30), (date(2027, 2, 24), 7), (date(2027, 3, 2), 1)]


def test_passport_gets_six_month_warning():
    dates = [d for d, _ in planned_reminder_dates("passport", date(2027, 10, 15), TODAY)]
    assert dates[0] == date(2027, 4, 18)  # 180 days before
    assert len(dates) == 4


def test_past_reminder_dates_are_skipped():
    # Added with 10 days left: only the 7- and 1-day reminders remain
    dates = planned_reminder_dates("car_insurance", date(2026, 12, 1), TODAY)
    assert [b for _, b in dates] == [7, 1]


def test_late_added_item_still_gets_one_reminder_today():
    dates = planned_reminder_dates("subscription", date(2026, 11, 22), TODAY)  # 1 day left, rule is 3 days
    assert dates == [(TODAY, 1)]


def test_expired_item_gets_no_planned_reminders():
    assert planned_reminder_dates("passport", date(2026, 1, 1), TODAY) == []


def test_send_time_is_9am_local():
    # 9:00 in Nairobi (UTC+3) is 06:00 UTC
    assert send_time_utc(date(2027, 2, 1), "Africa/Nairobi") == datetime(2027, 2, 1, 6, 0, tzinfo=timezone.utc)


def test_bad_timezone_falls_back_to_utc():
    assert send_time_utc(date(2027, 2, 1), "Not/AZone").hour == 9


def test_urgency_matches_the_timeline_design():
    assert urgency("car_insurance", 102) == "green"
    assert urgency("warranty", 41) == "amber"      # laptop warranty
    assert urgency("passport", 180) == "amber"     # passport at 6 months
    assert urgency("subscription", 3) == "charge"  # gym: a planned charge, never red
    assert urgency("car_insurance", 5) == "red"
    assert urgency("passport", -1) == "expired"
    assert urgency("passport", None) == "none"


def test_timeline_buckets_match_the_design():
    assert timeline_bucket("subscription", 3) == "needs_you"
    assert timeline_bucket("warranty", 41) == "needs_you"
    assert timeline_bucket("car_insurance", 102) == "coming_up"
    assert timeline_bucket("passport", 180) == "coming_up"
    assert timeline_bucket("passport", 400) == "later"
    assert timeline_bucket("passport", -3) == "needs_you"
    assert timeline_bucket("other", None) == "undated"


def test_escalation_gets_sooner_and_stops():
    ends = date(2026, 12, 21)  # 30 days left
    assert next_escalation(ends, TODAY, 0) == date(2026, 11, 28)  # 7-day cap
    assert next_escalation(date(2026, 11, 29), TODAY, 0) == date(2026, 11, 23)  # 8 left -> every 2 days
    assert next_escalation(date(2026, 11, 22), TODAY, 0) == date(2026, 11, 22)  # 1 left -> daily
    assert next_escalation(date(2026, 11, 1), TODAY, 0) == date(2026, 11, 28)  # expired -> weekly
    assert next_escalation(ends, TODAY, 5) is None
