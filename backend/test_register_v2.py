
from app import create_app, db
from app.models import Driver
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    try:
        # Test password hash
        h = generate_password_hash("password123", method="pbkdf2:sha256")
        
        # Test driver creation with NIC
        new_driver = Driver(
            full_name="Verified Driver",
            password=h,
            phone="0771234567",
            nic_number="123456789V",
            is_approved=False
        )
        db.session.add(new_driver)
        db.session.commit()
        print("Driver created successfully with all columns")
    except Exception as e:
        print(f"Error: {e}")
        db.session.rollback()
