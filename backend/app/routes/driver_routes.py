from flask import Blueprint, request, jsonify, send_from_directory, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os, uuid
from datetime import datetime

from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt,
    get_jwt_identity,
)

from app import db
from app.models import Driver, TourPlan, User, Notification, Booking, Vehicle

driver_bp = Blueprint("driver_bp", __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "drivers")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def save_upload(file_obj, subfolder=""):
    """Save an uploaded file and return its relative path, or None."""
    if not file_obj or file_obj.filename == "":
        return None
    if not allowed_file(file_obj.filename):
        return None
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    ext = file_obj.filename.rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    file_obj.save(os.path.join(UPLOAD_FOLDER, unique_name))
    return unique_name


def create_notification(recipient_email, subject, message, tour_id=None):
    if not recipient_email:
        return
    note = Notification(
        recipient_email=recipient_email,
        subject=subject,
        message=message,
        status="sent",
        tour_id=tour_id
    )
    db.session.add(note)


# =========================
# SERVE UPLOADED IMAGES
# =========================
@driver_bp.route("/uploads/drivers/<path:filename>", methods=["GET"])
def serve_driver_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


# =========================
# DRIVER REGISTER  (multipart/form-data)
# =========================
@driver_bp.route("/driver/register", methods=["POST"])
def register_driver():
    # Accept both JSON (legacy) and multipart form data
    if request.content_type and "multipart/form-data" in request.content_type:
        form = request.form
        files = request.files
    else:
        form = request.get_json() or {}
        files = {}

    # ── Required fields ──────────────────────────
    full_name  = form.get("full_name", "").strip()
    phone      = form.get("phone", "").strip()
    password   = form.get("password", "").strip()

    if not full_name or not phone or not password:
        return jsonify({"message": "full_name, phone and password are required"}), 400

    # ── Optional / conditional fields ────────────
    email           = (form.get("email") or "").strip().lower() or None
    nic_number      = form.get("nic_number", "").strip() or None
    gender          = form.get("gender", "").strip() or None
    home_district   = form.get("home_district", "").strip() or None
    home_address    = form.get("home_address", "").strip() or None
    license_number  = form.get("license_number", "").strip() or None
    vehicle_type    = form.get("vehicle_type", "").strip() or None
    vehicle_brand   = form.get("vehicle_brand", "").strip() or None
    vehicle_number  = form.get("vehicle_number", "").strip() or None
    vehicle_color   = form.get("vehicle_color", "").strip() or None

    # Parse dates
    dob_str     = form.get("date_of_birth", "")
    lic_exp_str = form.get("license_expiry_date", "")
    date_of_birth      = None
    license_expiry_date = None
    if dob_str:
        try:
            date_of_birth = datetime.strptime(dob_str, "%Y-%m-%d").date()
        except ValueError:
            pass
    if lic_exp_str:
        try:
            license_expiry_date = datetime.strptime(lic_exp_str, "%Y-%m-%d").date()
        except ValueError:
            pass

    # Parse capacity
    cap_raw  = form.get("capacity")
    capacity = int(cap_raw) if cap_raw and str(cap_raw).isdigit() else None

    # ── Uniqueness checks ─────────────────────────
    if email:
        if Driver.query.filter_by(email=email).first():
            return jsonify({"message": "A driver with this email already exists"}), 400
    if nic_number:
        if Driver.query.filter_by(nic_number=nic_number).first():
            return jsonify({"message": "A driver with this NIC already exists"}), 400

    # ── Save uploaded images ──────────────────────
    profile_photo         = save_upload(files.get("profile_photo"))
    license_front_image   = save_upload(files.get("license_front_image"))
    license_back_image    = save_upload(files.get("license_back_image"))
    vehicle_reg_book_image = save_upload(files.get("vehicle_reg_book_image"))
    revenue_license_image  = save_upload(files.get("revenue_license_image"))
    insurance_cert_image   = save_upload(files.get("insurance_cert_image"))
    
    # Vehicle Photos
    vehicle_front_image = save_upload(files.get("vehicle_front_image"))
    vehicle_rear_image  = save_upload(files.get("vehicle_rear_image"))
    vehicle_side_image  = save_upload(files.get("vehicle_side_image"))

    # ── Hash password ─────────────────────────────
    hashed_password = generate_password_hash(password, method="pbkdf2:sha256")

    # ── Create driver record ──────────────────────
    new_driver = Driver(
        full_name=full_name,
        email=email,
        password=hashed_password,
        phone=phone,
        nic_number=nic_number,
        date_of_birth=date_of_birth,
        gender=gender,
        home_district=home_district,
        home_address=home_address,
        profile_photo=profile_photo,
        license_number=license_number,
        license_expiry_date=license_expiry_date,
        license_front_image=license_front_image,
        license_back_image=license_back_image,
        vehicle_type=vehicle_type,
        vehicle_brand=vehicle_brand,
        vehicle_number=vehicle_number,
        vehicle_color=vehicle_color,
        capacity=capacity,
        vehicle_reg_book_image=vehicle_reg_book_image,
        revenue_license_image=revenue_license_image,
        insurance_cert_image=insurance_cert_image,
        vehicle_front_image=vehicle_front_image,
        vehicle_rear_image=vehicle_rear_image,
        vehicle_side_image=vehicle_side_image,
        role="driver",
        is_approved=False,
    )

    db.session.add(new_driver)
    db.session.commit()

    return jsonify({
        "message": "Driver registered successfully. Waiting for admin approval."
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
            "role": "driver",
            "name": driver.full_name,
            "email": driver.email
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
# GET DRIVER PROFILE
# =========================
@driver_bp.route("/driver/profile", methods=["GET"])
@jwt_required()
def get_driver_profile():
    driver_id = get_jwt_identity()
    driver = Driver.query.get(driver_id)

    if not driver:
        return jsonify({"message": "Driver not found"}), 404

    return jsonify({
        "id": driver.id,
        "full_name": driver.full_name,
        "email": driver.email,
        "phone": driver.phone,
        "nic_number": driver.nic_number,
        "date_of_birth": str(driver.date_of_birth) if driver.date_of_birth else None,
        "gender": driver.gender,
        "home_district": driver.home_district,
        "home_address": driver.home_address,
        "profile_photo": driver.profile_photo,
        "license_number": driver.license_number,
        "license_expiry_date": str(driver.license_expiry_date) if driver.license_expiry_date else None,
        "license_front_image": driver.license_front_image,
        "license_back_image": driver.license_back_image,
        "vehicle_type": driver.vehicle_type,
        "vehicle_brand": driver.vehicle_brand,
        "vehicle_number": driver.vehicle_number,
        "vehicle_color": driver.vehicle_color,
        "capacity": driver.capacity,
        "vehicle_reg_book_image": driver.vehicle_reg_book_image,
        "revenue_license_image": driver.revenue_license_image,
        "insurance_cert_image": driver.insurance_cert_image,
        "vehicle_front_image": driver.vehicle_front_image,
        "vehicle_rear_image": driver.vehicle_rear_image,
        "vehicle_side_image": driver.vehicle_side_image,
        "is_approved": driver.is_approved,
        "created_at": str(driver.created_at) if driver.created_at else None,
    }), 200


# =========================
# UPDATE DRIVER PROFILE
# =========================
@driver_bp.route("/driver/profile", methods=["PUT"])
@jwt_required()
def update_driver_profile():
    driver_id = get_jwt_identity()
    driver = Driver.query.get(driver_id)

    if not driver:
        return jsonify({"message": "Driver not found"}), 404

    # Support both JSON and multipart/form-data
    if request.content_type and "multipart/form-data" in request.content_type:
        data = request.form
        files = request.files
    else:
        data = request.get_json() or {}
        files = {}

    # Update personal fields
    if "full_name" in data: driver.full_name = data["full_name"]
    if "phone" in data: driver.phone = data["phone"]
    if "nic_number" in data: driver.nic_number = data["nic_number"]
    if "home_district" in data: driver.home_district = data["home_district"]
    if "home_address" in data: driver.home_address = data["home_address"]
    if "gender" in data: driver.gender = data["gender"]
    
    # Update license fields
    if "license_number" in data: driver.license_number = data["license_number"]
    if "license_expiry_date" in data:
        try:
            from datetime import datetime
            driver.license_expiry_date = datetime.strptime(data["license_expiry_date"], "%Y-%m-%d").date()
        except (ValueError, TypeError):
            pass

    # Update vehicle fields
    if "vehicle_brand" in data: driver.vehicle_brand = data["vehicle_brand"]
    if "vehicle_number" in data: driver.vehicle_number = data["vehicle_number"]
    if "vehicle_color" in data: driver.vehicle_color = data["vehicle_color"]
    if "capacity" in data: 
        try:
            driver.capacity = int(data["capacity"])
        except (ValueError, TypeError):
            pass

    # Handle multiple file uploads
    file_fields = [
        "profile_photo", "license_front_image", "license_back_image",
        "vehicle_reg_book_image", "revenue_license_image", "insurance_cert_image",
        "vehicle_front_image", "vehicle_rear_image", "vehicle_side_image"
    ]
    for field in file_fields:
        if field in files:
            new_file = save_upload(files[field])
            if new_file:
                setattr(driver, field, new_file)

    db.session.commit()
    return jsonify({"message": "Profile updated successfully"}), 200


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
            "nic_number": d.nic_number,
            "date_of_birth": str(d.date_of_birth) if d.date_of_birth else None,
            "gender": d.gender,
            "home_district": d.home_district,
            "home_address": d.home_address,
            "profile_photo": d.profile_photo,
            "license_number": d.license_number,
            "license_expiry_date": str(d.license_expiry_date) if d.license_expiry_date else None,
            "license_front_image": d.license_front_image,
            "license_back_image": d.license_back_image,
            "vehicle": d.vehicle_type,
            "vehicle_brand": d.vehicle_brand,
            "vehicle_number": d.vehicle_number,
            "vehicle_color": d.vehicle_color,
            "capacity": d.capacity,
            "vehicle_reg_book_image": d.vehicle_reg_book_image,
            "revenue_license_image": d.revenue_license_image,
            "insurance_cert_image": d.insurance_cert_image,
            "vehicle_front_image": d.vehicle_front_image,
            "vehicle_rear_image": d.vehicle_rear_image,
            "vehicle_side_image": d.vehicle_side_image,
            "created_at": str(d.created_at) if d.created_at else None,
        })

    return jsonify(result), 200


