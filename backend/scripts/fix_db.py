
import os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app import create_app, db
from app.models import Driver, User, TourPlan, Notification, Booking, Guest, Vehicle, Location

app = create_app()
with app.app_context():
    try:
        print("Dropping driver table...")
        db.session.execute(db.text("DROP TABLE IF EXISTS driver"))
        # Also drop other tables that might be out of sync
        db.session.execute(db.text("DROP TABLE IF EXISTS booking"))
        db.session.execute(db.text("DROP TABLE IF EXISTS tour_plan"))
        db.session.execute(db.text("DROP TABLE IF EXISTS location"))
        db.session.commit()
        
        print("Recreating all tables...")
        db.create_all()
        print("Tables recreated successfully")
    except Exception as e:
        print(f"Error: {e}")
        db.session.rollback()
