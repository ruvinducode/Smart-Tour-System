"""End-to-end checks for GET/PUT /profile (self-service traveler profile).

Runs against a throwaway SQLite file and the Flask test client, so it never
touches the real database. No pytest dependency — run it directly:

    venv/bin/python tests/test_profile_api.py
"""

import os
import sys
import tempfile

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

_DB_FD, _DB_PATH = tempfile.mkstemp(suffix=".db")
os.close(_DB_FD)
os.environ["DATABASE_URL"] = "sqlite:///" + _DB_PATH
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key")
os.environ.pop("RESEND_API_KEY", None)

from werkzeug.security import generate_password_hash  # noqa: E402

from app import create_app, db, limiter  # noqa: E402
from app.models import Driver, User  # noqa: E402
from flask_jwt_extended import create_access_token  # noqa: E402

app = create_app()
limiter.enabled = False

_failures = []


def check(label, condition, detail=""):
    if condition:
        print("  PASS  %s" % label)
    else:
        print("  FAIL  %s %s" % (label, detail))
        _failures.append(label)


def token_for(user_id, role):
    with app.app_context():
        return create_access_token(identity=str(user_id), additional_claims={"role": role})


def auth_headers(token):
    return {"Authorization": "Bearer %s" % token}


def main():
    with app.app_context():
        db.create_all()
        user = User(
            full_name="Grace Hopper",
            email="grace@example.com",
            password=generate_password_hash("compiler1", method="pbkdf2:sha256"),
            phone="+94 771111111",
            country="United States",
            role="user",
        )
        other_user = User(
            full_name="Other Traveler",
            email="other@example.com",
            password=generate_password_hash("password1", method="pbkdf2:sha256"),
            role="user",
        )
        driver = Driver(full_name="Some Driver", password=generate_password_hash("driverpw1", method="pbkdf2:sha256"), phone="0770000000")
        db.session.add_all([user, other_user, driver])
        db.session.commit()
        user_id, other_id, driver_id = user.id, other_user.id, driver.id

    client = app.test_client()
    user_token = token_for(user_id, "user")
    driver_token = token_for(driver_id, "driver")

    print("\n-- unauthenticated --")
    res = client.get("/profile")
    check("GET without token is rejected", res.status_code == 401, res.status_code)
    res = client.put("/profile", json={"full_name": "X"})
    check("PUT without token is rejected", res.status_code == 401, res.status_code)

    print("\n-- wrong role --")
    res = client.get("/profile", headers=auth_headers(driver_token))
    check("driver token cannot read /profile", res.status_code == 403, res.status_code)

    print("\n-- happy path: GET --")
    res = client.get("/profile", headers=auth_headers(user_token))
    body = res.get_json() or {}
    check("GET returns 200", res.status_code == 200, res.status_code)
    check("GET returns real email (not a JWT id)", body.get("email") == "grace@example.com", body)
    check("GET returns full_name", body.get("full_name") == "Grace Hopper", body)
    check("GET returns phone", body.get("phone") == "+94 771111111", body)
    check("GET returns country", body.get("country") == "United States", body)

    print("\n-- happy path: PUT --")
    res = client.put("/profile", json={
        "full_name": "  Grace M. Hopper  ",
        "phone": " +1 202-555-0199 ",
        "country": "  Canada ",
    }, headers=auth_headers(user_token))
    body = res.get_json() or {}
    check("PUT returns 200", res.status_code == 200, (res.status_code, body))
    check("PUT trims full_name", body.get("user", {}).get("full_name") == "Grace M. Hopper", body)
    check("PUT trims phone", body.get("user", {}).get("phone") == "+1 202-555-0199", body)
    check("PUT trims country", body.get("user", {}).get("country") == "Canada", body)

    with app.app_context():
        persisted = User.query.get(user_id)
        check("changes actually persisted to DB", persisted.full_name == "Grace M. Hopper", persisted.full_name)
        check("email untouched by profile PUT", persisted.email == "grace@example.com", persisted.email)
        check("password untouched by profile PUT", persisted.password != "compiler1")

    print("\n-- validation --")
    cases = [
        ("blank full_name rejected", {"full_name": "   "}, 400),
        ("missing full_name rejected", {"phone": "071"}, 400),
        ("oversized full_name rejected", {"full_name": "x" * 200}, 400),
        ("bad phone rejected", {"full_name": "OK Name", "phone": "abc"}, 400),
        ("oversized country rejected", {"full_name": "OK Name", "country": "x" * 200}, 400),
    ]
    for label, payload, expected in cases:
        res = client.put("/profile", json=payload, headers=auth_headers(user_token))
        check(label, res.status_code == expected, (res.status_code, res.get_json()))

    print("\n-- optional fields cleared --")
    res = client.put("/profile", json={"full_name": "Solo Name", "phone": "", "country": ""}, headers=auth_headers(user_token))
    body = res.get_json() or {}
    check("blank phone/country accepted", res.status_code == 200, (res.status_code, body))
    with app.app_context():
        persisted = User.query.get(user_id)
        check("blank phone stored as NULL", persisted.phone is None, persisted.phone)
        check("blank country stored as NULL", persisted.country is None, persisted.country)

    print("\n-- isolation between users --")
    with app.app_context():
        untouched = User.query.get(other_id)
        check("other user's profile untouched", untouched.full_name == "Other Traveler", untouched.full_name)

    print("\n%s" % ("-" * 40))
    if _failures:
        print("%d FAILED: %s" % (len(_failures), ", ".join(_failures)))
        return 1
    print("All profile-endpoint checks passed.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    finally:
        os.path.exists(_DB_PATH) and os.unlink(_DB_PATH)
