# routes/schools.py
from flask import Blueprint, jsonify, request
from services.data_fetcher import get_schools, get_school_details

# Blueprint defines route group for all /api/schools endpoints
school_bp = Blueprint("schools", __name__, url_prefix="/api/schools")


# ----------------------------------------------------------------------
# 1️⃣ Main list endpoint (pagination + filtering)
# ----------------------------------------------------------------------
@school_bp.get("/")
def api_schools():
    """
    Fetch school list with pagination and filters.
    Query params:
      - q: search text
      - level: filter by mainlevel_code
      - zone: filter by zone_code
      - type: filter by type_code
      - limit, offset: pagination controls
    """
    q = (request.args.get("q") or "").strip().lower()
    level = (request.args.get("level") or "").strip()
    zone = (request.args.get("zone") or "").strip()
    stype = (request.args.get("type") or "").strip()
    limit = int(request.args.get("limit", 10))
    offset = int(request.args.get("offset", 0))

    # ✅ Fetch cached base dataset
    items = get_schools(fetch_all=False)

    # 🔍 Apply filters
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
    total = len(filtered)
    paginated = filtered[offset: offset + limit]
    total_pages = (total + limit - 1) // limit

    return jsonify({
        "items": paginated,
        "total": total,
        "limit": limit,
        "offset": offset,
        "total_pages": total_pages
    })


# ----------------------------------------------------------------------
# 2️⃣ Detailed endpoint for a single school
# ----------------------------------------------------------------------
@school_bp.get("/<path:school_name>")
def api_school_detail(school_name):
    """
    Fetch full details for a single school:
    - Includes website, email, telephone
    - Adds subjects and CCAs
    Example:
        GET /api/schools/ang%20mo%20kio%20secondary%20school
    """
    try:
        # 🔧 Decode and normalize
        school_name = school_name.replace("+", " ").strip()
        details = get_school_details(school_name)
        if not details:
            return jsonify({"error": f"School '{school_name}' not found"}), 404
        return jsonify(details)
    except Exception as e:
        print(f"❌ Error fetching school details for '{school_name}':", e)
        return jsonify({"error": "Failed to load school details"}), 500
