import uuid
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import current_user, get_profile
from app.models import Item, Trip, User
from app.schemas import TripCheckOut, TripIn, TripIssueOut, TripOut
from app.services.travel_rules import TravelDoc, Traveller, check_trip, load_validity_rules

router = APIRouter(prefix="/trips", tags=["travel"])
TRAVEL_KINDS = ("passport", "visa", "travel_insurance")


@lru_cache
def _rules():
    return load_validity_rules(get_settings().content_dir)


@router.get("", response_model=list[TripOut])
def list_trips(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Trip).where(Trip.user_id == user.id).order_by(Trip.starts_on)).all()


@router.post("", response_model=TripOut, status_code=201)
def create_trip(body: TripIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if body.ends_on < body.starts_on:
        raise HTTPException(400, "The trip ends before it starts")
    travellers = [get_profile(db, user, pid) for pid in body.traveller_ids]
    trip = Trip(user_id=user.id, destination=body.destination, city=body.city,
                starts_on=body.starts_on, ends_on=body.ends_on, travellers=travellers)
    db.add(trip)
    db.flush()
    return trip


@router.get("/{trip_id}/check", response_model=TripCheckOut)
def check(trip_id: uuid.UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    trip = db.scalar(select(Trip).where(Trip.id == trip_id, Trip.user_id == user.id))
    if trip is None:
        raise HTTPException(404, "Trip not found")

    travellers = []
    for p in trip.travellers:
        docs = db.scalars(select(Item).where(Item.profile_id == p.id, Item.kind.in_(TRAVEL_KINDS),
                                             Item.status != "archived")).all()
        travellers.append(Traveller(p.name, p.nationality,
                                    [TravelDoc(d.kind, d.ends_on, d.destination) for d in docs]))

    rules, default = _rules()
    result = check_trip(trip.destination, trip.starts_on, trip.ends_on, travellers, rules, default)
    return TripCheckOut(
        trip=TripOut.model_validate(trip), status=result.status,
        issues=[TripIssueOut(**i.__dict__) for i in result.issues],
        ready_travellers=result.ready_travellers,
        rule_verified=bool(result.rule and result.rule.verified),
        rule_source_url=result.rule.source_url if result.rule else None,
    )


@router.delete("/{trip_id}", status_code=204)
def delete_trip(trip_id: uuid.UUID, user: User = Depends(current_user), db: Session = Depends(get_db)):
    trip = db.scalar(select(Trip).where(Trip.id == trip_id, Trip.user_id == user.id))
    if trip:
        db.delete(trip)
