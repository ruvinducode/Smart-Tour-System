from flask import Blueprint, request, jsonify
from app import db
from app.models import TourPlan, Vehicle, Location

from datetime import datetime

# JWT IMPORTS
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import current_app as app

tour_bp = Blueprint("tour_bp", __name__)

# =========================
# CALCULATE TOUR (PUBLIC)
# =========================
@tour_bp.route("/calculate", methods=["POST"])
def calculate_tour():

    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data"}), 400

    locations = data.get("locations")
    vehicle_type = data.get("vehicle_type")

    if not locations or not vehicle_type:
        return jsonify({"message": "Missing data"}), 400

    total_distance = len(locations) * 50
    total_days = max(1, total_distance // 100)

    vehicle = Vehicle.query.filter_by(type=vehicle_type).first()

    if not vehicle:
        return jsonify({"message": "Vehicle not found"}), 404

    base_fare = vehicle.base_fare or 0
    price_per_km = vehicle.price_per_km or 0
    price_per_day = vehicle.price_per_day or 0

    total_price = (
        base_fare +
        (total_distance * price_per_km) +
        (total_days * price_per_day)
    )

    return jsonify({
        "total_distance_km": total_distance,
        "total_days": total_days,
        "estimated_price": total_price
    }), 200


# =========================
# CREATE TOUR (PROTECTED)
# =========================
@tour_bp.route("/create-tour", methods=["POST"])
@jwt_required()   # 🔥 PROTECTED ROUTE
def create_tour():

    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data"}), 400

    # GET USER FROM TOKEN (IMPORTANT)
    raw_id = get_jwt_identity()
    try:
        user_id = int(raw_id) if raw_id is not None else None
    except (TypeError, ValueError):
        return jsonify({"message": "Invalid user identity in token"}), 401

    vehicle_id = data.get("vehicle_id")
    total_distance_km = data.get("total_distance_km")
    total_days = data.get("total_days")

    guest_id = data.get("guest_id")   # optional
    locations = data.get("locations")  # optional

    # DATE HANDLING
    start_date_str = data.get("start_date")
    end_date_str = data.get("end_date")

    start_date = None
    end_date = None

    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"message": "Invalid start_date format (YYYY-MM-DD required)"}), 400

    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"message": "Invalid end_date format (YYYY-MM-DD required)"}), 400

    # VALIDATION
    if vehicle_id is None or total_distance_km is None or total_days is None:
        return jsonify({"message": "Missing required fields"}), 400

    vehicle = Vehicle.query.get(vehicle_id)

    if not vehicle:
        return jsonify({"message": "Vehicle not found"}), 404

    base_fare = vehicle.base_fare or 0
    price_per_km = vehicle.price_per_km or 0
    price_per_day = vehicle.price_per_day or 0

    # PRICE CALCULATION
    total_price = (
        base_fare +
        (total_distance_km * price_per_km) +
        (total_days * price_per_day)
    )

    # CREATE TOUR (user_id from JWT)
    new_tour = TourPlan(
        user_id=user_id,
        guest_id=guest_id,
        vehicle_id=vehicle_id,
        start_date=start_date,
        end_date=end_date,
        total_distance_km=total_distance_km,
        total_days=total_days,
        estimated_price=total_price
    )

    db.session.add(new_tour)
    db.session.commit()

    # =========================
    # SAVE LOCATIONS (optional)
    # =========================
    if locations:
        for index, loc in enumerate(locations):
            new_location = Location(
                tour_id=new_tour.id,
                place_name=loc.get("place_name"),
                latitude=loc.get("latitude"),
                longitude=loc.get("longitude"),
                order_index=index
            )
            db.session.add(new_location)

        db.session.commit()

    return jsonify({
        "message": "Tour created successfully",
        "tour": {
            "id": new_tour.id,
            "total_distance_km": total_distance_km,
            "total_days": total_days,
            "estimated_price": total_price
        }
    }), 201


# =========================
# GET TOUR DETAILS (PROTECTED)
# =========================
@tour_bp.route("/<int:tour_id>/details", methods=["GET"])
@jwt_required()
def get_tour_details(tour_id):
    try:
        tour = TourPlan.query.get(tour_id)
        
        if not tour:
            return jsonify({"message": "Tour not found"}), 404
        
        # Get locations for this tour
        locations = Location.query.filter_by(tour_id=tour_id).order_by(Location.order_index).all()
        
        # Get vehicle info
        vehicle = Vehicle.query.get(tour.vehicle_id) if tour.vehicle_id else None
        
        # Get user/guest info
        user_name = None
        user_email = None
        guest_name = None
        guest_email = None
        
        if tour.user_id:
            from app.models import User
            user = User.query.get(tour.user_id)
            if user:
                user_name = user.full_name
                user_email = user.email
        
        if tour.guest_id:
            from app.models import Guest
            guest = Guest.query.get(tour.guest_id)
            if guest:
                guest_name = guest.full_name
                guest_email = guest.email
        
        # Check if there's a booking with driver price info
        from app.models import Booking
        booking = Booking.query.filter_by(tour_id=tour_id).first()
        driver_price = booking.total_price if booking else None
        
        return jsonify({
            "id": tour.id,
            "status": tour.status,
            "start_date": tour.start_date.isoformat() if tour.start_date else None,
            "end_date": tour.end_date.isoformat() if tour.end_date else None,
            "total_distance_km": tour.total_distance_km,
            "total_days": tour.total_days,
            "estimated_price": tour.estimated_price,
            "driver_price": driver_price,
            "user_name": user_name,
            "user_email": user_email,
            "guest_name": guest_name,
            "guest_email": guest_email,
            "vehicle": {
                "type": vehicle.type if vehicle else None,
                "max_passengers": vehicle.max_passengers if vehicle else None,
            } if vehicle else None,
            "locations": [
                {
                    "id": loc.id,
                    "place_name": loc.place_name,
                    "latitude": loc.latitude,
                    "longitude": loc.longitude,
                    "order_index": loc.order_index,
                }
                for loc in locations
            ],
        }), 200
    
    except Exception as e:
        app.logger.error(f"Error fetching tour details: {str(e)}")
        return jsonify({"message": "Error fetching tour details"}), 500