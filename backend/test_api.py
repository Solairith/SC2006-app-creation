'''import requests
import json

collection_id = 457
collection_url = f"https://api-production.data.gov.sg/v2/public/api/collections/{collection_id}/metadata"

print(f"Fetching collection metadata from: {collection_url}")
collection_resp = requests.get(collection_url, timeout=20)
print("Collection Status code:", collection_resp.status_code)
collection_data = collection_resp.json()

child_datasets = collection_data.get("data", {}).get("collectionMetadata", {}).get("childDatasets", [])
if not child_datasets:
    print("No datasets found in this collection.")
else:
    print(f"Found {len(child_datasets)} datasets in collection.\n")

    print("Dataset list:")
    for dataset_id in child_datasets:
        meta_url = f"https://api-production.data.gov.sg/v2/public/api/datasets/{dataset_id}/metadata"
        try:
            meta_resp = requests.get(meta_url, timeout=20)
            meta_resp.raise_for_status()
            meta_data = meta_resp.json()

            # Try both possible key structures
            dataset_metadata = (
                meta_data.get("data", {}).get("datasetMetadata")
                or meta_data.get("data", {}).get("metadata")
                or {}
            )

            title = dataset_metadata.get("title", "Unknown title")
            desc = dataset_metadata.get("description", "No description")
            updated = dataset_metadata.get("lastUpdatedAt", "Unknown date")

            print(f" - {dataset_id}: {title}")
            print(f"   Last updated: {updated}")
            print(f"   Description: {desc[:100]}...\n")

        except Exception as e:
            print(f" ⚠️  Failed to fetch title for {dataset_id}: {e}")

    # Keep your existing functionality: test 1st dataset
    dataset_id = child_datasets[0]
    dataset_url = f"https://api-production.data.gov.sg/v2/public/api/datasets/{dataset_id}/list-rows"
    print(f"\nFetching dataset rows from: {dataset_url}")
    dataset_resp = requests.get(dataset_url, headers={"Accept": "*/*"}, timeout=25)
    print("Dataset Status code:", dataset_resp.status_code)
    dataset_data = dataset_resp.json()
    print("\nDataset JSON preview:")
    print(json.dumps(dataset_data, indent=2)[:3000])'''

import requests
import json
from time import sleep

collection_id = 457
collection_url = f"https://api-production.data.gov.sg/v2/public/api/collections/{collection_id}/metadata"

print(f"Fetching collection metadata from: {collection_url}")
collection_resp = requests.get(collection_url, timeout=20)
print("Collection Status code:", collection_resp.status_code)
collection_data = collection_resp.json()

# Extract dataset IDs
child_datasets = collection_data.get("data", {}).get("collectionMetadata", {}).get("childDatasets", [])
if not child_datasets:
    print("No datasets found in this collection.")
else:
    print(f"Found {len(child_datasets)} datasets in this collection.\n")

    # Loop through the first 5 datasets (or all if fewer)
    for i, dataset_id in enumerate(child_datasets[:5], start=1):
        print(f"\n===== Dataset {i}: {dataset_id} =====")

        # Fetch metadata for reference
        meta_url = f"https://api-production.data.gov.sg/v2/public/api/datasets/{dataset_id}/metadata"
        try:
            meta_resp = requests.get(meta_url, timeout=20)
            meta_resp.raise_for_status()
            meta_data = meta_resp.json()

            dataset_metadata = (
                meta_data.get("data", {}).get("datasetMetadata")
                or meta_data.get("data", {}).get("metadata")
                or {}
            )

            title = dataset_metadata.get("title", "Unknown title")
            print(f"Title: {title}")

        except Exception as e:
            print(f"⚠️ Failed to fetch metadata for {dataset_id}: {e}")
            continue

        # Fetch dataset rows
        list_url = f"https://api-production.data.gov.sg/v2/public/api/datasets/{dataset_id}/list-rows"
        try:
            print(f"Fetching rows from: {list_url}")
            list_resp = requests.get(list_url, headers={"Accept": "*/*"}, timeout=25)
            list_resp.raise_for_status()
            list_data = list_resp.json()

            rows = list_data.get("data", {}).get("rows", [])
            print(f"Total rows: {len(rows)}")

            # Preview first 3 rows only
            for j, r in enumerate(rows[:3], start=1):
                print(f"Row {j}: {json.dumps(r, indent=2)}")

        except Exception as e:
            print(f"⚠️ Failed to fetch dataset rows for {dataset_id}: {e}")

        sleep(1)  # polite delay between requests


