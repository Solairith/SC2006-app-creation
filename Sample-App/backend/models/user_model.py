
# models/user_model.py
from utils.db import get_db

def init_db():
    db = get_db()

    # --- Users table ---
    db.execute("""
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            address TEXT,
            grades TEXT,
            travel_distance_km REAL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # --- Subjects table ---
    db.execute("""
        CREATE TABLE IF NOT EXISTS user_subjects(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            subject_name TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    db.commit()


def current_user():
    from flask import session
    db = get_db()
    uid = session.get("uid")
    if not uid:
        return None
    return db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()

