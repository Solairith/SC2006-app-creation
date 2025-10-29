# backend/models/user_model.py
# backend/models/user_model.py
from utils.db import get_db
from flask import session
from werkzeug.security import generate_password_hash, check_password_hash

# ---------------------
# User class
# ---------------------
class User:
    def __init__(self, id, name, email):
        self.id = id
        self.name = name
        self.email = email


# ---------------------
# User retrieval functions
# ---------------------
def get_user_by_id(uid):
    """Get a user by internal user ID"""
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not row:
        return None
    return User(row["id"], row["name"], row["email"])


def get_user_by_email(email: str):
    """Get a user by email"""
    db = get_db()
    row = db.execute(
        "SELECT id, name, email, password_hash FROM users WHERE email=?",
        (email.strip().lower(),)
    ).fetchone()
    return row  # sqlite Row or None


def get_user_by_google_id(google_id):
    """Get a user by Google OAuth ID"""
    db = get_db()
    row = db.execute("SELECT * FROM users WHERE google_id=?", (google_id,)).fetchone()
    if not row:
        return None
    return User(row["id"], row["name"], row["email"])


# ---------------------
# User creation functions
# ---------------------
def create_user_local(name: str, email: str, password: str):
    """Create a new user with email/password"""
    db = get_db()
    ph = generate_password_hash(password)
    cur = db.execute(
        "INSERT INTO users(name, email, password_hash) VALUES(?,?,?)",
        (name, email.strip().lower(), ph)
    )
    db.commit()
    return User(cur.lastrowid, name, email.strip().lower())


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
# Authentication functions
# ---------------------
def verify_password(email: str, password: str):
    """Return a User if email+password are correct; else None."""
    row = get_user_by_email(email)
    if not row:
        return None
    if not row["password_hash"] or not check_password_hash(row["password_hash"], password):
        return None
    return User(row["id"], row["name"], row["email"])


def current_user():
    """Return the logged-in user from session, or None."""
    db = get_db()
    uid = session.get("uid")
    if not uid:
        return None
    row = db.execute("SELECT id, name, email FROM users WHERE id=?", (uid,)).fetchone()
    if not row:
        return None
    return User(row["id"], row["name"], row["email"])


# ---------------------
# Database initialization
# ---------------------
def ensure_schema():
    """Create all necessary tables"""
    db = get_db()
    db.executescript("""
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
        );
        
        CREATE TABLE IF NOT EXISTS user_preferences(
            user_id INTEGER PRIMARY KEY,
            level TEXT,
            max_distance_km REAL,
            home_address TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS user_subjects(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            subject_name TEXT NOT NULL,
            UNIQUE(user_id, subject_name),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS user_ccas(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            cca_name TEXT NOT NULL,
            UNIQUE(user_id, cca_name),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS user_favorites(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            school_name TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)
    try:
        db.execute("SELECT home_address FROM user_preferences LIMIT 1;")
    except:
        db.execute("ALTER TABLE user_preferences ADD COLUMN home_address TEXT;")
    db.commit()


# Alias for compatibility
init_db = ensure_schema


# ---------------------
# Preferences functions
# ---------------------
def save_preferences(user_id: int, level: str | None, max_distance_km: float | None,
                     subjects: list[str], ccas: list[str], home_address: str | None):
    """Save user preferences"""
    db = get_db()
    exists = db.execute("SELECT 1 FROM user_preferences WHERE user_id=?", (user_id,)).fetchone()
    if exists:
        db.execute("UPDATE user_preferences SET level=?, max_distance_km=?, home_address=? WHERE user_id=?",
                   (level, max_distance_km, home_address, user_id)) 
    else:
        db.execute("INSERT INTO user_preferences(user_id, level, max_distance_km, home_address) VALUES(?,?,?,?)",
                   (user_id, level, max_distance_km, home_address))  
    
    db.execute("DELETE FROM user_subjects WHERE user_id=?", (user_id,))
    db.execute("DELETE FROM user_ccas WHERE user_id=?", (user_id,))
    
    for s in subjects or []:
        s = (s or "").strip()
        if s:
            db.execute("INSERT OR IGNORE INTO user_subjects(user_id, subject_name) VALUES(?,?)", (user_id, s))
    
    for c in ccas or []:
        c = (c or "").strip()
        if c:
            db.execute("INSERT OR IGNORE INTO user_ccas(user_id, cca_name) VALUES(?,?)", (user_id, c))
    
    db.commit()


def read_preferences(user_id: int) -> dict:
    """Read user preferences"""
    db = get_db()
    pref = db.execute("SELECT level, max_distance_km, home_address FROM user_preferences WHERE user_id=?", (user_id,)).fetchone()
    level = pref["level"] if pref else None
    max_distance_km = pref["max_distance_km"] if pref else None
    home_address = pref["home_address"] if pref else None
    
    subjects = [r["subject_name"] for r in db.execute(
        "SELECT subject_name FROM user_subjects WHERE user_id=?", (user_id,)
    ).fetchall()]
    
    ccas = [r["cca_name"] for r in db.execute(
        "SELECT cca_name FROM user_ccas WHERE user_id=?", (user_id,)
    ).fetchall()]
    
    return {
        "level": level,
        "max_distance_km": max_distance_km,
        "home_address": home_address,
        "subjects": subjects,
        "ccas": ccas
    }
