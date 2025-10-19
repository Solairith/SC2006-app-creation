# routes/users.py
from flask import Blueprint, request, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from utils.db import get_db
from models.user_model import current_user

user_bp = Blueprint("users", __name__)

# ---------------------
# AUTH ROUTES
# ---------------------
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
        db.execute(
            "INSERT INTO users(name,email,password_hash,address) VALUES(?,?,?,?)",
            (name, email, generate_password_hash(password), address),
        )
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


# ---------------------
# PROFILE ROUTES
# ---------------------
@user_bp.get("/profile")
def get_profile():
    u = current_user()
    if not u:
        return {"error": "Not logged in"}, 401

    db = get_db()
    subjects = db.execute("SELECT subject_name FROM user_subjects WHERE user_id=?", (u["id"],)).fetchall()
    return jsonify({
        "id": u["id"],
        "name": u["name"],
        "email": u["email"],
        "address": u["address"],
        "grades": u["grades"],
        "travel_distance_km": u["travel_distance_km"],
        "subjects": [s["subject_name"] for s in subjects]
    })


@user_bp.post("/profile")
def update_profile():
    u = current_user()
    if not u:
        return {"error": "Not logged in"}, 401

    data = request.get_json(force=True) or {}
    address = data.get("address")
    grades = data.get("grades")
    distance = data.get("travel_distance_km")

    db = get_db()
    db.execute("""
        UPDATE users SET
            address = COALESCE(?, address),
            grades = COALESCE(?, grades),
            travel_distance_km = COALESCE(?, travel_distance_km)
        WHERE id = ?
    """, (address, grades, distance, u["id"]))
    db.commit()

    return {"ok": True}


# ---------------------
# SUBJECT ROUTES
# ---------------------
@user_bp.get("/subjects")
def get_subjects():
    u = current_user()
    if not u:
        return {"error": "Not logged in"}, 401

    db = get_db()
    rows = db.execute("SELECT subject_name FROM user_subjects WHERE user_id=?", (u["id"],)).fetchall()
    return {"subjects": [r["subject_name"] for r in rows]}


@user_bp.post("/subjects")
def add_subject():
    u = current_user()
    if not u:
        return {"error": "Not logged in"}, 401

    data = request.get_json(force=True) or {}
    subject = (data.get("subject") or "").strip()
    if not subject:
        return {"error": "subject required"}, 400

    db = get_db()
    db.execute("INSERT INTO user_subjects(user_id, subject_name) VALUES (?, ?)", (u["id"], subject))
    db.commit()
    return {"ok": True}


@user_bp.delete("/subjects")
def delete_subject():
    u = current_user()
    if not u:
        return {"error": "Not logged in"}, 401

    data = request.get_json(force=True) or {}
    subject = (data.get("subject") or "").strip()
    if not subject:
        return {"error": "subject required"}, 400

    db = get_db()
    db.execute("DELETE FROM user_subjects WHERE user_id=? AND subject_name=?", (u["id"], subject))
    db.commit()
    return {"ok": True}
