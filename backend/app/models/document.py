"""Stored photos and PDFs. The bytes live in R2, encrypted; this is the record."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, TimestampMixin


class Document(IdMixin, TimestampMixin, Base):
    __tablename__ = "documents"

    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    item_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("items.id", ondelete="SET NULL"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    storage_key: Mapped[str] = mapped_column(String(255), unique=True)
    content_type: Mapped[str] = mapped_column(String(100))
    size_bytes: Mapped[int] = mapped_column(Integer)
    version: Mapped[int] = mapped_column(Integer, default=1)  # goes up after each renewal
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    keep_offline: Mapped[bool] = mapped_column(Boolean, default=False)

    item = relationship("Item", back_populates="documents")


class ScanUsage(IdMixin, Base):
    """One row per AI call, for the free-plan limit and the monthly spending cap."""

    __tablename__ = "scan_usage"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(32))
    cost_usd_micros: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
