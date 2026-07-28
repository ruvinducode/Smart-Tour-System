from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, jwt_required


def password_policy_error(password: str) -> str | None:
    """Return a user-facing error message if the password is too weak, else None."""
    if not password or len(password) < 8:
        return "Password must be at least 8 characters"
    if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        return "Password must contain at least one letter and one number"
    return None


def admin_required(fn):
    """JWT + admin role guard for finance and sensitive admin APIs."""

    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "admin":
            return jsonify({"message": "Admin access required"}), 403
        return fn(*args, **kwargs)

    return wrapper
