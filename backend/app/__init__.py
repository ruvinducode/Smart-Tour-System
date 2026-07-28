from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix

from app.config import Config

# Initialize DB globally
db = SQLAlchemy()

# Initialize JWT
jwt = JWTManager()

# Rate limiter — real per-client limits depend on ProxyFix below so the app
# sees each visitor's real IP instead of nginx's own address for every request.
limiter = Limiter(key_func=get_remote_address, default_limits=["200 per minute"])


def create_app():
    app = Flask(__name__)

    # nginx proxies every request, so without this Flask would see every
    # visitor as 127.0.0.1 — rate limiting would then lump all real users
    # into one shared bucket instead of limiting abusive callers individually.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    # Load configuration
    app.config.from_object(Config)

    # ✅ FIXED CORS (IMPORTANT)
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize DB
    db.init_app(app)

    # Initialize JWT
    jwt.init_app(app)

    # Initialize rate limiter
    limiter.init_app(app)

    # =========================
    # JWT ERROR HANDLERS
    # =========================
    @jwt.unauthorized_loader
    def unauthorized_callback(error):
        return jsonify({"message": "Missing or invalid token"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"message": "Invalid token"}), 422

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"message": "Token has expired"}), 401

    # Every other error response in this API is JSON — the default rate-limit
    # page is plain HTML, which would fail res.json() parsing on the frontend
    # and show a confusing generic error instead of "too many attempts".
    @app.errorhandler(429)
    def ratelimit_handler(error):
        return jsonify({"message": "Too many attempts. Please try again shortly."}), 429

    # =========================
    # REGISTER ROUTES
    # =========================
    from app.routes.auth_routes import auth_bp
    from app.routes.driver_routes import driver_bp
    from app.routes.tour_routes import tour_bp
    from app.routes.booking_routes import booking_bp
    from app.routes.finance_routes import finance_bp
    from app.routes.routing_routes import routing_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(driver_bp)
    app.register_blueprint(tour_bp, url_prefix="/tour")
    app.register_blueprint(booking_bp)
    app.register_blueprint(finance_bp)
    app.register_blueprint(routing_bp)

    # =========================
    # HOME ROUTE
    # =========================
    @app.route("/")
    def home():
        return "Smart Tour Backend Running 🚀"

    with app.app_context():
        db.create_all()

    return app