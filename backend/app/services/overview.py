"""Money tab and Family tab summaries. Pure functions."""
from dataclasses import dataclass
from datetime import date, timedelta

from app.services.recurring import charges_between, monthly_cost_minor

# Spending areas shown on the Money tab ("Where it goes").
SPEND_GROUPS = {
    "rent": "Rent", "utilities": "Electricity and water", "internet_phone": "Internet and phone",
    "entertainment": "Entertainment", "fitness": "Fitness", "school": "School",
    "insurance": "Insurance", "other": "Other",
}


def spend_group(group: str | None, category: str, kind: str) -> str:
    """The item's own group if set, otherwise a sensible guess from what it is."""
    if group in SPEND_GROUPS:
        return group
    if category == "insurance" or kind.endswith("_insurance"):
        return "insurance"
    if kind == "school_fees" or category == "school":
        return "school"
    if category == "digital":
        return "entertainment"
    return "other"


@dataclass(frozen=True)
class MoneyItem:
    item_id: str
    title: str
    amount_minor: int | None
    currency: str
    recurrence: str
    ends_on: date | None
    renews: bool
    plan_decision: str | None
    group: str


def upcoming_charges(items: list[MoneyItem], today: date, days: int = 30) -> list[dict]:
    """Every charge in the next `days`: repeat charges, plus policy renewals that fall in the window."""
    end = today + timedelta(days=days)
    out = []
    for it in items:
        if not it.ends_on or not it.amount_minor:
            continue
        if it.renews:
            dates, kind = charges_between(it.ends_on, it.recurrence, today, end), "charge"
        else:
            dates, kind = ([it.ends_on] if today <= it.ends_on <= end else []), "renewal"
        for d in dates:
            out.append({"item_id": it.item_id, "title": it.title, "on": d.isoformat(), "amount_minor": it.amount_minor,
                        "currency": it.currency, "type": kind, "plan_decision": it.plan_decision})
    return sorted(out, key=lambda c: c["on"])


def yearly_by_group(items: list[MoneyItem]) -> dict[str, dict[str, int]]:
    """{currency: {group: yearly minor}}, biggest first. Currencies are never mixed."""
    out: dict[str, dict[str, int]] = {}
    for it in items:
        yearly = monthly_cost_minor(it.amount_minor, it.recurrence) * 12
        if yearly:
            g = out.setdefault(it.currency, {})
            g[it.group] = g.get(it.group, 0) + yearly
    return {cur: dict(sorted(g.items(), key=lambda kv: -kv[1])) for cur, g in out.items()}


# ---------------------------------------------------------------- family

@dataclass(frozen=True)
class PersonItem:
    item_id: str
    title: str
    days_left: int | None
    urgency: str
    is_home: bool


HOME_ATTENTION_DAYS = 7
DOC_ATTENTION_DAYS = 60


def needs_attention(it: PersonItem) -> bool:
    if it.days_left is None or it.urgency in ("green", "none"):
        return False
    if it.urgency == "expired":
        return True
    return it.days_left <= (HOME_ATTENTION_DAYS if it.is_home else DOC_ATTENTION_DAYS)


def person_status(items: list[PersonItem]) -> dict:
    """Counts and the next thing, for one person's card on the Family tab."""
    attention = [i for i in items if needs_attention(i)]
    urgent = sum(1 for i in attention if i.urgency in ("red", "expired"))
    soon = len(attention) - urgent
    upcoming = sorted((i for i in items if i.days_left is not None), key=lambda i: i.days_left)
    nxt = next((i for i in upcoming if i.days_left >= 0), upcoming[0] if upcoming else None)
    if urgent:
        label, tone = f"{urgent} urgent", "red"
    elif soon:
        label, tone = f"{soon} soon", "amber"
    else:
        label, tone = "All good", "green"
    return {"item_count": len(items), "urgent": urgent, "soon": soon, "label": label, "tone": tone,
            "next": {"item_id": nxt.item_id, "title": nxt.title, "days_left": nxt.days_left} if nxt else None}


def family_attention(people: list[tuple[str, list[PersonItem]]], limit: int = 5) -> list[dict]:
    """Across everyone: what needs attention, most urgent first, with whose it is."""
    rows = [{"person": name, "item_id": i.item_id, "title": i.title, "days_left": i.days_left, "urgency": i.urgency}
            for name, items in people for i in items if needs_attention(i)]
    return sorted(rows, key=lambda r: r["days_left"])[:limit]
