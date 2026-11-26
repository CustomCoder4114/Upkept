"""The heart of Upkept: find what's due and send reminders, even if nobody opens the app.

How it avoids double-sending and skipping:
  1. A reminder is claimed by flipping pending -> sending in one UPDATE. Only one
     worker can win that, even with several workers running.
  2. Before each channel is used, a reminder_deliveries row is committed. The unique
     (reminder_id, channel) constraint means that channel can never be used twice.
  3. If a worker crashes mid-way, the reminder stays in "sending". The next run puts
     it back to pending after 15 minutes; channels already claimed are skipped.
  4. If every channel fails, it's retried every 30 minutes for up to a day.
"""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import DailySummary, Device, Item, Profile, ProfileShare, Reminder, ReminderDelivery, User
from app.services.email import send_email
from app.services.notifications import send_push
from app.services.home import SummaryItem, summary_text
from app.services.reminder_rules import (HOME_CATEGORIES, SUMMARY_WINDOW_DAYS, days_left, next_escalation,
                                         send_time_utc)
from app.workers.celery_app import celery

BATCH = 200
IGNORED_AFTER = timedelta(hours=48)
STUCK_AFTER = timedelta(minutes=15)
RETRY_EVERY = timedelta(minutes=30)
GIVE_UP_AFTER = timedelta(days=1)


def reminder_text(item: Item, profile: Profile, today) -> tuple[str, str]:
    left = days_left(item.ends_on, today)
    who = "" if profile.relation == "self" else f"{profile.name}'s "
    if left is None:
        return item.title, "Tap to check it."
    if left < 0:
        return f"{who}{item.title} has expired", f"It ended {-left} days ago. Tap to see how to renew it."
    if item.category in HOME_CATEGORIES:
        when = "today" if left == 0 else "tomorrow" if left == 1 else f"in {left} days"
        verb = "Use" if item.category == "kitchen" else "Check"
        return f"{verb} {who}{item.title} {when}", "Tap to see it on your Home list."
    if item.kind in ("subscription", "school_fees"):
        return f"{who}{item.title} charges in {left} days", "Still using it? Tap to keep or cancel."
    when = "today" if left == 0 else "tomorrow" if left == 1 else f"in {left} days"
    return f"{who}{item.title} ends {when}", "Tap to see the steps to renew."


def _claim_channel(db: Session, reminder_id: uuid.UUID, channel: str) -> ReminderDelivery | None:
    """Commit a delivery row before sending. None = this channel was already used."""
    delivery = ReminderDelivery(reminder_id=reminder_id, channel=channel)
    db.add(delivery)
    try:
        db.commit()
        return delivery
    except IntegrityError:
        db.rollback()
        return None


def _deliver(db: Session, reminder: Reminder) -> bool:
    item = db.get(Item, reminder.item_id)
    profile = db.get(Profile, item.profile_id)
    user = db.get(User, profile.owner_id)
    title, body = reminder_text(item, profile, datetime.now(timezone.utc).date())
    data = {"itemId": str(item.id), "reminderId": str(reminder.id)}
    delivered = False

    devices = db.scalars(select(Device).where(Device.user_id == user.id)).all()
    if devices and (d := _claim_channel(db, reminder.id, "push")):
        errors = []
        for device in devices:
            res = send_push(device.expo_push_token, title, body, data)
            if res.ok:
                delivered, d.provider_id = True, res.ticket_id
            else:
                errors.append(res.error or "push failed")
                if res.token_invalid:
                    db.delete(device)
        d.status = "sent" if delivered else "failed"
        d.error = "; ".join(errors)[:500] or None
        db.commit()

    # Email always goes as well: push is often blocked or delayed on phones.
    if d := _claim_channel(db, reminder.id, "email"):
        try:
            d.provider_id = send_email(user.email, title, body, action_url=f"https://upkept.app/item/{item.id}")
            d.status, delivered = "sent", True
        except Exception as exc:  # noqa: BLE001 - record any provider failure
            d.status, d.error = "failed", str(exc)[:500]
        db.commit()

    # Channels that succeeded earlier (before a crash) also count as delivered.
    return delivered or bool(db.scalar(select(func.count()).select_from(ReminderDelivery).where(
        ReminderDelivery.reminder_id == reminder.id, ReminderDelivery.status == "sent")))


