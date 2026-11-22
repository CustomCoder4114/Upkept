"""What the API sends and receives. These shapes become the TypeScript client."""
import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Category = Literal["identity", "travel", "vehicles", "home", "insurance", "health",
                   "money", "work", "school", "purchases", "digital", "personal"]
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
    days_left: int | None = None
    urgency: Urgency = "none"
    bucket: str = "undated"
    reminder_dates: list[date] = []


class Suggestion(BaseModel):
    text: str
    points: int


class TimelineOut(BaseModel):
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
    created_at: datetime


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
