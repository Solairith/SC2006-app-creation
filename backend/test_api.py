import requests
import json

url = "https://api-production.data.gov.sg/v2/public/api/collections/457/metadata"
response = requests.get(url)
data = response.json()

# Print formatted JSON structure
print(json.dumps(data, indent=2)[:3000])  # show only the first 3000 characters
