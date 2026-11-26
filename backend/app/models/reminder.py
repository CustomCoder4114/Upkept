"""Reminders and a delivery log.

A Reminder is "warn about item X at time T". A ReminderDelivery is one attempt
to send it on one channel. The unique constraint on (reminder_id, channel) is
what guarantees a worker restart never sends the same reminder twice.
"""
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin

# pending -> sending -> sent -> acted | ignored ; or snoozed / cancelled / failed
REMINDER_STATUSES = ("pending", "sending", "sent", "acted", "ignored", "snoozed", "cancelled", "failed")


class Reminder(IdMixin, TimestampMixin, Base):
    __tablename__ = "reminders"

    item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("items.id", ondelete="CASCADE"), index=True)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    days_before: Mapped[int] = mapped_column(Integer)
    attempt: Mapped[int] = mapped_column(Integer, default=0)  # 0 = planned, 1+ = escalation
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    acted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    item = relationship("Item", back_populates="reminders")
    deliveries = relationship("ReminderDelivery", back_populates="reminder", cascade="all, delete-orphan")


class ReminderDelivery(IdMixin, Base):
    __tablename__ = "reminder_deliveries"
    __table_args__ = (UniqueConstraint("reminder_id", "channel", name="uq_delivery_once_per_channel"),)

    reminder_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("reminders.id", ondelete="CASCADE"), index=True)
    channel: Mapped[str] = mapped_column(String(16))  # push | email | whatsapp | sms
    status: Mapped[str] = mapped_column(String(16), default="sending")  # sending | sent | failed
    provider_id: Mapped[str | None] = mapped_column(String(255))
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    reminder = relationship("Reminder", back_populates="deliveries")


class DailySummary(IdMixin, Base):
    """One row per user per day the Home list summary went out: never sent twice."""

    __tablename__ = "daily_summaries"
    __table_args__ = (UniqueConstraint("user_id", "day", name="uq_one_summary_per_day"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    day: Mapped[date] = mapped_column(Date)
    item_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
