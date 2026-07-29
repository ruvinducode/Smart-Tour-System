from flask import Blueprint, jsonify, request
from app import db
from app.models import Booking, Driver, TourPlan, Vehicle, Location, User

import uuid
import math

# JWT IMPORTS
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

booking_bp = Blueprint("booking_bp", __name__)

# =========================
# CREATE BOOKING (PROTECTED)
# =========================
@booking_bp.route("/create-booking/<int:tour_id>", methods=["POST"])
@jwt_required()
def create_booking(tour_id):

    # Get logged-in user
    user_id = get_jwt_identity()

    # 1. Get tour
    tour = TourPlan.query.get(tour_id)
    if not tour:
        return jsonify({"message": "Tour not found"}), 404

    # SECURITY: ensure user owns this tour
    # Convert both to same type for comparison
    jwt_user_id = int(user_id) if isinstance(user_id, str) else user_id
    tour_owner_id = int(tour.user_id) if isinstance(tour.user_id, str) else tour.user_id

    if tour_owner_id != jwt_user_id:
        return jsonify({"message": "Unauthorized access to this tour"}), 403

    # 2. Get vehicle
    vehicle = Vehicle.query.get(tour.vehicle_id)
    if not vehicle:
        return jsonify({"message": "Vehicle not found"}), 404

    # 3. Get first location
    first_location = Location.query.filter_by(tour_id=tour.id)\
        .order_by(Location.order_index).first()

    if not first_location:
        return jsonify({"message": "Tour location not found"}), 404

    # 4. Get eligible drivers (matching vehicle type, approved & available)
    from app.services.vehicle_matching_service import find_approved_drivers_for_vehicle_type
    drivers = [
        d for d in find_approved_drivers_for_vehicle_type(vehicle.type)
        if d.is_available
    ]

    if not drivers:
        return jsonify({"message": "No available drivers"}), 404

    # 5. Find nearest driver
    nearest_driver = None
    min_distance = float("inf")

    for d in drivers:
        if d.current_location_lat is None or d.current_location_lng is None:
            continue

        distance = math.sqrt(
            (d.current_location_lat - first_location.latitude) ** 2 +
            (d.current_location_lng - first_location.longitude) ** 2
        )

        if distance < min_distance:
            min_distance = distance
            nearest_driver = d

    if not nearest_driver:
        return jsonify({"message": "No drivers with location data"}), 404

    driver = nearest_driver

    # 6. Create booking
    booking_ref = str(uuid.uuid4())[:8]

    new_booking = Booking(
        tour_id=tour.id,
        driver_id=driver.id,
        booking_reference=booking_ref,
        total_price=tour.estimated_price
    )

    # Make driver unavailable
    driver.is_available = False

    db.session.add(new_booking)
    db.session.commit()

    return jsonify({
        "message": "Booking created successfully",
        "booking": {
            "booking_reference": booking_ref,
            "driver_name": driver.full_name,
            "vehicle": vehicle.type,
            "total_price": tour.estimated_price,
            "distance": min_distance
        }
    }), 201


# =========================
# GET ALL BOOKINGS (PROTECTED)
# =========================
@booking_bp.route("/bookings", methods=["GET"])
@jwt_required()
def get_bookings():

    raw = get_jwt_identity()
    try:
        user_id = int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return jsonify({"message": "Invalid user id in token"}), 401

    # 🔥 Only get bookings of this user
    bookings = Booking.query.join(TourPlan)\
        .filter(TourPlan.user_id == user_id).all()

    result = []

    for booking in bookings:
        driver = Driver.query.get(booking.driver_id)

        result.append({
            "booking_id": booking.id,
            "booking_reference": booking.booking_reference,
            "driver_name": driver.full_name if driver else "Unknown",
            "vehicle": driver.vehicle_type if driver else "Unknown",
            "total_price": booking.total_price,
            "status": booking.status
        })

    return jsonify(result), 200


# =========================
# UPDATE BOOKING STATUS (PROTECTED)
# =========================
@booking_bp.route("/booking/status/<int:booking_id>", methods=["PUT"])
@jwt_required()
def update_booking_status(booking_id):

    raw = get_jwt_identity()
    try:
        user_id = int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return jsonify({"message": "Invalid user id in token"}), 401

    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data"}), 400

    status = data.get("status")

    if not status:
        return jsonify({"message": "Status is required"}), 400

    booking = Booking.query.get(booking_id)

    if not booking:
        return jsonify({"message": "Booking not found"}), 404

    # Check ownership - allow admin or tour owner
    tour = TourPlan.query.get(booking.tour_id)
    if not tour:
        return jsonify({"message": "Tour not found"}), 404

    user = User.query.get(user_id) if user_id is not None else None

    if user is None:
        return jsonify({"message": "User not found"}), 404

    is_admin = user.role == "admin"
    if tour.user_id != user_id and not is_admin:
        return jsonify({"message": "Unauthorized"}), 403

    # The tour owner may only cancel — "confirmed"/"ongoing"/"completed" are
    # driver/admin-driven lifecycle transitions handled by the dedicated
    # /tour/<id>/en-route, /arrived, /start, /complete endpoints, which apply
    # their own business rules (fare calc, schedule locks, etc). Letting the
    # paying customer set those directly would desync booking state from what
    # actually happened on the trip.
    allowed_statuses = ["pending", "confirmed", "ongoing", "completed", "cancelled"] if is_admin else ["cancelled"]

    if status not in allowed_statuses:
        return jsonify({"message": "Invalid status"}), 400

    booking.status = status
    db.session.commit()

    return jsonify({
        "message": "Booking status updated",
        "booking_id": booking.id,
        "new_status": booking.status
    }), 200


# =========================
# DRIVER ACCEPT BOOKING (PROTECTED)
# =========================
@booking_bp.route("/driver/accept/<int:booking_id>", methods=["PUT"])
@jwt_required()
def driver_accept_booking(booking_id):

    booking = Booking.query.get(booking_id)

    if not booking:
        return jsonify({"message": "Booking not found"}), 404

    # This had no authorization check at all — any authenticated account,
    # regardless of role or assignment, could confirm someone else's booking.
    raw_id = get_jwt_identity()
    if get_jwt().get("role") != "driver" or str(booking.driver_id) != str(raw_id):
        return jsonify({"message": "Unauthorized"}), 403

    if booking.status != "pending":
        return jsonify({"message": "Booking already processed"}), 400

    booking.status = "confirmed"
    db.session.commit()

    return jsonify({
        "message": "Booking accepted by driver",
        "booking_id": booking.id
    }), 200


# =========================
# DRIVER REJECT BOOKING (PROTECTED)
# =========================
@booking_bp.route("/driver/reject/<int:booking_id>", methods=["PUT"])
@jwt_required()
def driver_reject_booking(booking_id):

    booking = Booking.query.get(booking_id)

    if not booking:
        return jsonify({"message": "Booking not found"}), 404

    # Same missing check as accept above — any account could cancel any
    # driver's booking without being the assigned driver.
    raw_id = get_jwt_identity()
    if get_jwt().get("role") != "driver" or str(booking.driver_id) != str(raw_id):
        return jsonify({"message": "Unauthorized"}), 403

    if booking.status != "pending":
        return jsonify({"message": "Booking already processed"}), 400

    driver = Driver.query.get(booking.driver_id)
    if driver:
        driver.is_available = True

    booking.status = "cancelled"
    db.session.commit()

    return jsonify({
        "message": "Booking rejected by driver",
        "booking_id": booking.id
    }), 200