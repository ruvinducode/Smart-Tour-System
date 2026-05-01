from werkzeug.security import generate_password_hash
import sqlite3
import os

db_path = os.path.join("instance", "local.db")
new_password = "admin123"
hashed_password = generate_password_hash(new_password, method="pbkdf2:sha256")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if admin@gmail.com exists
cursor.execute("SELECT id FROM user WHERE email='admin@gmail.com'")
row = cursor.fetchone()

if row:
    cursor.execute("UPDATE user SET password=? WHERE email='admin@gmail.com'", (hashed_password,))
    print(f"Password for admin@gmail.com updated to: {new_password}")
else:
    # Create admin if not exists
    cursor.execute("INSERT INTO user (full_name, email, password, role) VALUES ('Admin', 'admin@gmail.com', ?, 'admin')", (hashed_password,))
    print(f"Admin account created with email: admin@gmail.com and password: {new_password}")

conn.commit()
conn.close()
