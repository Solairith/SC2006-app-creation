# routes/schools.py
from flask import Blueprint, request, jsonify
from services.data_fetcher import get_schools, get_school_details
from models.user_model import current_user, read_preferences
from math import radians, sin, cos, sqrt, atan2
import requests, time
from urllib.parse import urlencode
from typing import Optional, Tuple
from functools import lru_cache
import os



school_bp = Blueprint("schools", __name__, url_prefix="/api/schools")

# 🔐 OneMap token (recommended: set env var ONEMAP_TOKEN)
ONEMAP_TOKEN = os.environ.get("ONEMAP_TOKEN", "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo5ODQ2LCJmb3JldmVyIjpmYWxzZSwiaXNzIjoiT25lTWFwIiwiaWF0IjoxNzYxOTc2OTU4LCJuYmYiOjE3NjE5NzY5NTgsImV4cCI6MTc2MjIzNjE1OCwianRpIjoiMDZjM2I1MzEtNDBkNy00YjZlLWEwOWEtMzFhYzY5MTU5Y2I1In0.3UkMJvO5HweZewN5OSZdBnjZfO9v3TNnRiVNtZJglbUJHMbCmm508GDWD9ui5GFducALjlEAC9g3zlXcJ2x285E7W0_stDQ7b3HiZBeWcFHephBwC7JUexfJOEwm_KXmOZyk776O7eFgCZg2D7PRwPd2_-tRsB6lGrhq5HFDK-SpbH9pGBaXjWLIswsGqB2qxq6o6XupqwTaGcgByssrnk2LFaysTd9uAHQ-_nB0QyCS7A1SlM4P2dF8skPS1WrSkyjndARCeh9jsBUTmgnRAOPJ1OHrZtsP0iKXnY3hAs_GM4VR1Md662umaLmttCqwLF_N-DxvKevb0DPUAZVflQ")

# 🔁 in-memory cache for postal → (lat, lon)
_POSTAL_CACHE: dict[str, dict] = {}   # { "200640": {"lat": 1.30..., "lon": 103.85..., "ts": 1690000000} }
_POSTAL_TTL_SEC = 24 * 3600           # cache for a day

def _normalize_level(lv: str | None) -> str | None:
    if not lv: 
        return None
    
    original_lv = lv
    lv = lv.strip().lower()
    
    result = None
    if lv in ("primary","pri","p","ps") or "primary" in lv:
        result = "PRIMARY"
    elif lv in ("secondary","sec","s") or "secondary" in lv:
        result = "SECONDARY"
    elif lv in ("mixed","mix") or "mixed" in lv:
        result = "MIXED"
    elif "junior college" in lv or "jc" in lv:
        result = "JUNIOR COLLEGE"
    else:
        result = lv.upper()
    
    return result

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

def _cache_get(postal: str) -> Optional[Tuple[float, float]]:
    rec = _GEOCODE_CACHE.get(postal)
    if not rec:
        return None
    lat, lon, ts = rec
    if time.time() - ts > _GEOCODE_TTL:
        return None
    return (lat, lon)

def _cache_put(postal: str, lat: float, lon: float) -> None:
    _GEOCODE_CACHE[postal] = (lat, lon, time.time())

def _is_sg_postal(postal: str) -> bool:
    return isinstance(postal, str) and len(postal.strip()) == 6 and postal.strip().isdigit()

