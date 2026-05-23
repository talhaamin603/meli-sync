"""
Amazon Reader.
Talks to the RapidAPI 'Real-Time Amazon Data' service to fetch products.
This is the ONLY file that knows how to call the Amazon data API.
"""
import time
import httpx
from app.config import settings


class AmazonReader:
    def __init__(self):
        self.base_url = f"https://{settings.RAPIDAPI_HOST}"
        self.headers = {
            "x-rapidapi-key": settings.RAPIDAPI_KEY,
            "x-rapidapi-host": settings.RAPIDAPI_HOST,
        }

    def _get(self, path: str, params: dict) -> dict:
        """Internal helper: makes one GET request with basic retry."""
        url = f"{self.base_url}{path}"
        for attempt in range(3):  # try up to 3 times
            try:
                resp = httpx.get(
                    url, headers=self.headers, params=params, timeout=30
                )
                # 429 means "too many requests" - wait and retry
                if resp.status_code == 429:
                    wait = 5 * (attempt + 1)
                    print(f"  Rate limited. Waiting {wait}s...")
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPStatusError as e:
                print(f"  HTTP error: {e.response.status_code}")
                if attempt == 2:
                    raise
                time.sleep(3)
            except httpx.RequestError as e:
                print(f"  Network error: {e}")
                if attempt == 2:
                    raise
                time.sleep(3)
        return {}

    def get_product(self, asin: str, country: str = "US") -> dict:
        """Fetch full details for one product by its ASIN."""
        data = self._get(
            "/product-details", {"asin": asin, "country": country}
        )
        return self._normalize(data.get("data", {}))

    def search_products(self, query: str, page: int = 1,
                        country: str = "US") -> list:
        """Search Amazon by keyword. Returns a list of normalized products."""
        data = self._get(
            "/search",
            {"query": query, "page": str(page), "country": country},
        )
        results = data.get("data", {}).get("products", [])
        return [self._normalize(p) for p in results]

    def _normalize(self, raw: dict) -> dict:
        """
        Convert the API's messy response into a clean, predictable shape.
        ALWAYS use this so the rest of the code never deals with raw API data.
        """
        # price may come as "$24.99" - strip it to a number
        price_raw = (
            raw.get("product_price")
            or raw.get("price")
            or ""
        )
        price = 0.0
        if price_raw:
            cleaned = (
                str(price_raw).replace("$", "").replace(",", "").strip()
            )
            try:
                price = float(cleaned)
            except ValueError:
                price = 0.0

        return {
            "asin": raw.get("asin", ""),
            "title": raw.get("product_title") or raw.get("title") or "",
            "description": (
                raw.get("product_description")
                or raw.get("about_product")
                or ""
            ),
            "image_url": raw.get("product_photo")
            or raw.get("product_main_image_url")
            or "",
            "price_usd": price,
            "is_prime": bool(
                raw.get("is_prime") or raw.get("product_prime") or False
            ),
            "stock": raw.get("product_num_offers", 0) or 0,
            "raw": raw,  # keep the original for debugging
        }