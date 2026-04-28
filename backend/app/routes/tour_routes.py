from flask import Blueprint, request, jsonify
from app import db
from app.models import TourPlan, Vehicle, Location, Booking, User, Notification, Driver

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


# =========================
# USER: ACCEPT DRIVER PRICE
# =========================
@tour_bp.route("/<int:tour_id>/accept-price", methods=["PUT"])
@jwt_required()
def accept_driver_price(tour_id):
    try:
        raw_id = get_jwt_identity()
        user_id = int(raw_id) if raw_id is not None else None

        tour = TourPlan.query.get(tour_id)
        if not tour or tour.user_id != user_id:
            return jsonify({"message": "Tour not found or unauthorized"}), 404

        if tour.status != "price_sent_by_driver":
            return jsonify({"message": "Invalid status for accepting price"}), 400

        # Query Booking table to find driver assignment
        booking = Booking.query.filter_by(tour_id=tour_id).first()
        if not booking:
            return jsonify({"message": "No booking found for this tour"}), 404

        # Update both TourPlan.status and Booking.status to 'confirmed'
        tour.status = "confirmed"
        booking.status = "confirmed"

        user = User.query.get(user_id) if user_id else None
        user_name = user.full_name if user else "User"

        drivers = Driver.query.filter_by(is_approved=True).all()
        for d in drivers:
            note = Notification(
                recipient_email=d.email,
                subject=f"User Accepted Tour #{tour.id}",
                message=f"{user_name} accepted the price for tour #{tour.id}.",
                status="sent",
                tour_id=tour.id
            )
            db.session.add(note)

        db.session.commit()
        return jsonify({"message": "Price accepted and tour confirmed."}), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Error accepting price: {str(e)}"}), 500


# =========================
# USER: REJECT DRIVER PRICE
# =========================
@tour_bp.route("/<int:tour_id>/reject-price", methods=["PUT"])
@jwt_required()
def reject_driver_price(tour_id):
    raw_id = get_jwt_identity()
    user_id = int(raw_id) if raw_id is not None else None

    tour = TourPlan.query.get(tour_id)
    if not tour or tour.user_id != user_id:
        return jsonify({"message": "Tour not found or unauthorized"}), 404

    tour.status = "rejected"
    
    from app.models import Notification, Driver
    user = User.query.get(user_id) if user_id else None
    user_name = user.full_name if user else "User"

    drivers = Driver.query.filter_by(is_approved=True).all()
    for d in drivers:
        note = Notification(
            recipient_email=d.email,
            subject=f"User Rejected Tour #{tour.id}",
            message=f"{user_name} rejected the price for tour #{tour.id}.",
            status="sent",
            tour_id=tour.id
        )
        db.session.add(note)

    db.session.commit()
    return jsonify({"message": "Price rejected."}), 200


# =========================
# USER: REPLY TO DRIVER
# =========================
@tour_bp.route("/<int:tour_id>/reply", methods=["POST"])
@jwt_required()
def reply_to_driver(tour_id):
    raw_id = get_jwt_identity()
    user_id = int(raw_id) if raw_id is not None else None
    data = request.get_json() or {}
    message = data.get("message")

    if not message:
        return jsonify({"message": "Message is required"}), 400

    tour = TourPlan.query.get(tour_id)
    if not tour or tour.user_id != user_id:
        return jsonify({"message": "Tour not found or unauthorized"}), 404

    from app.models import Notification, Driver
    user = User.query.get(user_id) if user_id else None
    user_name = user.full_name if user else "User"

    drivers = Driver.query.filter_by(is_approved=True).all()
    for d in drivers:
        note = Notification(
            recipient_email=d.email,
            subject=f"New message from user on Tour #{tour.id}",
            message=f"{user_name} replied: {message}",
            status="sent",
            tour_id=tour.id
        )
        db.session.add(note)

    db.session.commit()
    return jsonify({"message": "Reply sent to driver."}), 200


# =========================
# GET USER TOURS (PROTECTED)
# =========================
@tour_bp.route('/user/tours', methods=['GET'])
@jwt_required()
def get_user_tours():
    try:
        # Get the ID of the logged-in user from the token
        current_user_id = get_jwt_identity()
        
        # Convert to int for proper comparison with database
        try:
            user_id = int(current_user_id) if current_user_id is not None else None
        except (TypeError, ValueError):
            return jsonify({"message": "Invalid user ID in token"}), 401
        
        # Query only the tours that belong to this user
        tours = TourPlan.query.filter_by(user_id=user_id).all()
        
        # Format the data for the frontend
        results = []
        for tour in tours:
            # Get driver_price from related Booking if exists
            booking = Booking.query.filter_by(tour_id=tour.id).first()
            driver_price = booking.total_price if booking else None
            
            results.append({
                "id": tour.id,
                "total_distance_km": tour.total_distance_km,
                "total_days": tour.total_days,
                "status": tour.status,
                "start_date": tour.start_date.isoformat() if tour.start_date else None,
                "estimated_price": tour.estimated_price,
                "driver_price": driver_price  # Get from Booking model
            })
            
        return jsonify(results), 200
    except Exception as e:
        print(f"Error in get_user_tours: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Server error fetching your tours"}), 500

# 1. DRIVER SENDS LOCATION
@tour_bp.route('/<int:tour_id>/location', methods=['PUT']) # ⬅️ CHANGED TO tour_bp
@jwt_required()
def update_driver_location(tour_id):
    claims = get_jwt()
    if claims.get('role') != 'driver':
        return jsonify({"message": "Only drivers can update location"}), 403

    current_driver_id = get_jwt_identity()
    tour = TourPlan.query.get(tour_id)

    if not tour:
        return jsonify({"message": "Tour not found"}), 404
        
    # Check the Booking model to ensure this driver is assigned
    booking = Booking.query.filter_by(tour_id=tour_id, driver_id=current_driver_id).first()
    if not booking:
        return jsonify({"message": "You are not assigned to this tour"}), 403

    data = request.get_json()
    
    # Update the coordinates
    tour.driver_lat = data.get('latitude')
    tour.driver_lng = data.get('longitude')
    tour.last_location_update = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({"message": "Location updated successfully"}), 200


# 2. USER READS LOCATION
@tour_bp.route('/<int:tour_id>/location', methods=['GET']) # ⬅️ CHANGED TO tour_bp
@jwt_required()
def get_driver_location(tour_id):
    current_user_id = get_jwt_identity()
    tour = TourPlan.query.get(tour_id)

    if not tour:
        return jsonify({"message": "Tour not found"}), 404
        
    # Security: Ensure the person asking is the user who booked it
    if str(tour.user_id) != str(current_user_id):
        return jsonify({"message": "Unauthorized"}), 403

    # If the driver hasn't sent a location yet
    if not tour.driver_lat or not tour.driver_lng:
        return jsonify({"message": "Driver location not available yet"}), 404

    return jsonify({
        "latitude": tour.driver_lat,
        "longitude": tour.driver_lng,
        "last_update": tour.last_location_update.isoformat()
    }), 200