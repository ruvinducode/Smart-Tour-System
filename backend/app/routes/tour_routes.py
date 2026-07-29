from datetime import datetime, date, timedelta

from flask import Blueprint, request, jsonify
from app import db, limiter
from app.models import TourPlan, Vehicle, Location, Booking, User, Notification, Driver

# JWT IMPORTS
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from flask import current_app as app
from app.services.tour_pricing_service import (
    build_tour_estimate,
    parse_date,
    serialize_vehicle,
    haversine,
)
from app.services.routing_service import get_route, RoutingError

tour_bp = Blueprint("tour_bp", __name__)


def _authoritative_distance_km(locations):
    """
    Recompute road distance server-side from the trip's own stop coordinates —
    never trust a client-supplied total_distance_km for the price that's
    actually charged, since it's just a number in the request body an
    attacker can edit before booking. Returns None on routing failure so the
    caller can fall back to the haversine estimate instead of blocking booking.
    """
    if not locations or len(locations) < 2:
        return None
    try:
        coords = [[loc.get("longitude"), loc.get("latitude")] for loc in locations]
        return get_route(coords)["distance_km"]
    except (RoutingError, Exception):
        return None


def _resolve_vehicle(data):
    """Look up vehicle by id or type name."""
    vehicle_id = data.get("vehicle_id")
    vehicle_type = data.get("vehicle_type")

    if vehicle_id is not None:
        return Vehicle.query.get(vehicle_id)
    if vehicle_type:
        return Vehicle.query.filter_by(type=vehicle_type).first()
    return None


def _validate_start_date_window(start_date: date):
    """Ensure start date is within the allowed booking window."""
    today = date.today()
    if start_date < today:
        raise ValueError("Start date cannot be in the past")
    if start_date > today + timedelta(days=60):
        raise ValueError("Tours can only be scheduled up to 2 months in advance")

def _is_tour_schedule_locked(tour):
    """Return True if the tour cannot be started yet (future scheduled date only)."""
    from datetime import date

    if not tour.start_date:
        return False
    if tour.status in ('en_route', 'arrived', 'ongoing', 'completed', 'cancelled'):
        return False

    return date.today() < tour.start_date

# =========================
# CALCULATE TOUR (PUBLIC)
# =========================
@tour_bp.route("/calculate", methods=["POST"])
def calculate_tour():
    """Public estimate endpoint — backend is the single source of truth for pricing."""
    data = request.get_json()
    if not data:
        return jsonify({"message": "No input data"}), 400

    locations = data.get("locations")
    start_date_str = data.get("start_date")
    end_date_str = data.get("end_date")

    if not locations:
        return jsonify({"message": "locations are required"}), 400
    if not start_date_str or not end_date_str:
        return jsonify({"message": "start_date and end_date are required"}), 400

    vehicle = _resolve_vehicle(data)
    if not vehicle:
        return jsonify({"message": "Vehicle not found"}), 404

    try:
        estimate = build_tour_estimate(
            vehicle=vehicle,
            locations=locations,
            start_date=start_date_str,
            end_date=end_date_str,
            total_distance_km=data.get("total_distance_km"),
        )
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400

    return jsonify(estimate), 200


