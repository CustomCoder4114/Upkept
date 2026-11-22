"""Family access and one-off share links (routes come in Phase 2)."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TimestampMixin


class ProfileShare(IdMixin, TimestampMixin, Base):
    """Another user can see (or edit) one of your profiles, e.g. your brother sees Mum's."""

    __tablename__ = "profile_shares"

    profile_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    grantee_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(16), default="viewer")  # viewer | editor
    # Emergency access: only opens after the owner fails to respond for this many hours.
    emergency_only: Mapped[bool] = mapped_column(default=False)
    emergency_wait_hours: Mapped[int | None] = mapped_column(Integer)


class ShareLink(IdMixin, TimestampMixin, Base):
    """An expiring link to one document, e.g. an ID copy for a landlord."""

    __tablename__ = "share_links"

    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)  # sha256 of the token in the URL
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    max_views: Mapped[int | None] = mapped_column(Integer)
    views: Mapped[int] = mapped_column(Integer, default=0)
