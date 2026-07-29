
import os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app import create_app, db
from app.models import Driver
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    try:
        # Test password hash
        h = generate_password_hash("password123", method="pbkdf2:sha256")
        print(f"Hash: {h}")

        # Test driver creation
        new_driver = Driver(
            full_name="Test Driver",
            password=h,
            phone="1234567890",
            is_approved=False
        )
        db.session.add(new_driver)
        db.session.commit()
        print("Driver created successfully")
    except Exception as e:
        print(f"Error: {e}")
        db.session.rollback()
