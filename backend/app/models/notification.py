from app import db


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
