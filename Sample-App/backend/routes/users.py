# routes/users.py handles both Google OAuth and email/password
from flask import Blueprint, request, session, jsonify, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv
import os

from utils.db import get_db
from models.user_model import (
    current_user,
    create_user_local,
    get_user_by_email,
    verify_password,
    save_preferences,
    read_preferences,
    get_user_by_google_id,
    create_user_google,
    get_user_by_id
)

load_dotenv()

user_bp = Blueprint("users", __name__, url_prefix="/api")
oauth = OAuth()

# ---------------------
# Initialize OAuth
# ---------------------
def init_oauth(app):
    """Initialize OAuth with the Flask app - call this in app.py"""
    oauth.init_app(app)
    backend_url = os.getenv("BACKEND_URL", "http://localhost:5000")
    redirect_uri = f"{backend_url}/api/auth/callback/google"
    print("Initializing OAuth with redirect URI:", redirect_uri)
    oauth.register(
        name="google",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile", "redirect_uri": redirect_uri},
    )


# ==========================================
# GOOGLE OAUTH LOGIN ROUTES
# ==========================================
@user_bp.route("/auth/login/google")
def login_google():
    """Redirect user to Google login page"""
    redirect_uri = "http://localhost:5000/api/auth/callback/google"
    print(f"🔍 DEBUG: Generated redirect_uri = {redirect_uri}")
    return oauth.google.authorize_redirect(redirect_uri)


@user_bp.route("/auth/callback/google")
def auth_google():
    """Handle Google OAuth callback"""
    try:
        print("=== Starting Google OAuth callback ===")
        token = oauth.google.authorize_access_token()
        print(f"Token received: {token is not None}")
        
        # Get user info from the token
        user_info = token.get('userinfo')
        
        # If userinfo is not in token, fetch it
        if not user_info:
            resp = oauth.google.get('https://www.googleapis.com/oauth2/v2/userinfo')
            user_info = resp.json()
        
        print(f"User info: {user_info}")
        
        google_id = user_info["sub"] 
        email = user_info["email"]
        name = user_info.get("name", "No Name")
        
        print(f"Creating/finding user - Google ID: {google_id}, Email: {email}")

        # Find or create user
        user = get_user_by_google_id(google_id)
        if not user:
            print("User not found, creating new user")
            user = create_user_google(google_id, email, name)
        else:
            print(f"User found: {user.id}")

        # Store user id in session
        session["uid"] = user.id
        print(f"Session set, uid: {session['uid']}")
        
        # Redirect to frontend after successful login
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return redirect(f"{frontend_url}/dashboard")
        
    except Exception as e:
        print(f"=== Google OAuth Error ===")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        import traceback
        print(traceback.format_exc())
        print("=========================")
        
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return redirect(f"{frontend_url}/login?error=auth_failed")


# ==========================================
# EMAIL/PASSWORD LOGIN ROUTES
# ==========================================
@user_bp.post("/auth/signup")
def signup():
    """Create new user with email/password"""
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    
    if not (name and email and password):
        return {"error": "NAME_EMAIL_PASSWORD_REQUIRED"}, 400
    
    # Check if email already exists
    u = get_user_by_email(email)
    if u:
        return {"error": "EMAIL_EXISTS"}, 409
    
    # Create new user
    u = create_user_local(name, email, password)
    session["uid"] = u.id
    return {"ok": True, "user": {"id": u.id, "name": u.name, "email": u.email}}


@user_bp.post("/auth/login")
def login():
    """Login with email/password"""
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    
    if not (email and password):
        return {"error": "EMAIL_PASSWORD_REQUIRED"}, 400

    u = verify_password(email, password)
    if not u:
        return {"error": "INVALID_CREDENTIALS"}, 401

    session["uid"] = u.id
    return {"ok": True, "user": {"id": u.id, "name": u.name, "email": u.email}}


@user_bp.post("/logout")
def logout():
    """Logout (works for both Google and email/password users)"""
    session.clear()
    return {"ok": True}


@user_bp.get("/me")
def me():
    """Get current logged-in user (works for both Google and email/password users)"""
    u = current_user()
    if not u:
        return {"user": None}
    prefs = read_preferences(u.id)
    return {"user": {"id": u.id, "name": u.name, "email": u.email}, "preferences": prefs}


# ==========================================
# PREFERENCES ROUTES
# ==========================================
@user_bp.get("/preferences")
def get_preferences():
    """Get user preferences"""
    u = current_user()
    if not u:
        return {"error": "Not logged in"}, 401
    return {"ok": True, **read_preferences(u.id)}


@user_bp.put("/preferences")
def put_preferences():
    """Update user preferences"""
    u = current_user()
    if not u:
        return {"error": "Not logged in"}, 401
    data = request.get_json(force=True) or {}
    level = data.get("level")
    max_distance_km = data.get("max_distance_km")
    subjects = data.get("subjects") or []
    ccas = data.get("ccas") or []
    home_address = data.get("home_address")
    save_preferences(u.id, level, max_distance_km, subjects, ccas, home_address)
    return {"ok": True}


# ==========================================
# PROFILE ROUTES
# ==========================================
@user_bp.get("/profile")
def get_profile():
    """Get user profile"""
    u = current_user()
    if not u:
        return {"error": "Not logged in"}, 401

    db = get_db()
    subjects = db.execute("SELECT subject_name FROM user_subjects WHERE user_id=?", (u.id,)).fetchall()
    
    return jsonify({
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "subjects": [s["subject_name"] for s in subjects]
    })


@user_bp.post("/profile")
def update_profile():
    """Update user profile"""
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


# ==========================================
# SUBJECT ROUTES
# ==========================================
@user_bp.get("/subjects")
def get_subjects():
    """Get user subjects"""
    u = current_user()
    if not u:
        return {"error": "Not logged in"}, 401

    db = get_db()
    rows = db.execute("SELECT subject_name FROM user_subjects WHERE user_id=?", (u.id,)).fetchall()
    return {"subjects": [r["subject_name"] for r in rows]}


@user_bp.post("/subjects")
def add_subject():
    """Add a subject"""
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
    """Delete a subject"""
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
