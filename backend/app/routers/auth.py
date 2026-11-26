from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import (create_access_token, create_refresh_token, decode_token, hash_password,
                               verify_password)
from app.database import get_db
from app.deps import current_user
from app.models import Document, Profile, User
from app.schemas import LoginIn, RefreshIn, RegisterIn, TokensOut, UserOut, UserPatch
from app.services import storage

router = APIRouter(prefix="/auth", tags=["auth"])


def _tokens(user: User) -> TokensOut:
    return TokensOut(access_token=create_access_token(user.id), refresh_token=create_refresh_token(user.id))


@router.post("/register", response_model=TokensOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    user = User(email=email, password_hash=hash_password(body.password), name=body.name, country=body.country,
                timezone=body.timezone, currency=body.currency, language=body.language)
    db.add(user)
    db.flush()
    db.add(Profile(owner_id=user.id, name=body.name, relation="self", nationality=body.country))
    return _tokens(user)


@router.post("/login", response_model=TokensOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password")
    return _tokens(user)


@router.post("/refresh", response_model=TokensOut)
def refresh(body: RefreshIn, db: Session = Depends(get_db)):
    try:
        user_id = decode_token(body.refresh_token, "refresh")
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in again")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Please sign in again")
    return _tokens(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(body: UserPatch, user: User = Depends(current_user)):
    """Name, time zone and morning summary settings."""
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(user, k, v)
    return user


@router.delete("/me", status_code=204)
def delete_account(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Full account and data deletion: files first, then every row (cascades)."""
    profile_ids = select(Profile.id).where(Profile.owner_id == user.id)
    for key in db.scalars(select(Document.storage_key).where(Document.profile_id.in_(profile_ids))):
        storage.delete(key)
    storage.delete_prefix(f"u/{user.id}/")
    db.delete(user)
