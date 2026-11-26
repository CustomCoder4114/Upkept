"""Database side of reminders: (re)plan them when an item changes."""
from datetime import date, datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Item, Profile, Reminder, User
from app.services.recurring import auto_renews, roll_forward
from app.services.reminder_rules import HOME_ALERT_DAYS, is_home, planned_reminder_dates, send_time_utc


def reschedule(db: Session, item: Item, today: date | None = None) -> list[Reminder]:
    """Drop the item's pending reminders and plan new ones from its end date."""
    db.execute(delete(Reminder).where(Reminder.item_id == item.id, Reminder.status == "pending"))
    if item.ends_on is None or item.status in ("not_renewing", "archived"):
        return []
    # Home list items are covered by the morning summary; separate alerts only if asked for.
    days = None
    if is_home(item.category):
        if not item.alert_each:
            return []
        days = HOME_ALERT_DAYS.get(item.kind, (0,))

    user = db.scalar(select(User).join(Profile, Profile.owner_id == User.id).where(Profile.id == item.profile_id))
    tz = user.timezone if user else "UTC"
    today = today or datetime.now(timezone.utc).date()
    hour = get_settings().reminder_send_hour

    reminders = [
        Reminder(item_id=item.id, due_at=send_time_utc(day, tz, hour), days_before=before)
        for day, before in planned_reminder_dates(item.kind, item.ends_on, today, days)
    ]
    db.add_all(reminders)
    return reminders


def cancel_all(db: Session, item: Item) -> None:
    db.execute(delete(Reminder).where(Reminder.item_id == item.id, Reminder.status.in_(("pending", "snoozed"))))


def roll_recurring(db: Session, items: list[Item], today: date) -> int:
    """Subscriptions whose charge date has passed move to their next charge date.

    Only self-renewing things roll (see recurring.auto_renews); a policy stays
    "expired" until it's actually renewed. Returns how many moved.
    """
    moved = 0
    for item in items:
        if (item.ends_on and item.ends_on < today and item.status == "active"
                and auto_renews(item.kind, item.category, item.recurrence)):
            item.starts_on = item.ends_on
            item.ends_on = roll_forward(item.ends_on, item.recurrence, today)
            item.checklist_done = ""
            reschedule(db, item, today)
            moved += 1
    return moved
