"""What the API sends and receives. These shapes become the TypeScript client."""
import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Category = Literal["identity", "travel", "vehicles", "home", "insurance", "health",
                   "money", "work", "school", "purchases", "digital", "personal",
                   "kitchen", "medicines", "household"]
Urgency = Literal["green", "amber", "red", "expired", "charge", "none"]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------- auth

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    name: str = Field(min_length=1, max_length=120)
    country: str = Field(pattern=r"^[A-Z]{2}$")
    timezone: str = "Africa/Nairobi"
    currency: str = Field(default="KES", pattern=r"^[A-Z]{3}$")
    language: str = "en"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class TokensOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(ORM):
    id: uuid.UUID
    email: str
    name: str
    country: str
    timezone: str
    currency: str
    language: str
    plan: str
    summary_hour: int
    summary_include_family: bool
    monthly_budget_minor: int | None = None
    monthly_income_minor: int | None = None
    payday: int | None = None


class UserPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    timezone: str | None = None
    summary_hour: int | None = Field(default=None, ge=0, le=23)
    summary_include_family: bool | None = None
    monthly_budget_minor: int | None = Field(default=None, ge=0)
    monthly_income_minor: int | None = Field(default=None, ge=0)
    payday: int | None = Field(default=None, ge=1, le=31)
    country: str | None = Field(default=None, pattern=r"^[A-Z]{2}$")
    currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")


# ---------------------------------------------------------------- profiles

class ProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    relation: Literal["self", "child", "partner", "parent", "other"] = "other"
    date_of_birth: date | None = None
    nationality: str | None = Field(default=None, pattern=r"^[A-Z]{2}$")


class ProfileOut(ORM):
    id: uuid.UUID
    name: str
    relation: str
    date_of_birth: date | None
    nationality: str | None


# ---------------------------------------------------------------- items

class ItemIn(BaseModel):
    profile_id: uuid.UUID
    category: Category
    kind: str = Field(pattern=r"^[a-z_]+$", max_length=32)
    title: str = Field(min_length=1, max_length=160)
    issuer: str | None = None
    country: str | None = Field(default=None, pattern=r"^[A-Z]{2}$")
    destination: str | None = Field(default=None, pattern=r"^[A-Z]{2}$")
    number: str | None = Field(default=None, max_length=64)  # stored encrypted
    starts_on: date | None = None
    ends_on: date | None = None
    amount_minor: int | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")
    recurrence: Literal["none", "monthly", "yearly"] = "none"
    notes: str | None = None
    location: str | None = Field(default=None, max_length=32)
    quantity: str | None = Field(default=None, max_length=60)
    alert_each: bool = False
    cycle_days: int | None = Field(default=None, ge=1, le=730)
    spend_group: Literal["rent", "utilities", "internet_phone", "entertainment", "fitness", "school", "insurance", "other"] | None = None
    account_id: uuid.UUID | None = None


class ItemPatch(BaseModel):
    title: str | None = None
    issuer: str | None = None
    number: str | None = None
    starts_on: date | None = None
    ends_on: date | None = None
    amount_minor: int | None = Field(default=None, ge=0)
    currency: str | None = None
    recurrence: Literal["none", "monthly", "yearly"] | None = None
    status: Literal["active", "renewing", "not_renewing", "archived"] | None = None
    notes: str | None = None
    checklist_done: list[str] | None = None
    location: str | None = None
    quantity: str | None = None
    alert_each: bool | None = None
    cycle_days: int | None = Field(default=None, ge=1, le=730)
    plan_decision: Literal["keep", "review", "cancel"] | None = None
    spend_group: Literal["rent", "utilities", "internet_phone", "entertainment", "fitness", "school", "insurance", "other"] | None = None
    account_id: uuid.UUID | None = None


class RenewedIn(BaseModel):
    """After renewing: the new dates (usually read from a scan of the new document)."""
    ends_on: date
    starts_on: date | None = None
    amount_minor: int | None = Field(default=None, ge=0)
    number: str | None = None