def _geocode_postal(postal: str) -> tuple[Optional[float], Optional[float]]:
    """
    Geocode a Singapore postal code using OneMap's elastic search API.
    Returns (lat, lon) or (None, None) if not found or invalid token.
    """
    if not postal:
        return (None, None)
    p = str(postal).strip()
    if len(p) != 6 or not p.isdigit():
        return (None, None)

    # ✅ Cache check
    now = time.time()
    cached = _POSTAL_CACHE.get(p)
    if cached and (now - cached.get("ts", 0) < _POSTAL_TTL_SEC):
        return (cached["lat"], cached["lon"])

    # ✅ Correct OneMap endpoint (NOT developers.onemap.sg)
    url = (
        "https://www.onemap.gov.sg/api/common/elastic/search?"
        + urlencode({
            "searchVal": p,
            "returnGeom": "Y",
            "getAddrDetails": "Y",
            "pageNum": 1
        })
    )

    headers = {"Authorization": ONEMAP_TOKEN}
    try:
        r = requests.get(url, headers=headers, timeout=10)
        js = r.json()

        # ⚠️ Handle expired/invalid tokens gracefully
        if "error" in js:
            print(f"[geocode] OneMap token error: {js['error']}")
            return (None, None)

        results = js.get("results") or []
        if results:
            lat = results[0].get("LATITUDE")
            lon = results[0].get("LONGITUDE")
            if lat and lon:
                latf, lonf = float(lat), float(lon)
                _POSTAL_CACHE[p] = {"lat": latf, "lon": lonf, "ts": now}
                return (latf, lonf)

    except Exception as e:
        print(f"[geocode] OneMap postal error: {e}")

    # Cache negative results for stability
    _POSTAL_CACHE[p] = {"lat": None, "lon": None, "ts": now}
    return (None, None)


def _postal_distance_km(home_postal: Optional[str], school_postal: Optional[str]) -> Optional[float]:
    if not (home_postal and school_postal):
        return None
    lat1, lon1 = _geocode_postal(str(home_postal).strip())
    lat2, lon2 = _geocode_postal(str(school_postal).strip())
    if None in (lat1, lon1, lat2, lon2):
        return None
    return _haversine(lat1, lon1, lat2, lon2)



