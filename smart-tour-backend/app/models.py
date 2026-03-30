from app import db

# =========================
# 🅰 USER MODEL
# =========================
class User(db.Model):
    __tablename__ = "user"

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
    __tablename__ = "guest"

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
    __tablename__ = "driver"

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
    __tablename__ = "vehicle"

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
    __tablename__ = "tour_plan"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    guest_id = db.Column(db.Integer, db.ForeignKey("guest.id"), nullable=True)

    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicle.id"))

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
    __tablename__ = "location"

    id = db.Column(db.Integer, primary_key=True)

    tour_id = db.Column(db.Integer, db.ForeignKey("tour_plan.id"))

    place_name = db.Column(db.String(150))

    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    order_index = db.Column(db.Integer)


# =========================
# 🅶 BOOKING MODEL
# =========================
class Booking(db.Model):
    __tablename__ = "booking"

    id = db.Column(db.Integer, primary_key=True)

    tour_id = db.Column(db.Integer, db.ForeignKey("tour_plan.id"))
    driver_id = db.Column(db.Integer, db.ForeignKey("driver.id"))

    booking_reference = db.Column(db.String(100), unique=True)

    total_price = db.Column(db.Float)

    status = db.Column(db.String(50), default="pending")
    payment_status = db.Column(db.String(50), default="pending")

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())


# =========================
# 🅷 NOTIFICATION MODEL
# =========================
class Notification(db.Model):
    __tablename__ = "notification"

    id = db.Column(db.Integer, primary_key=True)

    recipient_email = db.Column(db.String(120))
    subject = db.Column(db.String(200))
    message = db.Column(db.Text)

    status = db.Column(db.String(50), default="sent")

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())