from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import math
import uuid

app = Flask(__name__)

# 🔗 Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://ruvi@localhost/smart_tour_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize DB
db = SQLAlchemy(app)

# =========================
# 🅰 USER MODEL
# =========================
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    full_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20))

    country = db.Column(db.String(100))

    role = db.Column(db.String(20), default="user")

    is_active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, onupdate=db.func.current_timestamp())


# =========================
# 🅱 GUEST MODEL
# =========================
class Guest(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    full_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))

    country = db.Column(db.String(100))

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())


# =========================
# 🅲 DRIVER MODEL
# =========================
class Driver(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    full_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

    phone = db.Column(db.String(20), nullable=False)

    license_number = db.Column(db.String(100))
    vehicle_number = db.Column(db.String(50))

    vehicle_type = db.Column(db.String(50))
    capacity = db.Column(db.Integer)

    current_location_lat = db.Column(db.Float)
    current_location_lng = db.Column(db.Float)

    is_available = db.Column(db.Boolean, default=True)
    is_approved = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())


# =========================
# 🅳 VEHICLE MODEL
# =========================
class Vehicle(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    type = db.Column(db.String(50), nullable=False)
    base_fare = db.Column(db.Float)
    price_per_km = db.Column(db.Float)
    price_per_day = db.Column(db.Float)

    max_passengers = db.Column(db.Integer)

    is_active = db.Column(db.Boolean, default=True)


# =========================
# 🅴 TOUR PLAN MODEL
# =========================
class TourPlan(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    guest_id = db.Column(db.Integer, db.ForeignKey('guest.id'), nullable=True)

    vehicle_id = db.Column(db.Integer, db.ForeignKey('vehicle.id'))

    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)

    total_distance_km = db.Column(db.Float)
    total_days = db.Column(db.Integer)

    estimated_price = db.Column(db.Float)

    status = db.Column(db.String(50), default="planned")

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())


# =========================
# 🅵 LOCATION MODEL
# =========================
class Location(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    tour_id = db.Column(db.Integer, db.ForeignKey('tour_plan.id'))

    place_name = db.Column(db.String(150))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    order_index = db.Column(db.Integer)


# =========================
# 🅶 BOOKING MODEL
# =========================
class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    tour_id = db.Column(db.Integer, db.ForeignKey('tour_plan.id'))
    driver_id = db.Column(db.Integer, db.ForeignKey('driver.id'))

    booking_reference = db.Column(db.String(100), unique=True)

    total_price = db.Column(db.Float)

    status = db.Column(db.String(50), default="pending")
    payment_status = db.Column(db.String(50), default="pending")

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())


# =========================
# 🅷 NOTIFICATION MODEL
# =========================
class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    recipient_email = db.Column(db.String(120))
    subject = db.Column(db.String(200))
    message = db.Column(db.Text)

    status = db.Column(db.String(50), default="sent")

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())


# =========================
# USER REGISTRATION API
# =========================

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    # Check if request body exists
    if not data:
        return jsonify({"message": "No input data"}), 400

    # Get data
    full_name = data.get("full_name")
    email = data.get("email")

    if not email:
        return jsonify({"message": "Email is required"}), 400

    email = email.lower()
    password = data.get("password")
    phone = data.get("phone")
    country = data.get("country")

    # Validate required fields
    if not full_name or not email or not password:
        return jsonify({"message": "Missing required fields"}), 400

    # Check if user exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"message": "Email already registered"}), 400

    # Hash password
    hashed_password = generate_password_hash(password)

    # Create new user
    new_user = User(
        full_name=full_name,
        email=email,
        password=hashed_password,
        phone=phone,
        country=country
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201


# =========================
# USER LOGIN API
# =========================

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data"}), 400

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    email = email.lower()

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"message": "User not found"}), 404

    if not user.is_active:
        return jsonify({"message": "Account is disabled"}), 403

    if not check_password_hash(user.password, password):
        return jsonify({"message": "Invalid credentials"}), 401

    return jsonify({
        "message": "Login successful",
        "user": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email
        }
    }), 200


# =========================
# DRIVER REGISTRATION API
# =========================

@app.route("/driver/register", methods=["POST"])
def register_driver():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data"}), 400

    full_name = data.get("full_name")
    email = data.get("email")
    password = data.get("password")
    phone = data.get("phone")
    license_number = data.get("license_number")
    vehicle_number = data.get("vehicle_number")
    vehicle_type = data.get("vehicle_type")
    capacity = data.get("capacity")

    if not full_name or not email or not password or not phone:
        return jsonify({"message": "Missing required fields"}), 400

    # Check existing driver
    existing_driver = Driver.query.filter_by(email=email.lower()).first()
    if existing_driver:
        return jsonify({"message": "Driver already exists"}), 400

    hashed_password = generate_password_hash(password)

    new_driver = Driver(
        full_name=full_name,
        email=email.lower(),
        password=hashed_password,
        phone=phone,
        license_number=license_number,
        vehicle_number=vehicle_number,
        vehicle_type=vehicle_type,
        capacity=capacity,
        is_approved=False  # 🔥 important
    )

    db.session.add(new_driver)
    db.session.commit()

    return jsonify({
        "message": "Driver registered. Waiting for admin approval."
    }), 201


