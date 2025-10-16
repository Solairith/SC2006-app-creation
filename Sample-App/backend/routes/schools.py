# routes/schools.py
from flask import Blueprint, jsonify, request
from services.data_fetcher import get_schools

# Blueprint defines a route group for all /api/schools endpoints
school_bp = Blueprint("schools", __name__, url_prefix="/api/schools")

@school_bp.get("/")
def api_schools():
    """
    Fetch school information from Data.gov.sg (via data_fetcher).
    Supports optional filtering by:
      - q (search term)
      - level (e.g. PRIMARY, SECONDARY)
      - zone (e.g. N, S, E, W)
      - type (e.g. GOVERNMENT, INDEPENDENT)
    """
    # --- Read query parameters from frontend ---
    q = (request.args.get("q") or "").strip().lower()
    level = (request.args.get("level") or "").strip()
    zone  = (request.args.get("zone") or "").strip()
    stype = (request.args.get("type") or "").strip()

    # --- Fetch all school data (cached inside data_fetcher) ---
    items = get_schools()   # or get_schools(fetch_all=True) to combine multiple datasets

    # --- Apply filtering ---
    def match(s):
        text = " ".join([
            s.get("school_name", ""),
            s.get("address", ""),
            s.get("mainlevel_code", ""),
            s.get("zone_code", ""),
            s.get("type_code", "")
        ]).lower()

        if q and q not in text:
            return False
        if level and s.get("mainlevel_code") != level:
            return False
        if zone and s.get("zone_code") != zone:
            return False
        if stype and s.get("type_code") != stype:
            return False
        return True

    filtered = [s for s in items if match(s)]

    # --- Return standardized JSON response ---
    return jsonify({
        "items": filtered,
        "total": len(filtered),
        "limit": 50,
        "offset": 0
    })
