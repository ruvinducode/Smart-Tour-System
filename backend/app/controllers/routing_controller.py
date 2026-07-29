from flask import Blueprint, request, jsonify

from app import limiter
from app.services.routing_service import get_route, RoutingError

routing_bp = Blueprint("routing_bp", __name__)


@routing_bp.route("/routing/route", methods=["POST"])
# This endpoint is intentionally public (guests plan trips before logging in),
# but it directly proxies to the paid/quota-limited OpenRouteService API.
# Two separate limits are needed here, not one:
#  - per-IP: stops a single abusive/scripted client from hammering it
#  - global (shared across ALL visitors): OpenRouteService's free-tier quota
#    is a single account-wide allowance — many different legitimate users
#    browsing at once could still collectively exceed it, which per-IP
#    limiting alone can never catch. Kept safely under ORS's real ~40/min
#    cap (confirmed live: it started rejecting us at 429 past that point).
@limiter.limit("20 per minute")
@limiter.limit("35 per minute", key_func=lambda: "global-ors-quota")
def compute_route():
    """
    Body: { "coordinates": [[lng, lat], [lng, lat], ...] }
    Returns: { distance_km, duration_min, geometry: [[lat, lng], ...] }
    """
    data = request.get_json(silent=True) or {}
    coordinates = data.get("coordinates")

    try:
        result = get_route(coordinates)
        return jsonify(result), 200
    except RoutingError as exc:
        return jsonify({"message": str(exc)}), 502
