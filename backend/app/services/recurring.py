"""Recurring charges (subscriptions, yearly policies) and the calendar. Pure functions."""
import calendar
from dataclasses import dataclass
from datetime import date, timedelta


# Things that charge again by themselves. Policies and licences don't: they must be renewed,
# so they keep showing as expiring until the person actually renews them.
AUTO_RENEW_KINDS = frozenset({"subscription", "school_fees", "domain"})


def auto_renews(kind: str, category: str, recurrence: str) -> bool:
    return recurrence in ("monthly", "yearly") and (kind in AUTO_RENEW_KINDS or category in ("money", "digital"))


def add_period(d: date, recurrence: str, anchor_day: int | None = None) -> date:
    """One period later. Monthly charges keep their day (31st -> 28th/30th -> back to 31st)."""
    day = anchor_day or d.day
    if recurrence == "monthly":
        y, m = (d.year + 1, 1) if d.month == 12 else (d.year, d.month + 1)
    elif recurrence == "yearly":
        y, m = d.year + 1, d.month
    else:
        raise ValueError(f"not recurring: {recurrence}")
    return date(y, m, min(day, calendar.monthrange(y, m)[1]))


def roll_forward(next_on: date, recurrence: str, today: date) -> date:
    """The next charge date on or after today. A charge that has passed rolls to the next one."""
    if recurrence not in ("monthly", "yearly"):
        return next_on
    anchor = next_on.day
    d = next_on
    while d < today:
        d = add_period(d, recurrence, anchor)
    return d


def charges_between(next_on: date, recurrence: str, start: date, end: date) -> list[date]:
    """Every charge date from start to end (inclusive), for the calendar."""
    if recurrence not in ("monthly", "yearly"):
        return [next_on] if start <= next_on <= end else []
    anchor = next_on.day
    d = roll_forward(next_on, recurrence, start)
    out = []
    while d <= end:
        out.append(d)
        d = add_period(d, recurrence, anchor)
    return out


def monthly_cost_minor(amount_minor: int | None, recurrence: str) -> int:
    if not amount_minor:
        return 0
    return amount_minor if recurrence == "monthly" else round(amount_minor / 12) if recurrence == "yearly" else 0


def cancel_by(next_on: date) -> date:
    """Cancel at least a day before the charge; many services charge early in the day."""
    return next_on - timedelta(days=1)


@dataclass(frozen=True)
class CalendarSource:
    item_id: str
    title: str
    kind: str
    ends_on: date
    recurrence: str
    urgency: str
    renews: bool = False  # auto_renews(...): show every charge, not just one end date


def calendar_entries(items: list[CalendarSource], start: date, end: date) -> dict[str, list[dict]]:
    """{"2026-12-03": [{"item_id", "title", "type": "charge"|"ends", "urgency"}]} for days in range."""
    days: dict[str, list[dict]] = {}
    for it in items:
        if it.renews:
            hits, kind = charges_between(it.ends_on, it.recurrence, start, end), "charge"
        else:
            hits, kind = ([it.ends_on] if start <= it.ends_on <= end else []), "ends"
        for d in hits:
            days.setdefault(d.isoformat(), []).append(
                {"item_id": it.item_id, "title": it.title, "type": kind, "urgency": it.urgency})
    return dict(sorted(days.items()))
