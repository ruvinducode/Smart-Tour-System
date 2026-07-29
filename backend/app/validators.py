"""Reusable request-field validation for account endpoints.

Keeps the max lengths in one place next to the column widths they protect —
oversized input previously reached the database and surfaced as a 500 instead
of a clear 400.
"""

import re

# Mirrors the User model column widths in app/models/user.py.
MAX_FULL_NAME = 150
MAX_EMAIL = 120
MAX_PHONE = 20
MAX_COUNTRY = 100

# Deliberately permissive — catches obvious typos without rejecting valid
# but unusual addresses. Matches the frontend rule in utils/validation.js.
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
_PHONE_RE = re.compile(r"^\+?[\d\s\-()]{7,20}$")


def clean_str(value, max_length=None):
    """Trim a possibly-None field, collapsing blanks to None."""
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if max_length is not None:
        text = text[:max_length]
    return text


def registration_error(full_name, email, password, phone, country):
    """Return a user-facing message for the first invalid field, else None.

    Password strength is checked separately by `password_policy_error` so the
    two policies stay independently reusable.
    """
    if not full_name:
        return "Full name is required"
    if len(full_name) > MAX_FULL_NAME:
        return f"Full name must be at most {MAX_FULL_NAME} characters"

    if not email:
        return "Email is required"
    if len(email) > MAX_EMAIL:
        return f"Email must be at most {MAX_EMAIL} characters"
    if not _EMAIL_RE.match(email):
        return "Enter a valid email address"

    if not password:
        return "Password is required"

    if phone:
        if len(phone) > MAX_PHONE:
            return f"Phone number must be at most {MAX_PHONE} characters"
        if not _PHONE_RE.match(phone):
            return "Enter a valid phone number"

    if country and len(country) > MAX_COUNTRY:
        return f"Country must be at most {MAX_COUNTRY} characters"

    return None
