"""Subscriptions planner and the timeline calendar."""
import calendar as cal
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import accessible_profile_ids, current_user
from app.models import Item, User
from app.routers.items import item_out, today_for
from app.schemas import CalendarOut, PlanTotals, SubscriptionOut, SubscriptionsOut
from app.services import reminder_scheduler
from app.services.recurring import CalendarSource, auto_renews, calendar_entries, cancel_by, monthly_cost_minor
from app.services.reminder_rules import HOME_CATEGORIES

router = APIRouter(tags=["planner"])


@router.get("/subscriptions", response_model=SubscriptionsOut)
def subscriptions(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Everything that charges regularly, cheapest to most expensive per month, with the plan."""
    today = today_for(user)
    rows = list(db.scalars(select(Item).where(
        Item.profile_id.in_(accessible_profile_ids(db, user)), Item.recurrence.in_(("monthly", "yearly")),
        Item.status.in_(("active", "renewing")), Item.category.not_in(HOME_CATEGORIES))))
    reminder_scheduler.roll_recurring(db, rows, today)

    out: list[SubscriptionOut] = []
    totals: dict[str, PlanTotals] = {}
    for i in rows:
        base = item_out(i, today)
        monthly = monthly_cost_minor(i.amount_minor, i.recurrence)
        renews = auto_renews(i.kind, i.category, i.recurrence)
        out.append(SubscriptionOut(**base.model_dump(), monthly_minor=monthly, renews=renews,
                                   cancel_by=cancel_by(i.ends_on) if renews and i.ends_on else None))
        cur = i.currency or user.currency
        t = totals.setdefault(cur, PlanTotals(monthly_minor=0, yearly_minor=0, cancel_savings_minor=0))
        t.monthly_minor += monthly
        t.yearly_minor += monthly * 12
        if i.plan_decision == "cancel":
            t.cancel_savings_minor += monthly
    out.sort(key=lambda s: -s.monthly_minor)
    return SubscriptionsOut(items=out, totals=totals, budget_minor=user.monthly_budget_minor,
                            budget_currency=user.currency)


@router.get("/calendar", response_model=CalendarOut)
def month_calendar(month: str = Query(pattern=r"^\d{4}-\d{2}$", description="YYYY-MM"),
                   profile_id: str | None = None,
                   user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Expiries and charges for one month (Home list items stay on their own screen)."""
    y, m = map(int, month.split("-"))
    if not 2000 <= y <= 2100 or not 1 <= m <= 12:
        raise HTTPException(400, "Bad month")
    start, end = date(y, m, 1), date(y, m, cal.monthrange(y, m)[1])
    today = today_for(user)

    q = select(Item).where(Item.profile_id.in_(accessible_profile_ids(db, user)), Item.ends_on.is_not(None),
                           Item.status.in_(("active", "renewing")), Item.category.not_in(HOME_CATEGORIES))
    if profile_id:
        q = q.where(Item.profile_id == profile_id)
    rows = list(db.scalars(q))
    reminder_scheduler.roll_recurring(db, rows, today)

    sources = []
    for i in rows:
        o = item_out(i, today)
        sources.append(CalendarSource(str(i.id), i.title, i.kind, i.ends_on, i.recurrence, o.urgency,
                                      renews=auto_renews(i.kind, i.category, i.recurrence)))
    return CalendarOut(start=start, end=end, days=calendar_entries(sources, start, end))
