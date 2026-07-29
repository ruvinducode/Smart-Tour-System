import os


class Config:
    # =========================
    # DATABASE CONFIG
    # =========================
    database_url = os.getenv("DATABASE_URL")

    # Fix Render postgres issue
    if database_url and database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URI = database_url or "sqlite:///local.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # =========================
    # SECRET KEYS
    # =========================
    # No hardcoded fallback: a guessable default here would let anyone forge
    # valid JWTs (including admin ones) if the env var is ever left unset.
    # Failing loudly at startup beats failing open silently.
    SECRET_KEY = os.environ["SECRET_KEY"]
    JWT_SECRET_KEY = os.environ["JWT_SECRET_KEY"]
    
    # Set token expiration to 24 hours
    from datetime import timedelta
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

    # Accept the JWT via query string too, in addition to the Authorization
    # header. This is needed only for the driver-upload serving route, whose
    # <img src> tags cannot carry an Authorization header — everything else
    # in the app still authenticates via the header.
    JWT_TOKEN_LOCATION = ["headers", "query_string"]
    JWT_QUERY_STRING_NAME = "token"

    # =========================
    # UPLOAD LIMITS
    # =========================
    # Reject any request body over 15MB outright (Flask returns 413) so an
    # attacker can't send an oversized "image" to exhaust disk space via the
    # unauthenticated driver-registration upload fields.
    MAX_CONTENT_LENGTH = 15 * 1024 * 1024

    # =========================
    # DEBUG MODE
    # =========================
    DEBUG = False

    # =========================
    # ROUTING (OpenRouteService)
    # =========================
    ORS_API_KEY = os.getenv("ORS_API_KEY", "")