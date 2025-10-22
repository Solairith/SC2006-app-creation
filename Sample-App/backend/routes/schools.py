# routes/schools.py
from flask import Blueprint, jsonify, request
from services.data_fetcher import get_schools, get_school_details
import math
from typing import List, Dict, Any, Optional

# Blueprint defines route group for all /api/schools endpoints
school_bp = Blueprint("schools", __name__, url_prefix="/api/schools")

def _get_school_name(s: dict) -> str:
    """
    Handles inconsistent header capitalization for school names.
    Works with: school_name, School_name, School_Name, name
    """
    for key in ["school_name", "School_name", "School_Name", "name"]:
        if key in s and s[key]:
            return str(s[key])
    return "Unknown School"


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
            _get_school_name(s),
            s.get("address", "") or "",
            s.get("mainlevel_code", "") or "",
            s.get("zone_code", "") or "",
            s.get("type_code", "") or ""
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

# -----------------------------
# Recommendation — helpers
# -----------------------------

def _to_list(x):
    if not x:
        return []
    if isinstance(x, list):
        return [str(i).strip() for i in x if str(i).strip()]
    return [s.strip() for s in str(x).split(",") if s.strip()]

def _jaccard(a: List[str], b: List[str]) -> float:
    A = {s.lower() for s in a if s}
    B = {s.lower() for s in b if s}
    if not A or not B:
        return 0.0
    return len(A & B) / len(A | B)

def _alias_level(val: Optional[str]) -> str:
    if not val: return ""
    v = str(val).strip().lower()
    # common aliases seen in MOE data
    aliases = {
        "sec": "secondary",
        "secondary school": "secondary",
        "jc": "junior college",
        "junior coll": "junior college",
        "pri": "primary",
        "primary school": "primary",
    }
    return aliases.get(v, v)

def _level_match(user_level: Optional[str], school_level: Optional[str]) -> float:
    u = _alias_level(user_level)
    s = _alias_level(school_level)
    if not u or not s: return 0.0
    if u == s: return 1.0
    # near matches
    pairs = {("secondary", "junior college"), ("junior college", "secondary")}
    return 0.6 if (u, s) in pairs or (s, u) in pairs else 0.0

def _haversine_km(lat1, lon1, lat2, lon2) -> Optional[float]:
    try:
        if None in (lat1, lon1, lat2, lon2):
            return None
        R = 6371.0
        p1, p2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlmb = math.radians(lon2 - lon1)
        a = math.sin(dphi/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dlmb/2)**2
        return 2 * R * math.asin(math.sqrt(a))
    except Exception:
        return None

def _norm01(x: Optional[float], lo: float, hi: float, reverse=False) -> float:
    if x is None or hi == lo:
        return 0.0
    x = max(min(float(x), hi), lo)
    v = (x - lo) / (hi - lo)
    return 1.0 - v if reverse else v

def _distance_score(user_lat, user_lon, sch_lat, sch_lon, max_km: Optional[float]) -> float:
    if not max_km or max_km <= 0:
        return 0.0
    d = _haversine_km(user_lat, user_lon, sch_lat, sch_lon)
    if d is None:
        return 0.0
    d = max(0.0, min(d, float(max_km)))
    return _norm01(d, 0.0, float(max_km), reverse=True)

def _pick_coord(s: Dict[str, Any], key_lat="latitude", key_lon="longitude"):
    # Try common keys from Data.gov.sg; adjust if your data_fetcher uses different keys.
    lat = s.get(key_lat) or s.get("lat") or s.get("Latitude")
    lon = s.get(key_lon) or s.get("lon") or s.get("Longitude")
    try:
        return (float(lat), float(lon)) if lat is not None and lon is not None else (None, None)
    except Exception:
        return (None, None)

def _compute_score(
    school_basic: Dict[str, Any],
    user_level: Optional[str],
    user_ccas: List[str],
    user_subjects: List[str],
    user_lat: Optional[float],
    user_lon: Optional[float],
    travel_km: Optional[float],
    weights: Dict[str, float],
) -> Dict[str, Any]:
    """
    Combines:
      - CCA overlap (0..1)
      - Subject overlap (0..1)
      - Level match (0..1)
      - Distance score (0..1)
    Returns: {'score': float, 'reasons': {...}}
    """
    # 1) Enrich with details (CCAs & subjects) via existing service (cached)
    name = _get_school_name(school_basic)
    details = get_school_details(name) or {}

    school_ccas = _to_list(details.get("ccas"))
    school_subjects = _to_list(details.get("subjects"))

    s_cca = _jaccard(user_ccas, school_ccas)
    s_subj = _jaccard(user_subjects, school_subjects)
    s_level = _level_match(user_level, school_basic.get("mainlevel_code") or school_basic.get("level"))

    sch_lat, sch_lon = _pick_coord(school_basic)
    s_dist = _distance_score(user_lat, user_lon, sch_lat, sch_lon, travel_km)

    total = (
        weights.get("cca", 0.40)      * s_cca +
        weights.get("subjects", 0.25) * s_subj +
        weights.get("level", 0.15)    * s_level +
        weights.get("distance", 0.20) * s_dist
    )

    return {
        "score": round(float(total), 4),
        "reasons": {
            "cca_overlap": s_cca,
            "subject_overlap": s_subj,
            "level_match": s_level,
            "distance": s_dist,
            "weights": weights
        },
        "details": {
            "ccas": school_ccas,
            "subjects": school_subjects
        }
    }


