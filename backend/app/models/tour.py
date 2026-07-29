from app import db


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

    driver_heading = db.Column(db.Float, nullable=True)

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
