import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import accessible_profile_ids, current_user, get_profile
from app.models import Profile, User
from app.schemas import ProfileIn, ProfileOut

router = APIRouter(prefix="/profiles", tags=["profiles"])

FREE_PLAN_PROFILES = 1  # plan: free = 1 profile; Premium adds family profiles
FAMILY_LIMIT_ON = False  # switch on when Premium billing launches
MAX_PROFILES = 12  # you + 11 people, a sanity limit


@router.get("", response_model=list[ProfileOut])
def list_profiles(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Profile).where(Profile.id.in_(accessible_profile_ids(db, user)))
                      .order_by(Profile.relation != "self", Profile.created_at)).all()


@router.post("", response_model=ProfileOut, status_code=201)
def create_profile(body: ProfileIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned = db.scalars(select(Profile.id).where(Profile.owner_id == user.id)).all()
    # Free for everyone until Premium billing exists; then turn this limit back on.
    if FAMILY_LIMIT_ON and user.plan == "free" and len(owned) >= FREE_PLAN_PROFILES:
        raise HTTPException(402, "Family profiles are part of Premium")
    if len(owned) >= MAX_PROFILES:
        raise HTTPException(400, f"You can add up to {MAX_PROFILES - 1} family members")
    profile = Profile(owner_id=user.id, **body.model_dump())
    db.add(profile)
    db.flush()
    return profile


@router.patch("/{profile_id}", response_model=ProfileOut)
def update_profile(profile_id: uuid.UUID, body: ProfileIn, user: User = Depends(current_user),
                   db: Session = Depends(get_db)):
    profile = get_profile(db, user, profile_id, edit=True)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(profile, k, v)
    return profile


@router.delete("/{profile_id}", status_code=204)
def delete_profile(profile_id: uuid.UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    profile = get_profile(db, user, profile_id, edit=True)
    if profile.owner_id != user.id:
        raise HTTPException(403, "Only the owner can delete a profile")
    if profile.relation == "self":
        raise HTTPException(400, "Delete your account instead")
    db.delete(profile)