@celery.task
def send_due_reminders() -> int:
    """Runs every 5 minutes (see celery_app.beat_schedule)."""
    now = datetime.now(timezone.utc)
    sent = 0
    with SessionLocal() as db:
        db.execute(update(Reminder).where(Reminder.status == "sending", Reminder.updated_at < now - STUCK_AFTER)
                   .values(status="pending"))
        db.commit()

        ids = db.scalars(select(Reminder.id).where(Reminder.status == "pending", Reminder.due_at <= now)
                         .order_by(Reminder.due_at).limit(BATCH)).all()
        for rid in ids:
            won = db.execute(update(Reminder).where(Reminder.id == rid, Reminder.status == "pending")
                             .values(status="sending").returning(Reminder.id)).first()
            db.commit()
            if not won:
                continue  # another worker took it

            reminder = db.get(Reminder, rid)
            item = db.get(Item, reminder.item_id)
            if item.status in ("not_renewing", "archived"):
                reminder.status = "cancelled"
            elif _deliver(db, reminder):
                reminder.status, reminder.sent_at = "sent", datetime.now(timezone.utc)
                sent += 1
            elif now - reminder.due_at > GIVE_UP_AFTER:
                reminder.status = "failed"
            else:
                # Nothing got through. Free the failed channels so the retry can use them.
                db.execute(ReminderDelivery.__table__.delete().where(
                    ReminderDelivery.reminder_id == rid, ReminderDelivery.status == "failed"))
                reminder.status, reminder.due_at = "pending", datetime.now(timezone.utc) + RETRY_EVERY
            db.commit()
    return sent


@celery.task
def escalate_ignored() -> int:
    """A reminder nobody answered in 48 hours comes back sooner (see next_escalation)."""
    now = datetime.now(timezone.utc)
    created = 0
    with SessionLocal() as db:
        rows = db.execute(
            select(Reminder, Item, User).join(Item, Reminder.item_id == Item.id)
            .join(Profile, Item.profile_id == Profile.id).join(User, Profile.owner_id == User.id)
            .where(Reminder.status == "sent", Reminder.sent_at <= now - IGNORED_AFTER,
                   Item.status == "active", Item.ends_on.is_not(None))
        ).all()
        for reminder, item, user in rows:
            reminder.status = "ignored"
            already_planned = db.scalar(select(func.count()).select_from(Reminder).where(
                Reminder.item_id == item.id, Reminder.status.in_(("pending", "sending"))))
            if already_planned:
                continue  # the next planned reminder will do
            day = next_escalation(item.ends_on, now.date(), reminder.attempt)
            if day is None:
                continue
            db.add(Reminder(item_id=item.id, due_at=send_time_utc(day, user.timezone),
                            days_before=reminder.days_before, attempt=reminder.attempt + 1))
            created += 1
        db.commit()
    return created


@celery.task
def weekly_summary() -> int:
    """Monday 'Due soon' email: everything ending in the next 30 days."""
    today = datetime.now(timezone.utc).date()
    count = 0
    with SessionLocal() as db:
        rows = db.execute(
            select(User, Item).join(Profile, Profile.owner_id == User.id).join(Item, Item.profile_id == Profile.id)
            .where(Item.status == "active", Item.ends_on.between(today, today + timedelta(days=30)),
                   Item.category.not_in(HOME_CATEGORIES))  # small things have their own daily summary
            .order_by(User.id, Item.ends_on)
        ).all()
        by_user: dict[uuid.UUID, tuple[User, list[Item]]] = {}
        for user, item in rows:
            by_user.setdefault(user.id, (user, []))[1].append(item)
        for user, items in by_user.values():
            lines = [f"- {i.title}: {days_left(i.ends_on, today)} days" for i in items]
            try:
                send_email(user.email, f"Due soon: {len(items)} item{'s' if len(items) > 1 else ''}",
                           "Here's what's coming up in the next 30 days:\n" + "\n".join(lines))
                count += 1
            except Exception:  # noqa: BLE001 - one failed email shouldn't stop the rest
                continue
    return count


