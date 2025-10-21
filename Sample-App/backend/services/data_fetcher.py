import requests
import time

# ------------------------------------------------------------------
# Hardcoded dataset IDs from the School Directory & Information collection (ID 457)
# ------------------------------------------------------------------
DATASETS = {
    "ccas": "d_9aba12b5527843afb0b2e8e4ed6ac6bd",        # CCAs
    "subjects": "d_f1d144e423570c9d84dbc5102c2e664d",    # Subjects Offered
    "school_info": "d_688b934f82c1059ed0a6993d2a829089"  # School general info
}

# ------------------------------------------------------------------
# Caches
# ------------------------------------------------------------------
_cache = {"items": None, "timestamp": 0, "ttl": 600}  # cache for school list (10 min)
_detail_cache = {}  # cache per school details
_dataset_cache = {}  # cache for raw datasets


# ------------------------------------------------------------------
# Fetch dataset from Data.gov.sg (cached)
# ------------------------------------------------------------------
def _fetch_dataset(dataset_id: str):
    """Fetch all rows from a Data.gov.sg dataset, with pagination support."""
    if dataset_id in _dataset_cache and time.time() - _dataset_cache[dataset_id]["timestamp"] < 600:
        return _dataset_cache[dataset_id]["data"]

    all_rows = []
    limit = 5000
    offset = 0

    while True:
        url = f"https://api-production.data.gov.sg/v2/public/api/datasets/{dataset_id}/list-rows?limit={limit}&offset={offset}"
        resp = requests.get(url, timeout=25)
        resp.raise_for_status()
        data = resp.json()

        rows = (
            data.get("data", {}).get("rows")
            or data.get("data", {}).get("items")
            or data.get("data", [])
        ) or []

        if not rows:
            break

        all_rows.extend(rows)

        print(f"✅ Retrieved {len(rows)} rows (offset={offset}) from dataset {dataset_id}")

        if len(rows) < limit:
            break  # No more pages
        offset += limit

    print(f"📦 Total rows fetched from {dataset_id}: {len(all_rows)}")
    _dataset_cache[dataset_id] = {"data": all_rows, "timestamp": time.time()}
    return all_rows


# ------------------------------------------------------------------
# Normalize school info dataset
# ------------------------------------------------------------------
def _normalize_school_data(rows):
    normalized = []
    for s in rows:
        normalized.append({
            "school_name": (s.get("school_name") or "").strip(),
            "postal_code": s.get("postal_code") or "",
            "mainlevel_code": s.get("mainlevel_code") or "",
            "zone_code": s.get("zone_code") or "",
            "type_code": s.get("type_code") or "",
            "address": s.get("address") or "",
            "telephone_no": s.get("telephone_no") or "",
            "email_address": s.get("email_address") or "",
            "url_address": s.get("url_address") or s.get("website") or "",
            **s,
        })
    return normalized


# ------------------------------------------------------------------
# Main school list (for /api/schools)
# ------------------------------------------------------------------
def get_schools(fetch_all=False):
    """Fetch general school info (cached for 10 min)."""
    if _cache["items"] and time.time() - _cache["timestamp"] < _cache["ttl"]:
        print("🔁 Returning cached school data")
        return _cache["items"]

    try:
        print(f"Fetching dataset 'school_info' ({DATASETS['school_info']}) ...")
        rows = _fetch_dataset(DATASETS["school_info"])
        data = _normalize_school_data(rows)

        _cache["items"] = data
        _cache["timestamp"] = time.time()
        print(f"✅ Cached {len(data)} school records")
        return data
    except Exception as e:
        print("❌ [data_fetcher] Failed to fetch school data:", e)
        return []


# ------------------------------------------------------------------
# Detailed info for one school (info + CCAs + subjects)
# ------------------------------------------------------------------
def get_school_details(school_name: str):
    """
    Get detailed info for one school:
    - From main dataset (school_info)
    - Enriched with CCAs and subjects (many rows per school)
    """
    key = school_name.strip().upper()

    # 🔁 Return cached version if available
    if key in _detail_cache and time.time() - _detail_cache[key]["timestamp"] < 600:
        print(f"🔁 Returning cached details for '{school_name}'")
        return _detail_cache[key]["data"]

    # 1️⃣ Get main school info
    schools = _cache["items"] or _normalize_school_data(_fetch_dataset(DATASETS["school_info"]))
    school = next((s for s in schools if (s.get("school_name") or "").strip().upper() == key), None)
    if not school:
        print(f"⚠️ School '{school_name}' not found in main dataset.")
        return None

    # 2️⃣ Load and enrich with CCAs + subjects
    # 2️⃣ Load and enrich with CCAs + subjects
    try:
        ccas = _fetch_dataset(DATASETS["ccas"])
        subjects = _fetch_dataset(DATASETS["subjects"])

        # Normalize case differences and match by uppercase name
        cca_list = sorted({
            (c.get("cca_grouping_desc") or c.get("Cca_grouping_desc") or "").strip()
            for c in ccas
            if (c.get("School_name") or c.get("school_name") or "").strip().upper() == key
        } - {""})

        subj_list = sorted({
            (s.get("Subject_Desc") or s.get("subject_desc") or "").strip()
            for s in subjects
            if (s.get("School_Name") or s.get("school_name") or "").strip().upper() == key
        } - {""})

        school["ccas"] = cca_list
        school["subjects"] = subj_list

        print(f"✅ Enriched {school_name} with {len(cca_list)} CCAs and {len(subj_list)} subjects.")

    except Exception as e:
        print(f"⚠️ Could not enrich details for '{school_name}': {e}")
        school["ccas"] = []
        school["subjects"] = []


    # 3️⃣ Cache and return
    _detail_cache[key] = {"data": school, "timestamp": time.time()}
    return school
