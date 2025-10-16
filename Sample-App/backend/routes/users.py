from flask import Blueprint, request, session
from werkzeug.security import generate_password_hash, check_password_hash
from utils.db import get_db
from models.user_model import init_db, current_user

user_bp = Blueprint("users", __name__)

@user_bp.post("/register")
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
    except Exception:
        return {"error": "EMAIL_EXISTS"}, 409

    user = db.execute("SELECT id,name,email,address FROM users WHERE email=?", (email,)).fetchone()
    session["uid"] = user["id"]
    return {"id": user["id"], "name": user["name"], "email": user["email"], "address": user["address"]}

@user_bp.post("/login")
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

@user_bp.post("/logout")
def logout():
    session.clear()
    return {"ok": True}

@user_bp.get("/me")
def me():
    u = current_user()
    if not u:
        return {"user": None}
    return {"user": {"id": u["id"], "name": u["name"], "email": u["email"], "address": u["address"]}}
