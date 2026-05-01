from app import db, create_app
from app.models import TourPlan, Booking

app = create_app()
with app.app_context():
    print("--- TOURS ---")
    tours = TourPlan.query.all()
    if not tours:
        print("No tours found.")
    for t in tours:
        print(f"ID: {t.id}, Status: {t.status}")
    
    print("\n--- BOOKINGS ---")
    bookings = Booking.query.all()
    if not bookings:
        print("No bookings found.")
    for b in bookings:
        print(f"Tour ID: {b.tour_id}, Booking Status: {b.status}")
