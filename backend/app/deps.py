"""Shared FastAPI dependencies: the current user and access checks."""
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.database import get_db
from app.models import Item, Profile, ProfileShare, User

_bearer = HTTPBearer(auto_error=False)


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer), db: Session = Depends(get_db)
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    try:
        user_id = decode_token(creds.credentials, "access")
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired, please sign in again")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account not found")
    return user


def accessible_profile_ids(db: Session, user: User, edit: bool = False):
    """Profiles you own, plus ones shared with you (non-emergency)."""
    shared = select(ProfileShare.profile_id).where(
        ProfileShare.grantee_user_id == user.id, ProfileShare.emergency_only.is_(False)
    )
    if edit:
        shared = shared.where(ProfileShare.role == "editor")
    return select(Profile.id).where(or_(Profile.owner_id == user.id, Profile.id.in_(shared)))


def get_profile(db: Session, user: User, profile_id: uuid.UUID, edit: bool = False) -> Profile:
    profile = db.scalar(select(Profile).where(Profile.id == profile_id,
                                              Profile.id.in_(accessible_profile_ids(db, user, edit))))
    if profile is None:
        # 404 rather than 403 so we don't confirm the profile exists
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")
    return profile


def get_item(db: Session, user: User, item_id: uuid.UUID, edit: bool = False) -> Item:
    item = db.scalar(select(Item).where(Item.id == item_id,
                                        Item.profile_id.in_(accessible_profile_ids(db, user, edit))))
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    return item
