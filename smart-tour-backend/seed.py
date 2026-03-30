from app import create_app, db
from app.models import Vehicle, User
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():

    # =========================
    #  SEED VEHICLES
    # =========================
    existing_vehicles = Vehicle.query.all()

    if not existing_vehicles:
        vehicles = [
            Vehicle(
                type="Car",
                base_fare=1000,
                price_per_km=50,
                price_per_day=5000,
                max_passengers=4
            ),
            Vehicle(
                type="Van",
                base_fare=1500,
                price_per_km=70,
                price_per_day=8000,
                max_passengers=8
            )
        ]

        db.session.bulk_save_objects(vehicles)
        db.session.commit()
        print(" Vehicles seeded successfully!")
    else:
        print(" Vehicles already exist, skipping...")

    # =========================
    #  SEED ADMIN
    # =========================
    admin_email = "admin@gmail.com"

    existing_admin = User.query.filter_by(email=admin_email).first()

    if not existing_admin:
        admin = User(
            full_name="Admin",
            email=admin_email,
            password=generate_password_hash("admin123"),
            role="admin",   #  IMPORTANT
            is_active=True
        )

        db.session.add(admin)
        db.session.commit()

        print(" Admin created successfully!")
    else:
        print(" Admin already exists, skipping...")

    # =========================
    # DEBUG OUTPUT
    # =========================
    vehicles = Vehicle.query.all()
    users = User.query.all()

    print("Vehicles in DB:", vehicles)
    print("Users in DB:", users)