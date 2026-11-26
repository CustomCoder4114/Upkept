import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.crypto import get_keyring, last4
from app.database import get_db
from app.deps import accessible_profile_ids, current_user, get_item, get_profile
from app.models import Document, Item, Reminder, User
from app.schemas import HomeCounts, ItemIn, ItemOut, ItemPatch, RenewedIn, Suggestion, TimelineOut
from app.services import reminder_scheduler
from app.services.reminder_rules import (HOME_ALERT_DAYS, SUMMARY_WINDOW_DAYS, days_left, is_home,
                                         planned_reminder_dates, timeline_bucket, urgency)
from app.services.score import ScoreInput, life_in_order

router = APIRouter(tags=["items"])


def today_for(user: User) -> date:
    from zoneinfo import ZoneInfo

    try:
        return datetime.now(ZoneInfo(user.timezone)).date()
    except Exception:
        return datetime.now(timezone.utc).date()


def item_out(item: Item, today: date) -> ItemOut:
    left = days_left(item.ends_on, today)
    out = ItemOut(
        id=item.id, profile_id=item.profile_id, category=item.category, kind=item.kind, title=item.title,
        issuer=item.issuer, country=item.country, destination=item.destination, number_last4=item.number_last4,
        starts_on=item.starts_on, ends_on=item.ends_on, amount_minor=item.amount_minor, currency=item.currency,
        recurrence=item.recurrence, status=item.status, notes=item.notes,
        checklist_done=[s for s in (item.checklist_done or "").split(",") if s],
        location=item.location, quantity=item.quantity, alert_each=bool(item.alert_each),
        cycle_days=item.cycle_days, is_home=is_home(item.category),
        plan_decision=item.plan_decision, spend_group=item.spend_group, account_id=item.account_id,
    )
    out.days_left = left
    out.urgency = urgency(item.kind, left)
    out.bucket = timeline_bucket(item.kind, left)
    if item.ends_on and not (out.is_home and not item.alert_each):
        days = HOME_ALERT_DAYS.get(item.kind, (0,)) if out.is_home else None
        out.reminder_dates = [d for d, _ in planned_reminder_dates(item.kind, item.ends_on, today, days)]
    return out


def _check_account(db: Session, user: User, account_id) -> None:
    if account_id is not None:
        from app.models import Account

        if db.scalar(select(Account.id).where(Account.id == account_id, Account.user_id == user.id)) is None:
            from fastapi import HTTPException

            raise HTTPException(404, "Account not found")


def _set_number(item: Item, number: str | None) -> None:
    if number:
        item.number_encrypted = get_keyring().encrypt_text(number, associated_data=str(item.id).encode())
        item.number_last4 = last4(number)
    elif number == "":
        item.number_encrypted = item.number_last4 = None


