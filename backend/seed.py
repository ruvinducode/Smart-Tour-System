from app import create_app, db
from app.models import Vehicle, User
from werkzeug.security import generate_password_hash

app = create_app()

# (type, base_fare, price_per_km, price_per_day, max_passengers)
VEHICLE_SEEDS = [
    ("Mini car", 800, 45, 4500, 3),
    ("Car", 1000, 50, 5000, 4),
    ("Mini van", 1200, 60, 6500, 6),
    ("Van", 1500, 70, 8000, 8),
    ("Jeep", 1300, 65, 7000, 5),
    ("Mini bus", 1800, 85, 11000, 15),
    ("Bus", 2000, 90, 12000, 20),
]

with app.app_context():

    # =========================
    #  SEED VEHICLES (add any missing types)
    # =========================
    added = 0
    for type_name, base_fare, price_per_km, price_per_day, max_passengers in VEHICLE_SEEDS:
        if not Vehicle.query.filter_by(type=type_name).first():
            db.session.add(
                Vehicle(
                    type=type_name,
                    base_fare=base_fare,
                    price_per_km=price_per_km,
                    price_per_day=price_per_day,
                    max_passengers=max_passengers,
                )
            )
            added += 1

    if added:
        db.session.commit()
        print(f" Added {added} vehicle type(s).")
    else:
        print(" All vehicle types already present, skipping vehicle inserts.")

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
    #  SEED SAMPLE USER
    # =========================
    user_email = "user@gmail.com"

    existing_user = User.query.filter_by(email=user_email).first()

    if not existing_user:
        sample_user = User(
            full_name="Sample User",
            email=user_email,
            password=generate_password_hash("user123"),
            role="user",   # Regular user
            is_active=True,
            phone="+94771234567",
            country="Sri Lanka"
        )

        db.session.add(sample_user)
        db.session.commit()

        print(" Sample user created successfully!")
    else:
        print(" Sample user already exists, skipping...")

    # =========================
    # DEBUG OUTPUT
    # =========================
    vehicles = Vehicle.query.all()
    users = User.query.all()

    print("Vehicles in DB:", vehicles)
    print("Users in DB:", users)
