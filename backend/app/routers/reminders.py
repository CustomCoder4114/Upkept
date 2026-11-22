import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import accessible_profile_ids, current_user
from app.models import Device, Item, Reminder, User
from app.schemas import DeviceIn, ReminderOut, SnoozeIn
from app.services import reminder_scheduler

router = APIRouter(tags=["reminders"])


def _get(db: Session, user: User, reminder_id: uuid.UUID) -> Reminder:
    r = db.scalar(select(Reminder).join(Item).where(
        Reminder.id == reminder_id, Item.profile_id.in_(accessible_profile_ids(db, user, edit=True))))
    if r is None:
        raise HTTPException(404, "Reminder not found")
    return r


@router.get("/reminders", response_model=list[ReminderOut])
def inbox(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """The bell: reminders that went out and still need an answer."""
    rows = db.execute(select(Reminder, Item.title).join(Item).where(
        Item.profile_id.in_(accessible_profile_ids(db, user)), Reminder.status == "sent"
    ).order_by(Reminder.due_at.desc()).limit(50)).all()
    return [ReminderOut.model_validate(r).model_copy(update={"item_title": t}) for r, t in rows]


@router.post("/reminders/{reminder_id}/snooze", response_model=ReminderOut)
def snooze(reminder_id: uuid.UUID, body: SnoozeIn, user: User = Depends(current_user),
           db: Session = Depends(get_db)):
    r = _get(db, user, reminder_id)
    r.status = "snoozed"
    again = Reminder(item_id=r.item_id, due_at=datetime.now(timezone.utc) + timedelta(days=body.days),
                     days_before=r.days_before, attempt=r.attempt)
    db.add(again)
    db.flush()
    return again


@router.post("/reminders/{reminder_id}/done", status_code=204)
def already_done(reminder_id: uuid.UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """'Already done': stop reminding. The app then asks for the new document."""
    r = _get(db, user, reminder_id)
    r.status, r.acted_at = "acted", datetime.now(timezone.utc)
    item = db.get(Item, r.item_id)
    item.status = "renewing"
    reminder_scheduler.cancel_all(db, item)


@router.post("/reminders/{reminder_id}/not-renewing", status_code=204)
def not_renewing(reminder_id: uuid.UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    r = _get(db, user, reminder_id)
    r.status, r.acted_at = "acted", datetime.now(timezone.utc)
    item = db.get(Item, r.item_id)
    item.status = "not_renewing"
    reminder_scheduler.cancel_all(db, item)


@router.post("/devices", status_code=204)
def register_device(body: DeviceIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    device = db.scalar(select(Device).where(Device.expo_push_token == body.expo_push_token))
    if device:
        device.user_id, device.platform, device.last_seen_at = user.id, body.platform, datetime.now(timezone.utc)
    else:
        db.add(Device(user_id=user.id, expo_push_token=body.expo_push_token, platform=body.platform))


@router.post("/reminders/test", status_code=202)
def send_test(user: User = Depends(current_user)):
    """Sent at sign-up so we know notifications actually reach this phone."""
    from app.workers.tasks import send_test_reminder

    send_test_reminder.delay(str(user.id))
