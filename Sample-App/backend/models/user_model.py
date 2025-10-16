from utils.db import get_db

def init_db():
    db = get_db()
    db.execute("""
        CREATE TABLE IF NOT EXISTS users(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          address TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
