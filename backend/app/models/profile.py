"""A person whose things Upkept tracks: you, your child, your mum."""
import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin

RELATIONS = ("self", "child", "partner", "parent", "other")


class Profile(IdMixin, TimestampMixin, Base):
    __tablename__ = "profiles"

    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    relation: Mapped[str] = mapped_column(String(16), default="self")
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    nationality: Mapped[str | None] = mapped_column(String(2))  # ISO country code, used by travel check

    owner = relationship("User", back_populates="profiles")
    items = relationship("Item", back_populates="profile", cascade="all, delete-orphan")
