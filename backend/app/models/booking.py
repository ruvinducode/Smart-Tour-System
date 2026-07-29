from app import db


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
