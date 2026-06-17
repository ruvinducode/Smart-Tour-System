"""
Canonical vehicle type matching — keeps driver.vehicle_type aligned with Vehicle.type.
"""

from __future__ import annotations

from app.models import Driver, Vehicle

# Must match frontend vehicleOptions.js and Vehicle seed types exactly.
CANONICAL_VEHICLE_TYPES = {
    "mini car": "Mini car",
    "car": "Car",
    "mini van": "Mini van",
    "van": "Van",
    "suv": "SUV",
    "mini bus": "Mini bus",
    "bus": "Bus",
}


def normalize_vehicle_type(raw: str | None) -> str | None:
    if not raw:
        return None
    cleaned = str(raw).strip()
    if not cleaned:
        return None
    return CANONICAL_VEHICLE_TYPES.get(cleaned.lower(), cleaned)


def vehicle_types_match(left: str | None, right: str | None) -> bool:
    left_norm = normalize_vehicle_type(left)
    right_norm = normalize_vehicle_type(right)
    return bool(left_norm and right_norm and left_norm == right_norm)


def vehicle_ids_for_type(vehicle_type: str | None) -> list[int]:
    canonical = normalize_vehicle_type(vehicle_type)
    if not canonical:
        return []
    return [
        v.id
        for v in Vehicle.query.filter_by(is_active=True).all()
        if normalize_vehicle_type(v.type) == canonical
    ]


def find_approved_drivers_for_vehicle_type(vehicle_type: str | None) -> list[Driver]:
    canonical = normalize_vehicle_type(vehicle_type)
    if not canonical:
        return []
    return [
        d
        for d in Driver.query.filter_by(is_approved=True).all()
        if normalize_vehicle_type(d.vehicle_type) == canonical
    ]