# =========================
# DRIVER LOGIN API
# =========================

@app.route("/driver/login", methods=["POST"])
def driver_login():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data"}), 400

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    driver = Driver.query.filter_by(email=email.lower()).first()

    if not driver:
        return jsonify({"message": "Driver not found"}), 404

    # ❗ IMPORTANT CHECK
    if not driver.is_approved:
        return jsonify({
            "message": "Driver not approved yet. Please wait for admin approval."
        }), 403

    if not check_password_hash(driver.password, password):
        return jsonify({"message": "Invalid password"}), 401

    return jsonify({
        "message": "Driver login successful",
        "driver": {
            "id": driver.id,
            "name": driver.full_name,
            "email": driver.email,
            "vehicle": driver.vehicle_type
        }
    }), 200


# =========================
# GET PENDING DRIVERS
# =========================

@app.route("/admin/drivers/pending", methods=["GET"])
def get_pending_drivers():
    drivers = Driver.query.filter_by(is_approved=False).all()

    result = []
    for d in drivers:
        result.append({
            "id": d.id,
            "name": d.full_name,
            "email": d.email,
            "phone": d.phone,
            "vehicle": d.vehicle_type
        })

    return jsonify(result), 200


# =========================
# APPROVE DRIVER
# =========================

@app.route("/admin/driver/approve/<int:driver_id>", methods=["PUT"])
def approve_driver(driver_id):
    driver = Driver.query.get(driver_id)

    if not driver:
        return jsonify({"message": "Driver not found"}), 404

    driver.is_approved = True
    db.session.commit()

    return jsonify({"message": "Driver approved successfully"}), 200


# =========================
# TOUR CALCULATION API
# =========================

