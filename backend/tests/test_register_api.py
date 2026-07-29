"""End-to-end checks for POST /register.

Runs against a throwaway SQLite file and the Flask test client, so it never
touches the real database. No pytest dependency — run it directly:

    venv/bin/python tests/test_register_api.py
"""

import os
import sys
import tempfile

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Must be set before app.config is imported.
_DB_FD, _DB_PATH = tempfile.mkstemp(suffix=".db")
os.close(_DB_FD)
os.environ["DATABASE_URL"] = "sqlite:///" + _DB_PATH
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key")
# Keep the welcome email out of the picture entirely.
os.environ.pop("RESEND_API_KEY", None)

from app import create_app, db, limiter  # noqa: E402
from app.models import User  # noqa: E402

app = create_app()
# The limiter is Redis-backed and would cap us at 5 registrations per minute.
limiter.enabled = False

VALID = {
    "full_name": "  Ada Lovelace  ",
    "email": "  Ada@Example.COM ",
    "phone": " +94 771234567 ",
    "country": "Sri Lanka",
    "password": "analytical1",
}

_failures = []


def check(label, condition, detail=""):
    if condition:
        print("  PASS  %s" % label)
    else:
        print("  FAIL  %s %s" % (label, detail))
        _failures.append(label)


def post(client, **overrides):
    payload = dict(VALID)
    payload.update(overrides)
    for key in [k for k, v in payload.items() if v is None]:
        del payload[key]
    res = client.post("/register", json=payload)
    return res.status_code, res.get_json() or {}


def main():
    with app.app_context():
        db.create_all()

    client = app.test_client()

    print("\n-- happy path --")
    status, body = post(client)
    check("valid registration returns 201", status == 201, (status, body))

    with app.app_context():
        user = User.query.filter_by(email="ada@example.com").first()
        check("user row created", user is not None)
        if user:
            check("full_name trimmed", user.full_name == "Ada Lovelace", repr(user.full_name))
            check("email lowercased + trimmed", user.email == "ada@example.com", repr(user.email))
            check("phone trimmed", user.phone == "+94 771234567", repr(user.phone))
            check("country persisted", user.country == "Sri Lanka", repr(user.country))
            check("role defaults to user", user.role == "user", repr(user.role))
            check("password is hashed", user.password != VALID["password"])

    print("\n-- duplicates --")
    status, body = post(client, email="ADA@example.com")
    check("duplicate email rejected (case-insensitive)", status == 400, (status, body))

    print("\n-- field validation --")
    cases = [
        ("blank full_name", {"full_name": "   "}, 400),
        ("missing full_name", {"full_name": None}, 400),
        ("malformed email", {"email": "not-an-email"}, 400),
        ("email without TLD", {"email": "ada@example"}, 400),
        ("oversized full_name", {"full_name": "x" * 200, "email": "a1@example.com"}, 400),
        ("oversized email", {"email": "x" * 130 + "@example.com"}, 400),
        ("bad phone", {"phone": "abc", "email": "a2@example.com"}, 400),
        ("short password", {"password": "ab1", "email": "a3@example.com"}, 400),
        ("letters-only password", {"password": "abcdefghij", "email": "a4@example.com"}, 400),
        ("digits-only password", {"password": "1234567890", "email": "a5@example.com"}, 400),
    ]
    for label, override, expected in cases:
        status, body = post(client, **override)
        check(label, status == expected, (status, body.get("message")))

    print("\n-- optional fields --")
    status, body = post(client, email="nocountry@example.com", country=None, phone=None)
    check("country and phone are optional", status == 201, (status, body))

    status, body = post(client, email="blankcountry@example.com", country="   ")
    check("blank country accepted as empty", status == 201, (status, body))
    with app.app_context():
        u = User.query.filter_by(email="blankcountry@example.com").first()
        check("blank country stored as NULL", u is not None and u.country is None)

    print("\n-- malformed request --")
    res = client.post("/register", json=None, content_type="application/json", data="")
    check("empty body rejected", res.status_code in (400, 415), res.status_code)

    print("\n%s" % ("-" * 40))
    if _failures:
        print("%d FAILED: %s" % (len(_failures), ", ".join(_failures)))
        return 1
    print("All registration checks passed.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    finally:
        os.path.exists(_DB_PATH) and os.unlink(_DB_PATH)
