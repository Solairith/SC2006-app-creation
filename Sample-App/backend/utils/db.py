import sqlite3
from pathlib import Path
from flask import g

DB_PATH = Path(__file__).resolve().parent.parent / "app.db"

def get_db():
    if "db" not in g:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        g.db = conn
    return g.db
