from flask import Blueprint, request, jsonify, send_from_directory, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from PIL import Image, UnidentifiedImageError
import os, uuid
from datetime import datetime

from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt,
    get_jwt_identity,
)

from app import db, limiter
from app.decorators import password_policy_error
from app.models import Driver, TourPlan, User, Notification, Booking, Vehicle, Location, DriverPayment
from app.services.vehicle_matching_service import normalize_vehicle_type, vehicle_ids_for_type
from app.services.tour_pricing_service import haversine
from app.services.notification_service import (
    get_notifications_for_driver,
    notify_driver_pending_tours,
    notify_driver_registered,
    notify_driver_approved,
    notify_driver_rejected,
)
from app.services.finance_service import enrich_driver_payment

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
    dest_path = os.path.join(UPLOAD_FOLDER, unique_name)
    file_obj.save(dest_path)

    # The extension check above only looks at the client-supplied filename,
    # which is trivial to fake — confirm the bytes we actually wrote are a
    # real, decodable image before letting anything reference this file.
    try:
        with Image.open(dest_path) as img:
            img.verify()
    except (UnidentifiedImageError, OSError):
        os.remove(dest_path)
        return None

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
@jwt_required()
def serve_driver_upload(filename):
    # These are identity documents (NIC, license, vehicle papers) — require
    # any authenticated caller rather than serving them to the public.
    return send_from_directory(UPLOAD_FOLDER, filename)


# =========================
# DRIVER REGISTER  (multipart/form-data)
# =========================
@driver_bp.route("/driver/register", methods=["POST"])
@limiter.limit("5 per minute")
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

    pw_error = password_policy_error(password)
    if pw_error:
        return jsonify({"message": pw_error}), 400

    # ── Optional / conditional fields ────────────
    email           = (form.get("email") or "").strip().lower() or None
    nic_number      = form.get("nic_number", "").strip() or None
    gender          = form.get("gender", "").strip() or None
    home_district   = form.get("home_district", "").strip() or None
    home_address    = form.get("home_address", "").strip() or None
    license_number  = form.get("license_number", "").strip() or None
    vehicle_type    = normalize_vehicle_type(form.get("vehicle_type", "").strip() or None)
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

    notify_driver_registered(new_driver)

    return jsonify({
        "message": "Driver registered successfully. Waiting for admin approval."
    }), 201