# =========================
# GET APPROVED DRIVERS (ADMIN PROTECTED)
# =========================
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
# GET ALL REGISTERED DRIVERS (ADMIN PROTECTED)
# =========================
@driver_bp.route("/admin/drivers/all", methods=["GET"])
@jwt_required()
def get_all_drivers():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"message": "Unauthorized"}), 403

    drivers = Driver.query.all()

    result = []
    for d in drivers:
        result.append({
            "id": d.id,
            "name": d.full_name,
            "email": d.email,
            "phone": d.phone,
            "nic_number": d.nic_number,
            "vehicle": d.vehicle_type,
            "is_approved": d.is_approved,
            "is_available": d.is_available,
            "created_at": str(d.created_at) if d.created_at else None,
            "date_of_birth": str(d.date_of_birth) if d.date_of_birth else None,
            "gender": d.gender,
            "home_district": d.home_district,
            "home_address": d.home_address,
            "profile_photo": d.profile_photo,
            "license_number": d.license_number,
            "license_expiry_date": str(d.license_expiry_date) if d.license_expiry_date else None,
            "license_front_image": d.license_front_image,
            "license_back_image": d.license_back_image,
            "vehicle_brand": d.vehicle_brand,
            "vehicle_number": d.vehicle_number,
            "vehicle_color": d.vehicle_color,
            "capacity": d.capacity,
            "vehicle_reg_book_image": d.vehicle_reg_book_image,
            "revenue_license_image": d.revenue_license_image,
            "insurance_cert_image": d.insurance_cert_image,
            "vehicle_front_image": d.vehicle_front_image,
            "vehicle_rear_image": d.vehicle_rear_image,
            "vehicle_side_image": d.vehicle_side_image,
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
# REJECT DRIVER (ADMIN PROTECTED)
# =========================
@driver_bp.route("/admin/driver/reject/<int:driver_id>", methods=["DELETE"])
@jwt_required()
def reject_driver(driver_id):
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"message": "Unauthorized"}), 403

    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify({"message": "Driver not found"}), 404

    db.session.delete(driver)
    db.session.commit()
    return jsonify({"message": "Driver registration rejected and removed"}), 200


