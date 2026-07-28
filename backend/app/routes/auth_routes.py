from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from flask_jwt_extended import create_access_token, jwt_required, get_jwt, get_jwt_identity

from app import db, limiter
from app.decorators import password_policy_error
from app.models import User, Driver, Notification

auth_bp = Blueprint("auth_bp", __name__)


# =========================
# ACCOUNT ROLE LOOKUP
# =========================
@auth_bp.route("/account-role", methods=["POST"])
def account_role_lookup():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data"}), 400

    email = data.get("email")
    if not email:
        return jsonify({"message": "Email is required"}), 400

    email = email.lower()

    driver = Driver.query.filter_by(email=email).first()
    if driver:
        return jsonify({"role": "driver"}), 200

    user = User.query.filter_by(email=email).first()
    if user:
        return jsonify({"role": user.role or "user"}), 200

    return jsonify({"role": "unknown"}), 200

# =========================
# USER REGISTER
# =========================
@auth_bp.route("/register", methods=["POST"])
@limiter.limit("5 per minute")
def register():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data"}), 400

    full_name = data.get("full_name")
    email = data.get("email")
    password = data.get("password")
    phone = data.get("phone")
    country = data.get("country")

    if not full_name or not email or not password:
        return jsonify({"message": "Missing required fields"}), 400

    pw_error = password_policy_error(password)
    if pw_error:
        return jsonify({"message": pw_error}), 400

    email = email.lower()

    # Check existing user
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"message": "Email already registered"}), 400

    # Hash password
    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

    # Create user (default role = user)
    new_user = User(
        full_name=full_name,
        email=email,
        password=hashed_password,
        phone=phone,
        country=country,
        role="user"   # 🔥 explicitly set
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201


# =========================
# USER LOGIN (WITH JWT)
# =========================
@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data"}), 400

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    email = email.lower()

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"message": "User not found"}), 404

    if not user.is_active:
        return jsonify({"message": "Account is disabled"}), 403

    if not check_password_hash(user.password, password):
        return jsonify({"message": "Invalid credentials"}), 401

    access_token = create_access_token(
    identity=str(user.id),   # MUST BE STRING
    additional_claims={
        "role": user.role    # role stored separately
    }
)

    return jsonify({
        "message": "Login successful",
        "token": access_token,
        "user": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role
        }
    }), 200


# =========================
# USER NOTIFICATIONS
# =========================
@auth_bp.route("/notifications/user", methods=["GET"])
@jwt_required()
def get_user_notifications():
    claims = get_jwt()
    if claims.get("role") != "user":
        return jsonify({"message": "Unauthorized"}), 403

    raw_id = get_jwt_identity()
    try:
        user_id = int(raw_id)
    except (TypeError, ValueError):
        return jsonify({"message": "Invalid user identity"}), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify([]), 200

    notifications = Notification.query.filter_by(recipient_email=user.email).order_by(Notification.created_at.desc()).all()

    return jsonify([
        {
            "id": n.id,
            "tour_id": n.tour_id,
            "subject": n.subject,
            "message": n.message,
            "status": n.status,
            "created_at": str(n.created_at) if n.created_at else None,
        }
        for n in notifications
    ]), 200


# =========================
# ADMIN: GET ALL USERS
# =========================
@auth_bp.route("/admin/users", methods=["GET"])
@jwt_required()
def get_all_users():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"message": "Unauthorized"}), 403

    users = User.query.filter(User.role != "admin").all()

    return jsonify([
        {
            "id": u.id,
            "name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "country": u.country,
            "is_active": u.is_active,
            "created_at": str(u.created_at) if u.created_at else None,
        }
        for u in users
    ]), 200


# =========================
# ADMIN: UPDATE USER
# =========================
@auth_bp.route("/admin/users/<int:user_id>", methods=["PUT"])
@jwt_required()
def update_user(user_id):
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"message": "Unauthorized"}), 403

    user = User.query.get(user_id)
    if not user or user.role == "admin":
        return jsonify({"message": "User not found"}), 404

    data = request.get_json() or {}
    if "name" in data:
        user.full_name = data["name"].strip()
    if "email" in data:
        email = data["email"].strip().lower()
        existing = User.query.filter(User.email == email, User.id != user_id).first()
        if existing:
            return jsonify({"message": "Email already in use"}), 409
        user.email = email
    if "phone" in data:
        user.phone = data["phone"].strip() or None
    if "country" in data:
        user.country = data["country"].strip() or None
    if "is_active" in data:
        user.is_active = bool(data["is_active"])

    db.session.commit()
    return jsonify({
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "country": user.country,
            "is_active": user.is_active,
            "created_at": str(user.created_at) if user.created_at else None,
        },
    }), 200


