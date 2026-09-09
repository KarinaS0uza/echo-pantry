"""FR-062: explicit dates, every reminder boundary, and no automatic disposal."""

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from pantry.domain.urgency import urgency_tier


@pytest.mark.parametrize(
    ("offset", "expected"),
    [
        (-365, "review"),
        (-1, "review"),
        (0, "use_today"),
        (1, "use_soon"),
        (2, "use_soon"),
        (3, "coming_up"),
        (5, "coming_up"),
        (6, "neutral"),
        (365, "neutral"),
    ],
)
def test_every_tier_boundary(offset, expected):
    today = date(2026, 9, 8)
    assert urgency_tier(today + timedelta(days=offset), today=today) == expected


def test_missing_date_stays_explicitly_unknown():
    assert urgency_tier(None, today=date(2026, 9, 8)) == "unknown"


@pytest.mark.parametrize(
    ("today", "item_date", "expected"),
    [
        (date(2026, 12, 31), date(2027, 1, 1), "use_soon"),
        (date(2028, 2, 28), date(2028, 3, 1), "use_soon"),
        (date(2027, 2, 28), date(2027, 3, 3), "coming_up"),
    ],
)
def test_calendar_rollovers(today, item_date, expected):
    assert urgency_tier(item_date, today=today) == expected


def test_local_day_can_differ_from_utc_day():
    instant = datetime(2026, 9, 9, 1, tzinfo=ZoneInfo("UTC"))
    local_day = instant.astimezone(ZoneInfo("America/Los_Angeles")).date()
    assert urgency_tier(date(2026, 9, 8), today=local_day) == "use_today"
    assert urgency_tier(date(2026, 9, 8), today=instant.date()) == "review"


@pytest.mark.parametrize("day", [date(2026, 3, 8), date(2026, 11, 1)])
def test_daylight_saving_boundaries_use_calendar_days(day):
    assert urgency_tier(day + timedelta(days=2), today=day) == "use_soon"
    assert urgency_tier(day + timedelta(days=3), today=day) == "coming_up"


def test_past_date_only_requests_review_and_preserves_stock():
    item = {"date": date(2026, 9, 7), "quantity": 2, "date_kind": "label"}
    original = item.copy()
    assert urgency_tier(item["date"], today=date(2026, 9, 8)) == "review"
    assert item == original


@pytest.mark.parametrize("value", ["2026-09-08", datetime(2026, 9, 8), 0])
def test_rejects_non_calendar_item_dates(value):
    with pytest.raises(TypeError, match="item_date"):
        urgency_tier(value, today=date(2026, 9, 8))


@pytest.mark.parametrize("value", [None, "2026-09-08", datetime(2026, 9, 8)])
def test_requires_an_explicit_calendar_today_even_for_unknown_items(value):
    with pytest.raises(TypeError, match="today"):
        urgency_tier(None, today=value)
