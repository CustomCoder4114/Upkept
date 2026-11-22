"""Database side of reminders: (re)plan them when an item changes."""
from datetime import date, datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Item, Profile, Reminder, User
from app.services.reminder_rules import planned_reminder_dates, send_time_utc


def reschedule(db: Session, item: Item, today: date | None = None) -> list[Reminder]:
    """Drop the item's pending reminders and plan new ones from its end date."""
    db.execute(delete(Reminder).where(Reminder.item_id == item.id, Reminder.status == "pending"))
    if item.ends_on is None or item.status in ("not_renewing", "archived"):
        return []

    user = db.scalar(select(User).join(Profile, Profile.owner_id == User.id).where(Profile.id == item.profile_id))
    tz = user.timezone if user else "UTC"
    today = today or datetime.now(timezone.utc).date()
    hour = get_settings().reminder_send_hour

    reminders = [
        Reminder(item_id=item.id, due_at=send_time_utc(day, tz, hour), days_before=before)
        for day, before in planned_reminder_dates(item.kind, item.ends_on, today)
    ]
    db.add_all(reminders)
    return reminders


def cancel_all(db: Session, item: Item) -> None:
    db.execute(delete(Reminder).where(Reminder.item_id == item.id, Reminder.status.in_(("pending", "snoozed"))))
