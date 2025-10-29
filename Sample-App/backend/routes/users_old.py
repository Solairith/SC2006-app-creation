# routes/users.py
from flask import Blueprint, request, session, jsonify
from models.user_model import (
    current_user,
    create_user_local,
    get_user_by_email,
    verify_password,
    save_preferences,
    read_preferences,
)
from utils.db import get_db

user_bp = Blueprint("users", __name__, url_prefix="/api")
# --------- Auth (local email/password) ---------
@user_bp.post("/auth/signup")
def signup():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not (name and email and password):
        return {"error":"NAME_EMAIL_PASSWORD_REQUIRED"}, 400
    # Reject duplicates
    u = get_user_by_email(email)
    if u:
        return {"error":"EMAIL_EXISTS"}, 409
    u = create_user_local(name, email, password)
    session["uid"] = u.id
    return {"ok": True, "user": {"id": u.id, "name": u.name, "email": u.email}}

@user_bp.post("/auth/login")
def login():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not (email and password):
        return {"error":"EMAIL_PASSWORD_REQUIRED"}, 400

    from models.user_model import verify_password
    u = verify_password(email, password)
    if not u:
        return {"error":"INVALID_CREDENTIALS"}, 401

    session["uid"] = u.id
    return {"ok": True, "user": {"id": u.id, "name": u.name, "email": u.email}}

@user_bp.post("/logout")
def logout():
    session.clear()
    return {"ok": True}

@user_bp.get("/me")
def me():
    u = current_user()
    if not u:
        return {"user": None}
    prefs = read_preferences(u.id)
    return {"user": {"id": u.id, "name": u.name, "email": u.email}, "preferences": prefs}

# --------- Preferences ---------
@user_bp.get("/preferences")
def get_preferences():
    u = current_user()
    if not u:
        return {"error":"Not logged in"}, 401
    return {"ok": True, **read_preferences(u.id)}

@user_bp.put("/preferences")
def put_preferences():
    u = current_user()
    if not u:
        return {"error":"Not logged in"}, 401
    data = request.get_json(force=True) or {}
    level = data.get("level")
    max_distance_km = data.get("max_distance_km")
    subjects = data.get("subjects") or []
    ccas = data.get("ccas") or []
    save_preferences(u.id, level, max_distance_km, subjects, ccas)
    return {"ok": True}
