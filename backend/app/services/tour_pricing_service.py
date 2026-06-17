"""
Tour pricing and duration calculations — single source of truth.

Duration:
  total_days = (end_date - start_date).days + 1  (inclusive of both dates)

Price (LKR):
  estimated_price =
    base_fare +
    (total_days × price_per_day) +
    (total_distance_km × price_per_km)

All vehicle rates are read from the database.
"""

from __future__ import annotations

import math
from datetime import date, datetime
from typing import Any

# Applied when OSRM distance is unavailable and we fall back to straight-line segments.
ROAD_FACTOR = 1.25


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two coordinates in kilometres."""
    radius_km = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_km * c


def parse_date(value: Any, field_name: str = "date") -> date | None:
    """Parse YYYY-MM-DD strings or pass through date objects."""
    if value is None:
        return None
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError(f"Invalid {field_name} format (YYYY-MM-DD required)") from exc


def calculate_total_days(start_date: date, end_date: date) -> int:
    """
    Inclusive calendar duration between travel dates.
    Example: 2026-06-01 → 2026-06-03 = 3 days.
    """
    if end_date < start_date:
        raise ValueError("end_date cannot be earlier than start_date")
    return (end_date - start_date).days + 1


def calculate_route_distance_km(
    locations: list[dict] | None,
    total_distance_km: float | None = None,
) -> float:
    """
    Prefer routed road distance supplied by the client (OSRM).
    Otherwise sum haversine segments between consecutive stops with a road factor.
    """
    if total_distance_km is not None and float(total_distance_km) > 0:
        return round(float(total_distance_km), 1)

    if not locations or len(locations) < 2:
        return 0.0

    total = 0.0
    for index in range(len(locations) - 1):
        start = locations[index]
        end = locations[index + 1]
        total += haversine(
            start.get("latitude", 0),
            start.get("longitude", 0),
            end.get("latitude", 0),
            end.get("longitude", 0),
        )
    return round(total * ROAD_FACTOR, 1)


def calculate_estimated_price(vehicle, total_distance_km: float, total_days: int) -> float:
    """
    estimated_price =
      base_fare +
      (total_days × price_per_day) +
      (total_distance_km × price_per_km)
    """
    base_fare = vehicle.base_fare or 0
    price_per_km = vehicle.price_per_km or 0
    price_per_day = vehicle.price_per_day or 0

    return round(
        base_fare + (total_days * price_per_day) + (total_distance_km * price_per_km),
        2,
    )


def serialize_vehicle(vehicle) -> dict:
    """Vehicle details returned alongside pricing estimates."""
    return {
        "id": vehicle.id,
        "type": vehicle.type,
        "base_fare": vehicle.base_fare,
        "price_per_km": vehicle.price_per_km,
        "price_per_day": vehicle.price_per_day,
        "max_passengers": vehicle.max_passengers,
    }


def build_tour_estimate(
    vehicle,
    locations: list[dict] | None,
    start_date: Any,
    end_date: Any,
    total_distance_km: float | None = None,
) -> dict:
    """Compute distance, inclusive days, price, and vehicle metadata."""
    parsed_start = parse_date(start_date, "start_date")
    parsed_end = parse_date(end_date, "end_date")

    if parsed_start is None or parsed_end is None:
        raise ValueError("start_date and end_date are required")

    total_days = calculate_total_days(parsed_start, parsed_end)
    distance = calculate_route_distance_km(locations, total_distance_km)
    estimated_price = calculate_estimated_price(vehicle, distance, total_days)

    fee_preview = None
    try:
        from app.services.finance_service import calculate_financial_breakdown
        fee_preview = calculate_financial_breakdown(estimated_price)
    except Exception:
        fee_preview = None

    result = {
        "total_distance_km": distance,
        "total_days": total_days,
        "estimated_price": estimated_price,
        "start_date": parsed_start.isoformat(),
        "end_date": parsed_end.isoformat(),
        "vehicle": serialize_vehicle(vehicle),
    }
    if fee_preview:
        result["fee_preview"] = fee_preview
    return result
