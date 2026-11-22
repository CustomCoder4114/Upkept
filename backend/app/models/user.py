from sqlalchemy import String
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

    profiles = relationship("Profile", back_populates="owner", cascade="all, delete-orphan")
    devices = relationship("Device", back_populates="user", cascade="all, delete-orphan")