# =========================
# DEACTIVATE DRIVER (ADMIN PROTECTED)
# =========================
@driver_bp.route("/admin/driver/deactivate/<int:driver_id>", methods=["PUT"])
@jwt_required()
def deactivate_driver(driver_id):
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"message": "Unauthorized"}), 403

    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify({"message": "Driver not found"}), 404

    driver.is_approved = False
    db.session.commit()
    return jsonify({"message": "Driver account deactivated successfully"}), 200


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

    driver_id = get_jwt_identity()
    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify({"message": "Driver not found"}), 404

    # 🔥 Filter tours by the driver's vehicle type and ensure they are NOT cancelled
    tours = TourPlan.query.join(Vehicle).filter(
        Vehicle.type == driver.vehicle_type,
        TourPlan.status != 'cancelled'
    ).order_by(TourPlan.created_at.desc()).all()

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
            tour.id
        )

    # ✅ CREATE OR UPDATE BOOKING TO LINK DRIVER TO TOUR
    from app.models import Booking
    booking = Booking.query.filter_by(tour_id=tour_id).first()
    if not booking:
        booking = Booking(
            tour_id=tour_id,
            driver_id=driver_id,
            total_price=tour.estimated_price, # Use current estimated price as default
            status="driver_approved"
        )
        db.session.add(booking)
    else:
        booking.driver_id = driver_id
        booking.status = "driver_approved"
        # total_price stays as is or updates to estimated_price
        if not booking.total_price:
            booking.total_price = tour.estimated_price

    admins = User.query.filter_by(role="admin").all()
    for admin in admins:
        create_notification(
            admin.email,
            "Driver accepted a tour request",
            f"{driver_name} accepted tour request #{tour.id}.",
            tour.id
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

    raw_id = get_jwt_identity()
    try:
        driver_id = int(raw_id)
    except (TypeError, ValueError):
        driver_id = None
    
    driver = Driver.query.get(driver_id) if driver_id else None
    driver_name = driver.full_name if driver else "Driver"

    tour.estimated_price = driver_price
    tour.status = "price_sent_by_driver"

    # Create or update booking for this tour
    booking = Booking.query.filter_by(tour_id=tour_id).first()
    if not booking:
        booking = Booking(
            tour_id=tour_id,
            driver_id=driver_id,
            total_price=driver_price,
            status="pending"
        )
        db.session.add(booking)
    else:
        booking.total_price = driver_price
        booking.driver_id = driver_id
        booking.status = "pending"

    user = User.query.get(tour.user_id) if tour.user_id else None

    if user:
        create_notification(
            user.email,
            "Driver sent a negotiated price",
            f"{driver_name} sent a new price for tour request #{tour.id}: Rs. {driver_price:.2f}",
            tour.id
        )

    admins = User.query.filter_by(role="admin").all()
    for admin in admins:
        create_notification(
            admin.email,
            "Driver negotiated a tour price",
            f"{driver_name} set Rs. {driver_price:.2f} for tour request #{tour.id}.",
            tour.id
        )

    db.session.commit()

    return jsonify({
        "message": "Driver price sent to user",
        "tour_id": tour.id,
        "driver_price": tour.estimated_price,
        "status": tour.status,
    }), 200
# =========================
# DRIVER: GET NOTIFICATIONS
# =========================
@driver_bp.route("/driver/notifications", methods=["GET"])
@jwt_required()
def get_driver_notifications():
    claims = get_jwt()
    if claims.get("role") != "driver":
        return jsonify({"message": "Unauthorized"}), 403

    driver_id = get_jwt_identity()
    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify({"message": "Driver not found"}), 404

    # Get notifications for this driver's email
    notes = Notification.query.filter_by(recipient_email=driver.email).order_by(Notification.created_at.desc()).all()

    result = []
    for n in notes:
        result.append({
            "id": n.id,
            "subject": n.subject,
            "message": n.message,
            "status": n.status,
            "tour_id": n.tour_id,
            "created_at": n.created_at.isoformat() if n.created_at else None
        })

    return jsonify(result), 200
