from flask import Flask, jsonify
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

    # ✅ FIXED CORS (IMPORTANT)
    CORS(app)

    # Initialize DB
    db.init_app(app)

    # Initialize JWT
    jwt.init_app(app)

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
    
    @app.route("/vehicles-test")
    def vehicles_test():
        from app.models import Vehicle
        vehicles = Vehicle.query.all()
        return jsonify([
            {"id": v.id, "type": v.type}
            for v in vehicles
        ])
    
    @app.route("/seed-all-vehicles", methods=["POST"])
    def seed_all_vehicles():
        from app.models import Vehicle
        
        # Vehicle data matching frontend vehicleOptions.js
        vehicle_data = [
            ("Mini car", 800, 45, 4500, 3),
            ("Car", 1000, 50, 5000, 4),
            ("Mini van", 1200, 60, 6500, 6),
            ("Van", 1500, 70, 8000, 8),
            ("Jeep", 1300, 65, 7000, 5),
            ("Mini bus", 1800, 85, 11000, 15),
            ("Bus", 2000, 90, 12000, 20),
        ]
        
        added = 0
        for type_name, base_fare, price_per_km, price_per_day, max_passengers in vehicle_data:
            if not Vehicle.query.filter_by(type=type_name).first():
                db.session.add(
                    Vehicle(
                        type=type_name,
                        base_fare=base_fare,
                        price_per_km=price_per_km,
                        price_per_day=price_per_day,
                        max_passengers=max_passengers,
                    )
                )
                added += 1
        
        if added > 0:
            db.session.commit()
            return jsonify({"message": f"Added {added} new vehicle types"}), 201
        else:
            return jsonify({"message": "All vehicle types already exist"}), 200

    with app.app_context():
        db.create_all()

    return app