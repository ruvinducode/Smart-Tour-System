from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from app.config import Config

# Initialize DB globally
db = SQLAlchemy()

# Initialize JWT
jwt = JWTManager()


def create_app():
    app = Flask(__name__)

    # Load configuration
    app.config.from_object(Config)

    # Enable CORS
    CORS(app)

    # Initialize DB
    db.init_app(app)

    # Initialize JWT
    jwt.init_app(app)

    # =========================
    # OPTIONAL JWT ERROR HANDLERS (VERY USEFUL)
    # =========================
    @jwt.unauthorized_loader
    def unauthorized_callback(error):
        return {"message": "Missing or invalid token"}, 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {"message": "Invalid token"}, 422

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {"message": "Token has expired"}, 401

    # =========================
    # REGISTER ROUTES
    # =========================
    from app.routes.auth_routes import auth_bp
    from app.routes.driver_routes import driver_bp
    from app.routes.tour_routes import tour_bp
    from app.routes.booking_routes import booking_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(driver_bp)
    app.register_blueprint(tour_bp, url_prefix="/tour")
    app.register_blueprint(booking_bp)

    # =========================
    # HOME ROUTE
    # =========================
    @app.route("/")
    def home():
        return "Smart Tour Backend Running 🚀"

    return app