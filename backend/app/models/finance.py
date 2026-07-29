from app import db


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
