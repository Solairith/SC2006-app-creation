# routes/schools.py

# from flask import Blueprint, request, jsonify
from services.data_fetcher import get_schools, get_school_details
from models.user_model import current_user, read_preferences
from math import radians, sin, cos, sqrt, atan2
import requests
from urllib.parse import urlencode, quote_plus
from typing import Optional

school_bp = Blueprint("schools", __name__, url_prefix="/api/schools")

def _normalize_level(lv: str | None) -> str | None:
    if not lv: 
        return None
    lv = lv.strip().lower()
    if lv in ("primary","pri","p","ps"):
        return "PRIMARY"
    if lv in ("secondary","sec","s"):
        return "SECONDARY"
    return lv.upper()

def _alpha_name(s: dict) -> str:
    return (s.get("school_name") or "").strip().lower()

# Haversine distance (km)
def _haversine(lat1, lon1, lat2, lon2):
    # If any missing, return None
    if None in (lat1, lon1, lat2, lon2):
        return None
    R = 6371.0
    dlat = radians(lat2-lat1)
    dlon = radians(lon2-lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2*atan2(sqrt(a), sqrt(1-a))
    return R*c

@school_bp.get("/", strict_slashes=False)
def search():
    q = (request.args.get("q") or "").strip().lower()
    level = _normalize_level(request.args.get("level"))
    zone = (request.args.get("zone") or "").strip().upper()
    type_code = (request.args.get("type") or "").strip().upper()
    limit = int(request.args.get("limit") or 20)
    offset = int(request.args.get("offset") or 0)

    items = get_schools()
    def ok(s):
        if q and q not in (s.get("school_name") or "").lower():
            return False
        if level and s.get("mainlevel_code") != level:
            return False
        if zone and s.get("zone_code") != zone:
            return False
        if type_code and s.get("type_code") != type_code:
            return False
        return True

    filtered = [s for s in items if ok(s)]
    total = len(filtered)
    sliced = filtered[offset:offset+limit]
    return {"items": sliced, "total": total, "limit": limit, "offset": offset, "total_pages": (total+limit-1)//limit}

@school_bp.get("/details")
def details():
    name = request.args.get("name")
    if not name:
        return {"error":"name required"}, 400
    d = get_school_details(name)
    if not d:
        return {"error":"not found"}, 404
    return {"ok": True, "item": d}

def _score_school(school: dict, prefs: dict, weights: dict, user_lat=None, user_lon=None) -> tuple[float, dict]:
    # Prepare factors
    cca_prefs = set(map(str.lower, prefs.get("ccas") or []))
    subj_prefs = set(map(str.lower, prefs.get("subjects") or []))
    lvl_pref = _normalize_level(prefs.get("level"))
    max_km = prefs.get("max_distance_km") or prefs.get("travel_km")

    details = get_school_details(school["school_name"]) or {}
    school_ccas = set(map(str.lower, details.get("ccas", [])))
    school_subjects = set(map(str.lower, details.get("subjects", [])))
    school_level = (school.get("mainlevel_code") or "").upper()
    lat = school.get("latitude")
    lon = school.get("longitude")

    # Factors ∈ [0,1]
    cca_score = (len(cca_prefs & school_ccas) / max(1, len(cca_prefs))) if cca_prefs else 0.0
    subj_score = (len(subj_prefs & school_subjects) / max(1, len(subj_prefs))) if subj_prefs else 0.0
    level_score = 1.0 if (lvl_pref and school_level == lvl_pref) else (0.0 if lvl_pref else 0.0)

    # Distance
    distance_km = None
    dist_score = 0.0
    if max_km and user_lat is not None and user_lon is not None and lat is not None and lon is not None:
        distance_km = _haversine(user_lat, user_lon, lat, lon)
        if distance_km is not None:
            # 1.0 if within max_km, then decays linearly for the next max_km (soft cap)
            dist_score = max(0.0, 1.0 - max(0.0, (distance_km - float(max_km))) / (float(max_km) * 2.0))
    else:
        # If we truly have no distance info, don't contribute (keep 0.0).
        # (Previously this was 0.5 which masked lack of data.)
        dist_score = 0.0

    score = (
        weights.get("cca", 0.4) * cca_score +
        weights.get("subjects", 0.25) * subj_score +
        weights.get("level", 0.15) * level_score +
        weights.get("distance", 0.2) * dist_score
    )
    reasons = {
        "cca_matches": list(cca_prefs & school_ccas),
        "subject_matches": list(subj_prefs & school_subjects),
        "level_match": bool(level_score == 1.0),
        "distance_km": round(distance_km, 3) if distance_km is not None else None,
        "distance_score": dist_score,
        "weights": weights
    }
    return score, reasons


def _geocode_address(addr: str) -> tuple[Optional[float], Optional[float]]:
    """
    Geocode a home address -> (lat, lon).
    1) OneMap Singapore common API (no key for basic search)
    2) Nominatim (OpenStreetMap) fallback
    Returns (lat, lon) as floats, or (None, None) if not found.
    """
    if not addr or not str(addr).strip():
        return (None, None)

    # --- OneMap Singapore ---
    try:
        url = (
            "https://developers.onemap.sg/commonapi/search?"
            + urlencode({"searchVal": addr, "returnGeom": "Y", "getAddrDetails": "Y", "pageNum": 1})
        )
        r = requests.get(url, timeout=12)
        if r.ok:
            js = r.json()
            results = js.get("results") or []
            if results:
                lat = results[0].get("LATITUDE")
                lon = results[0].get("LONGITUDE")
                if lat and lon:
                    return (float(lat), float(lon))
    except Exception:
        pass

    # --- Nominatim fallback ---
    try:
        headers = {"User-Agent": "SchoolFit/1.0 (education app; mailto:noreply@example.com)"}
        url = "https://nominatim.openstreetmap.org/search?" + urlencode({"q": addr, "format": "json", "limit": 1})
        r = requests.get(url, headers=headers, timeout=12)
        if r.ok:
            arr = r.json()
            if isinstance(arr, list) and arr:
                lat = arr[0].get("lat")
                lon = arr[0].get("lon")
                if lat and lon:
                    return (float(lat), float(lon))
    except Exception:
        pass

    return (None, None)

@school_bp.post("/recommend")
@school_bp.get("/recommend")
def recommend():
    # This endpoint uses current user's saved preferences if not provided in body/query.
    u = current_user()
    # Parse input
    data = request.get_json(silent=True) or {}
    # allow GET overrides
    level = data.get("level") or request.args.get("level")
    subjects = data.get("subjects") or request.args.get("subjects") or []
    ccas = data.get("ccas") or request.args.get("ccas") or []
    travel_km = data.get("travel_km") or request.args.get("travel_km")
    home_address = (data.get("home_address") or request.args.get("home_address") or "").strip()

    # Support comma-separated strings for GET
    if isinstance(subjects, str):
        subjects = [s.strip() for s in subjects.split(",") if s.strip()]
    if isinstance(ccas, str):
        ccas = [s.strip() for s in ccas.split(",") if s.strip()]

    # coerce travel_km to float if provided
    try:
        travel_km = float(travel_km) if travel_km is not None else None
    except Exception:
        travel_km = None

    # Coordinates may be provided directly
    user_lat = data.get("lat")
    user_lon = data.get("lon")
    if user_lat is None and request.args.get("lat"):
        try:
            user_lat = float(request.args.get("lat"))
        except Exception:
            user_lat = None
    if user_lon is None and request.args.get("lon"):
        try:
            user_lon = float(request.args.get("lon"))
        except Exception:
            user_lon = None

    limit = int(data.get("limit") or request.args.get("limit") or 999999)
    weights = data.get("weights") or {"cca":0.4,"subjects":0.25,"level":0.15,"distance":0.2}

    # If no explicit prefs, require login to use saved prefs
    if not (level or subjects or ccas or travel_km):
        u = current_user()
        if not u:
            return {"error":"Login required for personalized recommendations"}, 401
        prefs = read_preferences(u.id)
    else:
        prefs = {"level": level, "subjects": subjects, "ccas": ccas, "max_distance_km": travel_km}

    # NEW: If no lat/lon but we have a home address, geocode it to get coords
    if (user_lat is None or user_lon is None) and home_address:
        g_lat, g_lon = _geocode_address(home_address)
        if g_lat is not None and g_lon is not None:
            user_lat, user_lon = g_lat, g_lon


     # ---------- FETCH, SCORE, SORT, RETURN ----------
    all_schools = get_schools() or []
    scored = []
    for s in all_schools:
        sc, reasons = _score_school(s, prefs, weights, user_lat=user_lat, user_lon=user_lon)
        scored.append({
            "school_name": s["school_name"],
            "mainlevel_code": s.get("mainlevel_code"),
            "zone_code": s.get("zone_code"),
            "type_code": s.get("type_code"),
            "address": s.get("address"),
            "distance_km": reasons.get("distance_km"),   # ✅ real distance
            "score": sc,
            "score_percent": round(max(0.0, min(1.0, sc)) * 100),
            "reasons": reasons
        })

    # Sort by score desc, tie-break alphabetically; apply limit
    scored.sort(key=lambda x: (-x["score"], x["school_name"].lower()))
    items = scored[:limit]

    return {
        "ok": True,
        "count": len(items),
        "items": items,
        "preferences_used": prefs,
        "user_coords": {"lat": user_lat, "lon": user_lon} if (user_lat is not None and user_lon is not None) else None
    }

@school_bp.get("/options")
def options():
    """Return recognized options (no free-text) for levels, zones (locations),
    types, subjects, and CCAs, derived from datasets/services."""
    items = get_schools() or []
    levels = sorted({(s.get("mainlevel_code") or "").strip().upper() for s in items if s.get("mainlevel_code")})
    zones = sorted({(s.get("zone_code") or "").strip().upper() for s in items if s.get("zone_code")})
    types = sorted({(s.get("type_code") or "").strip().upper() for s in items if s.get("type_code")})

    subjects, ccas = [], []
    try:
        from services.data_fetcher import fetch_subjects_options, fetch_ccas_options  # type: ignore
        subjects = fetch_subjects_options() or []
        ccas = fetch_ccas_options() or []
    except Exception:
        seen_subj, seen_ccas = set(), set()
        for s in items[:50]:
            d = get_school_details(s.get("school_name"))
            for sub in (d or {}).get("subjects") or []:
                if isinstance(sub, str) and sub.strip():
                    seen_subj.add(sub.strip())
            for c in (d or {}).get("ccas") or []:
                if isinstance(c, str) and c.strip():
                    seen_ccas.add(c.strip())
        subjects = sorted(seen_subj)
        ccas = sorted(seen_ccas)

    return {"ok": True, "levels": levels, "zones": zones, "types": types, "subjects": subjects, "ccas": ccas}

