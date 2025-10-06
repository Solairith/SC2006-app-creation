from flask import Flask, jsonify
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({"message": "Hello from SchoolFit backend!"})

@app.route('/api/schools', methods=['GET'])
def get_schools():
    collection_id = os.getenv("COLLECTION_ID")
    if not collection_id:
        return jsonify({"error": "COLLECTION_ID not found in .env"}), 500

    # Step 1: Get collection metadata
    meta_url = f"https://api-production.data.gov.sg/v2/public/api/collections/{collection_id}/metadata"
    meta_response = requests.get(meta_url)
    if meta_response.status_code != 200:
        return jsonify({
            "error": "Failed to fetch collection metadata",
            "status_code": meta_response.status_code
        }), meta_response.status_code

    meta_data = meta_response.json()
    cm = meta_data.get("data", {}).get("collectionMetadata", {})
    child_datasets = cm.get("childDatasets", [])

    if not child_datasets:
        return jsonify({"error": "No child datasets found"}), 500

    # Step 2: Pick the first dataset (main table)
    dataset_id = child_datasets[0]

    # Step 3: Fetch dataset metadata to find resourceId
    dataset_meta_url = f"https://api-production.data.gov.sg/v2/public/api/datasets/{dataset_id}/metadata"
    dataset_meta_response = requests.get(dataset_meta_url)
    if dataset_meta_response.status_code != 200:
        return jsonify({
            "error": "Failed to fetch dataset metadata",
            "status_code": dataset_meta_response.status_code,
            "url": dataset_meta_url
        }), dataset_meta_response.status_code

    dataset_meta = dataset_meta_response.json()
    dm = dataset_meta.get("data", {}).get("datasetMetadata", {})
    resources = dm.get("resources", [])

    if not resources:
        return jsonify({
            "error": "No resources found in dataset metadata",
            "keys_in_datasetMetadata": list(dm.keys())
        }), 500

    # Step 4: Get the first resourceId (actual data table)
    resource_id = resources[0].get("resourceId")
    if not resource_id:
        return jsonify({"error": "Resource ID not found"}), 500

    # Step 5: Fetch data from the resource
    data_url = f"https://api-production.data.gov.sg/v2/public/api/resources/{resource_id}/data"
    data_response = requests.get(data_url)
    if data_response.status_code != 200:
        return jsonify({
            "error": "Failed to fetch resource data",
            "status_code": data_response.status_code,
            "url": data_url
        }), data_response.status_code

    school_data = data_response.json()

    # Step 6: Simplify data for output
    try:
        records = school_data["data"]["records"]
        simplified = []
        for item in records:
            simplified.append({
                "school_name": item.get("school_name"),
                "address": item.get("address"),
                "postal_code": item.get("postal_code"),
                "mainlevel_code": item.get("mainlevel_code"),
                "zone_code": item.get("zone_code"),
                "type_code": item.get("type_code"),
                "nature_code": item.get("nature_code")
            })

        return jsonify({
            "dataset_id": dataset_id,
            "resource_id": resource_id,
            "total_schools": len(simplified),
            "schools": simplified
        })

    except KeyError:
        return jsonify({
            "error": "Unexpected data format",
            "keys_in_data": list(school_data.keys())
        }), 500


if __name__ == '__main__':
    app.run(debug=True)