@router.get("/timeline", response_model=TimelineOut)
def timeline(profile_id: uuid.UUID | None = None, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Home screen: Needs you / Coming up / Later, plus the Life in Order score."""
    today = today_for(user)
    q = select(Item).where(Item.profile_id.in_(accessible_profile_ids(db, user)), Item.status != "archived")
    if profile_id:
        q = q.where(Item.profile_id == profile_id)
    rows = list(db.scalars(q))
    reminder_scheduler.roll_recurring(db, rows, today)  # passed subscription charges move to the next one
    everything = [item_out(i, today) for i in rows]
    home = HomeCounts()
    for i in everything:
        if i.is_home and i.days_left is not None and i.days_left <= SUMMARY_WINDOW_DAYS:
            setattr(home, i.category, getattr(home, i.category) + 1)
            home.total += 1
    items = [i for i in everything if not i.is_home]  # the Home list has its own screen
    items.sort(key=lambda i: (i.days_left is None, i.days_left if i.days_left is not None else 0))

    # On-time ratio: reminders the user acted on before the item's end date.
    acted = db.scalar(select(func.count()).select_from(Reminder).join(Item)
                      .where(Item.profile_id.in_(accessible_profile_ids(db, user)), Reminder.status == "acted"))
    sent = db.scalar(select(func.count()).select_from(Reminder).join(Item)
                     .where(Item.profile_id.in_(accessible_profile_ids(db, user)),
                            Reminder.status.in_(("sent", "acted", "ignored"))))
    score, suggestions = life_in_order(
        [ScoreInput(i.category, i.days_left, i.status) for i in items], (acted / sent) if sent else None)

    buckets: dict[str, list[ItemOut]] = {"needs_you": [], "coming_up": [], "later": [], "undated": []}
    for i in items:
        buckets[i.bucket].append(i)
    return TimelineOut(home=home, score=score, suggestions=[Suggestion(text=s.text, points=s.points) for s in suggestions[:3]],
                       **buckets)


@router.get("/items", response_model=list[ItemOut])
def list_items(profile_id: uuid.UUID | None = None, category: str | None = None,
               q: str | None = Query(default=None, max_length=100),
               user: User = Depends(current_user), db: Session = Depends(get_db)):
    query = select(Item).where(Item.profile_id.in_(accessible_profile_ids(db, user)))
    if profile_id:
        query = query.where(Item.profile_id == profile_id)
    if category:
        query = query.where(Item.category == category)
    if q:
        like = f"%{q.lower()}%"
        query = query.where(func.lower(Item.title).like(like) | func.lower(Item.issuer).like(like))
    today = today_for(user)
    return [item_out(i, today) for i in db.scalars(query.order_by(Item.ends_on.nulls_last()))]


@router.post("/items", response_model=ItemOut, status_code=201)
def create_item(body: ItemIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    get_profile(db, user, body.profile_id, edit=True)
    _check_account(db, user, body.account_id)
    data = body.model_dump(exclude={"number"})
    item = Item(id=uuid.uuid4(), **data)
    _set_number(item, body.number)
    db.add(item)
    db.flush()
    reminder_scheduler.reschedule(db, item, today_for(user))
    return item_out(item, today_for(user))


@router.get("/items/{item_id}", response_model=ItemOut)
def get_one(item_id: uuid.UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return item_out(get_item(db, user, item_id), today_for(user))


@router.get("/items/{item_id}/number")
def reveal_number(item_id: uuid.UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Full number, only on request (the app shows last 4 until you tap)."""
    item = get_item(db, user, item_id)
    if not item.number_encrypted:
        return {"number": None}
    return {"number": get_keyring().decrypt_text(item.number_encrypted, associated_data=str(item.id).encode())}


@router.patch("/items/{item_id}", response_model=ItemOut)
def update_item(item_id: uuid.UUID, body: ItemPatch, user: User = Depends(current_user),
                db: Session = Depends(get_db)):
    item = get_item(db, user, item_id, edit=True)
    data = body.model_dump(exclude_unset=True)
    if "account_id" in data:
        _check_account(db, user, data["account_id"])
    if "number" in data:
        _set_number(item, data.pop("number") or "")
    if "checklist_done" in data:
        item.checklist_done = ",".join(data.pop("checklist_done") or [])
    for k, v in data.items():
        setattr(item, k, v)
    if {"ends_on", "status", "alert_each"} & data.keys():
        reminder_scheduler.reschedule(db, item, today_for(user))
    return item_out(item, today_for(user))


@router.post("/items/{item_id}/renewed", response_model=ItemOut)
def mark_renewed(item_id: uuid.UUID, body: RenewedIn, user: User = Depends(current_user),
                 db: Session = Depends(get_db)):
    """'Snap the new one': new dates, old document kept as history, checklist and reminders reset."""
    item = get_item(db, user, item_id, edit=True)
    for doc in db.scalars(select(Document).where(Document.item_id == item.id, Document.is_current.is_(True))):
        doc.is_current = False
    item.starts_on = body.starts_on or item.ends_on
    item.ends_on = body.ends_on
    if body.amount_minor is not None:
        item.amount_minor = body.amount_minor
    if body.number:
        _set_number(item, body.number)
    item.status = "active"
    item.checklist_done = ""
    db.execute(Reminder.__table__.update().where(Reminder.item_id == item.id, Reminder.status == "sent")
               .values(status="acted", acted_at=datetime.now(timezone.utc)))
    reminder_scheduler.reschedule(db, item, today_for(user))
    return item_out(item, today_for(user))


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: uuid.UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(get_item(db, user, item_id, edit=True))