# =========================
# ADMIN: DELETE USER
# =========================
@auth_bp.route("/admin/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"message": "Unauthorized"}), 403

    user = User.query.get(user_id)
    if not user or user.role == "admin":
        return jsonify({"message": "User not found"}), 404

    from app.models import TourPlan
    active_tours = TourPlan.query.filter(
        TourPlan.user_id == user_id,
        TourPlan.status.notin_(["completed", "cancelled"]),
    ).count()
    if active_tours > 0:
        return jsonify({
            "message": f"Cannot delete user with {active_tours} active tour(s). Deactivate instead.",
        }), 409

    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted successfully"}), 200


# =========================
# ADMIN NOTIFICATIONS
# =========================
@auth_bp.route("/notifications/admin", methods=["GET"])
@jwt_required()
def get_admin_notifications():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"message": "Unauthorized"}), 403

    raw_id = get_jwt_identity()
    try:
        admin_id = int(raw_id)
    except (TypeError, ValueError):
        return jsonify({"message": "Invalid admin identity"}), 401

    admin = User.query.get(admin_id)
    if not admin:
        return jsonify([]), 200

    notifications = Notification.query.filter_by(recipient_email=admin.email).order_by(Notification.created_at.desc()).all()

    return jsonify([
        {
            "id": n.id,
            "tour_id": n.tour_id,
            "subject": n.subject,
            "message": n.message,
            "status": n.status,
            "created_at": str(n.created_at) if n.created_at else None,
        }
        for n in notifications
    ]), 200


from sqlalchemy import func, or_


def _caller_notification_filter():
    """Return a SQLAlchemy filter for notifications owned by the JWT caller."""
    claims = get_jwt()
    role = claims.get("role", "user")
    raw_id = get_jwt_identity()

    try:
        uid = int(raw_id)
    except (TypeError, ValueError):
        return None

    if role == "driver":
        from app.models import Driver
        driver = Driver.query.get(uid)
        if not driver:
            return None
        clauses = [Notification.recipient_driver_id == uid]
        if driver.email:
            clauses.append(func.lower(Notification.recipient_email) == driver.email.strip().lower())
        return or_(*clauses)

    entity = User.query.get(uid)
    if not entity or not entity.email:
        return None
    return func.lower(Notification.recipient_email) == entity.email.strip().lower()


def _resolve_email():
    """Return the email of the authenticated caller (user, admin, or driver)."""
    claims = get_jwt()
    role = claims.get("role", "user")
    raw_id = get_jwt_identity()

    try:
        uid = int(raw_id)
    except (TypeError, ValueError):
        return None

    if role == "driver":
        from app.models import Driver
        entity = Driver.query.get(uid)
    else:
        entity = User.query.get(uid)

    return entity.email if entity else None


# =========================
# MARK ONE NOTIFICATION AS READ
# =========================
@auth_bp.route("/notifications/<int:notif_id>/read", methods=["PUT"])
@jwt_required()
def mark_notification_read(notif_id):
    owner_filter = _caller_notification_filter()
    if owner_filter is None:
        return jsonify({"message": "Unauthorized"}), 403

    notif = Notification.query.filter(Notification.id == notif_id).filter(owner_filter).first()
    if not notif:
        return jsonify({"message": "Notification not found"}), 404

    notif.status = "read"
    db.session.commit()
    return jsonify({"message": "Notification marked as read"}), 200


# =========================
# MARK ALL NOTIFICATIONS AS READ
# =========================
@auth_bp.route("/notifications/read-all", methods=["PUT"])
@jwt_required()
def mark_all_notifications_read():
    owner_filter = _caller_notification_filter()
    if owner_filter is None:
        return jsonify({"message": "Unauthorized"}), 403

    Notification.query.filter(owner_filter).filter(Notification.status != "read").update({"status": "read"})
    db.session.commit()
    return jsonify({"message": "All notifications marked as read"}), 200


# =========================
# DELETE ONE NOTIFICATION
# =========================
@auth_bp.route("/notifications/<int:notif_id>", methods=["DELETE"])
@jwt_required()
def delete_notification(notif_id):
    owner_filter = _caller_notification_filter()
    if owner_filter is None:
        return jsonify({"message": "Unauthorized"}), 403

    notif = Notification.query.filter(Notification.id == notif_id).filter(owner_filter).first()
    if not notif:
        return jsonify({"message": "Notification not found"}), 404

    db.session.delete(notif)
    db.session.commit()
    return jsonify({"message": "Notification deleted"}), 200


# =========================
# CLEAR ALL NOTIFICATIONS
# =========================
@auth_bp.route("/notifications/clear-all", methods=["DELETE"])
@jwt_required()
def clear_all_notifications():
    owner_filter = _caller_notification_filter()
    if owner_filter is None:
        return jsonify({"message": "Unauthorized"}), 403

    Notification.query.filter(owner_filter).delete()
    db.session.commit()
    return jsonify({"message": "All notifications cleared"}), 200