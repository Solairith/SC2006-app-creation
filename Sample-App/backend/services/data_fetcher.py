# services/data_fetcher.py
import requests
import time

# ------------------------------------------------------------------
# Hardcoded dataset IDs from the School Directory & Information collection (ID 457)
# These rarely change, so hardcoding them improves speed and stability.
# ------------------------------------------------------------------
DATASETS = {
    "ccas": "d_9aba12b5527843afb0b2e8e4ed6ac6bd",               # CCAs
    "subjects": "d_f1d144e423570c9d84dbc5102c2e664d",           # Subjects Offered
    "school_info": "d_688b934f82c1059ed0a6993d2a829089"         # School general info
}

# Simple in-memory cache to avoid repeated API calls
_cache = {"items": None, "timestamp": 0, "ttl": 600}  # 10 minutes TTL


# ------------------------------------------------------------------
# Internal helper: fetch a dataset from Data.gov.sg using its dataset_id
# ------------------------------------------------------------------
def _fetch_dataset(dataset_id: str):
    url = f"https://api-production.data.gov.sg/v2/public/api/datasets/{dataset_id}/list-rows"
    resp = requests.get(url, timeout=25)
    resp.raise_for_status()
    data = resp.json()

    rows = (
        data.get("data", {}).get("rows")
        or data.get("data", {}).get("items")
        or data.get("data", [])
    )

    if not rows:
        print(f"⚠️ No rows found in dataset {dataset_id}")
    return rows


# ------------------------------------------------------------------
# Internal helper: normalize field names for frontend consistency
# ------------------------------------------------------------------
def _normalize_school_data(rows):
    normalized = []
    for s in rows:
        normalized.append({
            "school_name": s.get("school_name") or s.get("name") or "",
            "postal_code": s.get("postal_code") or s.get("postal") or "",
            "mainlevel_code": s.get("mainlevel_code") or s.get("level") or "",
            "zone_code": s.get("zone_code") or s.get("zone") or "",
            "type_code": s.get("type_code") or s.get("type") or "",
            "address": s.get("address") or s.get("address1") or "",
            **s,  # keep all other fields
        })
    return normalized


# ------------------------------------------------------------------
# Main function: returns list of schools (cached)
# ------------------------------------------------------------------
def get_schools(fetch_all=False):
    """
    Fetch school data from Data.gov.sg.
    - If cache is valid, return cached results.
    - If fetch_all=True, merge all datasets (school info, subjects, facilities).
    - Otherwise, only fetch main school_info dataset.
    """

    # 1️⃣ Check cache first
    if _cache["items"] and time.time() - _cache["timestamp"] < _cache["ttl"]:
        return _cache["items"]

    try:
        if fetch_all:
            # 🧩 Merge all datasets
            combined = []
            for name, ds_id in DATASETS.items():
                print(f"Fetching dataset '{name}' ({ds_id}) ...")
                rows = _fetch_dataset(ds_id)
                combined.extend(_normalize_school_data(rows))
            data = combined
        else:
            # ✅ Fast mode: just the main school info dataset
            rows = _fetch_dataset(DATASETS["school_info"])
            data = _normalize_school_data(rows)

        # 🕒 Cache results
        _cache["items"] = data
        _cache["timestamp"] = time.time()
        return data

    except Exception as e:
        print("❌ [data_fetcher] Failed to fetch school data:", e)
        return []
