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

    # ---- image_url (main) + all images ----
    image_url, all_images = _extract_images(data)

    # ---- price (string '$36.00' -> float 36.00) ----
    price = _parse_price(data.get("price") or data.get("product_price"))

    # ---- prime flag ----
    is_prime = bool(data.get("is_prime") or data.get("prime"))

    return {
        "asin": asin,
        "title": title.strip()[:200],
        "description": description.strip()[:500],
        "image_url": image_url,
        "images": all_images,          # full list, MAIN first
        "amazon_price_usd": price,
        "is_prime": is_prime,
        "stock": 10,
    }


def _extract_images(data: dict) -> tuple[str, list[str]]:
    """
    Returns (main_image_url, all_image_urls).
    main_image_url is the MAIN variant (hi-res preferred), used for the thumbnail.
    all_image_urls is every image in order: MAIN first, then the rest.
    """
    images = data.get("images")
    all_urls: list[str] = []
    main_url = ""

    if isinstance(images, list) and images:
        main_candidates = []
        other_candidates = []
        for img in images:
            if not isinstance(img, dict):
                continue
            url = img.get("hi_res") or img.get("image") or img.get("large") or ""
            if not url:
                continue
            if img.get("variant") == "MAIN":
                main_candidates.append(url)
            else:
                other_candidates.append(url)

        # MAIN variant first, then the rest
        all_urls = main_candidates + other_candidates
        main_url = all_urls[0] if all_urls else ""

    if not main_url:
        main_url = (
            data.get("product_photo")
            or data.get("main_image")
            or data.get("image")
            or ""
        )
        if main_url and main_url not in all_urls:
            all_urls.insert(0, main_url)

    return main_url, all_urls


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