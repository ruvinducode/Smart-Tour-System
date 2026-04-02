from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt,
    get_jwt_identity,
)

from app import db
from app.models import Driver, TourPlan, User, Notification

driver_bp = Blueprint("driver_bp", __name__)


def create_notification(recipient_email, subject, message):
    if not recipient_email:
        return
    note = Notification(
        recipient_email=recipient_email,
        subject=subject,
        message=message,
        status="sent",
    )
    db.session.add(note)

# =========================
# DRIVER REGISTER
# =========================
@driver_bp.route("/driver/register", methods=["POST"])
def register_driver():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data"}), 400

    full_name = data.get("full_name")
    email = data.get("email")
    password = data.get("password")
    phone = data.get("phone")

    license_number = data.get("license_number")
    vehicle_number = data.get("vehicle_number")
    vehicle_type = data.get("vehicle_type")
    capacity = data.get("capacity")

    if not full_name or not email or not password or not phone:
        return jsonify({"message": "Missing required fields"}), 400

    email = email.lower()

    existing_driver = Driver.query.filter_by(email=email).first()
    if existing_driver:
        return jsonify({"message": "Driver already exists"}), 400

    # Use PBKDF2 explicitly for compatibility with Python environments
    # where hashlib.scrypt is not available.
    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

    new_driver = Driver(
        full_name=full_name,
        email=email,
        password=hashed_password,
        phone=phone,
        license_number=license_number,
        vehicle_number=vehicle_number,
        vehicle_type=vehicle_type,
        capacity=capacity,
        is_approved=False
    )

    db.session.add(new_driver)
    db.session.commit()

    return jsonify({
        "message": "Driver registered. Waiting for admin approval."
    }), 201


# =========================
# DRIVER LOGIN (JWT TOKEN)
# =========================
@driver_bp.route("/driver/login", methods=["POST"])
def driver_login():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data"}), 400

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    email = email.lower()

    driver = Driver.query.filter_by(email=email).first()

    if not driver:
        return jsonify({"message": "Driver not found"}), 404

    if not driver.is_approved:
        return jsonify({
            "message": "Driver not approved yet. Please wait for admin approval."
        }), 403

    try:
        password_ok = check_password_hash(driver.password, password)
    except AttributeError:
        # Some older records may use scrypt hashes that are unsupported
        # in this Python runtime. Return a safe message instead of 500.
        return jsonify({
            "message": "Legacy driver password format is not supported in this server. Please reset or re-register this driver account."
        }), 400

    if not password_ok:
        return jsonify({"message": "Invalid password"}), 401

    # ✅ FIXED JWT TOKEN
    access_token = create_access_token(
        identity=str(driver.id),
        additional_claims={
            "role": "driver"
        }
    )

    return jsonify({
        "message": "Driver login successful",
        "token": access_token,
        "driver": {
            "id": driver.id,
            "name": driver.full_name,
            "email": driver.email,
            "vehicle": driver.vehicle_type
        }
    }), 200


# =========================
# GET PENDING DRIVERS (ADMIN PROTECTED)
# =========================
@driver_bp.route("/admin/drivers/pending", methods=["GET"])
@jwt_required()
def get_pending_drivers():

    claims = get_jwt()

    # 🔒 Only admin allowed
    if claims.get("role") != "admin":
        return jsonify({"message": "Unauthorized"}), 403

    drivers = Driver.query.filter_by(is_approved=False).all()

    result = []
    for d in drivers:
        result.append({
            "id": d.id,
            "name": d.full_name,
            "email": d.email,
            "phone": d.phone,
            "vehicle": d.vehicle_type
        })

    return jsonify(result), 200


# =========================
# GET APPROVED DRIVERS (ADMIN PROTECTED)
# =========================
@driver_bp.route("/admin/drivers/approved", methods=["GET"])
@jwt_required()
def get_approved_drivers():

    claims = get_jwt()

    # 🔒 Only admin allowed
    if claims.get("role") != "admin":
        return jsonify({"message": "Unauthorized"}), 403

    drivers = Driver.query.filter_by(is_approved=True).all()

    result = []
    for d in drivers:
        result.append({
            "id": d.id,
            "name": d.full_name,
            "email": d.email,
            "phone": d.phone,
            "vehicle": d.vehicle_type,
            "capacity": d.capacity,
            "is_available": d.is_available
        })

    return jsonify(result), 200


# =========================
# APPROVE DRIVER (ADMIN PROTECTED)
# =========================
@driver_bp.route("/admin/driver/approve/<int:driver_id>", methods=["PUT"])
@jwt_required()
def approve_driver(driver_id):

    claims = get_jwt()

    # 🔒 Only admin allowed
    if claims.get("role") != "admin":
        return jsonify({"message": "Unauthorized"}), 403

    driver = Driver.query.get(driver_id)

    if not driver:
        return jsonify({"message": "Driver not found"}), 404

    driver.is_approved = True
    db.session.commit()

    return jsonify({"message": "Driver approved successfully"}), 200


