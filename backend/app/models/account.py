"""A bank or mobile-money account the person adds by hand. Never connected to the bank."""
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TimestampMixin


class Account(IdMixin, TimestampMixin, Base):
    __tablename__ = "accounts"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(60))  # "Salary account", "M-Pesa"
    bank: Mapped[str | None] = mapped_column(String(80))  # "Equity Bank", "Chase"...
    last4: Mapped[str | None] = mapped_column(String(4))  # only the last 4 digits, ever
    balance_minor: Mapped[int | None] = mapped_column(BigInteger)  # typed in by the person
    balance_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    currency: Mapped[str] = mapped_column(String(3))
