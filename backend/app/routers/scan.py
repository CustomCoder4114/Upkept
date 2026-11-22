from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import current_user
from app.models import ScanUsage, User
from app.routers.items import today_for
from app.schemas import ScanFieldOut, ScanIn, ScanOut
from app.services.ai_reader import read_document
from app.services.reminder_rules import days_for

router = APIRouter(prefix="/scan", tags=["scan"])

EST_COST_USD_MICROS = 2_000  # rough cost per AI read; tune from real invoices


def _month_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


@router.post("", response_model=ScanOut)
def scan(body: ScanIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Read the text the phone extracted. The user confirms every field afterwards."""
    s = get_settings()
    used = db.scalar(select(func.count()).select_from(ScanUsage)
                     .where(ScanUsage.user_id == user.id, ScanUsage.created_at >= _month_start())) or 0
    spent_micros = db.scalar(select(func.coalesce(func.sum(ScanUsage.cost_usd_micros), 0))
                             .where(ScanUsage.created_at >= _month_start())) or 0

    limit = None if user.plan != "free" else s.free_plan_ai_scans_per_month
    under_limit = limit is None or used < limit
    under_budget = spent_micros < s.ai_monthly_budget_usd * 1_000_000

    result = read_document(body.text, today=today_for(user), month_first=body.month_first,
                           provider=s.ai_provider, api_key=s.anthropic_api_key, model=s.ai_model,
                           ai_allowed=under_limit and under_budget)
    if result.provider != "rules":
        db.add(ScanUsage(user_id=user.id, provider=result.provider, cost_usd_micros=EST_COST_USD_MICROS))
        used += 1
    elif not under_limit:
        result.warnings.append("You've used this month's free AI scans, so we read this with basic reading. "
                               "Please check each field.")

    def f(field) -> ScanFieldOut:
        return ScanFieldOut(value=field.value, confidence=round(field.confidence, 2))

    kind = result.kind.value or "other"
    return ScanOut(
        kind=f(result.kind), category=f(result.category), title=f(result.title), issuer=f(result.issuer),
        number=f(result.number), starts_on=f(result.starts_on), ends_on=f(result.ends_on),
        amount=f(result.amount), currency=f(result.currency), provider=result.provider,
        warnings=result.warnings, reminder_days=list(days_for(kind)),
        ai_scans_left=None if limit is None else max(0, limit - used),
    )
