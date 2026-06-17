"""
Finance module migration & seed script.

Run: python migrate_finance.py
"""

from sqlalchemy import inspect, text

from app import create_app, db
from app.services.finance_service import backfill_financial_records, seed_vehicle_pricing

app = create_app()


def _safe_add_columns():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()

    alters = {
        "vehicle": [("created_at", "DATETIME"), ("updated_at", "DATETIME")],
        "booking": [("updated_at", "DATETIME")],
    }

    for table, columns in alters.items():
        if table not in tables:
            continue
        existing = {c["name"] for c in inspector.get_columns(table)}
        for col_name, col_type in columns:
            if col_name not in existing:
                db.session.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"))
    db.session.commit()


with app.app_context():
    db.create_all()
    _safe_add_columns()
    pricing_count = seed_vehicle_pricing()
    sync_result = backfill_financial_records()
    print(f"Vehicle pricing seeded/updated: {pricing_count}")
    print(f"Bookings backfilled: {sync_result}")
