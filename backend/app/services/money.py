"""Money view: what charges you, monthly and yearly. Pure functions; no bank login."""
from collections import defaultdict
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Charge:
    title: str
    category: str
    amount_minor: int
    currency: str
    recurrence: str  # none | monthly | yearly
    next_on: date | None


def monthly_minor(c: Charge) -> int:
    if c.recurrence == "monthly":
        return c.amount_minor
    if c.recurrence == "yearly":
        return round(c.amount_minor / 12)
    return 0


def summary(charges: list[Charge], today: date, horizon_days: int = 90) -> dict:
    """Totals per currency (never mix currencies), by category, plus upcoming charges."""
    totals: dict[str, dict] = {}
    for c in charges:
        t = totals.setdefault(c.currency, {"monthly_minor": 0, "yearly_minor": 0, "by_category": defaultdict(int)})
        m = monthly_minor(c)
        t["monthly_minor"] += m
        t["yearly_minor"] += m * 12
        t["by_category"][c.category] += m * 12
    for t in totals.values():
        t["by_category"] = dict(t["by_category"])

    upcoming = sorted(
        (c for c in charges if c.next_on and 0 <= (c.next_on - today).days <= horizon_days),
        key=lambda c: c.next_on,
    )
    return {
        "totals": totals,
        "upcoming": [
            {"title": c.title, "amount_minor": c.amount_minor, "currency": c.currency, "on": c.next_on.isoformat()}
            for c in upcoming
        ],
    }