class ItemOut(ORM):
    id: uuid.UUID
    profile_id: uuid.UUID
    category: str
    kind: str
    title: str
    issuer: str | None
    country: str | None
    destination: str | None
    number_last4: str | None
    starts_on: date | None
    ends_on: date | None
    amount_minor: int | None
    currency: str | None
    recurrence: str
    status: str
    notes: str | None
    checklist_done: list[str] = []
    location: str | None = None
    quantity: str | None = None
    alert_each: bool = False
    cycle_days: int | None = None
    plan_decision: str | None = None
    spend_group: str | None = None
    account_id: uuid.UUID | None = None
    is_home: bool = False
    days_left: int | None = None
    urgency: Urgency = "none"
    bucket: str = "undated"
    reminder_dates: list[date] = []


class Suggestion(BaseModel):
    text: str
    points: int


class HomeCounts(BaseModel):
    """Home list items due within a week (or expired), per section: the timeline card."""
    kitchen: int = 0
    medicines: int = 0
    household: int = 0
    total: int = 0


class TimelineOut(BaseModel):
    home: HomeCounts = HomeCounts()
    score: int
    suggestions: list[Suggestion]
    needs_you: list[ItemOut]
    coming_up: list[ItemOut]
    later: list[ItemOut]
    undated: list[ItemOut]


# ---------------------------------------------------------------- documents

class DocumentOut(ORM):
    id: uuid.UUID
    profile_id: uuid.UUID
    item_id: uuid.UUID | None
    title: str
    content_type: str
    size_bytes: int
    version: int
    is_current: bool
    keep_offline: bool
    folder: str = "other"
    created_at: datetime


Folder = Literal["identity", "property", "education", "medical", "money", "vehicles", "family", "other"]


class DocumentBase64In(BaseModel):
    """A photo sent as base64 text (works with every version of the app's fetch)."""
    profile_id: uuid.UUID
    item_id: uuid.UUID | None = None
    title: str = Field(default="Document", max_length=160)
    folder: Folder = "other"
    keep_offline: bool = False
    content_type: str
    data_base64: str = Field(max_length=21_000_000)  # about 15 MB of file


class DocumentPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    folder: Folder | None = None
    keep_offline: bool | None = None


# ---------------------------------------------------------------- scan

class ScanIn(BaseModel):
    text: str = Field(max_length=20000)  # read on the phone by ML Kit
    month_first: bool = False  # True for US-style dates


class ScanFieldOut(BaseModel):
    value: str | None
    confidence: float


class ScanOut(BaseModel):
    kind: ScanFieldOut
    category: ScanFieldOut
    title: ScanFieldOut
    issuer: ScanFieldOut
    number: ScanFieldOut
    starts_on: ScanFieldOut
    ends_on: ScanFieldOut
    amount: ScanFieldOut
    currency: ScanFieldOut
    provider: str
    warnings: list[str]
    reminder_days: list[int]
    ai_scans_left: int | None


# ---------------------------------------------------------------- reminders

class ReminderOut(ORM):
    id: uuid.UUID
    item_id: uuid.UUID
    due_at: datetime
    days_before: int
    attempt: int
    status: str
    item_title: str = ""


class SnoozeIn(BaseModel):
    days: int = Field(ge=1, le=30)


class DeviceIn(BaseModel):
    expo_push_token: str = Field(pattern=r"^(Exponent|Expo)PushToken\[.+\]$")
    platform: Literal["android", "ios"]


# ---------------------------------------------------------------- travel

class TripIn(BaseModel):
    destination: str = Field(pattern=r"^[A-Z]{2}$")
    city: str | None = None
    starts_on: date
    ends_on: date
    traveller_ids: list[uuid.UUID] = Field(min_length=1)


class TripOut(ORM):
    id: uuid.UUID
    destination: str
    city: str | None
    starts_on: date
    ends_on: date


class TripIssueOut(BaseModel):
    traveller: str
    code: str
    severity: Literal["blocker", "check", "tip"]
    message: str
    detail: str
    fix_by: date | None
    guide_item: str | None


