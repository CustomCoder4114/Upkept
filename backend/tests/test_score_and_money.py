from datetime import date

from app.services.money import Charge, summary
from app.services.score import ScoreInput, life_in_order


def test_empty_account_scores_zero_with_suggestions():
    score, suggestions = life_in_order([], None)
    assert score == 0
    assert len(suggestions) == 5 and all(s.points == 8 for s in suggestions)


def test_score_rises_with_coverage_and_validity():
    few, _ = life_in_order([ScoreInput("travel", 300)], None)
    more, sugg = life_in_order([ScoreInput("travel", 300), ScoreInput("identity", 900),
                                ScoreInput("insurance", 102), ScoreInput("money", 3)], 1.0)
    assert few < more <= 100
    assert [s.text for s in sugg] == ["Add your medical cover"]


def test_expired_items_lower_the_score_and_come_first():
    ok, _ = life_in_order([ScoreInput("travel", 30)], 1.0)
    bad, sugg = life_in_order([ScoreInput("travel", -5)], 1.0)
    assert bad < ok
    assert sugg[0].text == "Renew 1 expired item"


def test_money_summary_keeps_currencies_apart():
    charges = [
        Charge("Gym", "money", 2500_00, "KES", "monthly", date(2026, 11, 24)),
        Charge("Car insurance", "insurance", 42000_00, "KES", "yearly", date(2027, 3, 3)),
        Charge("Netflix", "money", 9_99, "USD", "monthly", date(2026, 12, 5)),
    ]
    s = summary(charges, date(2026, 11, 21))
    assert s["totals"]["KES"]["monthly_minor"] == 2500_00 + 3500_00
    assert s["totals"]["USD"]["yearly_minor"] == 9_99 * 12
    assert [u["title"] for u in s["upcoming"]] == ["Gym", "Netflix"]  # car insurance is >90 days away
