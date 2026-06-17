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

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, onupdate=db.func.current_timestamp())


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
    start_time = db.Column(db.String(10), nullable=True)
    end_date = db.Column(db.Date)

    total_distance_km = db.Column(db.Float)
    total_days = db.Column(db.Integer)

    estimated_price = db.Column(db.Float)
    actual_distance_km = db.Column(db.Float, default=0.0)

    status = db.Column(db.String(50), default="planned")
    cancellation_reason = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    driver_lat = db.Column(db.Float, nullable=True)

    driver_lng = db.Column(db.Float, nullable=True)

    last_location_update = db.Column(db.DateTime, nullable=True)


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
    cancellation_reason = db.Column(db.Text, nullable=True)
    payment_status = db.Column(db.String(50), default="pending")

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, onupdate=db.func.current_timestamp())


# =========================
# 🅷 NOTIFICATION MODEL
# =========================
class Notification(db.Model):
    __tablename__ = "notification"

    id = db.Column(db.Integer, primary_key=True)

    recipient_email = db.Column(db.String(120))
    recipient_driver_id = db.Column(db.Integer, db.ForeignKey("driver.id"), nullable=True, index=True)
    tour_id = db.Column(db.Integer, db.ForeignKey("tour_plan.id"), nullable=True)
    subject = db.Column(db.String(200))
    message = db.Column(db.Text)

    status = db.Column(db.String(50), default="sent")

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
# =========================
# 🅸 FEEDBACK MODEL
# =========================
class Feedback(db.Model):
    __tablename__ = "feedback"

    id = db.Column(db.Integer, primary_key=True)

    tour_id = db.Column(db.Integer, db.ForeignKey("tour_plan.id"))
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    driver_id = db.Column(db.Integer, db.ForeignKey("driver.id"))

    rating = db.Column(db.Integer, nullable=False)  # 1 to 5 stars
    comment = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())


# =========================
# FINANCE — PLATFORM SETTINGS (singleton row)
# =========================
class PlatformSetting(db.Model):
    __tablename__ = "platform_settings"

    id = db.Column(db.Integer, primary_key=True)
    customer_service_fee_percent = db.Column(db.Float, nullable=False, default=10.0)
    driver_service_fee_percent = db.Column(db.Float, nullable=False, default=5.0)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, onupdate=db.func.current_timestamp())


# Vehicle table = pricing_settings (managed via Finance → Pricing Management)


class CustomerPayment(db.Model):
    __tablename__ = "customer_payments"

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("booking.id"), nullable=False, index=True)
    tour_id = db.Column(db.Integer, db.ForeignKey("tour_plan.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True, index=True)

    final_agreed_price = db.Column(db.Float, nullable=False)
    customer_service_fee = db.Column(db.Float, nullable=False, default=0.0)
    total_customer_payment = db.Column(db.Float, nullable=False)

    payment_method = db.Column(db.String(50), default="cash")
    payment_date = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(30), default="pending", index=True)

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, onupdate=db.func.current_timestamp())

    booking = db.relationship("Booking", backref=db.backref("customer_payment", uselist=False))
    tour = db.relationship("TourPlan", backref=db.backref("customer_payments", lazy=True))
    user = db.relationship("User", backref=db.backref("customer_payments", lazy=True))


class DriverPayment(db.Model):
    __tablename__ = "driver_payments"

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("booking.id"), nullable=False, index=True)
    tour_id = db.Column(db.Integer, db.ForeignKey("tour_plan.id"), nullable=False, index=True)
    driver_id = db.Column(db.Integer, db.ForeignKey("driver.id"), nullable=False, index=True)

    final_agreed_price = db.Column(db.Float, nullable=False)
    driver_service_fee = db.Column(db.Float, nullable=False, default=0.0)
    driver_payout = db.Column(db.Float, nullable=False)

    payment_date = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(30), default="pending", index=True)

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, onupdate=db.func.current_timestamp())

    booking = db.relationship("Booking", backref=db.backref("driver_payment", uselist=False))
    tour = db.relationship("TourPlan", backref=db.backref("driver_payments", lazy=True))
    driver = db.relationship("Driver", backref=db.backref("driver_payments", lazy=True))


class Expense(db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(80), nullable=False, index=True)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text, nullable=True)
    expense_date = db.Column(db.Date, nullable=True, index=True)
    receipt_filename = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, onupdate=db.func.current_timestamp())


class Refund(db.Model):
    __tablename__ = "refunds"

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("booking.id"), nullable=False, index=True)
    tour_id = db.Column(db.Integer, db.ForeignKey("tour_plan.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True, index=True)

    refund_amount = db.Column(db.Float, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    requested_date = db.Column(db.DateTime, default=db.func.current_timestamp())
    processed_date = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(30), default="pending", index=True)

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, onupdate=db.func.current_timestamp())

    booking = db.relationship("Booking", backref=db.backref("refunds", lazy=True))
    tour = db.relationship("TourPlan", backref=db.backref("refunds", lazy=True))
    user = db.relationship("User", backref=db.backref("refunds", lazy=True))


class FinancialTransaction(db.Model):
    __tablename__ = "financial_transactions"

    id = db.Column(db.Integer, primary_key=True)
    transaction_type = db.Column(db.String(30), nullable=False, index=True)
    category = db.Column(db.String(80), nullable=False, index=True)
    amount = db.Column(db.Float, nullable=False)
    reference_type = db.Column(db.String(50), nullable=True)
    reference_id = db.Column(db.Integer, nullable=True)
    description = db.Column(db.Text, nullable=True)
    transaction_date = db.Column(db.DateTime, nullable=False, index=True)

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, onupdate=db.func.current_timestamp())
