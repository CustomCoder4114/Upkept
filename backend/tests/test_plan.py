from datetime import date

from app.services.overview import MoneyItem
from app.services.plan import Account, money_plan, next_payday

TODAY = date(2026, 11, 26)


def bill(id_, amount, ends, rec="monthly", renews=True):
    return MoneyItem(id_, id_.title(), amount, "KES", rec, ends, renews, None, "other")


BILLS = [
    bill("rent", 25000_00, date(2026, 12, 1)),
    bill("internet", 2999_00, date(2026, 12, 18)),
    bill("gym", 2500_00, date(2026, 12, 24)),
    bill("streaming", 1100_00, date(2026, 11, 27)),
    bill("car insurance", 42000_00, date(2027, 3, 3), rec="yearly", renews=False),
]
ACCOUNTS = [Account("eq", "Salary account", 20000_00, "KES"), Account("mp", "M-Pesa", 5000_00, "KES")]
WHO_PAYS = {"rent": "eq", "internet": "eq", "streaming": "mp", "gym": None, "car insurance": "eq"}


def test_next_payday():
    assert next_payday(TODAY, 28) == date(2026, 11, 28)
    assert next_payday(TODAY, 25) == date(2026, 12, 25)
    assert next_payday(TODAY, 26) == TODAY
    assert next_payday(date(2027, 2, 1), 31) == date(2027, 2, 28)
    assert next_payday(date(2026, 12, 29), 5) == date(2027, 1, 5)


def test_plan_income_and_left():
    p = money_plan(income_minor=60000_00, payday=25, currency="KES", bills=BILLS, bill_accounts=WHO_PAYS,
                   accounts=ACCOUNTS, today=TODAY)
    assert p["monthly_bills_minor"] == 25000_00 + 2999_00 + 2500_00 + 1100_00 + 3500_00
    assert p["left_after_bills_minor"] == 60000_00 - p["monthly_bills_minor"]
    assert p["until"] == "2026-12-24"  # the day before payday on 25 Dec


def test_accounts_warn_when_short_before_payday():
    p = money_plan(income_minor=None, payday=25, currency="KES", bills=BILLS, bill_accounts=WHO_PAYS,
                   accounts=ACCOUNTS, today=TODAY)
    eq = next(a for a in p["accounts"] if a["account_id"] == "eq")
    assert eq["due_minor"] == 25000_00 + 2999_00  # rent + internet before 25 Dec; insurance is in March
    assert eq["short_minor"] == 25000_00 + 2999_00 - 20000_00
    mp = next(a for a in p["accounts"] if a["account_id"] == "mp")
    assert mp["short_minor"] == 0 and mp["after_minor"] == 5000_00 - 1100_00
    assert p["unassigned_count"] == 1 and p["unassigned_due_minor"] == 2500_00  # gym has no account
    assert p["left_after_bills_minor"] is None  # no income entered


def test_no_payday_means_next_30_days():
    p = money_plan(income_minor=None, payday=None, currency="KES", bills=BILLS, bill_accounts={}, accounts=[],
                   today=TODAY)
    assert p["until"] == "2026-12-26"
    assert p["due_before_payday_minor"] == 25000_00 + 2999_00 + 2500_00 + 1100_00  # rent once (1 Dec)
