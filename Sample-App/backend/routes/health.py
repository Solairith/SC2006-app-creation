from flask import Blueprint
import time

health_bp = Blueprint("health", __name__)

@health_bp.get("/health")
def health():
    return {"ok": True, "time": time.time()}
