# models/user_model.py
from utils.db import get_db
from flask_login import UserMixin

# ---------------------
# User class for Flask-Login
# ---------------------
class User(UserMixin):
    def __init__(self, id, name, email):
        self.id = id
        self.name = name
        self.email = email


# ---------------------
# User helpers
# ---------------------
def get_user_by_id(uid):
    """Get a user by internal user ID"""
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not row:
        return None
    return User(row["id"], row["name"], row["email"])


def get_user_by_google_id(google_id):
    """Get a user by Google OAuth ID"""
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE google_id=?", (google_id,)).fetchone()
    if not row:
        return None
    return User(row["id"], row["name"], row["email"])


def create_user_google(google_id, email, name):
    """Create a new user using Google login"""
    db = get_db()
    db.execute(
        "INSERT INTO users(google_id, email, name) VALUES(?,?,?)",
        (google_id, email, name)
    )
    db.commit()
    return get_user_by_google_id(google_id)


# ---------------------
# Current logged-in user (from session)
# ---------------------
def current_user():
    from flask import session
    db = get_db()
    uid = session.get("uid")
    if not uid:
        return None
    row = db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not row:
        return None
    return User(row["id"], row["name"], row["email"])


# ---------------------
# Database initialization
# ---------------------
def init_db():
    db = get_db()

    # --- Users table ---
    db.execute("""
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT,
            google_id TEXT UNIQUE,
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

    # --- Favorites schools table ---
    db.execute("""
        CREATE TABLE IF NOT EXISTS user_favorites(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            school_name TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    db.commit()
