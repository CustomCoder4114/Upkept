"""Country renewal guides, loaded from /content/guides/<country>/<item>.json.

The same files build the website's guide pages. Every guide must name its
official source and when it was last checked; tests fail if a guide is stale.
"""
import json
from datetime import date
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, Field, HttpUrl, field_validator

MAX_AGE_DAYS = 183  # about 6 months


class GuideSource(BaseModel):
    title: str
    url: HttpUrl
    official: bool = False


class GuideCost(BaseModel):
    amount: float | None = None
    currency: str = Field(min_length=3, max_length=3)
    note: str  # e.g. "Pay the amount on your eCitizen invoice"
    verified: bool  # checked against an official source on last_checked


class GuideStep(BaseModel):
    id: str = Field(pattern=r"^[a-z0-9-]+$")
    title: str
    detail: str


class Guide(BaseModel):
    country: str = Field(pattern=r"^[A-Z]{2}$")
    item: str = Field(pattern=r"^[a-z_]+$")  # matches Item.kind
    title: str
    summary: str
    official_url: HttpUrl
    sources: list[GuideSource] = Field(min_length=1)
    last_checked: date
    cost: GuideCost
    processing_time: str
    renew_before_days: int | None = None
    documents_needed: list[str] = Field(min_length=1)
    steps: list[GuideStep] = Field(min_length=2)
    tips: list[str] = []

    @field_validator("sources")
    @classmethod
    def needs_an_official_source(cls, v: list[GuideSource]) -> list[GuideSource]:
        if not any(s.official for s in v):
            raise ValueError("at least one source must be official (a government site)")
        return v

    @property
    def slug(self) -> str:
        return self.item.replace("_", "-")


def load_guides(content_dir: Path) -> dict[tuple[str, str], Guide]:
    """Read and validate every guide. Raises on the first invalid file."""
    guides: dict[tuple[str, str], Guide] = {}
    for path in sorted((content_dir / "guides").glob("*/*.json")):
        guide = Guide.model_validate(json.loads(path.read_text(encoding="utf-8")))
        expected = (path.parent.name.upper(), path.stem.replace("-", "_"))
        if (guide.country, guide.item) != expected:
            raise ValueError(f"{path}: country/item {guide.country}/{guide.item} don't match the file path")
        guides[(guide.country, guide.item)] = guide
    return guides


def stale_guides(guides: dict[tuple[str, str], Guide], today: date, max_age_days: int = MAX_AGE_DAYS) -> list[Guide]:
    return [g for g in guides.values() if (today - g.last_checked).days > max_age_days]


@lru_cache
def cached_guides(content_dir: str) -> dict[tuple[str, str], Guide]:
    return load_guides(Path(content_dir))
