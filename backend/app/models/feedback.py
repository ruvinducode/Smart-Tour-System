from app import db


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