class TripCheckOut(BaseModel):
    trip: TripOut
    status: Literal["ready", "check", "not_ready"]
    issues: list[TripIssueOut]
    ready_travellers: list[str]
    rule_verified: bool
    rule_source_url: str | None


# ---------------------------------------------------------------- home list

class HomeOut(BaseModel):
    this_week: list[ItemOut]
    kitchen: list[ItemOut]
    medicines: list[ItemOut]
    household: list[ItemOut]
    summary_hour: int
    summary_include_family: bool


class RefilledIn(BaseModel):
    """'Refilled today'. Optional: how many days the user thinks it lasts."""
    cycle_days: int | None = Field(default=None, ge=1, le=730)


# ---------------------------------------------------------------- planner + calendar

class SubscriptionOut(ItemOut):
    monthly_minor: int
    cancel_by: date | None
    renews: bool


class PlanTotals(BaseModel):
    monthly_minor: int
    yearly_minor: int
    cancel_savings_minor: int  # per month, if everything marked "cancel" is cancelled


class SubscriptionsOut(BaseModel):
    items: list[SubscriptionOut]
    totals: dict[str, PlanTotals]  # per currency, never mixed
    budget_minor: int | None
    budget_currency: str


class CalendarEntry(BaseModel):
    item_id: str
    title: str
    type: Literal["charge", "ends"]
    urgency: str


class CalendarOut(BaseModel):
    start: date
    end: date
    days: dict[str, list[CalendarEntry]]


# ---------------------------------------------------------------- money + family tabs

class UpcomingCharge(BaseModel):
    item_id: str
    title: str
    on: date
    amount_minor: int
    currency: str
    type: Literal["charge", "renewal"]
    plan_decision: str | None


class MoneyOverview(BaseModel):
    empty: bool  # nothing with a cost yet: the app shows the first-time screen
    currency: str
    next_30_total_minor: int
    next_30_count: int
    upcoming: list[UpcomingCharge]
    monthly_minor: int
    budget_minor: int | None
    by_group: list[dict]  # [{"group", "label", "yearly_minor"}] in the main currency


class PersonCard(BaseModel):
    profile: ProfileOut
    item_count: int
    urgent: int
    soon: int
    label: str
    tone: Literal["red", "amber", "green"]
    next: dict | None


class FamilyOverview(BaseModel):
    people: list[PersonCard]
    attention: list[dict]


class EmergencyDoc(BaseModel):
    id: uuid.UUID
    title: str
    content_type: str
    keep_offline: bool


class EmergencyItem(BaseModel):
    item_id: uuid.UUID
    title: str
    number_last4: str | None
    ends_on: date | None
    documents: list[EmergencyDoc]


class EmergencyPerson(BaseModel):
    profile: ProfileOut
    items: list[EmergencyItem]


# ---------------------------------------------------------------- accounts + plan

class AccountIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    bank: str | None = Field(default=None, max_length=80)
    last4: str | None = Field(default=None, pattern=r"^\d{4}$")
    balance_minor: int | None = None
    currency: str | None = Field(default=None, pattern=r"^[A-Z]{3}$")


class AccountPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    bank: str | None = Field(default=None, max_length=80)
    last4: str | None = Field(default=None, pattern=r"^\d{4}$")
    balance_minor: int | None = None


class AccountOut(ORM):
    id: uuid.UUID
    name: str
    bank: str | None
    last4: str | None
    balance_minor: int | None
    balance_updated_at: datetime | None
    currency: str


class PlanAccount(BaseModel):
    account_id: str
    name: str
    balance_minor: int | None
    due_minor: int
    due_count: int
    short_minor: int | None
    after_minor: int | None


class MoneyPlan(BaseModel):
    currency: str
    income_minor: int | None
    payday: int | None
    monthly_bills_minor: int
    left_after_bills_minor: int | None
    until: date
    due_before_payday_minor: int
    accounts: list[PlanAccount]
    unassigned_due_minor: int
    unassigned_count: int
