"""Life in Order score (0-100). Pure function.

  40 pts  coverage   - the core areas of life have at least one item
  40 pts  validity   - share of items that haven't expired
  20 pts  on time    - share of reminders acted on before the end date
"""
from dataclasses import dataclass

CORE_AREAS: dict[str, str] = {
    "identity": "Add your national ID",
    "travel": "Add your passport",
    "insurance": "Add your car or home insurance",
    "health": "Add your medical cover",
    "money": "Add a subscription or bill",
}
COVERAGE_POINTS = 40
VALIDITY_POINTS = 40
ON_TIME_POINTS = 20


@dataclass(frozen=True)
class ScoreInput:
    category: str
    days_left: int | None
    status: str = "active"


@dataclass(frozen=True)
class Suggestion:
    text: str
    points: int


def life_in_order(items: list[ScoreInput], on_time_ratio: float | None) -> tuple[int, list[Suggestion]]:
    active = [i for i in items if i.status not in ("archived", "not_renewing")]
    per_area = COVERAGE_POINTS // len(CORE_AREAS)
    covered = {i.category for i in active} & set(CORE_AREAS)
    suggestions = [Suggestion(text, per_area) for area, text in CORE_AREAS.items() if area not in covered]

    if not active:
        return 0, suggestions

    coverage = per_area * len(covered)
    valid = sum(1 for i in active if i.days_left is None or i.days_left >= 0)
    validity = round(VALIDITY_POINTS * valid / len(active))
    # New users with no reminder history get half marks, not zero.
    ratio = 0.5 if on_time_ratio is None else max(0.0, min(1.0, on_time_ratio))
    on_time = round(ON_TIME_POINTS * ratio)

    if valid < len(active):
        expired = len(active) - valid
        suggestions.insert(0, Suggestion(f"Renew {expired} expired item{'s' if expired > 1 else ''}", 0))
    return min(100, coverage + validity + on_time), suggestions
