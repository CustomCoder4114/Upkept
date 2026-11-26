"""Money tab and Family tab, plus the Emergency folder."""
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import accessible_profile_ids, current_user
from app.models import Document, Item, Profile, User
from app.routers.items import item_out, today_for
from app.schemas import (EmergencyDoc, EmergencyItem, EmergencyPerson, FamilyOverview, MoneyOverview, PersonCard,
                         ProfileOut, UpcomingCharge)
from app.services import reminder_scheduler
from app.services.overview import (SPEND_GROUPS, MoneyItem, PersonItem, family_attention, person_status, spend_group,
                                   upcoming_charges, yearly_by_group)
from app.services.recurring import auto_renews, monthly_cost_minor
from app.services.reminder_rules import HOME_CATEGORIES

router = APIRouter(tags=["overviews"])

EMERGENCY_KINDS = ("national_id", "passport", "health_insurance", "driving_licence", "birth_certificate", "visa")


@router.get("/money/overview", response_model=MoneyOverview)
def money_overview(user: User = Depends(current_user), db: Session = Depends(get_db)):
    today = today_for(user)
    rows = list(db.scalars(select(Item).where(
        Item.profile_id.in_(accessible_profile_ids(db, user)), Item.amount_minor.is_not(None),
        Item.status.in_(("active", "renewing")), Item.category.not_in(HOME_CATEGORIES))))
    reminder_scheduler.roll_recurring(db, rows, today)

    cur = user.currency
    items = [MoneyItem(str(i.id), i.title, i.amount_minor, i.currency or cur, i.recurrence, i.ends_on,
                       auto_renews(i.kind, i.category, i.recurrence), i.plan_decision,
                       spend_group(i.spend_group, i.category, i.kind)) for i in rows]
    upcoming = [c for c in upcoming_charges(items, today) if c["currency"] == cur]
    groups = yearly_by_group(items).get(cur, {})
    return MoneyOverview(
        empty=not items,
        currency=cur,
        next_30_total_minor=sum(c["amount_minor"] for c in upcoming),
        next_30_count=len(upcoming),
        upcoming=[UpcomingCharge(**c) for c in upcoming],
        monthly_minor=sum(monthly_cost_minor(i.amount_minor, i.recurrence) for i in items if i.currency == cur),
        budget_minor=user.monthly_budget_minor,
        by_group=[{"group": g, "label": SPEND_GROUPS[g], "yearly_minor": v} for g, v in groups.items()],
    )


def _profiles(db: Session, user: User) -> list[Profile]:
    return list(db.scalars(select(Profile).where(Profile.id.in_(accessible_profile_ids(db, user)))
                           .order_by(Profile.relation != "self", Profile.created_at)))


@router.get("/family", response_model=FamilyOverview)
def family_overview(user: User = Depends(current_user), db: Session = Depends(get_db)):
    today = today_for(user)
    profiles = _profiles(db, user)
    items = list(db.scalars(select(Item).where(Item.profile_id.in_([p.id for p in profiles]),
                                               Item.status.in_(("active", "renewing")))))
    reminder_scheduler.roll_recurring(db, items, today)

    by_profile: dict = defaultdict(list)
    for i in items:
        o = item_out(i, today)
        by_profile[i.profile_id].append(PersonItem(str(i.id), i.title, o.days_left, o.urgency, o.is_home))

    people, named = [], []
    for p in profiles:
        status = person_status(by_profile[p.id])
        people.append(PersonCard(profile=ProfileOut.model_validate(p), **status))
        named.append(("You" if p.relation == "self" else p.name, by_profile[p.id]))
    return FamilyOverview(people=people, attention=family_attention(named))


@router.get("/family/emergency", response_model=list[EmergencyPerson])
def emergency_folder(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Each person's ID, passport and medical cover, with their stored copies."""
    out = []
    for p in _profiles(db, user):
        items = db.scalars(select(Item).where(
            Item.profile_id == p.id, Item.status != "archived",
            (Item.kind.in_(EMERGENCY_KINDS)) | (Item.category.in_(("identity", "health")))
        ).order_by(Item.category, Item.title)).all()
        rows = []
        for i in items:
            docs = db.scalars(select(Document).where(Document.item_id == i.id, Document.is_current.is_(True))).all()
            rows.append(EmergencyItem(item_id=i.id, title=i.title, number_last4=i.number_last4, ends_on=i.ends_on,
                                      documents=[EmergencyDoc(id=d.id, title=d.title, content_type=d.content_type,
                                                              keep_offline=d.keep_offline) for d in docs]))
        out.append(EmergencyPerson(profile=ProfileOut.model_validate(p), items=rows))
    return out
