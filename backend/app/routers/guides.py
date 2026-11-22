from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.services.guides import Guide, cached_guides

router = APIRouter(prefix="/guides", tags=["guides"])


@router.get("", response_model=list[Guide])
def list_guides(country: str | None = None):
    guides = cached_guides(str(get_settings().content_dir)).values()
    return [g for g in guides if country is None or g.country == country.upper()]


@router.get("/{country}/{item}", response_model=Guide)
def get_guide(country: str, item: str):
    guide = cached_guides(str(get_settings().content_dir)).get((country.upper(), item.replace("-", "_")))
    if guide is None:
        raise HTTPException(404, "We don't have a guide for this yet")
    return guide
