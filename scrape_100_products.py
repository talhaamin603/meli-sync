#!/usr/bin/env python3
"""
FINAL SCRIPT: Scrape 100 Amazon Prime Beauty Products
- Loads blacklist from your database
- Filters out blocked products
- Only saves Prime-eligible products
- Outputs CSV ready for import

Usage:
    python scrape_100_products.py
"""

import csv
import re
import time
import sys
from typing import List, Dict, Set, Tuple
from apify_client import ApifyClient
import psycopg2

# ============================================================
# CONFIGURATION - EDIT THESE
# ============================================================

# Your Apify API token (get from https://console.apify.com/settings/integrations)
APIFY_TOKEN = "apify_api_sxmiqkLXhRKpzCmScJt4UhfIEOgGXD3zwPkc"  # <--- REPLACE THIS

# Database connection (should match your .env)
DB_CONFIG = {
    "host": "localhost",
    "port": "5432",
    "database": "meli_sync",
    "user": "postgres",
    "password": "mysecretpassword"
}

# Target number of products
TARGET_PRODUCTS = 100

# Search queries - generic, avoiding brand names to skip blacklist
SEARCH_QUERIES = [
    "face moisturizer cream",
    "organic face serum",
    "natural shampoo",
    "face cleanser wash",
    "hyaluronic acid serum",
    "vitamin c face serum",
    "coconut oil shampoo",
    "retinol face cream",
    "sunscreen face spf",
    "eye cream moisturizer",
    "face exfoliator scrub",
    "micellar cleansing water",
    "face toner hydrating",
    "face mask sheet",
    "aloe vera gel face",
]

# ============================================================
# DATABASE FUNCTIONS (Load Blacklist)
# ============================================================

def get_blacklist_words() -> Set[str]:
    """Load all blacklist terms from your PostgreSQL database"""
    blacklist = set()
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute("SELECT LOWER(value) FROM blacklistrule")
        for row in cur.fetchall():
            blacklist.add(row[0])
        cur.close()
        conn.close()
        print(f"✅ Loaded {len(blacklist)} blacklist terms from database")
        return blacklist
    except Exception as e:
        print(f"❌ Cannot connect to database: {e}")
        print("   Make sure PostgreSQL is running: docker start meli-postgres")
        sys.exit(1)

def is_blocked(title: str, description: str, blacklist: Set[str]) -> Tuple[bool, str]:
    """
    Check if product is blocked by blacklist using whole-word matching
    Same algorithm as your blacklist.py
    """
    text = f" {title} {description} ".lower()
    
    for term in blacklist:
        # Whole word boundary check
        pattern = r'\b' + re.escape(term) + r'\b'
        if re.search(pattern, text):
            return True, term
    
    return False, None

# ============================================================
# APIFY FETCHING FUNCTIONS
# ============================================================

def extract_asin(item: Dict) -> str:
    """Extract ASIN from product item"""
    asin = item.get("asin", "")
    if not asin:
        asin = item.get("ASIN", "")
    if not asin:
        url = item.get("url", "")
        match = re.search(r'/dp/([A-Z0-9]{10})', url)
        if match:
            asin = match.group(1)
    return asin

def extract_price(item: Dict) -> float:
    """Extract price from product item"""
    price = item.get("price", 0)
    if isinstance(price, str):
        numbers = re.findall(r'\d+\.?\d*', price)
        if numbers:
            return float(numbers[0])
    elif isinstance(price, dict):
        price = price.get("value", 0)
    elif isinstance(price, (int, float)):
        return float(price)
    return 0.0

