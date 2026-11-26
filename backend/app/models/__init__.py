"""Import every model so Alembic and SQLAlchemy can see all tables."""
from app.models.account import Account
from app.models.base import Base
from app.models.device import Device
from app.models.document import Document, ScanUsage
from app.models.item import Item
from app.models.profile import Profile
from app.models.reminder import DailySummary, Reminder, ReminderDelivery
from app.models.share import ProfileShare, ShareLink
from app.models.trip import Trip, trip_travellers
from app.models.user import User

__all__ = [
    "Account", "Base", "DailySummary", "Device", "Document", "Item", "Profile", "ProfileShare", "Reminder",
    "ReminderDelivery", "ScanUsage", "ShareLink", "Trip", "User", "trip_travellers",
]