# -----------------------------
# Recommendation — route
# -----------------------------
@school_bp.route("/recommend", methods=["GET", "POST"])
def recommend_schools():
    """
    GET or POST /api/schools/recommend

    POST JSON example:
    {
      "level": "secondary",
      "ccas": ["basketball","choir"],
      "subjects": ["physics","computing"],   // optional
      "lat": 1.309, "lon": 103.82,          // optional
      "travel_km": 8,                        // optional
      "zone": "north",                       // optional quick filter
      "type": "government",                  // optional quick filter
      "limit": 20,                           // optional
      "weights": {"cca":0.4,"subjects":0.25,"level":0.15,"distance":0.2}  // optional
    }

    GET query example (works in browser):
      /api/schools/recommend?level=secondary&ccas=basketball,choir&subjects=computing,physics&lat=1.309&lon=103.82&travel_km=8&limit=10
    """
    try:
        # -------- accept both POST (JSON) and GET (query params) --------
        if request.method == "POST":
            data = request.get_json(silent=True) or {}
        else:
            args = request.args

            def split_list(val):
                if not val:
                    return []
                return [s.strip() for s in val.split(",") if s.strip()]

            data = {
                "level": args.get("level"),
                "ccas": split_list(args.get("ccas")),
                "subjects": split_list(args.get("subjects")),
                "lat": float(args.get("lat")) if args.get("lat") else None,
                "lon": float(args.get("lon")) if args.get("lon") else None,
                "travel_km": float(args.get("travel_km")) if args.get("travel_km") else None,
                "zone": args.get("zone"),
                "type": args.get("type"),
                "limit": int(args.get("limit")) if args.get("limit") else None,
                "weights": None,  # keep weights simple for GET; you can extend if needed
            }

        # -------- read inputs from unified 'data' --------
        level      = data.get("level")
        user_ccas  = _to_list(data.get("ccas"))
        user_subjs = _to_list(data.get("subjects"))
        lat        = data.get("lat")
        lon        = data.get("lon")
        travel_km  = data.get("travel_km")
        zone_pref  = (data.get("zone") or "").strip().lower()
        type_pref  = (data.get("type") or "").strip().lower()
        limit      = int(data.get("limit") or 25)
        weights    = data.get("weights") or {}

        # 1) load candidate schools (cached in services.data_fetcher)
        items = get_schools()

        # 2) lightweight pre-filter
        cand = []
        for s in items:
            lvl  = (s.get("mainlevel_code") or s.get("level") or "").strip().lower()
            zone = (s.get("zone_code") or s.get("zone") or "").strip().lower()
            typ  = (s.get("type_code") or s.get("type") or "").strip().lower()

            if level and _alias_level(level) and _alias_level(lvl) and _alias_level(level) != _alias_level(lvl):
                continue
            if zone_pref and zone_pref != zone:
                continue
            if type_pref and type_pref != typ:
                continue
            cand.append(s)

        if not cand:
            cand = items

        # 3) score each candidate (uses get_school_details cache internally)
        scored = []
        for s in cand:
            res = _compute_score(
                school_basic = s,
                user_level   = level,
                user_ccas    = user_ccas,
                user_subjects= user_subjs,
                user_lat     = lat,
                user_lon     = lon,
                travel_km    = travel_km,
                weights      = weights
            )
            scored.append({
                "name": _get_school_name(s),
                "level": s.get("mainlevel_code") or s.get("level"),
                "zone_code": s.get("zone_code"),
                "type_code": s.get("type_code"),
                "address": s.get("address"),
                "latitude": s.get("latitude") or s.get("lat"),
                "longitude": s.get("longitude") or s.get("lon"),
                "score": res["score"],
                "reasons": res["reasons"],
                "details": res["details"]
            })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return jsonify({"ok": True, "count": min(limit, len(scored)), "items": scored[:limit]})
    except Exception as e:
        print("❌ recommend_schools error:", e)
        return jsonify({"ok": False, "error": "Failed to compute recommendations"}), 500
