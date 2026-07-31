from app import db


# =========================
# 🅾 TOUR OFFER MODEL
# =========================
class TourOffer(db.Model):
    """One row per (tour, driver) — lets multiple drivers negotiate or
    directly accept the same open tour request in parallel, with the
    traveler choosing which offer to accept. A real Booking is only created
    once the traveler picks a winner."""
    __tablename__ = "tour_offer"

    id = db.Column(db.Integer, primary_key=True)

    tour_id = db.Column(db.Integer, db.ForeignKey("tour_plan.id"), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey("driver.id"), nullable=False)

    offer_type = db.Column(db.String(20), default="negotiated")  # "direct" | "negotiated"
    price = db.Column(db.Float, nullable=False)
    # pending | accepted | declined | superseded | withdrawn
    status = db.Column(db.String(20), default="pending")

    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, onupdate=db.func.current_timestamp())

    __table_args__ = (
        db.UniqueConstraint("tour_id", "driver_id", name="uq_tour_offer_tour_driver"),
    )
