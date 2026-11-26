"""When to remind, how urgent an item is, and where it sits on the timeline.

Pure functions only (no database), so they are easy to test and to reuse in the worker.
"""
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

# Days before the end date when a reminder goes out, per item kind.
REMINDER_DAYS: dict[str, tuple[int, ...]] = {
    "passport": (180, 90, 30, 7),
    "visa": (90, 30, 7),
    "work_permit": (120, 60, 30, 7),
    "national_id": (90, 30, 7),
    "driving_licence": (60, 30, 7),
    "car_insurance": (30, 7, 1),
    "home_insurance": (30, 7, 1),
    "health_insurance": (30, 7, 1),
    "life_insurance": (30, 7, 1),
    "vehicle_inspection": (30, 7, 1),
    "lease": (90, 60, 30),
    "warranty": (60, 30, 7),
    "return_window": (2,),
    "subscription": (3,),
    "prescription": (7, 2),
    "vaccination": (30, 7),
    "domain": (60, 30, 7),
    "professional_licence": (90, 30, 7),
    "school_fees": (30, 7),
    # Home list (food, medicines, household). These normally go in the morning
    # summary; the numbers set the amber window (the largest) for colours.
    "food": (3, 0),
    "medicine": (30, 7),
    "household_item": (14, 3),
}
DEFAULT_DAYS: tuple[int, ...] = (30, 7, 1)

# Home list: the categories, their item kinds, and when an item turns red.
HOME_CATEGORIES = frozenset({"kitchen", "medicines", "household"})
HOME_KIND_FOR_CATEGORY = {"kitchen": "food", "medicines": "medicine", "household": "household_item"}
RED_WITHIN: dict[str, int] = {"food": 1, "household_item": 3}  # everything else: 7 days
# Only when the user turns on "Also alert me": days before the end date.
HOME_ALERT_DAYS: dict[str, tuple[int, ...]] = {"food": (0,), "medicine": (7, 0), "household_item": (3,)}
SUMMARY_WINDOW_DAYS = 7  # the morning summary covers the next week

# Kinds that are a planned charge, not something expiring. Never shown in red.
CHARGE_KINDS = frozenset({"subscription", "school_fees"})

MAX_ESCALATIONS = 5
NEEDS_YOU_WINDOW_DAYS = 60
COMING_UP_WINDOW_DAYS = 365


def days_for(kind: str) -> tuple[int, ...]:
    return REMINDER_DAYS.get(kind, DEFAULT_DAYS)


def days_left(ends_on: date | None, today: date) -> int | None:
    return None if ends_on is None else (ends_on - today).days


def is_home(category: str) -> bool:
    return category in HOME_CATEGORIES


def planned_reminder_dates(kind: str, ends_on: date, today: date,
                           days: tuple[int, ...] | None = None) -> list[tuple[date, int]]:
    """(send date, days before end) for every reminder still in the future.

    If every planned date has already passed but the item hasn't ended yet,
    remind today, so a late-added item still gets one warning.
    """
    out = []
    for before in days if days is not None else days_for(kind):
        when = ends_on - timedelta(days=before)
        if when >= today:
            out.append((when, before))
    if not out and ends_on >= today:
        out.append((today, (ends_on - today).days))
    return sorted(out)


def send_time_utc(day: date, tz_name: str, hour: int = 9) -> datetime:
    """The moment to send: `hour` o'clock on `day` in the user's own time zone, as UTC."""
    try:
        tz = ZoneInfo(tz_name)
    except Exception:  # unknown zone name: fall back to UTC rather than failing
        tz = timezone.utc
    return datetime.combine(day, time(hour), tz).astimezone(timezone.utc)


def next_escalation(ends_on: date, today: date, attempt: int) -> date | None:
    """An ignored reminder comes back sooner. Returns the next date, or None to stop.

    Gap shrinks as the end date gets close: a quarter of the time left, between 1 and 7 days.
    After the end date, a weekly nudge. Stops after MAX_ESCALATIONS.
    """
    if attempt >= MAX_ESCALATIONS:
        return None
    left = (ends_on - today).days
    gap = 7 if left < 0 else max(1, min(7, left // 4))
    return today + timedelta(days=gap)


def urgency(kind: str, left: int | None) -> str:
    """green | amber | red | expired | charge | none. Shared by API, app and website."""
    if left is None:
        return "none"
    window = max(days_for(kind))
    if kind in CHARGE_KINDS:
        return "charge" if 0 <= left <= window else ("expired" if left < 0 else "green")
    if left < 0:
        return "expired"
    if left <= RED_WITHIN.get(kind, 7):
        return "red"
    if left <= window:
        return "amber"
    return "green"


def timeline_bucket(kind: str, left: int | None) -> str:
    """needs_you | coming_up | later | undated."""
    if left is None:
        return "undated"
    level = urgency(kind, left)
    if level == "expired" or (left <= NEEDS_YOU_WINDOW_DAYS and level != "green"):
        return "needs_you"
    if left <= COMING_UP_WINDOW_DAYS:
        return "coming_up"
    return "later"