@celery.task
def send_test_reminder(user_id: str) -> bool:
    with SessionLocal() as db:
        devices = db.scalars(select(Device).where(Device.user_id == uuid.UUID(user_id))).all()
        return any(send_push(d.expo_push_token, "Reminders are working",
                             "This is how we'll warn you before anything expires.").ok for d in devices)


EXPIRED_LOOKBACK_DAYS = 14  # mention expired things for two weeks, then stop nagging


def _local_now(tz_name: str) -> datetime:
    from zoneinfo import ZoneInfo

    try:
        return datetime.now(ZoneInfo(tz_name))
    except Exception:
        return datetime.now(timezone.utc)


@celery.task
def home_morning_summaries() -> int:
    """Hourly. One Home list message per user per day, at their chosen hour, local time."""
    sent = 0
    with SessionLocal() as db:
        for user in db.scalars(select(User)).all():
            now = _local_now(user.timezone)
            if now.hour != user.summary_hour:
                continue
            today = now.date()

            # Claim today's summary first, so a rerun or a second worker never sends it twice.
            db.add(DailySummary(user_id=user.id, day=today))
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
                continue

            own = select(Profile.id).where(Profile.owner_id == user.id)
            if not user.summary_include_family:
                own = own.where(Profile.relation == "self")
            profile_ids = list(db.scalars(own))
            if user.summary_include_family:
                profile_ids += list(db.scalars(select(ProfileShare.profile_id).where(
                    ProfileShare.grantee_user_id == user.id, ProfileShare.emergency_only.is_(False))))

            items = db.scalars(select(Item).where(
                Item.profile_id.in_(profile_ids), Item.category.in_(HOME_CATEGORIES),
                Item.status == "active", Item.ends_on.is_not(None),
                Item.ends_on.between(today - timedelta(days=EXPIRED_LOOKBACK_DAYS),
                                     today + timedelta(days=SUMMARY_WINDOW_DAYS)))).all()
            text = summary_text([SummaryItem(i.title, (i.ends_on - today).days) for i in items], today)
            summary = db.scalar(select(DailySummary).where(DailySummary.user_id == user.id, DailySummary.day == today))
            summary.item_count = len(items)
            db.commit()
            if text is None:
                continue  # nothing due: say nothing

            title, body = text
            devices = db.scalars(select(Device).where(Device.user_id == user.id)).all()
            delivered = False
            for d in devices:
                res = send_push(d.expo_push_token, title, body, {"screen": "home"})
                delivered = delivered or res.ok
                if res.token_invalid:
                    db.delete(d)
            if not delivered:  # no phone reachable: email instead, so it isn't lost
                try:
                    send_email(user.email, title, body, action_url="https://upkept.app/home")
                except Exception:  # noqa: BLE001 - email not configured / failed
                    pass
            db.commit()
            sent += 1
    return sent


@celery.task
def roll_recurring_charges() -> int:
    """Daily. Keeps subscription charge dates (and their reminders) moving forward."""
    from app.services.reminder_scheduler import roll_recurring

    today = datetime.now(timezone.utc).date()
    with SessionLocal() as db:
        items = db.scalars(select(Item).where(
            Item.status == "active", Item.recurrence.in_(("monthly", "yearly")), Item.ends_on < today)).all()
        moved = roll_recurring(db, list(items), today)
        db.commit()
    return moved
