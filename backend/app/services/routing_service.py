"""
Real road-routing via OpenRouteService (ORS).

Replaces client-side calls to the public OSRM demo server: OSRM is
rate-limited, and its road-network data can leave rural highways poorly
connected (verified against Google Maps for a Padiyatalawa-Kandy route:
OSRM/ORS "fastest" both detoured via Badulla at ~129km vs Google's 108km;
ORS "shortest" preference closes most of that gap at ~120km).

The ORS key lives server-side only — the frontend calls our own
/routing/route endpoint instead of ORS directly, so the key is never
exposed in browser-visible JS.
"""

from __future__ import annotations

import requests
from flask import current_app

ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"


class RoutingError(Exception):
    pass


def get_route(coordinates: list[list[float]]) -> dict:
    """
    coordinates: list of [lng, lat] pairs, in travel order (2+ points).
    Returns: { distance_km, duration_min, geometry: [[lat, lng], ...] }
    """
    api_key = current_app.config.get("ORS_API_KEY")
    if not api_key:
        raise RoutingError("Routing is not configured")

    if not isinstance(coordinates, list) or len(coordinates) < 2:
        raise RoutingError("At least two coordinates are required")

    try:
        response = requests.post(
            ORS_DIRECTIONS_URL,
            headers={
                "Authorization": api_key,
                "Content-Type": "application/json",
            },
            json={"coordinates": coordinates, "preference": "shortest"},
            timeout=10,
        )
    except requests.RequestException as exc:
        raise RoutingError(f"Routing request failed: {exc}") from exc

    if not response.ok:
        raise RoutingError(f"Routing service error: {response.status_code}")

    data = response.json()
    features = data.get("features") or []
    if not features:
        raise RoutingError("No route found")

    feature = features[0]
    properties = feature.get("properties") or {}
    summary = properties.get("summary") or {}
    segments = properties.get("segments") or []
    coords = (feature.get("geometry") or {}).get("coordinates") or []

    return {
        "distance_km": round(summary.get("distance", 0) / 1000, 2),
        "duration_min": round(summary.get("duration", 0) / 60, 1),
        "geometry": [[lat, lng] for lng, lat in coords],
        # Per-leg distance between consecutive waypoints (one entry per stop-to-stop hop).
        "leg_distances_km": [round(seg.get("distance", 0) / 1000, 2) for seg in segments],
    }
