"""Fails the build when a guide is invalid or hasn't been checked in 6 months."""
import json
from datetime import date

import pytest

from app.services.guides import Guide, load_guides, stale_guides


def test_all_guides_are_valid(content_dir):
    guides = load_guides(content_dir)
    assert ("KE", "passport") in guides
    assert ("KE", "driving_licence") in guides


def test_no_guide_is_older_than_six_months(content_dir):
    stale = stale_guides(load_guides(content_dir), date.today())
    assert not stale, "Re-check these guides and update last_checked: " + ", ".join(
        f"{g.country}/{g.item} ({g.last_checked})" for g in stale)


def test_every_guide_has_an_official_source(content_dir):
    for g in load_guides(content_dir).values():
        assert any(s.official for s in g.sources)


def test_unverified_costs_explain_what_to_pay(content_dir):
    for g in load_guides(content_dir).values():
        if not g.cost.verified:
            assert "invoice" in g.cost.note.lower() or "official" in g.cost.note.lower()


def test_guide_without_official_source_is_rejected(content_dir):
    data = json.loads((content_dir / "guides" / "ke" / "passport.json").read_text())
    for s in data["sources"]:
        s["official"] = False
    with pytest.raises(ValueError):
        Guide.model_validate(data)


def test_stale_detection():
    data = {"country": "KE", "item": "passport", "title": "t", "summary": "s",
            "official_url": "https://immigration.go.ke/", "last_checked": "2025-01-01",
            "sources": [{"title": "x", "url": "https://immigration.go.ke/", "official": True}],
            "cost": {"currency": "KES", "note": "pay the invoice", "verified": False},
            "processing_time": "weeks", "documents_needed": ["ID"],
            "steps": [{"id": "a", "title": "A", "detail": "a"}, {"id": "b", "title": "B", "detail": "b"}]}
    g = Guide.model_validate(data)
    assert stale_guides({("KE", "passport"): g}, date(2026, 11, 22)) == [g]