def fetch_safe_products(blacklist: Set[str]) -> List[Dict]:
    """Fetch products from Apify and filter out blacklisted ones"""
    
    client = ApifyClient(APIFY_TOKEN)
    safe_products = []
    seen_asins = set()
    
    stats = {
        "total": 0,
        "blocked": 0,
        "not_prime": 0,
        "no_price": 0,
        "duplicate": 0
    }
    
    print("\n" + "=" * 70)
    print("FETCHING AMAZON PRIME BEAUTY PRODUCTS")
    print(f"Target: {TARGET_PRODUCTS} safe products (not in blacklist)")
    print("=" * 70)
    
    for query in SEARCH_QUERIES:
        if len(safe_products) >= TARGET_PRODUCTS:
            break
        
        print(f"\n🔍 Searching: {query}")
        
        run_input = {
            "searchQueries": [query],
            "maxProductsPerSearch": 30,
            "maxSearchPages": 2,
            "countryCode": "US",
        }
        
        try:
            run = client.actor("dtrungtin/amazon-scraper").call(run_input=run_input)
            
            for item in client.dataset(run["defaultDatasetId"]).iterate_items():
                if len(safe_products) >= TARGET_PRODUCTS:
                    break
                
                stats["total"] += 1
                
                # Extract ASIN
                asin = extract_asin(item)
                if not asin or asin in seen_asins:
                    stats["duplicate"] += 1
                    continue
                seen_asins.add(asin)
                
                # Get title
                title = item.get("title", "")
                if not title:
                    continue
                
                # Check Prime
                is_prime = item.get("isPrime", False) or item.get("prime", False)
                if not is_prime:
                    stats["not_prime"] += 1
                    continue
                
                # Get price
                price = extract_price(item)
                if price <= 0:
                    stats["no_price"] += 1
                    continue
                
                # Get description
                description = item.get("description", title)
                image_url = item.get("mainImage", "") or item.get("imageUrl", "")
                
                # CHECK BLACKLIST (CRITICAL)
                blocked, blocked_term = is_blocked(title, description, blacklist)
                
                if blocked:
                    stats["blocked"] += 1
                    print(f"  🚫 BLOCKED: {title[:45]}... (matched: '{blocked_term}')")
                    continue
                
                # Product is SAFE
                safe_products.append({
                    "asin": asin,
                    "title": title,
                    "description": description[:500],
                    "image_url": image_url,
                    "amazon_price_usd": price,
                    "stock": 10,
                    "is_prime": True
                })
                print(f"  ✅ SAFE: {title[:50]}... (${price})")
                print(f"     Progress: {len(safe_products)}/{TARGET_PRODUCTS}")
                
        except Exception as e:
            print(f"  ⚠️ Error: {e}")
            continue
        
        time.sleep(2)
    
    # Print statistics
    print("\n" + "=" * 70)
    print("STATISTICS")
    print("=" * 70)
    print(f"Total products examined    : {stats['total']}")
    print(f"✅ SAFE (not in blacklist) : {len(safe_products)}")
    print(f"🚫 Blocked by blacklist    : {stats['blocked']}")
    print(f"⏭️ Not Prime              : {stats['not_prime']}")
    print(f"⏭️ No price               : {stats['no_price']}")
    print(f"⏭️ Duplicate              : {stats['duplicate']}")
    print("=" * 70)
    
    return safe_products

# ============================================================
# SAVE TO CSV
# ============================================================

def save_to_csv(products: List[Dict], filename: str = "products_100.csv"):
    """Save products to CSV for import into your system"""
    
    if not products:
        print("\n❌ No safe products found!")
        print("   Try: Different search terms or check blacklist")
        return
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            "asin", "title", "description", "image_url",
            "amazon_price_usd", "stock", "is_prime"
        ])
        writer.writeheader()
        
        for p in products:
            writer.writerow({
                "asin": p["asin"],
                "title": p["title"][:200],
                "description": p["description"][:500],
                "image_url": p["image_url"],
                "amazon_price_usd": p["amazon_price_usd"],
                "stock": p["stock"],
                "is_prime": "true"
            })
    
    print(f"\n✅ Saved {len(products)} products to {filename}")
    return filename

def preview_products(products: List[Dict]):
    """Show preview of first 5 products"""
    print("\n" + "=" * 70)
    print("PREVIEW (First 5 Safe Products)")
    print("=" * 70)
    for i, p in enumerate(products[:5], 1):
        print(f"\n{i}. ASIN: {p['asin']}")
        print(f"   Title: {p['title'][:60]}...")
        print(f"   Price: ${p['amazon_price_usd']}")

# ============================================================
# MAIN
# ============================================================

def main():
    print("\n" + "=" * 70)
    print("AMAZON PRIME BEAUTY PRODUCT SCRAPER")
    print("=" * 70)
    
    # Check API token
    if APIFY_TOKEN == "apify_api_YOUR_TOKEN_HERE":
        print("\n❌ Please set your Apify API token!")
        print("   1. Go to https://console.apify.com/settings/integrations")
        print("   2. Copy your API token")
        print("   3. Replace 'apify_api_YOUR_TOKEN_HERE' in the script")
        sys.exit(1)
    
    # Load blacklist from database
    print("\n📂 Connecting to database...")
    blacklist = get_blacklist_words()
    
    # Fetch safe products
    safe_products = fetch_safe_products(blacklist)
    
    if safe_products:
        # Preview
        preview_products(safe_products)
        
        # Save to CSV
        filename = save_to_csv(safe_products)
        
        # Next steps
        print("\n" + "=" * 70)
        print("NEXT STEPS")
        print("=" * 70)
        print(f"1. Run: python import_csv.py {filename}")
        print("2. Verify: docker exec -it meli-postgres psql -U postgres -d meli_sync -c \"SELECT COUNT(*) FROM product;\"")
        print(f"\n✅ Expected: {len(safe_products)} new products added")
    else:
        print("\n❌ No safe products found!")
        print("   Try modifying SEARCH_QUERIES in the script")

if __name__ == "__main__":
    main()