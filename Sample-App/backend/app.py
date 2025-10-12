# app.py — SchoolFit Backend (Flask) with auth + CORS + fallback
import os, sqlite3, time, json, requests
from pathlib import Path
from flask import Flask, request, jsonify, session, g
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

BASE = Path(__file__).parent
DB_PATH = BASE / "app.db"

SCHOOL_API_URL = os.getenv("SCHOOL_API_URL")
COLLECTION_ID  = os.getenv("COLLECTION_ID")

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-change-me")
app.config.update(SESSION_COOKIE_SAMESITE="Lax", SESSION_COOKIE_SECURE=False)

# Allow localhost/127.0.0.1 on any port (dev only)
CORS(app, resources={r"/api/*": {"origins": [r"http://127\.0\.0\.1:\d+", r"http://localhost:\d+"]}},
     supports_credentials=True)

def get_db():
    if "db" not in g:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        g.db = conn
    return g.db

@app.teardown_appcontext
def close_db(_=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()

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
    )""")
    db.commit()

with app.app_context():
    init_db()

_cache = {"items": None, "ts": 0}

def _fetch_dgs_collection(collection_id: str):
    meta = requests.get(f"https://data.gov.sg/api/collections/{collection_id}/metadata", timeout=20).json()
    for item in meta.get("result", {}).get("items", []):
        for res in item.get("resources", []):
            if res.get("format","").lower() == "json" and "school" in res.get("name","").lower():
                data = requests.get(res["url"], timeout=25).json()
                if isinstance(data, dict):
                    return data.get("schools") or data.get("items") or data.get("data") or []
                if isinstance(data, list):
                    return data
    return []

def get_schools():
    if _cache["items"] and time.time() - _cache["ts"] < 600:
        return _cache["items"]
    items = []
    try:
        if SCHOOL_API_URL:
            d = requests.get(SCHOOL_API_URL, timeout=25).json()
            items = d.get("schools") or d.get("items") or d.get("data") or (d if isinstance(d, list) else [])
        elif COLLECTION_ID:
            items = _fetch_dgs_collection(COLLECTION_ID)
    except Exception as e:
        print("WARN: external fetch failed:", e)
    if not items:
        try:
            with open(BASE / "sample_schools.json", "r", encoding="utf-8") as f:
                items = json.load(f)
        except Exception:
            items = []
    norm = []
    for s in items:
        name = s.get("school_name") or s.get("name") or ""
        postal = s.get("postal_code") or s.get("postal") or ""
        level  = s.get("mainlevel_code") or s.get("level") or ""
        zone   = s.get("zone_code") or s.get("zone") or ""
        stype  = s.get("type_code") or s.get("type") or ""
        addr   = s.get("address") or s.get("address1") or ""
        norm.append({
            "school_name": name,
            "postal_code": postal,
            "mainlevel_code": level,
            "zone_code": zone,
            "type_code": stype,
            "address": addr,
            **s
        })
    _cache["items"], _cache["ts"] = norm, time.time()
    return norm

@app.get("/api/health")
def health():
    return {"ok": True, "time": time.time()}

@app.get("/api/schools")
def api_schools():
    q = (request.args.get("q") or "").strip().lower()
    level = (request.args.get("level") or "").strip()
    zone  = (request.args.get("zone") or "").strip()
    stype = (request.args.get("type") or "").strip()
    items = get_schools()
    def match(s):
        text = " ".join([s.get("school_name",""), s.get("address",""),
                         s.get("mainlevel_code",""), s.get("zone_code",""),
                         s.get("type_code","")]).lower()
        if q and q not in text: return False
        if level and s.get("mainlevel_code") != level: return False
        if zone and s.get("zone_code") != zone: return False
        if stype and s.get("type_code") != stype: return False
        return True
    filtered = [s for s in items if match(s)]
    return {"items": filtered, "total": len(filtered), "limit": 50, "offset": 0}

def current_user():
    uid = session.get("uid")
    if not uid: return None
    db = get_db()
    return db.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()

@app.post("/api/auth/register")
def register():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    address = (data.get("address") or "").strip()
    if not name or not email or not password:
        return {"error": "name, email, password required"}, 400
    db = get_db()
    try:
        db.execute("INSERT INTO users(name,email,password_hash,address) VALUES(?,?,?,?)",
                   (name, email, generate_password_hash(password), address))
        db.commit()
    except sqlite3.IntegrityError:
        return {"error": "EMAIL_EXISTS"}, 409
    user = db.execute("SELECT id,name,email,address FROM users WHERE email=?", (email,)).fetchone()
    session["uid"] = user["id"]
    return {"id": user["id"], "name": user["name"], "email": user["email"], "address": user["address"]}

@app.post("/api/auth/login")
def login():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    db = get_db()
    u = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not u or not check_password_hash(u["password_hash"], password):
        return {"error": "INVALID_CREDENTIALS"}, 401
    session["uid"] = u["id"]
    return {"id": u["id"], "name": u["name"], "email": u["email"], "address": u["address"]}

@app.post("/api/auth/logout")
def logout():
    session.clear()
    return {"ok": True}

@app.get("/api/me")
def me():
    u = current_user()
    return {"user": None if not u else {"id": u["id"], "name": u["name"], "email": u["email"], "address": u["address"]}}

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