# =========================
# DRIVER LOGIN (JWT TOKEN)
# =========================
@driver_bp.route("/driver/login", methods=["POST"])
@limiter.limit("10 per minute")
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
    # Driver and User rows are separate auto-increment sequences, so their IDs
    # regularly collide (e.g. user #1 and driver #1 both exist) — without this
    # check, any authenticated non-driver whose JWT id happens to match a
    # driver's row could read (and via the PUT sibling, overwrite) that
    # driver's private profile, license, and vehicle data.
    if get_jwt().get("role") != "driver":
        return jsonify({"message": "Unauthorized"}), 403

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
    if get_jwt().get("role") != "driver":
        return jsonify({"message": "Unauthorized"}), 403

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
    if "vehicle_type" in data:
        driver.vehicle_type = normalize_vehicle_type(data["vehicle_type"])
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
            file_obj = files[field]
            if file_obj and file_obj.filename != "":
                new_file = save_upload(file_obj)
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
            "rating": d.rating,
            "total_ratings": d.total_ratings,
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
            "is_available": d.is_available,
            "rating": d.rating,
            "total_ratings": d.total_ratings,
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
            "rating": d.rating,
            "total_ratings": d.total_ratings,
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

    notify_driver_pending_tours(driver)
    notify_driver_approved(driver)
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

    driver_name, driver_email = driver.full_name, driver.email

    db.session.delete(driver)
    db.session.commit()

    notify_driver_rejected(driver_name, driver_email)

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
# UPDATE DRIVER (ADMIN PROTECTED)
# =========================
@driver_bp.route("/admin/driver/<int:driver_id>", methods=["PUT"])
@jwt_required()
def admin_update_driver(driver_id):
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"message": "Unauthorized"}), 403

    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify({"message": "Driver not found"}), 404

    data = request.get_json() or {}
    if "name" in data:
        driver.full_name = data["name"].strip()
    if "email" in data:
        email = (data["email"] or "").strip().lower() or None
        if email:
            existing = Driver.query.filter(Driver.email == email, Driver.id != driver_id).first()
            if existing:
                return jsonify({"message": "Email already in use"}), 409
        driver.email = email
    if "phone" in data:
        driver.phone = data["phone"].strip()
    if "vehicle" in data:
        driver.vehicle_type = normalize_vehicle_type(data["vehicle"].strip())
    if "vehicle_number" in data:
        driver.vehicle_number = data["vehicle_number"].strip() or None
    if "capacity" in data:
        driver.capacity = int(data["capacity"]) if data["capacity"] not in (None, "") else None
    if "is_approved" in data:
        was_approved = driver.is_approved
        driver.is_approved = bool(data["is_approved"])
        if driver.is_approved and not was_approved:
            notify_driver_pending_tours(driver)
            notify_driver_approved(driver)

    if "is_available" in data:
        driver.is_available = bool(data["is_available"])

    db.session.commit()
    return jsonify({
        "message": "Driver updated successfully",
        "driver": {
            "id": driver.id,
            "name": driver.full_name,
            "email": driver.email,
            "phone": driver.phone,
            "vehicle": driver.vehicle_type,
            "vehicle_number": driver.vehicle_number,
            "capacity": driver.capacity,
            "is_approved": driver.is_approved,
            "is_available": driver.is_available,
        },
    }), 200


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

    tours = TourPlan.query.order_by(TourPlan.created_at.desc()).all()

    result = []
    for t in tours:
        user = User.query.get(t.user_id) if t.user_id else None
        booking = Booking.query.filter_by(tour_id=t.id).first()
        driver = Driver.query.get(booking.driver_id) if booking and booking.driver_id else None
        vehicle = Vehicle.query.get(t.vehicle_id) if t.vehicle_id else None
        first_loc = (
            Location.query.filter_by(tour_id=t.id)
            .order_by(Location.order_index.asc())
            .first()
        )

        result.append({
            "id": t.id,
            "user_id": t.user_id,
            "guest_id": t.guest_id,
            "vehicle_id": t.vehicle_id,
            "start_date": str(t.start_date) if t.start_date else None,
            "end_date": str(t.end_date) if t.end_date else None,
            "start_time": t.start_time,
            "total_distance_km": t.total_distance_km,
            "total_days": t.total_days,
            "estimated_price": t.estimated_price,
            "status": t.status,
            "created_at": str(t.created_at) if t.created_at else None,
            "user_name": user.full_name if user else None,
            "user_email": user.email if user else None,
            "driver_id": driver.id if driver else None,
            "driver_name": driver.full_name if driver else None,
            "driver_phone": driver.phone if driver else None,
            "vehicle_type": vehicle.type if vehicle else (driver.vehicle_type if driver else None),
            "vehicle_number": driver.vehicle_number if driver else None,
            "booking_status": booking.status if booking else None,
            "total_price": booking.total_price if booking else None,
            "driver_lat": t.driver_lat,
            "driver_lng": t.driver_lng,
            "last_location_update": t.last_location_update.isoformat() if t.last_location_update else None,
            "pickup_name": first_loc.place_name if first_loc else None,
            "pickup_lat": first_loc.latitude if first_loc else None,
            "pickup_lng": first_loc.longitude if first_loc else None,
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
    try:
        driver_id_int = int(driver_id)
    except (TypeError, ValueError):
        return jsonify({"message": "Invalid driver identity"}), 401

    driver = Driver.query.get(driver_id_int)
    if not driver:
        return jsonify({"message": "Driver not found"}), 404

    matching_vehicle_ids = vehicle_ids_for_type(driver.vehicle_type)
    if not matching_vehicle_ids:
        return jsonify([]), 200

    from sqlalchemy import or_
    tours = (
        TourPlan.query.outerjoin(Booking, Booking.tour_id == TourPlan.id)
        .filter(
            TourPlan.vehicle_id.in_(matching_vehicle_ids),
            TourPlan.status != "cancelled",
            or_(Booking.id.is_(None), Booking.driver_id == driver_id_int),
        )
        .order_by(TourPlan.created_at.desc())
        .all()
    )

    from app.models import TourOffer

    result = []
    for t in tours:
        user = User.query.get(t.user_id) if t.user_id else None
        booking = Booking.query.filter_by(tour_id=t.id).first()
        my_offer = TourOffer.query.filter_by(tour_id=t.id, driver_id=driver_id_int).first()
        offer_count = TourOffer.query.filter_by(tour_id=t.id, status="pending").count()
        result.append({
            "id": t.id,
            "user_id": t.user_id,
            "user_name": user.full_name if user else "Unknown User",
            "user_email": user.email if user else None,
            "vehicle_id": t.vehicle_id,
            "start_date": str(t.start_date) if t.start_date else None,
            "end_date": str(t.end_date) if t.end_date else None,
            "start_time": t.start_time,
            "total_distance_km": t.total_distance_km,
            "total_days": t.total_days,
            "estimated_price": t.estimated_price,
            "driver_price": booking.total_price if booking else None,
            "my_offer": {
                "id": my_offer.id,
                "price": my_offer.price,
                "status": my_offer.status,
                "offer_type": my_offer.offer_type,
            } if my_offer else None,
            "offer_count": offer_count,
            "status": t.status,
            "created_at": str(t.created_at) if t.created_at else None,
        })

    return jsonify(result), 200


# A driver actively driving/confirmed on a trip shouldn't be interrupted by a
# new-request popup — except when they're on an ongoing tour and nearly done,
# in which case a heads-up about upcoming work is genuinely useful to them.
DRIVER_BUSY_STATUSES = ["driver_approved", "confirmed", "en_route", "arrived"]
NEAR_COMPLETION_KM = 1.0


# =========================
# DRIVER: GET INCOMING (POPUP-ELIGIBLE) TOUR REQUESTS
# =========================
@driver_bp.route("/driver/incoming-tour-requests", methods=["GET"])
@jwt_required()
def get_driver_incoming_tour_requests():
    claims = get_jwt()
    if claims.get("role") != "driver":
        return jsonify({"message": "Unauthorized"}), 403

    try:
        driver_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return jsonify({"message": "Invalid driver identity"}), 401

    driver = Driver.query.get(driver_id)
    if not driver or not driver.is_approved:
        return jsonify([]), 200

    # Block the popup while genuinely busy; allow it through for an ongoing
    # tour that's within ~1km of its final stop (about to free up).
    active_booking = (
        Booking.query.join(TourPlan, Booking.tour_id == TourPlan.id)
        .filter(
            Booking.driver_id == driver_id,
            TourPlan.status.in_(DRIVER_BUSY_STATUSES + ["ongoing"]),
        )
        .first()
    )
    if active_booking:
        active_tour = TourPlan.query.get(active_booking.tour_id)
        if active_tour.status in DRIVER_BUSY_STATUSES:
            return jsonify([]), 200
        if active_tour.status == "ongoing":
            near_completion = False
            if active_tour.driver_lat is not None and active_tour.driver_lng is not None:
                final_stop = (
                    Location.query.filter_by(tour_id=active_tour.id)
                    .order_by(Location.order_index.desc())
                    .first()
                )
                if final_stop:
                    dist = haversine(
                        active_tour.driver_lat, active_tour.driver_lng,
                        final_stop.latitude, final_stop.longitude,
                    )
                    near_completion = dist <= NEAR_COMPLETION_KM
            if not near_completion:
                return jsonify([]), 200

    matching_vehicle_ids = vehicle_ids_for_type(driver.vehicle_type)
    if not matching_vehicle_ids:
        return jsonify([]), 200

    # Strictly open requests only — untouched by any driver yet. The moment
    # any driver accepts or negotiates, a Booking row exists and it drops out
    # of this query for everyone (including the driver who acted), which is
    # exactly the "remove automatically once someone picks it up" behavior.
    open_tours = (
        TourPlan.query.outerjoin(Booking, Booking.tour_id == TourPlan.id)
        .filter(
            TourPlan.vehicle_id.in_(matching_vehicle_ids),
            TourPlan.status == "planned",
            Booking.id.is_(None),
        )
        .order_by(TourPlan.created_at.desc())
        .all()
    )

    result = []
    for t in open_tours:
        user = User.query.get(t.user_id) if t.user_id else None
        locs = Location.query.filter_by(tour_id=t.id).order_by(Location.order_index.asc()).all()
        result.append({
            "id": t.id,
            "user_name": user.full_name if user else "Guest",
            "start_date": str(t.start_date) if t.start_date else None,
            "end_date": str(t.end_date) if t.end_date else None,
            "total_distance_km": t.total_distance_km,
            "total_days": t.total_days,
            "estimated_price": t.estimated_price,
            "pickup_name": locs[0].place_name if locs else None,
            "destination_name": locs[-1].place_name if len(locs) > 1 else None,
            "stops_count": len(locs),
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

    raw_id = get_jwt_identity()
    try:
        driver_id = int(raw_id)
    except (TypeError, ValueError):
        driver_id = None

    # Multiple drivers can each have a live offer on the same open tour — the
    # only thing that actually locks a tour to one driver is the traveler
    # accepting a specific offer, which creates a real Booking. So the only
    # thing that must block this call is a Booking already existing for a
    # *different* driver (tour already won) — not another driver's pending
    # offer, and not this driver's own prior offer (re-accepting is a no-op).
    from app.models import Booking, TourOffer
    booking = Booking.query.filter_by(tour_id=tour_id).first()
    if booking and booking.driver_id != driver_id:
        return jsonify({"message": "This tour is no longer available to approve"}), 409
    if tour.status not in ("planned", "price_sent_by_driver", "rejected"):
        return jsonify({"message": "This tour is no longer available to approve"}), 409

    driver = Driver.query.get(driver_id) if driver_id else None
    driver_name = driver.full_name if driver else "Driver"

    offer = TourOffer.query.filter_by(tour_id=tour_id, driver_id=driver_id).first()
    if offer and offer.status == "pending":
        return jsonify({"message": "You already have a pending offer on this tour"}), 200
    if not offer:
        offer = TourOffer(
            tour_id=tour_id, driver_id=driver_id,
            offer_type="direct", price=tour.estimated_price, status="pending",
        )
        db.session.add(offer)
    else:
        offer.offer_type = "direct"
        offer.price = tour.estimated_price
        offer.status = "pending"

    tour.status = "price_sent_by_driver"

    user = User.query.get(tour.user_id) if tour.user_id else None
    if user:
        create_notification(
            user.email,
            "A driver wants to accept your tour request",
            f"{driver_name} is ready to accept tour #{tour.id} at the listed price "
            f"(Rs. {tour.estimated_price:.2f}). Review and confirm in your dashboard.",
            tour.id
        )

    admins = User.query.filter_by(role="admin").all()
    for admin in admins:
        create_notification(
            admin.email,
            "Driver offered to accept a tour request",
            f"{driver_name} offered to accept tour request #{tour.id}.",
            tour.id
        )

    db.session.commit()

    return jsonify({"message": "Offer sent to traveler for confirmation"}), 200


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

    # Same hijack risk as the approve endpoint: without this guard, any driver
    # could send a "counter-price" on a tour already won by someone else (a
    # real Booking exists) and take it over. But multiple drivers negotiating
    # in parallel on a still-open tour is exactly the point now, so a *pending
    # offer from another driver* is not itself a reason to block this one.
    # "rejected" is included because that's the state after the traveler
    # turns down every current offer — any driver, including this one, must
    # be able to send a new one, or the negotiation dead-ends.
    from app.models import TourOffer
    booking = Booking.query.filter_by(tour_id=tour_id).first()
    if booking and booking.driver_id != driver_id:
        return jsonify({"message": "This tour is no longer available to negotiate"}), 409
    if tour.status not in ("planned", "price_sent_by_driver", "rejected"):
        return jsonify({"message": "This tour is no longer available to negotiate"}), 409

    tour.status = "price_sent_by_driver"

    # Create or update this driver's own offer — other drivers' offers on the
    # same tour are untouched.
    offer = TourOffer.query.filter_by(tour_id=tour_id, driver_id=driver_id).first()
    if not offer:
        offer = TourOffer(
            tour_id=tour_id, driver_id=driver_id,
            offer_type="negotiated", price=driver_price, status="pending",
        )
        db.session.add(offer)
    else:
        offer.price = driver_price
        offer.offer_type = "negotiated"
        offer.status = "pending"

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
        "driver_price": driver_price,
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
    try:
        driver_id_int = int(driver_id)
    except (TypeError, ValueError):
        return jsonify({"message": "Invalid driver identity"}), 401

    driver = Driver.query.get(driver_id_int)
    if not driver:
        return jsonify({"message": "Driver not found"}), 404

    notes = get_notifications_for_driver(driver)

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


# =========================
# DRIVER: GET MY PAYMENTS
# =========================
@driver_bp.route("/driver/payments", methods=["GET"])
@jwt_required()
def get_my_driver_payments():
    claims = get_jwt()
    if claims.get("role") != "driver":
        return jsonify({"message": "Unauthorized"}), 403

    try:
        driver_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return jsonify({"message": "Invalid driver identity"}), 401

    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify({"message": "Driver not found"}), 404

    payments = (
        DriverPayment.query.filter_by(driver_id=driver_id)
        .order_by(DriverPayment.created_at.desc())
        .all()
    )
    return jsonify([enrich_driver_payment(p) for p in payments]), 200


def _build_driver_feedback_payload(driver):
    """Shared shape for a single driver's rating summary + feedback list —
    used by both the driver's own dashboard and the admin driver-detail view,
    so the two can never drift apart."""
    from app.models import Feedback, User
    feedbacks = Feedback.query.filter_by(driver_id=driver.id).order_by(Feedback.created_at.desc()).all()

    breakdown = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    results = []

    for f in feedbacks:
        if f.rating in breakdown:
            breakdown[f.rating] += 1

        user = User.query.get(f.user_id) if f.user_id else None
        results.append({
            "id": f.id,
            "tour_id": f.tour_id,
            "user_name": user.full_name if user else "Guest",
            "rating": f.rating,
            "comment": f.comment,
            "created_at": f.created_at.isoformat() if f.created_at else None
        })

    return {
        "summary": {
            "total_feedbacks": driver.total_ratings,
            "average_rating": driver.rating,
            "breakdown": breakdown
        },
        "feedbacks": results
    }


# =========================
# DRIVER: GET MY FEEDBACKS
# =========================
@driver_bp.route("/driver/feedbacks", methods=["GET"])
@jwt_required()
def get_my_driver_feedbacks():
    claims = get_jwt()
    if claims.get("role") != "driver":
        return jsonify({"message": "Unauthorized"}), 403

    try:
        driver_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return jsonify({"message": "Invalid driver identity"}), 401

    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify({"message": "Driver not found"}), 404

    return jsonify(_build_driver_feedback_payload(driver)), 200


# =========================
# ADMIN: GET A SPECIFIC DRIVER'S FEEDBACKS
# =========================
@driver_bp.route("/admin/driver/<int:driver_id>/feedbacks", methods=["GET"])
@jwt_required()
def get_driver_feedbacks_admin(driver_id):
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"message": "Unauthorized"}), 403

    driver = Driver.query.get(driver_id)
    if not driver:
        return jsonify({"message": "Driver not found"}), 404

    return jsonify(_build_driver_feedback_payload(driver)), 200
