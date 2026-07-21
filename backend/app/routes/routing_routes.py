from flask import Blueprint, request, jsonify

from app.services.routing_service import get_route, RoutingError

routing_bp = Blueprint("routing_bp", __name__)


@routing_bp.route("/routing/route", methods=["POST"])
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
