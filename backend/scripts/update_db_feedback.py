import os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    # Try to create all tables (Feedback)
    db.create_all()
    
    # Manually add columns if they don't exist in driver table
    try:
        db.session.execute(text('ALTER TABLE driver ADD COLUMN rating FLOAT DEFAULT 5.0'))
        db.session.execute(text('ALTER TABLE driver ADD COLUMN total_ratings INTEGER DEFAULT 0'))
        db.session.commit()
        print("Driver columns added successfully.")
    except Exception as e:
        db.session.rollback()
        print(f"Driver columns might already exist: {e}")
