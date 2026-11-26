from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import accessible_profile_ids, current_user
from app.models import Item, User
from app.routers.items import today_for
from app.services import reminder_scheduler
from app.services.money import Charge, summary

router = APIRouter(prefix="/money", tags=["money"])


@router.get("/summary")
def money_summary(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Built from items with an amount: no bank login needed."""
    items = db.scalars(select(Item).where(
        Item.profile_id.in_(accessible_profile_ids(db, user)), Item.amount_minor.is_not(None),
        Item.status.in_(("active", "renewing")))).all()
    reminder_scheduler.roll_recurring(db, list(items), today_for(user))
    charges = [Charge(i.title, i.category, i.amount_minor, i.currency or user.currency, i.recurrence, i.ends_on)
               for i in items]
    return summary(charges, today_for(user))
