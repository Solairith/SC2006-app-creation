# app.py
from flask import Flask, g 
from flask_cors import CORS
from routes.schools import school_bp
from routes.users import user_bp, init_oauth
from routes.health import health_bp
from utils.db import get_db
from models.user_model import ensure_schema
from dotenv import load_dotenv
import os

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-change-me")

    # Flask-Session configuration
    app.config["SESSION_TYPE"] = "filesystem"
    app.config["SESSION_PERMANENT"] = False
    app.config["SESSION_USE_SIGNER"] = True
    
    # Session cookie configuration - FIXED
    app.config["SESSION_COOKIE_DOMAIN"] = None  # ✅ Changed from "127.0.0.1"
    app.config["SESSION_COOKIE_PATH"] = "/"
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"  # ✅ Changed from None
    app.config["SESSION_COOKIE_SECURE"] = False
    #app.config["SESSION_COOKIE_HTTPONLY"] = True  # ✅ Changed from False
    
    # Initialize Flask-Session
    Session(app)
    
    # Allow local Vite dev server with cookies
    CORS(
        app,
        supports_credentials=True,
        origins=[
            "http://127.0.0.1:5173",
            "http://localhost:5173",
        ],
    )

    # Initialize OAuth (must be done BEFORE registering blueprints)
    init_oauth(app)

    # Make sure DB schema exists
    with app.app_context():
        ensure_schema()

    # Register Blueprints
    app.register_blueprint(school_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(health_bp)

    @app.get("/")
    def home():
        return {"message": "Backend is running!"}

    @app.teardown_appcontext
    def teardown_db(exception):
        db = getattr(g, "db", None)
        if db is not None:
            db.close()

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
