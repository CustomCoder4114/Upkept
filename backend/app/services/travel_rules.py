"""Travel check: is everyone on a trip ready? Pure functions.

Passport-validity rules come from /content/travel/passport-validity.json, per
destination. Unknown destinations never produce a hard "Not ready" on a guess:
they get a "check" telling the user to confirm on the official site.
"""
import calendar
import json
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path

RENEWAL_LEAD_DAYS = 45  # "renew by" = this many days before departure
VISA_LEAD_DAYS = 30


@dataclass(frozen=True)
class ValidityRule:
    rule: str  # duration_of_stay | months_after_arrival | months_after_departure | unknown
    months: int = 0
    verified: bool = False
    source_url: str | None = None
    last_checked: str | None = None


@dataclass(frozen=True)
class TravelDoc:
    kind: str  # passport | visa | travel_insurance
    ends_on: date | None
    destination: str | None = None  # for visas


@dataclass(frozen=True)
class Traveller:
    name: str
    nationality: str | None
    docs: list[TravelDoc]


@dataclass(frozen=True)
class Issue:
    traveller: str
    code: str
    severity: str  # blocker | check | tip
    message: str
    detail: str = ""
    fix_by: date | None = None
    guide_item: str | None = None


@dataclass
class TripCheck:
    status: str  # ready | check | not_ready
    issues: list[Issue] = field(default_factory=list)
    ready_travellers: list[str] = field(default_factory=list)
    rule: ValidityRule | None = None


def load_validity_rules(content_dir: Path) -> tuple[dict[str, ValidityRule], ValidityRule]:
    data = json.loads((content_dir / "travel" / "passport-validity.json").read_text(encoding="utf-8"))
    rules = {code: ValidityRule(**r) for code, r in data["rules"].items()}
    return rules, ValidityRule(**data["default"])


def add_months(d: date, months: int) -> date:
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    return date(year, month, min(d.day, calendar.monthrange(year, month)[1]))


def months_between(start: date, end: date) -> int:
    """Whole months from start to end (negative if end is before start)."""
    m = (end.year - start.year) * 12 + (end.month - start.month)
    if end.day < start.day:
        m -= 1
    return m


def _latest(docs: list[TravelDoc], kind: str, destination: str | None = None) -> TravelDoc | None:
    found = [d for d in docs if d.kind == kind and d.ends_on and (destination is None or d.destination == destination)]
    return max(found, key=lambda d: d.ends_on) if found else None


def check_trip(
    destination: str,
    starts_on: date,
    ends_on: date,
    travellers: list[Traveller],
    rules: dict[str, ValidityRule],
    default_rule: ValidityRule,
) -> TripCheck:
    rule = rules.get(destination, default_rule)
    result = TripCheck(status="ready", rule=rule)
    renew_by = starts_on - timedelta(days=RENEWAL_LEAD_DAYS)

    for t in travellers:
        before = len([i for i in result.issues if i.severity != "tip"])
        passport = _latest(t.docs, "passport")

        if passport is None:
            result.issues.append(Issue(t.name, "passport_missing", "blocker", "Passport: not added yet",
                                       "Add it so we can check it.", renew_by, "passport"))
        else:
            if rule.rule == "duration_of_stay" or rule.rule == "unknown":
                needed_until = ends_on
            elif rule.rule == "months_after_arrival":
                needed_until = add_months(starts_on, rule.months)
            else:  # months_after_departure
                needed_until = add_months(ends_on, rule.months)

            left_on_arrival = months_between(starts_on, passport.ends_on)
            if passport.ends_on < needed_until:
                msg = ("Passport: expires during the trip" if passport.ends_on < ends_on
                       else f"Passport: only {left_on_arrival} months left on arrival")
                result.issues.append(Issue(t.name, "passport_validity", "blocker", msg,
                                           f"Expires {passport.ends_on:%b %Y}. Renew by {renew_by:%-d %B}.",
                                           renew_by, "passport"))
            elif rule.rule == "unknown" and passport.ends_on < add_months(starts_on, 6):
                result.issues.append(Issue(t.name, "passport_rule_unknown", "check",
                                           f"Passport: {left_on_arrival} months left on arrival",
                                           "Many countries need 6 months. Check this destination's official entry rules.",
                                           renew_by, "passport"))

        if t.nationality and t.nationality != destination:
            visa = _latest(t.docs, "visa", destination)
            if visa is None:
                result.issues.append(Issue(t.name, "visa_missing", "check", "Visa: not added yet",
                                           "Check whether you need one and apply in time.",
                                           starts_on - timedelta(days=VISA_LEAD_DAYS), "visa"))
            elif visa.ends_on < ends_on:
                result.issues.append(Issue(t.name, "visa_validity", "blocker", "Visa: ends before you come home",
                                           f"Ends {visa.ends_on:%-d %b %Y}.", starts_on - timedelta(days=VISA_LEAD_DAYS),
                                           "visa"))

        insurance = _latest(t.docs, "travel_insurance")
        if insurance is None or insurance.ends_on < ends_on:
            result.issues.append(Issue(t.name, "travel_insurance", "tip", "Travel insurance",
                                       "Not required, but recommended."))

        if len([i for i in result.issues if i.severity != "tip"]) == before:
            result.ready_travellers.append(t.name)

    severities = {i.severity for i in result.issues}
    result.status = "not_ready" if "blocker" in severities else "check" if "check" in severities else "ready"
    return result
