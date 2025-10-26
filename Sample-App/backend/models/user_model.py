# models/user_model.py
from utils.db import get_db
from flask import session
from werkzeug.security import generate_password_hash, check_password_hash

class User:
    def __init__(self, id, name, email):
        self.id = id
        self.name = name
        self.email = email

def current_user():
    db = get_db()
    uid = session.get("uid")
    if not uid:
        return None
    row = db.execute("SELECT id, name, email FROM users WHERE id=?", (uid,)).fetchone()
    if not row:
        return None
    return User(row["id"], row["name"], row["email"])

def get_user_by_email(email: str):
    db = get_db()
    row = db.execute("SELECT id, name, email, password_hash FROM users WHERE email=?", (email,)).fetchone()
    return row

def create_user_local(name: str, email: str, password: str):
    db = get_db()
    ph = generate_password_hash(password)
    db.execute("INSERT INTO users(name, email, password_hash) VALUES(?,?,?)", (name, email, ph))
    db.commit()
    row = db.execute("SELECT id, name, email FROM users WHERE email=?", (email,)).fetchone()
    return User(row["id"], row["name"], row["email"])

def verify_password(stored_hash: str, password: str) -> bool:
    return check_password_hash(stored_hash, password)

def ensure_schema():
    db = get_db()
    db.executescript(
        '''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_preferences (
            user_id INTEGER PRIMARY KEY,
            level TEXT,
            max_distance_km REAL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS user_subjects (
            user_id INTEGER NOT NULL,
            subject_name TEXT NOT NULL,
            PRIMARY KEY (user_id, subject_name),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS user_ccas (
            user_id INTEGER NOT NULL,
            cca_name TEXT NOT NULL,
            PRIMARY KEY (user_id, cca_name),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        '''
    )
    db.commit()

def save_preferences(user_id: int, level: str | None, max_distance_km: float | None, subjects: list[str], ccas: list[str]):
    db = get_db()
    # Upsert prefs
    existing = db.execute("SELECT 1 FROM user_preferences WHERE user_id=?", (user_id,)).fetchone()
    if existing:
        db.execute("UPDATE user_preferences SET level=?, max_distance_km=? WHERE user_id=?", (level, max_distance_km, user_id))
    else:
        db.execute("INSERT INTO user_preferences(user_id, level, max_distance_km) VALUES(?,?,?)", (user_id, level, max_distance_km))

    # Replace tags
    db.execute("DELETE FROM user_subjects WHERE user_id=?", (user_id,))
    db.execute("DELETE FROM user_ccas WHERE user_id=?", (user_id,))
    for s in subjects or []:
        s = (s or '').strip()
        if s:
            db.execute("INSERT OR IGNORE INTO user_subjects(user_id, subject_name) VALUES(?,?)", (user_id, s))
    for c in ccas or []:
        c = (c or '').strip()
        if c:
            db.execute("INSERT OR IGNORE INTO user_ccas(user_id, cca_name) VALUES(?,?)", (user_id, c))
    db.commit()

def read_preferences(user_id: int) -> dict:
    db = get_db()
    pref = db.execute("SELECT level, max_distance_km FROM user_preferences WHERE user_id=?", (user_id,)).fetchone()
    level = pref["level"] if pref else None
    max_distance_km = pref["max_distance_km"] if pref else None
    subjects = [r["subject_name"] for r in db.execute("SELECT subject_name FROM user_subjects WHERE user_id=?", (user_id,)).fetchall()]
    ccas = [r["cca_name"] for r in db.execute("SELECT cca_name FROM user_ccas WHERE user_id=?", (user_id,)).fetchall()]
    return {"level": level, "max_distance_km": max_distance_km, "subjects": subjects, "ccas": ccas}
