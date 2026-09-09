"""Calendar-date reminder categories, independent of storage and food-safety decisions."""

from datetime import date, datetime
from typing import Literal

UrgencyTier = Literal["review", "use_today", "use_soon", "coming_up", "neutral", "unknown"]


def urgency_tier(item_date: date | None, *, today: date) -> UrgencyTier:
    """Classify a recorded date using the caller's explicit local calendar date.

    The service supplies ``today`` in the applicable local timezone. Requiring dates
    prevents a server clock or elapsed-hour calculation from changing the boundary.
    This function neither estimates dates nor decides whether food is safe to eat.
    """
    if not isinstance(today, date) or isinstance(today, datetime):
        raise TypeError("today must be a local calendar date.")
    if item_date is None:
        return "unknown"
    if not isinstance(item_date, date) or isinstance(item_date, datetime):
        raise TypeError("item_date must be a calendar date or None.")

    days = (item_date - today).days
    if days < 0:
        return "review"
    if days == 0:
        return "use_today"
    if days <= 2:
        return "use_soon"
    if days <= 5:
        return "coming_up"
    return "neutral"
