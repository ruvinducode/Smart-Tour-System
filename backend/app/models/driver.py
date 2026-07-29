from app import db


# =========================
# 🅲 DRIVER MODEL
# =========================
class Driver(db.Model):
    __tablename__ = "driver"

    id = db.Column(db.Integer, primary_key=True)

    # ── Personal Info ──────────────────────────────
    full_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password = db.Column(db.String(255), nullable=False)

    phone = db.Column(db.String(20), nullable=False)

    nic_number = db.Column(db.String(20), unique=True, nullable=True)
    date_of_birth = db.Column(db.Date, nullable=True)
    gender = db.Column(db.String(10), nullable=True)       # Male / Female / Other
    home_district = db.Column(db.String(100), nullable=True)
    home_address = db.Column(db.Text, nullable=True)
    profile_photo = db.Column(db.String(255), nullable=True)

    # ── License Info ───────────────────────────────
    license_number = db.Column(db.String(100), nullable=True)
    license_expiry_date = db.Column(db.Date, nullable=True)
    license_front_image = db.Column(db.String(255), nullable=True)
    license_back_image = db.Column(db.String(255), nullable=True)

    # ── Vehicle Info ───────────────────────────────
    vehicle_type = db.Column(db.String(50), nullable=True)
    vehicle_brand = db.Column(db.String(100), nullable=True)
    vehicle_number = db.Column(db.String(50), nullable=True)
    vehicle_color = db.Column(db.String(50), nullable=True)
    capacity = db.Column(db.Integer, nullable=True)
    vehicle_reg_book_image = db.Column(db.String(255), nullable=True)
    revenue_license_image = db.Column(db.String(255), nullable=True)
    insurance_cert_image = db.Column(db.String(255), nullable=True)

    # ── Vehicle Photos ─────────────────────────────
    vehicle_front_image = db.Column(db.String(255), nullable=True)
    vehicle_rear_image = db.Column(db.String(255), nullable=True)
    vehicle_side_image = db.Column(db.String(255), nullable=True)

    # ── Location & Status ──────────────────────────
    current_location_lat = db.Column(db.Float)
    current_location_lng = db.Column(db.Float)

    is_available = db.Column(db.Boolean, default=True)
    is_approved = db.Column(db.Boolean, default=False)
    role = db.Column(db.String(20), default="driver")

    # ── Rating Info ───────────────────────────────
    rating = db.Column(db.Float, default=5.0)
    total_ratings = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
