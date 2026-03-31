from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt
)

from app import db
from app.models import Driver

driver_bp = Blueprint("driver_bp", __name__)

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

    hashed_password = generate_password_hash(password)

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

    if not check_password_hash(driver.password, password):
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