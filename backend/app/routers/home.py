"""Home list: food, medicines and household things."""
import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import accessible_profile_ids, current_user, get_item
from app.models import Item, User
from app.routers.items import item_out, today_for
from app.schemas import HomeOut, ItemOut, RefilledIn
from app.services import reminder_scheduler
from app.services.home import next_refill
from app.services.reminder_rules import HOME_CATEGORIES, SUMMARY_WINDOW_DAYS

router = APIRouter(tags=["home"])


def _sort_key(i: ItemOut):
    return (i.days_left is None, i.days_left if i.days_left is not None else 0)


@router.get("/home", response_model=HomeOut)
def home_list(profile_id: uuid.UUID | None = None, user: User = Depends(current_user), db: Session = Depends(get_db)):
    today = today_for(user)
    q = select(Item).where(Item.profile_id.in_(accessible_profile_ids(db, user)),
                           Item.category.in_(HOME_CATEGORIES), Item.status.in_(("active", "renewing")))
    if profile_id:
        q = q.where(Item.profile_id == profile_id)
    items = sorted((item_out(i, today) for i in db.scalars(q)), key=_sort_key)
    return HomeOut(
        this_week=[i for i in items if i.days_left is not None and i.days_left <= SUMMARY_WINDOW_DAYS],
        kitchen=[i for i in items if i.category == "kitchen"],
        medicines=[i for i in items if i.category == "medicines"],
        household=[i for i in items if i.category == "household"],
        summary_hour=user.summary_hour,
        summary_include_family=user.summary_include_family,
    )


@router.get("/home/recent", response_model=list[str])
def recent_kitchen(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """'Add again' chips: kitchen things added recently, newest first, no repeats."""
    titles = db.scalars(select(Item.title).where(
        Item.profile_id.in_(accessible_profile_ids(db, user)), Item.category == "kitchen"
    ).order_by(Item.created_at.desc()).limit(40)).all()
    seen: list[str] = []
    for t in titles:
        if t.lower() not in (s.lower() for s in seen):
            seen.append(t)
    return seen[:6]


@router.post("/items/{item_id}/refilled", response_model=ItemOut)
def refilled(item_id: uuid.UUID, body: RefilledIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Gas, water filter...: refilled today. The next date is estimated from past refills."""
    item = get_item(db, user, item_id, edit=True)
    today = today_for(user)
    if body.cycle_days:  # the user said how long it lasts: trust that
        cycle, next_on = body.cycle_days, today + timedelta(days=body.cycle_days)
    else:
        cycle, next_on = next_refill(item.starts_on, item.cycle_days, today)
    item.cycle_days, item.starts_on, item.ends_on, item.status = cycle, today, next_on, "active"
    reminder_scheduler.reschedule(db, item, today)
    return item_out(item, today)
