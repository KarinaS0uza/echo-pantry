"""Pure recommendation ordering using facts prepared by the meal service."""

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, datetime

from pantry.domain.urgency import UrgencyTier

URGENCY_ORDER = {
    "review": 0,
    "use_today": 1,
    "use_soon": 2,
    "coming_up": 3,
    "neutral": 4,
    "unknown": 5,
}


@dataclass(frozen=True, kw_only=True)
class RankingInput:
    """Facts about ingredients actually used, never unrelated pantry stock.

    The caller resolves fresh/short-lived foods and local calendar dates from
    verified inputs. Unknown dates stay None. purchase_cost_cents is the valid
    total for all missing packages, or None for incomplete/unavailable estimates.
    Price eligibility, freshness, and merchant compatibility belong to pricing,
    not this sorter. No portion cost or guessed zero should be supplied here.
    """

    recipe_id: str
    title: str
    is_complete_match: bool
    uses_short_lived_food: bool = False
    soonest_use_by_date: date | None = None
    oldest_stock_date: date | None = None
    favorite: bool = False
    purchase_cost_cents: int | None = None
    missing_count: int = 0
    urgency_tier: UrgencyTier = "unknown"

    def __post_init__(self):
        for value in (self.soonest_use_by_date, self.oldest_stock_date):
            if value is not None and (not isinstance(value, date) or isinstance(value, datetime)):
                raise ValueError("Ranking dates must be calendar dates or None.")
        cost = self.purchase_cost_cents
        if cost is not None and (type(cost) is not int or cost < 0):
            raise ValueError("Package cost must be nonnegative integer cents or None.")
        if type(self.missing_count) is not int or self.missing_count < 0:
            raise ValueError("Missing count must be a nonnegative integer.")
        if self.urgency_tier not in URGENCY_ORDER:
            raise ValueError("Unknown urgency tier.")


def _date_key(value):
    return value is None, value or date.max


def _key(item):
    identity = (item.title.casefold(), item.title, item.recipe_id)
    if item.is_complete_match:
        return (
            0,
            not item.uses_short_lived_food,
            _date_key(item.soonest_use_by_date),
            _date_key(item.oldest_stock_date),
            not item.favorite,
            identity,
        )
    return (
        1,
        not item.favorite,
        item.purchase_cost_cents is None,
        item.purchase_cost_cents if item.purchase_cost_cents is not None else 0,
        item.missing_count,
        URGENCY_ORDER[item.urgency_tier],
        identity,
    )


def rank(matches: Iterable[RankingInput]) -> list[RankingInput]:
    """Return a new ordered list, preserving unknown facts and input records."""
    return sorted(matches, key=_key)
