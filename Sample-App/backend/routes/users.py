# routes/users.py
from flask import Blueprint, request, session, jsonify, redirect, url_for, render_template_string
from werkzeug.security import generate_password_hash, check_password_hash
from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv
import os

from utils.db import get_db
from models.user_model import (
    current_user,
    get_user_by_google_id,
    create_user_google,
    get_user_by_id
)

load_dotenv()

user_bp = Blueprint("users", __name__)
oauth = OAuth()

# ---------------------
# Google OAuth setup
# ---------------------
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# ---------------------
# GOOGLE LOGIN ROUTES
# ---------------------
@user_bp.route("/login/google")
def login_google():
    redirect_uri = url_for("users.auth_google", _external=True)
    return oauth.google.authorize_redirect(redirect_uri)

@user_bp.route("/auth/google")
def auth_google():
    token = oauth.google.authorize_access_token()
    user_info = oauth.google.parse_id_token(token)
    google_id = user_info["sub"]
    email = user_info["email"]
    name = user_info.get("name", "No Name")

    user = get_user_by_google_id(google_id)
    if not user:
        user = create_user_google(google_id, email, name)

    # Store user id in session
    session["uid"] = user.id
    return redirect(url_for("users.profile"))

# ---------------------
# EMAIL/PASSWORD LOGIN
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

    user_row = db.execute("SELECT id,name,email,address FROM users WHERE email=?", (email,)).fetchone()
    session["uid"] = user_row["id"]
    return {"id": user_row["id"], "name": user_row["name"], "email": user_row["email"], "address": user_row["address"]}


@user_bp.post("/login")
def login():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    db = get_db()
    u = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not u or not u["password_hash"] or not check_password_hash(u["password_hash"], password):
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
    return {"user": {"id": u.id, "name": u.name, "email": u.email}}


# ---------------------
# PROFILE ROUTES
# ---------------------
@user_bp.get("/profile")
def get_profile():
    u = current_user()
    if not u:
        return {"error": "Not logged in"}, 401

    db = get_db()
    subjects = db.execute("SELECT subject_name FROM user_subjects WHERE user_id=?", (u.id,)).fetchall()
    favorites = db.execute("SELECT school_name FROM user_favorites WHERE user_id=?", (u.id,)).fetchall()

    return jsonify({
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "subjects": [s["subject_name"] for s in subjects],
        "favorites": [f["school_name"] for f in favorites]
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
    """, (address, grades, distance, u.id))
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
    rows = db.execute("SELECT subject_name FROM user_subjects WHERE user_id=?", (u.id,)).fetchall()
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
    db.execute("INSERT INTO user_subjects(user_id, subject_name) VALUES (?, ?)", (u.id, subject))
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
    db.execute("DELETE FROM user_subjects WHERE user_id=? AND subject_name=?", (u.id, subject))
    db.commit()
    return {"ok": True}
