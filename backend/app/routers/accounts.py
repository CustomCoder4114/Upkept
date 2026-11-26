"""Bank / mobile-money accounts (added by hand) and the money plan."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import accessible_profile_ids, current_user
from app.models import Account, Item, User
from app.routers.items import today_for
from app.schemas import AccountIn, AccountOut, AccountPatch, MoneyPlan
from app.services import reminder_scheduler
from app.services.overview import MoneyItem, spend_group
from app.services.plan import Account as PlanAccount
from app.services.plan import money_plan
from app.services.recurring import auto_renews
from app.services.reminder_rules import HOME_CATEGORIES

router = APIRouter(tags=["accounts"])
MAX_ACCOUNTS = 10


def get_account(db: Session, user: User, account_id: uuid.UUID) -> Account:
    acc = db.scalar(select(Account).where(Account.id == account_id, Account.user_id == user.id))
    if acc is None:
        raise HTTPException(404, "Account not found")
    return acc


@router.get("/accounts", response_model=list[AccountOut])
def list_accounts(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Account).where(Account.user_id == user.id).order_by(Account.created_at)).all()


@router.post("/accounts", response_model=AccountOut, status_code=201)
def add_account(body: AccountIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if len(list_accounts(user, db)) >= MAX_ACCOUNTS:
        raise HTTPException(400, f"You can add up to {MAX_ACCOUNTS} accounts")
    acc = Account(user_id=user.id, name=body.name, bank=body.bank, last4=body.last4, balance_minor=body.balance_minor,
                  currency=body.currency or user.currency,
                  balance_updated_at=datetime.now(timezone.utc) if body.balance_minor is not None else None)
    db.add(acc)
    db.flush()
    return acc


@router.patch("/accounts/{account_id}", response_model=AccountOut)
def update_account(account_id: uuid.UUID, body: AccountPatch, user: User = Depends(current_user),
                   db: Session = Depends(get_db)):
    acc = get_account(db, user, account_id)
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(acc, k, v)
    if "balance_minor" in data:
        acc.balance_updated_at = datetime.now(timezone.utc)
    return acc


@router.delete("/accounts/{account_id}", status_code=204)
def delete_account(account_id: uuid.UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(get_account(db, user, account_id))  # bills that used it simply have no account now


@router.get("/money/plan", response_model=MoneyPlan)
def plan(user: User = Depends(current_user), db: Session = Depends(get_db)):
    today = today_for(user)
    rows = list(db.scalars(select(Item).where(
        Item.profile_id.in_(accessible_profile_ids(db, user)), Item.amount_minor.is_not(None),
        Item.status.in_(("active", "renewing")), Item.category.not_in(HOME_CATEGORIES))))
    reminder_scheduler.roll_recurring(db, rows, today)
    bills = [MoneyItem(str(i.id), i.title, i.amount_minor, i.currency or user.currency, i.recurrence, i.ends_on,
                       auto_renews(i.kind, i.category, i.recurrence), i.plan_decision,
                       spend_group(i.spend_group, i.category, i.kind)) for i in rows]
    accounts = [PlanAccount(str(a.id), a.name, a.balance_minor, a.currency) for a in list_accounts(user, db)]
    result = money_plan(income_minor=user.monthly_income_minor, payday=user.payday, currency=user.currency,
                        bills=bills, bill_accounts={str(i.id): str(i.account_id) if i.account_id else None for i in rows},
                        accounts=accounts, today=today)
    return MoneyPlan(payday=user.payday, **result)
