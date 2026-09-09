"""Pure Decimal conversions. No density, package-size or count-to-mass guesses."""

from decimal import Decimal, InvalidOperation

CHECK_QUANTITY = "check_quantity"
UNITS = {
    "g": ("mass", Decimal("1")),
    "kg": ("mass", Decimal("1000")),
    "oz": ("mass", Decimal("28.349523125")),
    "lb": ("mass", Decimal("453.59237")),
    "ml": ("volume", Decimal("1")),
    "L": ("volume", Decimal("1000")),
    "fl oz": ("volume", Decimal("29.5735295625")),
    "cup": ("volume", Decimal("236.5882365")),
    "tbsp": ("volume", Decimal("14.78676478125")),
    "tsp": ("volume", Decimal("4.92892159375")),
    "item": ("count", Decimal("1")),
}


def normalize(quantity, unit):
    if quantity is None or isinstance(quantity, bool) or unit not in UNITS:
        return CHECK_QUANTITY
    try:
        value = Decimal(str(quantity))
    except (InvalidOperation, ValueError):
        return CHECK_QUANTITY
    if not value.is_finite() or value < 0:
        return CHECK_QUANTITY
    dimension, factor = UNITS[unit]
    return dimension, value * factor


def convert(quantity, source_unit, target_unit):
    value = normalize(quantity, source_unit)
    if value == CHECK_QUANTITY or target_unit not in UNITS or value[0] != UNITS[target_unit][0]:
        return CHECK_QUANTITY
    return value[1] / UNITS[target_unit][1]


def sufficient(required, owned):
    """Quantity mappings use {quantity, unit}; None owned means absent stock."""
    if owned is None:
        return "missing"
    need = normalize(required.get("quantity"), required.get("unit"))
    have = normalize(owned.get("quantity"), owned.get("unit"))
    if CHECK_QUANTITY in (need, have) or need[0] != have[0]:
        return CHECK_QUANTITY
    return "available" if have[1] >= need[1] else "missing"
