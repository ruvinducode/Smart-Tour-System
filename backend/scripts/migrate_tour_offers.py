"""Add the tour_offer table, and backfill any in-flight negotiation
(a Booking whose tour is still price_sent_by_driver) into a pending
TourOffer — then delete those Booking rows, since under the new model any
existing Booking means "claimed", and leaving them would make every
currently-negotiating tour instantly invisible to every other driver."""

import os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app import create_app, db
from app.models import Booking, TourPlan, TourOffer
from app.models.finance import CustomerPayment, DriverPayment, Refund


def migrate():
    db.create_all()  # creates tour_offer only — existing tables untouched

    in_flight = (
        Booking.query.join(TourPlan, Booking.tour_id == TourPlan.id)
        .filter(TourPlan.status == "price_sent_by_driver")
        .all()
    )
    for b in in_flight:
        exists = TourOffer.query.filter_by(tour_id=b.tour_id, driver_id=b.driver_id).first()
        if not exists:
            db.session.add(TourOffer(
                tour_id=b.tour_id, driver_id=b.driver_id,
                offer_type="negotiated", price=b.total_price, status="pending",
            ))

    payments_removed = 0
    for b in in_flight:
        # A previous finance backfill created placeholder payment rows for
        # some of these before they were ever actually confirmed (all
        # verified still "pending", no payment_date — no real money moved).
        # They reference booking_id NOT NULL, so they must go before the
        # Booking itself can be deleted.
        for model in (CustomerPayment, DriverPayment, Refund):
            removed = model.query.filter_by(booking_id=b.id).delete()
            payments_removed += removed
    for b in in_flight:
        db.session.delete(b)
    db.session.commit()
    print(f"Backfilled {len(in_flight)} in-flight negotiation(s) into tour_offer "
          f"(removed {payments_removed} unconfirmed placeholder payment record(s)).")


app = create_app()
with app.app_context():
    migrate()
    print("Tour offer migration complete.")
