from sqlalchemy import BigInteger, Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin


class User(IdMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(32), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(120))
    country: Mapped[str] = mapped_column(String(2))  # ISO 3166-1 alpha-2, e.g. "KE"
    language: Mapped[str] = mapped_column(String(8), default="en")
    timezone: Mapped[str] = mapped_column(String(64), default="Africa/Nairobi")
    currency: Mapped[str] = mapped_column(String(3), default="KES")
    plan: Mapped[str] = mapped_column(String(16), default="free")  # free | premium | family
    # Home list morning summary
    summary_hour: Mapped[int] = mapped_column(Integer, default=7, server_default="7")
    summary_include_family: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    # Subscriptions planner: monthly budget in the user's currency, minor units
    monthly_budget_minor: Mapped[int | None] = mapped_column(BigInteger)
    # Money plan: take-home income per month and the day of the month it arrives
    monthly_income_minor: Mapped[int | None] = mapped_column(BigInteger)
    payday: Mapped[int | None] = mapped_column(Integer)

    profiles = relationship("Profile", back_populates="owner", cascade="all, delete-orphan")
    devices = relationship("Device", back_populates="user", cascade="all, delete-orphan")
