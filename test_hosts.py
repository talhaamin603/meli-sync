import httpx

KEY = "ec4dddb47cmsh91ae4af235f0349p18e772jsn42aa656e6222"

# Try different hosts
hosts = [
    "real-time-amazon-data.p.rapidapi.com",
    "amazon-products1.p.rapidapi.com",
    "amazon-product-scraper.p.rapidapi.com",
    "amazon-search1.p.rapidapi.com",
    "unofficial-amazon.p.rapidapi.com"
]

for host in hosts:
    headers = {
        "x-rapidapi-key": KEY,
        "x-rapidapi-host": host
    }
    url = f"https://{host}/search"
    params = {"query": "laptop", "page": "1", "country": "US"}
    
    try:
        resp = httpx.get(url, headers=headers, params=params, timeout=10)
        print(f"{host}: {resp.status_code}")
        if resp.status_code == 200:
            print(f"  ✅ WORKING! Use this host.")
            print(f"  Sample: {resp.json().get('data', {}).get('products', [{}])[0].get('title', 'N/A')[:50]}")
            break
    except Exception as e:
        print(f"{host}: Error - {str(e)[:50]}")
