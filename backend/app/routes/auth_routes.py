from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from flask_jwt_extended import create_access_token, jwt_required, get_jwt, get_jwt_identity

from app import db
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
            "subject": n.subject,
            "message": n.message,
            "status": n.status,
            "created_at": str(n.created_at) if n.created_at else None,
        }
        for n in notifications
    ]), 200


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
            "subject": n.subject,
            "message": n.message,
            "status": n.status,
            "created_at": str(n.created_at) if n.created_at else None,
        }
        for n in notifications
    ]), 200