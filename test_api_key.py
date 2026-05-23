import json
import httpx

RAPIDAPI_KEY = "ec4dddb47cmsh91ae4af235f0349p18e772jsn42aa656e6222"
RAPIDAPI_HOST = "real-time-amazon-data.p.rapidapi.com"

headers = {
    "x-rapidapi-key": RAPIDAPI_KEY,
    "x-rapidapi-host": RAPIDAPI_HOST
}

url = f"https://{RAPIDAPI_HOST}/search"
params = {"query": "laptop", "page": "1", "country": "US"}

response = httpx.get(url, headers=headers, params=params, timeout=30)

print(f"Status Code: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    print("✅ SUCCESS! API is working!")
    print("\nFirst product:")
    products = data.get("data", {}).get("products", [])
    if products:
        first = products[0]
        print(f"ASIN: {first.get('asin')}")
        print(f"Title: {first.get('product_title', first.get('title', 'N/A'))[:100]}")
        print(f"Price: {first.get('product_price', first.get('price', 'N/A'))}")
        print(f"Prime: {first.get('is_prime', first.get('product_prime', False))}")
    else:
        print("No products found in response")
        print(json.dumps(data, indent=2)[:1000])
else:
    print(f"❌ FAILED: {response.text[:500]}")