@school_bp.get("/", strict_slashes=False)
def search():
    q = (request.args.get("q") or "").strip().lower()
    level = _normalize_level(request.args.get("level"))
    zone = (request.args.get("zone") or "").strip().upper()
    type_code = (request.args.get("type") or "").strip().upper()
    limit = int(request.args.get("limit") or 20)
    offset = int(request.args.get("offset") or 0)

    items = get_schools()

    all_levels = {}
    for school in items:
        school_level = school.get("mainlevel_code")
        if school_level:
            all_levels[school_level] = all_levels.get(school_level, 0) + 1
    
    def ok(s):
        if q and q not in (s.get("school_name") or "").lower():
            return False
        
        if level:
            school_level = s.get("mainlevel_code") or ""
            if level not in school_level.upper():
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
    # 1) preference prep
    cca_prefs = set(map(str.lower, prefs.get("ccas") or []))
    subj_prefs = set(map(str.lower, prefs.get("subjects") or []))
    lvl_pref   = _normalize_level(prefs.get("level"))
    max_km     = prefs.get("max_distance_km") or prefs.get("travel_km")

    details = get_school_details(school["school_name"]) or {}
    school_ccas     = set(map(str.lower, details.get("ccas", [])))
    school_subjects = set(map(str.lower, details.get("subjects", [])))
    school_level    = _normalize_level(school.get("mainlevel_code"))

    # 2) distances: geocode school postal → coords
    distance_km = None
    dist_score  = 0.0
    if max_km and user_lat is not None and user_lon is not None:
        sch_postal = (school.get("postal_code") or "").strip()
        sch_lat, sch_lon = _geocode_postal(sch_postal)
        distance_km = _haversine(user_lat, user_lon, sch_lat, sch_lon) if (sch_lat and sch_lon) else None
        if distance_km is not None:
            # soft cap: full score within max_km, linear decay across next max_km
            dist_score = max(0.0, 1.0 - (float(distance_km) / float(max_km)))

    # 3) factors in [0,1]
    cca_score   = (len(cca_prefs & school_ccas)     / max(1, len(cca_prefs)))   if cca_prefs else 0.0
    subj_score  = (len(subj_prefs & school_subjects) / max(1, len(subj_prefs))) if subj_prefs else 0.0
    level_score = 1.0 if (lvl_pref and school_level == lvl_pref) else (0.0 if lvl_pref else 0.0)

    # 4) weighted total
    score = (
        weights.get("cca", 0.2)       * cca_score +
        weights.get("subjects", 0.25) * subj_score +
        weights.get("level", 0.15)    * level_score +
        weights.get("distance", 0.4)  * dist_score
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


@school_bp.post("/recommend")
@school_bp.get("/recommend")
def recommend():
    u = current_user()
    data = request.get_json(silent=True) or {}

    # GET overrides
    level       = data.get("level")       or request.args.get("level")
    subjects    = data.get("subjects")    or request.args.get("subjects") or []
    ccas        = data.get("ccas")        or request.args.get("ccas")     or []
    travel_km   = data.get("travel_km")   or request.args.get("travel_km")
    home_postal = (data.get("home_postal") or request.args.get("home_postal") or data.get("home_address") or request.args.get("home_address") or "").strip()

    # allow comma string for GET
    if isinstance(subjects, str):
        subjects = [s.strip() for s in subjects.split(",") if s.strip()]
    if isinstance(ccas, str):
        ccas = [s.strip() for s in ccas.split(",") if s.strip()]

    try:
        travel_km = float(travel_km) if travel_km is not None else None
    except Exception:
        travel_km = None

    limit   = int(data.get("limit") or request.args.get("limit") or 999999)
    weights = data.get("weights") or {"cca": 0.2, "subjects": 0.25, "level": 0.15, "distance": 0.4}

    # If nothing is provided, require login to read saved prefs
    if not (level or subjects or ccas or travel_km or home_postal):
        if not u:
            return {"error": "Login required for personalized recommendations"}, 401
        prefs = read_preferences(u.id)
        home_postal = (prefs.get("home_postal") or "").strip()
    else:
        prefs = {"level": level, "subjects": subjects, "ccas": ccas, "max_distance_km": travel_km}

    # Geocode the user's postal once
    user_lat = user_lon = None
    if home_postal:
        user_lat, user_lon = _geocode_postal(home_postal)

    # ---------- FETCH, SCORE, SORT, RETURN ----------
    all_schools = get_schools() or []
    scored = []
    for s in all_schools:
        sc, reasons = _score_school(s, prefs, weights, user_lat=user_lat, user_lon=user_lon)
        scored.append({
            "school_name":   s["school_name"],
            "mainlevel_code": s.get("mainlevel_code"),
            "zone_code":      s.get("zone_code"),
            "type_code":      s.get("type_code"),
            "address":        s.get("address"),
            "postal_code":    s.get("postal_code"),
            "distance_km":    reasons.get("distance_km"),
            "score":          sc,
            "score_percent":  round(max(0.0, min(1.0, sc)) * 100),
            "reasons":        reasons
        })

    scored.sort(key=lambda x: (-x["score"], x["school_name"].lower()))
    items = scored[:limit]

    return {
        "ok": True,
        "count": len(items),
        "items": items,
        "preferences_used": prefs,
        "home_postal_used": home_postal or None,
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

@school_bp.get("/recommend-debug")
def recommend_debug():
    u = current_user()
    if not u:
        return {"error": "Not logged in"}, 401
    prefs = read_preferences(u.id) or {}
    home_postal = (prefs.get("home_postal") or "").strip() or request.args.get("home_postal", "").strip()

    schools = get_schools()
    sample = schools[0] if schools else {}
    d_km = None
    if sample:
        d_km = _postal_distance_km(home_postal, sample.get("postal_code"))

    return {
        "user": {"id": getattr(u, "id", None), "home_postal": home_postal},
        "sample_school": {
            "name": sample.get("school_name"),
            "postal_code": sample.get("postal_code"),
            "address": sample.get("address"),
        },
        "calculated_distance_km": d_km,
        "prefs": prefs
    }

@school_bp.get("/debug-distance")
def debug_distance():
    home_postal = (request.args.get("home_postal") or
                   request.args.get("home_address") or "").strip()
    school_postal = request.args.get("school_postal", "").strip()
    if not home_postal or not school_postal:
        return {"error": "Both home_postal and school_postal required"}, 400

    
    # Test geocoding for both
    home_lat, home_lon = _geocode_postal(home_postal)
    school_lat, school_lon = _geocode_postal(school_postal)
    
    distance = _haversine(home_lat, home_lon, school_lat, school_lon) if all([home_lat, home_lon, school_lat, school_lon]) else None
    
    return {
        "home_postal": home_postal,
        "school_postal": school_postal,
        "home_coords": {"lat": home_lat, "lon": home_lon},
        "school_coords": {"lat": school_lat, "lon": school_lon},
        "distance_km": distance
    }