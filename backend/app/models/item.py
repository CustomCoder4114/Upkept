"""Anything that can expire: a passport, a policy, a warranty, a subscription."""
import uuid
from datetime import date

from sqlalchemy import BigInteger, Date, ForeignKey, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin

CATEGORIES = (
    "identity", "travel", "vehicles", "home", "insurance", "health",
    "money", "work", "school", "purchases", "digital", "personal",
)
STATUSES = ("active", "renewing", "not_renewing", "archived")
RECURRENCES = ("none", "monthly", "yearly")


class Item(IdMixin, TimestampMixin, Base):
    __tablename__ = "items"

    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    category: Mapped[str] = mapped_column(String(16))
    kind: Mapped[str] = mapped_column(String(32))  # passport, car_insurance, warranty, subscription...
    title: Mapped[str] = mapped_column(String(160))
    issuer: Mapped[str | None] = mapped_column(String(160))
    country: Mapped[str | None] = mapped_column(String(2))  # which country's guide applies
    destination: Mapped[str | None] = mapped_column(String(2))  # for visas: which country it is for

    # The full number is encrypted; only the last 4 characters are stored in the clear.
    number_encrypted: Mapped[bytes | None] = mapped_column(LargeBinary)
    number_last4: Mapped[str | None] = mapped_column(String(8))

    starts_on: Mapped[date | None] = mapped_column(Date)
    ends_on: Mapped[date | None] = mapped_column(Date, index=True)

    amount_minor: Mapped[int | None] = mapped_column(BigInteger)  # cents / shillings x100
    currency: Mapped[str | None] = mapped_column(String(3))
    recurrence: Mapped[str] = mapped_column(String(8), default="none")

    status: Mapped[str] = mapped_column(String(16), default="active", index=True)
    notes: Mapped[str | None] = mapped_column(Text)
    # Ticked steps of the "Get it done" checklist, e.g. "compare-quotes,renew"
    checklist_done: Mapped[str] = mapped_column(String(500), default="")

    profile = relationship("Profile", back_populates="items")
    documents = relationship("Document", back_populates="item")
    reminders = relationship("Reminder", back_populates="item", cascade="all, delete-orphan")
