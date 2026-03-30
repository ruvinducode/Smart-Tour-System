from flask import Blueprint, jsonify, request
from app import db
from app.models import Booking, Driver, TourPlan, Vehicle, Location, User

import uuid
import math

# JWT IMPORTS
from flask_jwt_extended import jwt_required, get_jwt_identity

booking_bp = Blueprint("booking_bp", __name__)

# =========================
# DEBUG ENDPOINT - Check JWT Token
# =========================
@booking_bp.route("/debug-token", methods=["GET"])
@jwt_required()
def debug_token():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return jsonify({
        "jwt_user_id": user_id,
        "user_email": user.email if user else "Unknown",
        "user_name": user.full_name if user else "Unknown"
    }), 200


# =========================
# CREATE BOOKING (PROTECTED)
# =========================
@booking_bp.route("/create-booking/<int:tour_id>", methods=["POST"])
@jwt_required()
def create_booking(tour_id):

    # Get logged-in user
    user_id = get_jwt_identity()
    
    # DEBUG INFO
    print(f"DEBUG: JWT User ID = {user_id}")
    print(f"DEBUG: Tour ID = {tour_id}")

    # 1. Get tour
    tour = TourPlan.query.get(tour_id)
    if not tour:
        return jsonify({"message": "Tour not found"}), 404
    
    print(f"DEBUG: Tour Owner ID = {tour.user_id}")

    # SECURITY: ensure user owns this tour
    # Convert both to same type for comparison
    jwt_user_id = int(user_id) if isinstance(user_id, str) else user_id
    tour_owner_id = int(tour.user_id) if isinstance(tour.user_id, str) else tour.user_id
    
    print(f"DEBUG: Comparing JWT User ID ({jwt_user_id}) with Tour Owner ID ({tour_owner_id})")
    print(f"DEBUG: Types - JWT: {type(jwt_user_id)}, Tour: {type(tour_owner_id)}")
    
    if tour_owner_id != jwt_user_id:
        print(f"DEBUG: AUTH FAILED - Tour owner ({tour_owner_id}) != JWT user ({jwt_user_id})")
        return jsonify({"message": "Unauthorized access to this tour"}), 403
    
    print(f"DEBUG: AUTH SUCCESS - User {user_id} can access tour {tour_id}")

    # 2. Get vehicle
    vehicle = Vehicle.query.get(tour.vehicle_id)
    if not vehicle:
        return jsonify({"message": "Vehicle not found"}), 404

    # 3. Get first location
    first_location = Location.query.filter_by(tour_id=tour.id)\
        .order_by(Location.order_index).first()

    if not first_location:
        return jsonify({"message": "Tour location not found"}), 404

    # 4. Get eligible drivers
    drivers = Driver.query.filter_by(
        vehicle_type=vehicle.type,
        is_available=True,
        is_approved=True
    ).all()

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

    user_id = get_jwt_identity()

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

    user_id = get_jwt_identity()
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
    user = User.query.get(user_id)
    
    if tour.user_id != user_id and user.role != 'admin':
        print(f"DEBUG: User {user_id} (role: {user.role}) cannot update booking for tour {tour.user_id}")
        return jsonify({"message": "Unauthorized"}), 403

    allowed_statuses = ["pending", "confirmed", "ongoing", "completed", "cancelled"]

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