# =========================
# GET ALL TOUR PLANS (ADMIN PROTECTED)
# =========================
@driver_bp.route("/admin/tour-plans", methods=["GET"])
@jwt_required()
def get_tour_plans():

    claims = get_jwt()

    # 🔒 Only admin allowed
    if claims.get("role") != "admin":
        return jsonify({"message": "Unauthorized"}), 403

    tours = TourPlan.query.all()

    result = []
    for t in tours:
        result.append({
            "id": t.id,
            "user_id": t.user_id,
            "guest_id": t.guest_id,
            "vehicle_id": t.vehicle_id,
            "start_date": str(t.start_date) if t.start_date else None,
            "end_date": str(t.end_date) if t.end_date else None,
            "total_distance_km": t.total_distance_km,
            "total_days": t.total_days,
            "estimated_price": t.estimated_price,
            "status": t.status,
            "created_at": str(t.created_at) if t.created_at else None,
        })

    return jsonify(result), 200


# =========================
# DRIVER: GET TOUR REQUESTS
# =========================
@driver_bp.route("/driver/tour-requests", methods=["GET"])
@jwt_required()
def get_driver_tour_requests():

    claims = get_jwt()

    if claims.get("role") != "driver":
        return jsonify({"message": "Unauthorized"}), 403

    tours = TourPlan.query.order_by(TourPlan.created_at.desc()).all()

    result = []
    for t in tours:
        user = User.query.get(t.user_id) if t.user_id else None
        result.append({
            "id": t.id,
            "user_id": t.user_id,
            "user_name": user.full_name if user else "Unknown User",
            "user_email": user.email if user else None,
            "vehicle_id": t.vehicle_id,
            "start_date": str(t.start_date) if t.start_date else None,
            "end_date": str(t.end_date) if t.end_date else None,
            "total_distance_km": t.total_distance_km,
            "total_days": t.total_days,
            "estimated_price": t.estimated_price,
            "status": t.status,
            "created_at": str(t.created_at) if t.created_at else None,
        })

    return jsonify(result), 200


# =========================
# DRIVER: APPROVE TOUR
# =========================
@driver_bp.route("/driver/tour-requests/<int:tour_id>/approve", methods=["PUT"])
@jwt_required()
def approve_tour_request_as_driver(tour_id):

    claims = get_jwt()

    if claims.get("role") != "driver":
        return jsonify({"message": "Unauthorized"}), 403

    tour = TourPlan.query.get(tour_id)
    if not tour:
        return jsonify({"message": "Tour request not found"}), 404

    tour.status = "driver_approved"

    user = User.query.get(tour.user_id) if tour.user_id else None
    raw_id = get_jwt_identity()
    try:
        driver_id = int(raw_id)
    except (TypeError, ValueError):
        driver_id = None
    driver = Driver.query.get(driver_id) if driver_id else None
    driver_name = driver.full_name if driver else "Driver"

    if user:
        create_notification(
            user.email,
            "Driver accepted your tour request",
            f"{driver_name} accepted your tour request #{tour.id}.",
        )

    admins = User.query.filter_by(role="admin").all()
    for admin in admins:
        create_notification(
            admin.email,
            "Driver accepted a tour request",
            f"{driver_name} accepted tour request #{tour.id}.",
        )

    db.session.commit()

    return jsonify({"message": "Tour request approved by driver"}), 200


# =========================
# DRIVER: NEGOTIATE PRICE
# =========================
@driver_bp.route("/driver/tour-requests/<int:tour_id>/negotiate-price", methods=["PUT"])
@jwt_required()
def negotiate_price_as_driver(tour_id):

    claims = get_jwt()

    if claims.get("role") != "driver":
        return jsonify({"message": "Unauthorized"}), 403

    data = request.get_json() or {}
    driver_price = data.get("driver_price")

    if driver_price is None:
        return jsonify({"message": "driver_price is required"}), 400

    try:
        driver_price = float(driver_price)
    except (TypeError, ValueError):
        return jsonify({"message": "driver_price must be a number"}), 400

    if driver_price <= 0:
        return jsonify({"message": "driver_price must be greater than 0"}), 400

    tour = TourPlan.query.get(tour_id)
    if not tour:
        return jsonify({"message": "Tour request not found"}), 404

    tour.estimated_price = driver_price
    tour.status = "price_sent_by_driver"

    user = User.query.get(tour.user_id) if tour.user_id else None
    raw_id = get_jwt_identity()
    try:
        driver_id = int(raw_id)
    except (TypeError, ValueError):
        driver_id = None
    driver = Driver.query.get(driver_id) if driver_id else None
    driver_name = driver.full_name if driver else "Driver"

    if user:
        create_notification(
            user.email,
            "Driver sent a negotiated price",
            f"{driver_name} sent a new price for tour request #{tour.id}: Rs. {driver_price:.2f}",
        )

    admins = User.query.filter_by(role="admin").all()
    for admin in admins:
        create_notification(
            admin.email,
            "Driver negotiated a tour price",
            f"{driver_name} set Rs. {driver_price:.2f} for tour request #{tour.id}.",
        )

    db.session.commit()

    return jsonify({
        "message": "Driver price sent to user",
        "tour_id": tour.id,
        "driver_price": tour.estimated_price,
        "status": tour.status,
    }), 200