@app.route("/tour/calculate", methods=["POST"])
def calculate_tour():
    data = request.get_json()

    locations = data.get("locations")
    vehicle_type = data.get("vehicle_type")

    if not locations or not vehicle_type:
        return jsonify({"message": "Missing data"}), 400

    #  TEMP LOGIC (we improve later)
    total_distance = len(locations) * 50  # assume 50km per location
    total_days = max(1, total_distance // 100)

    # Get vehicle pricing
    vehicle = Vehicle.query.filter_by(type=vehicle_type).first()

    if not vehicle:
        return jsonify({"message": "Vehicle not found"}), 404

    total_price = (
        vehicle.base_fare +
        (total_distance * vehicle.price_per_km) +
        (total_days * vehicle.price_per_day)
    )

    return jsonify({
        "total_distance_km": total_distance,
        "total_days": total_days,
        "estimated_price": total_price
    }), 200


# =========================
# CREATE TOUR PLAN API
# =========================

@app.route("/create-tour", methods=["POST"])
def create_tour():
    data = request.get_json()

    # Validate input
    if not data:
        return jsonify({"message": "No input data"}), 400

    vehicle_id = data.get("vehicle_id")
    total_distance_km = data.get("total_distance_km")
    total_days = data.get("total_days")
    user_id = data.get("user_id")   # optional
    guest_id = data.get("guest_id") # optional

    
    from datetime import datetime

    start_date_str = data.get("start_date")
    end_date_str = data.get("end_date")

    start_date = None
    end_date = None

    if start_date_str:
      try:
         start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
      except:
        return jsonify({"message": "Invalid start_date format (YYYY-MM-DD required)"}), 400

    if end_date_str:
      try:
        end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
      except:
        return jsonify({"message": "Invalid end_date format (YYYY-MM-DD required)"}), 400

    if not vehicle_id or not total_distance_km or not total_days:
        return jsonify({"message": "Missing required fields"}), 400

    # Get vehicle data
    vehicle = Vehicle.query.get(vehicle_id)

    if not vehicle:
        return jsonify({"message": "Vehicle not found"}), 404

    # 💰 Calculate price
    total_price = (
        vehicle.base_fare +
        (total_distance_km * vehicle.price_per_km) +
        (total_days * vehicle.price_per_day)
    )

    # Save tour
    new_tour = TourPlan(
        user_id=user_id,
        guest_id=guest_id,
        vehicle_id=vehicle_id,
        start_date=start_date,
        end_date=end_date,
        total_distance_km=total_distance_km,
        total_days=total_days,
        estimated_price=total_price
    )

    db.session.add(new_tour)
    db.session.commit()

    return jsonify({
        "message": "Tour created successfully",
        "tour": {
            "id": new_tour.id,
            "total_distance_km": total_distance_km,
            "total_days": total_days,
            "estimated_price": total_price
        }
    }), 201


# =========================
# ASSIGN DRIVER + CREATE BOOKING
# =========================

@app.route("/create-booking/<int:tour_id>", methods=["POST"])
def create_booking(tour_id):

    # 1. Get tour
    tour = TourPlan.query.get(tour_id)
    if not tour:
        return jsonify({"message": "Tour not found"}), 404

    # 2. Get vehicle
    vehicle = Vehicle.query.get(tour.vehicle_id)
    if not vehicle:
        return jsonify({"message": "Vehicle not found"}), 404

    # =========================
    #  SMART DRIVER MATCHING
    # =========================

    # Get first location
    first_location = Location.query.filter_by(tour_id=tour.id)\
        .order_by(Location.order_index).first()

    if not first_location:
        return jsonify({"message": "Tour location not found"}), 404

    # Get drivers
    drivers = Driver.query.filter_by(
        vehicle_type=vehicle.type,
        is_available=True,
        is_approved=True
    ).all()

    if not drivers:
        return jsonify({"message": "No available drivers"}), 404

    # Find nearest driver
    nearest_driver = None
    min_distance = float("inf")

    for d in drivers:
        if d.current_location_lat is None or d.current_location_lng is None:
            continue

        distance = math.sqrt(
            (d.current_location_lat - first_location.latitude) ** 2 +
            (d.current_location_lng - first_location.longitude) ** 2
        )

        if distance < min_distance:
            min_distance = distance
            nearest_driver = d

    if not nearest_driver:
        return jsonify({"message": "No drivers with location data"}), 404

    driver = nearest_driver  # 👈 FINAL DRIVER

    # =========================
    # CONTINUE NORMAL FLOW
    # =========================

    booking_ref = str(uuid.uuid4())[:8]

    new_booking = Booking(
        tour_id=tour.id,
        driver_id=driver.id,
        booking_reference=booking_ref,
        total_price=tour.estimated_price
    )

    driver.is_available = False

    db.session.add(new_booking)
    db.session.commit()

    return jsonify({
        "message": "Booking created successfully",
        "booking": {
            "booking_reference": booking_ref,
            "driver_name": driver.full_name,
            "vehicle": vehicle.type,
            "total_price": tour.estimated_price,
            "distance": min_distance  # 👈 optional (for testing)
        }
    }), 201


# =========================
# GET ALL BOOKINGS
# =========================

@app.route("/bookings", methods=["GET"])
def get_bookings():

    bookings = Booking.query.all()

    result = []

    for booking in bookings:
        driver = Driver.query.get(booking.driver_id)
        tour = TourPlan.query.get(booking.tour_id)

        result.append({
            "booking_id": booking.id,
            "booking_reference": booking.booking_reference,
            "driver_name": driver.full_name if driver else "Unknown",
            "vehicle": driver.vehicle_type if driver else "Unknown",
            "total_price": booking.total_price,
            "status": booking.status
        })

    return jsonify(result), 200


# =========================
# UPDATE BOOKING STATUS
# =========================

@app.route("/booking/status/<int:booking_id>", methods=["PUT"])
def update_booking_status(booking_id):

    data = request.get_json()

    if not data:
        return jsonify({"message": "No input data"}), 400

    status = data.get("status")

    if not status:
        return jsonify({"message": "Status is required"}), 400

    booking = Booking.query.get(booking_id)

    if not booking:
        return jsonify({"message": "Booking not found"}), 404

    # ✅ Allowed statuses
    allowed_statuses = ["pending", "confirmed", "ongoing", "completed", "cancelled"]

    if status not in allowed_statuses:
        return jsonify({"message": "Invalid status"}), 400

    booking.status = status

    db.session.commit()

    return jsonify({
        "message": "Booking status updated",
        "booking_id": booking.id,
        "new_status": booking.status
    }), 200


# =========================
# DRIVER ACCEPT BOOKING
# =========================

@app.route("/driver/accept/<int:booking_id>", methods=["PUT"])
def driver_accept_booking(booking_id):

    booking = Booking.query.get(booking_id)

    if not booking:
        return jsonify({"message": "Booking not found"}), 404

    if booking.status != "pending":
        return jsonify({"message": "Booking already processed"}), 400

    booking.status = "confirmed"

    db.session.commit()

    return jsonify({
        "message": "Booking accepted by driver",
        "booking_id": booking.id
    }), 200


# =========================
# DRIVER REJECT BOOKING
# =========================

@app.route("/driver/reject/<int:booking_id>", methods=["PUT"])
def driver_reject_booking(booking_id):

    booking = Booking.query.get(booking_id)

    if not booking:
        return jsonify({"message": "Booking not found"}), 404

    if booking.status != "pending":
        return jsonify({"message": "Booking already processed"}), 400

    # Make driver available again
    driver = Driver.query.get(booking.driver_id)
    if driver:
        driver.is_available = True

    booking.status = "cancelled"

    db.session.commit()

    return jsonify({
        "message": "Booking rejected by driver",
        "booking_id": booking.id
    }), 200
    
@app.route("/vehicles-test")
def vehicles_test():
    vehicles = Vehicle.query.all()

    return jsonify([
        {"id": v.id, "type": v.type}
        for v in vehicles
    ])

# ========================= 
#  HOME ROUTE
# =========================
@app.route("/")
def home():
    return "Smart Tour Backend Running 🚀"


# =========================
# RUN SERVER
# =========================
if __name__ == "__main__":
    app.run(debug=True)