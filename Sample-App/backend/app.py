# app.py
from flask import Flask, g
from flask_cors import CORS
from flask_login import LoginManager
from routes.schools import school_bp
from routes.users import user_bp
from routes.health import health_bp

from dotenv import load_dotenv
import os

from utils.db import get_db

load_dotenv()  # Load .env variables

collection_id = os.getenv("COLLECTION_ID")  # optional

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-change-me")
app.config.update(SESSION_COOKIE_SAMESITE="Lax", SESSION_COOKIE_SECURE=False)

# Allow frontend requests (React on localhost)
CORS(app, resources={r"/api/*": {"origins": [r"http://127\.0\.0\.1:\d+", r"http://localhost:\d+"]}},
     supports_credentials=True)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "/api/auth/login"

# Register Blueprints
app.register_blueprint(health_bp, url_prefix="/api")
app.register_blueprint(school_bp, url_prefix="/api/schools")
app.register_blueprint(user_bp, url_prefix="/api/auth")

@app.route('/')
def home():
    return {"message": "Backend is running!"}


# Teardown DB after each request
@app.teardown_appcontext
def teardown_db(exception):
    db = getattr(g, "db", None)
    if db is not None:
        db.close()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
