"""Money plan: income vs bills, and will each account cover what's due before payday. Pure functions.

Upkept never connects to a bank. Accounts are added by hand (bank name, nickname,
last 4 digits, the balance the person types in), so nothing here can move money.
"""
import calendar
from dataclasses import dataclass
from datetime import date, timedelta

from app.services.overview import MoneyItem, upcoming_charges
from app.services.recurring import monthly_cost_minor


@dataclass(frozen=True)
class Account:
    account_id: str
    name: str
    balance_minor: int | None
    currency: str


def next_payday(today: date, payday: int) -> date:
    """The next payday on or after today. Day 31 in a 30-day month means the 30th."""
    def on(y: int, m: int) -> date:
        return date(y, m, min(payday, calendar.monthrange(y, m)[1]))

    this = on(today.year, today.month)
    if this >= today:
        return this
    y, m = (today.year + 1, 1) if today.month == 12 else (today.year, today.month + 1)
    return on(y, m)


def money_plan(*, income_minor: int | None, payday: int | None, currency: str, bills: list[MoneyItem],
               bill_accounts: dict[str, str | None], accounts: list[Account], today: date) -> dict:
    """Everything the Money tab's plan card needs, in the user's currency."""
    mine = [b for b in bills if b.currency == currency]
    monthly_bills = sum(monthly_cost_minor(b.amount_minor, b.recurrence) for b in mine)
    left = income_minor - monthly_bills if income_minor is not None else None

    until = next_payday(today, payday) - timedelta(days=1) if payday else today + timedelta(days=30)
    if until < today:  # payday is today: look at the month ahead
        until = next_payday(today + timedelta(days=1), payday) - timedelta(days=1)
    due = upcoming_charges(mine, today, days=(until - today).days)

    per_account = []
    for a in accounts:
        if a.currency != currency:
            continue
        charges = [c for c in due if bill_accounts.get(c["item_id"]) == a.account_id]
        total = sum(c["amount_minor"] for c in charges)
        short = max(0, total - a.balance_minor) if a.balance_minor is not None else None
        per_account.append({"account_id": a.account_id, "name": a.name, "balance_minor": a.balance_minor,
                            "due_minor": total, "due_count": len(charges), "short_minor": short,
                            "after_minor": a.balance_minor - total if a.balance_minor is not None else None})
    unassigned = [c for c in due if not bill_accounts.get(c["item_id"])]
    return {
        "currency": currency,
        "income_minor": income_minor,
        "monthly_bills_minor": monthly_bills,
        "left_after_bills_minor": left,
        "until": until.isoformat(),
        "due_before_payday_minor": sum(c["amount_minor"] for c in due),
        "accounts": per_account,
        "unassigned_due_minor": sum(c["amount_minor"] for c in unassigned),
        "unassigned_count": len(unassigned),
    }
