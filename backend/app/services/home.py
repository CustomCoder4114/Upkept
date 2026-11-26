"""Home list: morning summary text and refill estimates. Pure functions."""
from dataclasses import dataclass
from datetime import date, timedelta

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MAX_NAMED = 3


@dataclass(frozen=True)
class SummaryItem:
    title: str
    days_left: int


def _mid_sentence(title: str) -> str:
    """'Yoghurt' -> 'yoghurt', but keep 'KRA', 'iPhone', 'Paracetamol 500mg' readable."""
    if len(title) > 1 and title[0].isupper() and title[1].islower():
        return title[0].lower() + title[1:]
    return title


def _when(days: int, today: date) -> str:
    if days == 0:
        return "today"
    if days == 1:
        return "tomorrow"
    if days < 7:
        return f"on {WEEKDAYS[(today + timedelta(days=days)).weekday()]}"
    return f"in {days} days"


def summary_text(items: list[SummaryItem], today: date) -> tuple[str, str] | None:
    """('Home: 3 things this week', 'Milk tomorrow, yoghurt on Friday. Cough syrup has expired.')

    None when there's nothing to say, so no empty message is ever sent.
    """
    if not items:
        return None
    items = sorted(items, key=lambda i: i.days_left)
    expired = [i for i in items if i.days_left < 0]
    coming = [i for i in items if i.days_left >= 0]

    sentences = []
    if coming:
        named = [f"{_mid_sentence(i.title)} {_when(i.days_left, today)}" for i in coming[:MAX_NAMED]]
        more = len(coming) - MAX_NAMED
        text = ", ".join(named) + (f" and {more} more" if more > 0 else "")
        sentences.append(text[0].upper() + text[1:] + ".")
    if expired:
        if len(expired) == 1:
            sentences.append(f"{expired[0].title} has expired.")
        else:
            sentences.append(f"{len(expired)} things have expired.")

    n = len(items)
    title = f"Home: {n} thing{'s' if n != 1 else ''} this week"
    return title, " ".join(sentences)


def next_refill(started_on: date | None, cycle_days: int | None, today: date) -> tuple[int, date]:
    """After "Refilled today": the new estimated cycle length and next refill date.

    Blends the old estimate with how long the last one actually lasted, so the
    estimate settles over a few refills and one odd month doesn't throw it off.
    """
    observed = (today - started_on).days if started_on and started_on < today else None
    if observed is not None and not 1 <= observed <= 730:
        observed = None  # ignore nonsense (same-day taps, very old start dates)
    if cycle_days and observed:
        cycle = round(0.6 * cycle_days + 0.4 * observed)
    else:
        cycle = cycle_days or observed or 30
    return cycle, today + timedelta(days=cycle)
