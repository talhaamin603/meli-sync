import os
import httpx
from bs4 import BeautifulSoup

SCRAPEDO_TOKEN = os.getenv("SCRAPEDO_TOKEN", "")
_BASE = "https://api.scrape.do/plugin/amazon"


def is_configured() -> bool:
    return bool(SCRAPEDO_TOKEN)


def _parse_html(html: str) -> dict:
    if not html:
        return {"description": "", "whats_in_the_box": ""}

    soup = BeautifulSoup(html, "lxml")

    # "About this item" bullets
    bullets = soup.select("#feature-bullets .a-list-item")
    description = "\n".join(b.get_text(strip=True) for b in bullets if b.get_text(strip=True))

    # "What's in the box" — scan product-detail table rows
    whats_in_the_box = ""
    _box_keys = {"included components", "what's in the box", "what's included", "in the box"}
    for row in soup.select("table tr"):
        th = row.select_one("th")
        td = row.select_one("td")
        if th and td and th.get_text(strip=True).lower() in _box_keys:
            whats_in_the_box = td.get_text(strip=True)
            break

    # Append to description so it's stored and searchable
    if whats_in_the_box:
        description = (description + "\n\nWhat's in the Box:\n" + whats_in_the_box).strip()

    return {"description": description, "whats_in_the_box": whats_in_the_box}


def fetch_product(asin: str) -> dict:
    r = httpx.get(
        f"{_BASE}/pdp",
        params={"token": SCRAPEDO_TOKEN, "asin": asin, "geocode": "us", "include_html": "true"},
        timeout=30,
    )
    r.raise_for_status()
    d = r.json()

    if d.get("status") != "success":
        raise ValueError(d.get("errorMessage") or "Product not found")

    price = float(d.get("price") or 0)
    if price == 0:
        raise ValueError("Product unavailable (price is $0)")

    thumbnail = d.get("thumbnail") or ""
    raw_images = [i.get("url", "") for i in (d.get("images") or [])]
    seen, images = set(), []
    for url in [thumbnail] + raw_images:
        if url and url not in seen:
            seen.add(url)
            images.append(url)
        if len(images) == 8:
            break

    return {
        "asin": d.get("asin") or asin,
        "name": d.get("name") or "",
        "brand": d.get("brand") or "",
        "url": d.get("url") or "",
        "thumbnail": thumbnail,
        "images": images,
        "rating": float(d.get("rating") or 0),
        "total_ratings": int(d.get("total_ratings") or 0),
        "price": price,
        "is_prime": bool(d.get("is_prime")),
        **_parse_html(d.get("html", "")),
        "status": "success",
    }


def fetch_product_for_sync(asin: str) -> dict:
    """Lightweight fetch for daily sync — no HTML parsing, just price/rating data."""
    r = httpx.get(
        f"{_BASE}/pdp",
        params={"token": SCRAPEDO_TOKEN, "asin": asin, "geocode": "us"},
        timeout=30,
    )
    r.raise_for_status()
    d = r.json()
    if d.get("status") != "success":
        raise ValueError(d.get("errorMessage") or "Product not found")
    return {
        "asin": d.get("asin") or asin,
        "name": d.get("name") or "",
        "price": float(d.get("price") or 0),
        "rating": float(d.get("rating") or 0),
        "total_ratings": int(d.get("total_ratings") or 0),
        "is_prime": bool(d.get("is_prime")),
    }


def _parse_review_count(raw) -> int:
    """Parse Amazon review count strings like '(9.1K)', '(567)', '(2.3M)' → int."""
    if not raw:
        return 0
    s = str(raw).strip().strip("()").replace(",", "").upper()
    mult = 1
    if s.endswith("K"):
        mult, s = 1_000, s[:-1]
    elif s.endswith("M"):
        mult, s = 1_000_000, s[:-1]
    try:
        return int(float(s) * mult)
    except ValueError:
        return 0


def search_products(query: str, page: int = 1) -> dict:
    """Keyword search on Amazon via scrape.do — returns one Amazon results page (1 credit)."""
    r = httpx.get(
        f"{_BASE}/search",
        params={"token": SCRAPEDO_TOKEN, "keyword": query, "geocode": "us", "page": page},
        timeout=40,
    )
    r.raise_for_status()
    d = r.json()

    if d.get("status") != "success":
        raise ValueError(d.get("errorMessage") or "Search failed")

    products = []
    for item in d.get("products") or []:
        asin = (item.get("asin") or "").strip()
        if not asin:
            continue
        products.append({
            "asin": asin,
            "title": item.get("title") or "",
            "url": item.get("url") or "",
            "image_url": item.get("imageUrl") or "",
            "amazon_price_usd": float((item.get("price") or {}).get("amount") or 0),
            "rating": float((item.get("rating") or {}).get("value") or 0),
            "review_count": _parse_review_count(item.get("reviewCount")),
            "is_prime": bool(item.get("isPrime")),
            "is_sponsored": bool(item.get("isSponsored")),
            "position": int(item.get("position") or 0),
            "badge": item.get("badge") or None,
        })

    return {
        "page": int(d.get("page") or page),
        "total_results": d.get("totalResults") or "",
        "products": products,
    }
