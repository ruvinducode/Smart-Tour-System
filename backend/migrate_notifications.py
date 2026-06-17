"""Add notification.recipient_driver_id and backfill existing driver notifications."""

from sqlalchemy import inspect, text

from app import create_app, db
from app.models import Driver, Notification


def migrate():
    inspector = inspect(db.engine)
    if "notification" in inspector.get_table_names():
        cols = {c["name"] for c in inspector.get_columns("notification")}
        if "recipient_driver_id" not in cols:
            db.session.execute(text("ALTER TABLE notification ADD COLUMN recipient_driver_id INTEGER"))
            db.session.commit()

    for driver in Driver.query.all():
        if not driver.email:
            continue
        email = driver.email.strip().lower()
        Notification.query.filter(
            Notification.recipient_driver_id.is_(None),
            Notification.recipient_email.isnot(None),
            db.func.lower(Notification.recipient_email) == email,
        ).update({"recipient_driver_id": driver.id}, synchronize_session=False)
    db.session.commit()


app = create_app()
with app.app_context():
    db.create_all()
    migrate()
    print("Notification migration complete.")