# =========================
# CREATE TOUR (PROTECTED)
# =========================
@tour_bp.route("/create-tour", methods=["POST"])
@jwt_required()   # 🔥 PROTECTED ROUTE
@limiter.limit("20 per minute")
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

    guest_id = data.get("guest_id")   # optional
    locations = data.get("locations")  # optional

    start_date_str = data.get("start_date")
    start_time_str = data.get("start_time")
    end_date_str = data.get("end_date")

    if not start_date_str or not end_date_str:
        return jsonify({"message": "start_date and end_date are required"}), 400
    if not locations:
        return jsonify({"message": "locations are required"}), 400

    vehicle = _resolve_vehicle(data)
    if not vehicle:
        return jsonify({"message": "Vehicle not found. Provide vehicle_id or vehicle_type."}), 404

    vehicle_id = vehicle.id

    try:
        start_date = parse_date(start_date_str, "start_date")
        end_date = parse_date(end_date_str, "end_date")
        _validate_start_date_window(start_date)
        # The price actually charged must never depend on a client-supplied
        # number — always recompute distance from the trip's real coordinates.
        estimate = build_tour_estimate(
            vehicle=vehicle,
            locations=locations,
            start_date=start_date,
            end_date=end_date,
            total_distance_km=_authoritative_distance_km(locations),
        )
    except ValueError as exc:
        return jsonify({"message": str(exc)}), 400

    total_distance_km = estimate["total_distance_km"]
    total_days = estimate["total_days"]
    total_price = estimate["estimated_price"]

    # CREATE TOUR (user_id from JWT)
    new_tour = TourPlan(
        user_id=user_id,
        guest_id=guest_id,
        vehicle_id=vehicle_id,
        start_date=start_date,
        start_time=start_time_str,
        end_date=end_date,
        total_distance_km=total_distance_km,
        total_days=total_days,
        estimated_price=total_price,
        status="planned"
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

    # =========================
    # NOTIFY DRIVERS (DB + optional SMS)
    # =========================
    from app.services.notification_service import notify_drivers_new_tour
    notify_drivers_new_tour(new_tour, vehicle.type, total_distance_km)
    db.session.commit()

    return jsonify({
        "message": "Tour created successfully",
        "tour": {
            "id": new_tour.id,
            "total_distance_km": total_distance_km,
            "total_days": total_days,
            "estimated_price": total_price,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "vehicle": serialize_vehicle(vehicle),
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

        claims = get_jwt()
        current_id = get_jwt_identity()
        is_admin = claims.get("role") == "admin"
        is_owner = tour.user_id is not None and str(tour.user_id) == str(current_id)
        is_assigned_driver = False
        if claims.get("role") == "driver":
            from app.models import Booking as _Booking
            existing_booking = _Booking.query.filter_by(tour_id=tour_id).first()
            is_assigned_driver = bool(
                existing_booking and str(existing_booking.driver_id) == str(current_id)
            )

        if not (is_admin or is_owner or is_assigned_driver):
            return jsonify({"message": "Unauthorized"}), 403

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
              # Check if there's a booking with driver price info and driver details
        from app.models import Booking, Driver as DriverModel
        booking = Booking.query.filter_by(tour_id=tour_id).first()
        driver_price = booking.total_price if booking else None

        # Fetch full driver details for the Uber-style panel
        driver_info = None
        if booking and booking.driver_id:
            drv = DriverModel.query.get(booking.driver_id)
            if drv:
                driver_info = {
                    "id": drv.id,
                    "name": drv.full_name,
                    "phone": drv.phone,
                    "profile_photo": drv.profile_photo,
                    "vehicle_brand": drv.vehicle_brand,
                    "vehicle_number": drv.vehicle_number,
                    "vehicle_color": drv.vehicle_color,
                    "vehicle_type": drv.vehicle_type,
                    "capacity": drv.capacity,
                    "vehicle_front_image": drv.vehicle_front_image,
                }

        return jsonify({
            "id": tour.id,
            "status": tour.status,
            "start_date": tour.start_date.isoformat() if tour.start_date else None,
            "start_time": tour.start_time,
            "end_date": tour.end_date.isoformat() if tour.end_date else None,
            "total_distance_km": tour.total_distance_km,
            "actual_distance_km": tour.actual_distance_km,
            "total_days": tour.total_days,
            "estimated_price": tour.estimated_price,
            "driver_price": driver_price,
            "driver": driver_info,
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

        from app.services.finance_service import upsert_payment_records_for_booking
        upsert_payment_records_for_booking(booking)

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
            # Get driver_price and driver info from related Booking if exists
            booking = Booking.query.filter_by(tour_id=tour.id).first()
            driver_price = booking.total_price if booking else None

            # Get driver details
            driver_name = None
            driver_phone = None
            if booking and booking.driver_id:
                driver = Driver.query.get(booking.driver_id)
                if driver:
                    driver_name = driver.full_name
                    driver_phone = driver.phone

            # Get first location (pickup point)
            first_loc = Location.query.filter_by(tour_id=tour.id).order_by(Location.order_index).first()

            results.append({
                "id": tour.id,
                "total_distance_km": tour.total_distance_km,
                "actual_distance_km": tour.actual_distance_km,
                "total_days": tour.total_days,
                "status": tour.status,
                "start_date": tour.start_date.isoformat() if tour.start_date else None,
                "estimated_price": tour.estimated_price,
                "driver_price": driver_price,
                "driver_name": driver_name,
                "driver_phone": driver_phone,
                "driver_image": driver.profile_photo if (booking and booking.driver_id and driver) else None,
                "vehicle_image": driver.vehicle_front_image if (booking and booking.driver_id and driver) else None,
                "vehicle_number": driver.vehicle_number if (booking and booking.driver_id and driver) else None,
                "pickup_lat": first_loc.latitude if first_loc else None,
                "pickup_lng": first_loc.longitude if first_loc else None,
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

    if tour.status == 'cancelled':
        return jsonify({"message": "This tour has been cancelled by the traveler"}), 403
        
    # Check the Booking model to ensure this driver is assigned
    booking = Booking.query.filter_by(tour_id=tour_id, driver_id=current_driver_id).first()
    if not booking:
        return jsonify({"message": "You are not assigned to this tour"}), 403

    data = request.get_json()
    new_lat = data.get('latitude')
    new_lng = data.get('longitude')

    if new_lat is None or new_lng is None:
        return jsonify({"message": "Latitude and longitude are required"}), 400

    # Calculate distance if ongoing
    if tour.status == 'ongoing' and tour.driver_lat and tour.driver_lng:
        dist = haversine(tour.driver_lat, tour.driver_lng, new_lat, new_lng)
        # Bound by implied speed, not just raw distance — a fixed "< 5km" cap
        # doesn't account for how much time actually passed, so without a
        # time check a rapid stream of sub-5km jumps could accumulate
        # unlimited fake distance (this feeds a real extra-distance charge
        # billed to the customer at trip completion).
        elapsed_hours = (
            (datetime.utcnow() - tour.last_location_update).total_seconds() / 3600.0
            if tour.last_location_update else None
        )
        implied_speed_kmh = (dist / elapsed_hours) if elapsed_hours and elapsed_hours > 0 else 0
        if dist < 5.0 and implied_speed_kmh <= 150:
            tour.actual_distance_km = (tour.actual_distance_km or 0.0) + dist

    # Update the coordinates
    tour.driver_lat = new_lat
    tour.driver_lng = new_lng
    tour.last_location_update = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        "message": "Location updated successfully",
        "actual_distance_km": tour.actual_distance_km
    }), 200

# =========================
# TOUR LIFECYCLE ENDPOINTS
# =========================

@tour_bp.route('/<int:tour_id>/en-route', methods=['PUT'])
@jwt_required()
def mark_en_route(tour_id):
    if get_jwt().get('role') != 'driver':
        return jsonify({"message": "Only drivers can update trip status"}), 403
    current_driver_id = get_jwt_identity()
    tour = TourPlan.query.get(tour_id)
    booking = Booking.query.filter_by(tour_id=tour_id, driver_id=current_driver_id).first()
    
    if not tour or not booking:
        return jsonify({"message": "Tour or assignment not found"}), 404

    if _is_tour_schedule_locked(tour):
        return jsonify({"message": f"This tour is scheduled for {tour.start_date.isoformat()} and cannot be started yet."}), 400
        
    tour.status = 'en_route'
    booking.status = 'en_route'
    
    user = User.query.get(tour.user_id)
    if user:
        note = Notification(
            recipient_email=user.email,
            tour_id=tour.id,
            subject="Driver is on the way!",
            message=f"Your driver is now heading to your pickup location for Tour #{tour.id}."
        )
        db.session.add(note)
        
    db.session.commit()
    return jsonify({"message": "Status updated to en-route"}), 200

@tour_bp.route('/<int:tour_id>/arrived', methods=['PUT'])
@jwt_required()
def mark_arrived(tour_id):
    if get_jwt().get('role') != 'driver':
        return jsonify({"message": "Only drivers can update trip status"}), 403
    current_driver_id = get_jwt_identity()
    tour = TourPlan.query.get(tour_id)
    booking = Booking.query.filter_by(tour_id=tour_id, driver_id=current_driver_id).first()
    
    if not tour or not booking:
        return jsonify({"message": "Tour or assignment not found"}), 404

    if _is_tour_schedule_locked(tour):
        return jsonify({"message": f"This tour is scheduled for {tour.start_date.isoformat()} and cannot be started yet."}), 400
        
    tour.status = 'arrived'
    booking.status = 'arrived'
    
    user = User.query.get(tour.user_id)
    if user:
        note = Notification(
            recipient_email=user.email,
            tour_id=tour.id,
            subject="Driver has arrived!",
            message=f"Your driver has reached the pickup location for Tour #{tour.id}. Please meet them."
        )
        db.session.add(note)
        
    db.session.commit()
    return jsonify({"message": "Status updated to arrived"}), 200

@tour_bp.route('/<int:tour_id>/start', methods=['PUT'])
@jwt_required()
def mark_ongoing(tour_id):
    if get_jwt().get('role') != 'driver':
        return jsonify({"message": "Only drivers can update trip status"}), 403
    current_driver_id = get_jwt_identity()
    tour = TourPlan.query.get(tour_id)
    booking = Booking.query.filter_by(tour_id=tour_id, driver_id=current_driver_id).first()
    
    if not tour or not booking:
        return jsonify({"message": "Tour or assignment not found"}), 404

    if _is_tour_schedule_locked(tour):
        return jsonify({"message": f"This tour is scheduled for {tour.start_date.isoformat()} and cannot be started yet."}), 400
        
    tour.status = 'ongoing'
    booking.status = 'ongoing'
    tour.actual_distance_km = 0.0 # Reset tracking at pickup start
    
    user = User.query.get(tour.user_id)
    if user:
        note = Notification(
            recipient_email=user.email,
            tour_id=tour.id,
            subject="Trip started!",
            message=f"Your journey for Tour #{tour.id} has officially started. Enjoy your trip!"
        )
        db.session.add(note)
        
    db.session.commit()
    return jsonify({"message": "Tour started"}), 200

@tour_bp.route('/<int:tour_id>/complete', methods=['PUT'])
@jwt_required()
def mark_completed(tour_id):
    if get_jwt().get('role') != 'driver':
        return jsonify({"message": "Only drivers can update trip status"}), 403
    current_driver_id = get_jwt_identity()
    tour = TourPlan.query.get(tour_id)
    booking = Booking.query.filter_by(tour_id=tour_id, driver_id=current_driver_id).first()
    driver = Driver.query.get(current_driver_id)
    vehicle = Vehicle.query.get(tour.vehicle_id) if tour else None
    
    if not tour or not booking:
        return jsonify({"message": "Tour or assignment not found"}), 404
        
    # Calculate extra charges
    planned_dist = tour.total_distance_km or 0.0
    actual_dist = tour.actual_distance_km or 0.0
    extra_dist = max(0, actual_dist - planned_dist)
    
    price_per_km = vehicle.price_per_km if vehicle else 0.0
    extra_charge = extra_dist * price_per_km
    
    final_price = booking.total_price + extra_charge
    
    tour.status = 'completed'
    booking.status = 'completed'
    booking.total_price = final_price

    from app.services.finance_service import (
        upsert_payment_records_for_booking,
        sync_income_transactions_for_booking,
    )
    upsert_payment_records_for_booking(booking, final_price)
    sync_income_transactions_for_booking(booking)
    
    if driver:
        driver.is_available = True
    
    user = User.query.get(tour.user_id)
    if user:
        msg = f"Tour #{tour.id} completed. Total distance: {actual_dist:.1f}km. "
        if extra_dist > 0:
            msg += f"Includes extra charge for {extra_dist:.1f}km."
        msg += f" Final Fare: Rs. {final_price:,.2f}"
        
        note = Notification(
            recipient_email=user.email,
            tour_id=tour.id,
            subject="Tour Completed!",
            message=msg
        )
        db.session.add(note)
        
    db.session.commit()
    return jsonify({
        "message": "Tour completed successfully",
        "final_price": final_price,
        "extra_charge": extra_charge,
        "actual_distance": actual_dist
    }), 200


# 2. USER READS LOCATION
@tour_bp.route('/<int:tour_id>/location', methods=['GET']) # ⬅️ CHANGED TO tour_bp
@jwt_required()
def get_driver_location(tour_id):
    claims = get_jwt()
    current_user_id = get_jwt_identity()
    tour = TourPlan.query.get(tour_id)

    if not tour:
        return jsonify({"message": "Tour not found"}), 404

    is_admin = claims.get("role") == "admin"
    is_owner = str(tour.user_id) == str(current_user_id)

    if not is_admin and not is_owner:
        return jsonify({"message": "Unauthorized"}), 403

    if not tour.driver_lat or not tour.driver_lng:
        return jsonify({"message": "Driver location not available yet"}), 404

    return jsonify({
        "latitude": tour.driver_lat,
        "longitude": tour.driver_lng,
        "last_update": tour.last_location_update.isoformat() if tour.last_location_update else None,
        "status": tour.status,
    }), 200

# 3. USER CANCELS TOUR
@tour_bp.route('/<int:tour_id>/driver-cancel', methods=['POST'])
@jwt_required()
def driver_cancel_tour(tour_id):
    if get_jwt().get('role') != 'driver':
        return jsonify({"message": "Only drivers can cancel as the assigned driver"}), 403
    current_driver_id = get_jwt_identity()
    data = request.get_json()
    reason = data.get('reason', 'No reason provided')
    
    tour = TourPlan.query.get(tour_id)
    booking = Booking.query.filter_by(tour_id=tour_id, driver_id=current_driver_id).first()
    
    if not tour or not booking:
        return jsonify({"message": "Tour or assignment not found"}), 404
        
    driver = Driver.query.get(current_driver_id)
    if driver:
        driver.is_available = True
        
    tour.status = 'cancelled'
    tour.cancellation_reason = f"Driver Cancelled: {reason}"
    booking.status = 'cancelled'
    
    user = User.query.get(tour.user_id)
    if user:
        note = Notification(
            recipient_email=user.email,
            tour_id=tour.id,
            subject="Trip Cancelled by Driver",
            message=f"Your driver has cancelled the trip (Tour #{tour.id}). Reason: {reason}"
        )
        db.session.add(note)
        
    db.session.commit()
    return jsonify({"message": "Tour cancelled by driver successfully"}), 200

@tour_bp.route('/<int:tour_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_tour(tour_id):
    current_user_id = get_jwt_identity()
    data = request.get_json()
    reason = data.get('reason', 'No reason provided')
    
    tour = TourPlan.query.get(tour_id)
    if not tour:
        return jsonify({"message": "Tour not found"}), 404
        
    # Security check
    if str(tour.user_id) != str(current_user_id):
        return jsonify({"message": "Unauthorized"}), 403
        
    # Get user name for notifications
    user = User.query.get(current_user_id)
    user_name = user.full_name if user else "A traveler"
    user_email = user.email if user else None

    # Update TourPlan status
    tour.status = 'cancelled'
    tour.cancellation_reason = reason
    
    notif_count = 0

    # 1. Notify User (Confirmation)
    if user_email:
        note = Notification(
            recipient_email=user_email,
            subject="Tour Cancelled Successfully",
            message=f"You have cancelled Tour #{tour_id}. Reason: {reason}",
            tour_id=tour_id,
            status="sent"
        )
        db.session.add(note)
        notif_count += 1

    # 2. Notify All Admins
    admins = User.query.filter_by(role='admin').all()
    for admin in admins:
        note = Notification(
            recipient_email=admin.email,
            subject="Trip Cancelled by User",
            message=f"Tour #{tour_id} has been cancelled by {user_name} ({user_email}). Reason: {reason}",
            tour_id=tour_id,
            status="sent"
        )
        db.session.add(note)
        notif_count += 1
    
    # 3. Find and Notify Driver
    # We look for the most recent booking for this tour
    booking = Booking.query.filter_by(tour_id=tour_id).order_by(Booking.id.desc()).first()
    if booking:
        if booking.status != 'cancelled':
            booking.status = 'cancelled'
            booking.cancellation_reason = reason
        
        if booking.driver_id:
            driver = Driver.query.get(booking.driver_id)
            if driver:
                note = Notification(
                    recipient_email=driver.email,
                    subject="Trip Cancelled by Traveler",
                    message=f"{user_name} has cancelled Tour #{tour_id}. Reason: {reason}",
                    tour_id=tour_id,
                    status="sent"
                )
                db.session.add(note)
                notif_count += 1
        
    db.session.commit()
    return jsonify({
        "message": "Tour cancelled successfully"
    }), 200


# =========================
# 4. FEEDBACK & RATINGS
# =========================
@tour_bp.route('/<int:tour_id>/feedback', methods=['POST'])
@jwt_required()
@limiter.limit("10 per minute")
def submit_feedback(tour_id):
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        rating = data.get('rating')
        comment = data.get('comment', '')

        if not rating:
            return jsonify({"message": "Rating is required"}), 400
        try:
            rating = int(rating)
        except (TypeError, ValueError):
            return jsonify({"message": "Rating must be a number"}), 400
        if rating < 1 or rating > 5:
            return jsonify({"message": "Rating must be between 1 and 5"}), 400

        from app.models import TourPlan, Booking, Driver, Feedback
        tour = TourPlan.query.get(tour_id)
        if not tour:
            return jsonify({"message": "Tour not found"}), 404

        # Without this, any authenticated account could rate a driver on a
        # tour that wasn't theirs — directly manipulating a real driver's
        # public average rating with fake reviews.
        if str(tour.user_id) != str(current_user_id):
            return jsonify({"message": "Unauthorized"}), 403
        if tour.status != "completed":
            return jsonify({"message": "You can only review a completed tour"}), 400
        if Feedback.query.filter_by(tour_id=tour_id, user_id=current_user_id).first():
            return jsonify({"message": "You have already reviewed this tour"}), 409

        booking = Booking.query.filter_by(tour_id=tour_id).first()
        if not booking or not booking.driver_id:
            return jsonify({"message": "No driver assigned to this tour"}), 400

        # Create feedback record
        feedback = Feedback(
            tour_id=tour_id,
            user_id=current_user_id,
            driver_id=booking.driver_id,
            rating=rating,
            comment=comment
        )
        db.session.add(feedback)

        # Update driver average rating
        driver = Driver.query.get(booking.driver_id)
        if driver:
            # Simple moving average: (avg * count + new) / (count + 1)
            total_score = (driver.rating * driver.total_ratings) + int(rating)
            driver.total_ratings += 1
            driver.rating = round(total_score / driver.total_ratings, 1)

        db.session.commit()
        return jsonify({"message": "Feedback submitted successfully", "new_rating": driver.rating}), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error submitting feedback: {str(e)}")
        return jsonify({"message": "Error submitting feedback"}), 500

# =========================
# 5. ADMIN FEEDBACK VIEW
# =========================
@tour_bp.route('/admin/feedbacks', methods=['GET'])
@jwt_required()
def get_all_feedbacks():
    try:
        claims = get_jwt()
        if claims.get("role") != "admin":
            return jsonify({"message": "Unauthorized"}), 403
        
        from app.models import Feedback, User, Driver
        feedbacks = Feedback.query.order_by(Feedback.created_at.desc()).all()
        results = []
        for f in feedbacks:
            user = User.query.get(f.user_id) if f.user_id else None
            driver = Driver.query.get(f.driver_id)
            results.append({
                "id": f.id,
                "tour_id": f.tour_id,
                "user_name": user.full_name if user else "Guest",
                "driver_name": driver.full_name if driver else "Unknown",
                "rating": f.rating,
                "comment": f.comment,
                "created_at": f.created_at.isoformat()
            })
        
        avg_rating = round(sum(f.rating for f in feedbacks) / len(feedbacks), 1) if feedbacks else 0.0
        
        return jsonify({
            "feedbacks": results,
            "average_rating": avg_rating
        }), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@tour_bp.route('/admin/feedbacks/analytics', methods=['GET'])
@jwt_required()
def get_feedback_analytics():
    try:
        claims = get_jwt()
        if claims.get("role") != "admin":
            return jsonify({"message": "Unauthorized"}), 403
            
        from app.models import Feedback, Driver
        from app import db
        
        total_feedbacks = db.session.query(db.func.count(Feedback.id)).scalar() or 0
        overall_avg = db.session.query(db.func.avg(Feedback.rating)).scalar() or 0
        
        drivers_with_ratings = Driver.query.filter(Driver.total_ratings > 0).all()
        avg_per_driver = sum([d.rating for d in drivers_with_ratings]) / len(drivers_with_ratings) if drivers_with_ratings else 0
        
        highest_driver = Driver.query.filter(Driver.total_ratings > 0).order_by(Driver.rating.desc(), Driver.total_ratings.desc()).first()
        lowest_driver = Driver.query.filter(Driver.total_ratings > 0).order_by(Driver.rating.asc(), Driver.total_ratings.desc()).first()

        return jsonify({
            "total_feedbacks": total_feedbacks,
            "overall_avg": round(overall_avg, 1),
            "avg_per_driver": round(avg_per_driver, 1),
            "highest_rated_driver": highest_driver.full_name if highest_driver else "N/A",
            "lowest_rated_driver": lowest_driver.full_name if lowest_driver else "N/A"
        }), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500


# =========================
# DELETE TOUR (PROTECTED)
# =========================
@tour_bp.route("/<int:tour_id>", methods=["DELETE"])
@jwt_required()
def delete_tour(tour_id):
    try:
        claims = get_jwt()
        is_admin = claims.get("role") == "admin"
        raw_id = get_jwt_identity()
        user_id = int(raw_id) if raw_id is not None else None

        tour = TourPlan.query.get(tour_id)
        if not tour:
            return jsonify({"message": "Tour not found"}), 404

        if is_admin:
            if tour.status not in ["completed", "cancelled", "rejected"]:
                return jsonify({
                    "message": "Admin can only delete completed, cancelled, or rejected tours",
                }), 400
        else:
            if tour.user_id != user_id:
                return jsonify({"message": "Unauthorized to delete this tour"}), 403
            if tour.status not in ["completed", "cancelled", "rejected", "planned"]:
                return jsonify({"message": "Cannot delete active or ongoing tours"}), 400

        # Before deleting TourPlan, we must delete associated records to avoid foreign key errors.
        # Associated records: Location, Booking, Notification, Feedback.
        from app.models import Location, Booking, Notification, Feedback
        Location.query.filter_by(tour_id=tour_id).delete()
        Booking.query.filter_by(tour_id=tour_id).delete()
        Notification.query.filter_by(tour_id=tour_id).delete()
        Feedback.query.filter_by(tour_id=tour_id).delete()

        # Now delete the tour itself
        db.session.delete(tour)
        db.session.commit()

        return jsonify({"message": "Tour deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Error deleting tour: {str(e)}"}), 500

