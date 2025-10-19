#app.py
from flask import Flask
from flask_cors import CORS
from routes.schools import school_bp
from routes.users import user_bp
from routes.health import health_bp

from dotenv import load_dotenv
import os

from utils.db import get_db

load_dotenv()  # This reads your .env file
collection_id = os.getenv("COLLECTION_ID")  # This gets the value


app = Flask(__name__)
app.secret_key = "dev-secret-change-me"
app.config.update(SESSION_COOKIE_SAMESITE="Lax", SESSION_COOKIE_SECURE=False)

# Allow frontend requests (React on localhost)
CORS(app, resources={r"/api/*": {"origins": [r"http://127\.0\.0\.1:\d+", r"http://localhost:\d+"]}},
     supports_credentials=True)

# Register Blueprints
app.register_blueprint(health_bp, url_prefix="/api")
app.register_blueprint(school_bp, url_prefix="/api/schools")
app.register_blueprint(user_bp, url_prefix="/api/auth")

@app.route('/')
def home():
    return {"message": "Backend is running!"}
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)


@app.teardown_appcontext
#Flask runs this automatically after handling a web request, to close your database connection to free memory.
def teardown_db(exception):
    db = getattr(g, "db", None)
    if db is not None:
        db.close()

