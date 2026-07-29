from app import db


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
