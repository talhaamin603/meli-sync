"""
app/services/amazon.py
Fetches product details from RapidAPI 'Real-Time Amazon Data' (letscrape).

Updated to handle the actual response shape from /product-details:
  {
    "status": true,
    "data": {
      "asin": "...",
      "title": "...",
      "price": "$36.00",
      "is_prime": true,
      "is_amazon_choice": true,
      "images": [
        {"variant": "MAIN", "image": "https://..."},
        ...
      ],
      "bullet_points": ["...", "...", ...]
    }
  }

ENV VARS:
    RAPIDAPI_KEY
    RAPIDAPI_HOST          (default: real-time-amazon-data.p.rapidapi.com)
    RAPIDAPI_PRODUCT_PATH  (default: /product-details)
"""
import os
import httpx
from typing import Optional


RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "")
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "real-time-amazon-data.p.rapidapi.com")
RAPIDAPI_PRODUCT_PATH = os.getenv("RAPIDAPI_PRODUCT_PATH", "/product-details")


def is_configured() -> bool:
    return bool(RAPIDAPI_KEY)


# ---------- HTTP call ----------

def _fetch_raw_product(asin: str) -> Optional[dict]:
    if not is_configured():
        raise RuntimeError("Amazon RapidAPI not configured. Set RAPIDAPI_KEY in .env")

    if "{asin}" in RAPIDAPI_PRODUCT_PATH:
        path = RAPIDAPI_PRODUCT_PATH.replace("{asin}", asin)
        params = {"country": "US"}
    else:
        path = RAPIDAPI_PRODUCT_PATH
        params = {"asin": asin, "country": "US"}

    url = f"https://{RAPIDAPI_HOST}{path}"
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
    }

    try:
        r = httpx.get(url, headers=headers, params=params, timeout=30)
        if r.status_code != 200:
            print(f"[amazon] {asin} HTTP {r.status_code}: {r.text[:200]}")
            return None
        return r.json()
    except Exception as e:
        print(f"[amazon] {asin} error: {e}")
        return None


# ---------- ADAPTER ----------

def _normalize_rapidapi_response(asin: str, raw: dict) -> Optional[dict]:
    """Map letscrape /product-details response into our internal Product shape."""
    if not raw or not isinstance(raw, dict):
        return None

    # status field tells us if the call succeeded
    if raw.get("status") is False:
        print(f"[amazon] {asin} status=false: {raw.get('message')}")
        return None

    data = raw.get("data") or {}
    if not data:
        return None

    title = data.get("title") or data.get("product_title")
    if not title:
        return None

    # ---- description (bullet points joined or fallback) ----
    description = _join_bullets(data)

    # ---- image_url (extract from images[] array) ----
    image_url = _extract_main_image(data)

    # ---- price (string '$36.00' -> float 36.00) ----
    price = _parse_price(data.get("price") or data.get("product_price"))

    # ---- prime flag ----
    is_prime = bool(data.get("is_prime") or data.get("prime"))

    return {
        "asin": asin,
        "title": title.strip()[:200],
        "description": description.strip()[:500],
        "image_url": image_url,
        "amazon_price_usd": price,
        "is_prime": is_prime,
        "stock": 10,
    }


def _extract_main_image(data: dict) -> str:
    """Find the best image URL from the images[] array."""
    # Try the images[] array first (letscrape shape)
    images = data.get("images")
    if isinstance(images, list) and images:
        # Prefer the MAIN variant
        for img in images:
            if isinstance(img, dict) and img.get("variant") == "MAIN":
                # Try hi_res first (highest quality), then image, then large
                url = img.get("hi_res") or img.get("image") or img.get("large")
                if url:
                    return url
        # Fallback: first image of any variant
        first = images[0]
        if isinstance(first, dict):
            return first.get("hi_res") or first.get("image") or first.get("large") or ""

    # Other providers might use these flat keys
    return (
        data.get("product_photo")
        or data.get("main_image")
        or data.get("image")
        or ""
    )


def _join_bullets(data: dict) -> str:
    """Build description from bullet_points or fallback to description text."""
    bullets = data.get("bullet_points") or data.get("about_product") or data.get("features")
    if isinstance(bullets, list) and bullets:
        # Take first 3 bullets, joined with ". "
        return " ".join(str(b) for b in bullets[:3])
    return (
        data.get("description")
        or data.get("product_description")
        or ""
    )


def _parse_price(raw) -> float:
    if isinstance(raw, (int, float)):
        return round(float(raw), 2)
    if not raw:
        return 0.0
    s = str(raw)
    cleaned = "".join(c for c in s if c.isdigit() or c in ".,")
    cleaned = cleaned.replace(",", "")
    try:
        return round(float(cleaned), 2)
    except ValueError:
        return 0.0


# ---------- Public function ----------

def fetch_product(asin: str) -> Optional[dict]:
    asin = asin.strip().upper()
    if len(asin) != 10 or not asin.isalnum():
        return None
    raw = _fetch_raw_product(asin)
    if raw is None:
        return None
    return _normalize_rapidapi_response(asin, raw)