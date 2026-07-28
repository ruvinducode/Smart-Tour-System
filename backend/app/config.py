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

    # =========================
    # DEBUG MODE
    # =========================
    DEBUG = False

    # =========================
    # ROUTING (OpenRouteService)
    # =========================
    ORS_API_KEY = os.getenv("ORS_API_KEY", "")