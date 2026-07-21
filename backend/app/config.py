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
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-jwt-key")
    
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