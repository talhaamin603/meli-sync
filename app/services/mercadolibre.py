"""
app/services/mercadolibre.py
Talks to the Mercado Libre Colombia API.

This module handles three jobs:
  1. OAuth (build authorization URL, exchange code for tokens, refresh).
  2. Category prediction (ask ML what category a product belongs to).
  3. Publishing (create / update / unpublish listings).

The access token lives in the meli_tokens DB table. It expires every
~6 hours but we use the refresh token to silently regenerate it, so the
client never has to log in again after the one-time authorization.
"""
import os
import time
from datetime import datetime, timedelta
import httpx
from sqlmodel import Session, select
from app.models import MeliToken


# ---------- config (from environment / .env) ----------

MELI_CLIENT_ID = os.getenv("MELI_CLIENT_ID", "")
MELI_CLIENT_SECRET = os.getenv("MELI_CLIENT_SECRET", "")
MELI_REDIRECT_URI = os.getenv(
    "MELI_REDIRECT_URI", "http://localhost:8000/api/meli/callback"
)
MELI_SITE_ID = os.getenv("MELI_SITE_ID", "MCO")  # Colombia

AUTH_BASE = "https://auth.mercadolibre.com.co"
API_BASE = "https://api.mercadolibre.com"


# ---------- OAuth ----------

def build_authorize_url() -> str:
    """
    Returns the URL the client clicks (from his browser in Colombia) to
    authorize our app. After he clicks Allow, ML redirects to our
    callback with a one-time ?code= parameter.
    """
    return (
        f"{AUTH_BASE}/authorization"
        f"?response_type=code"
        f"&client_id={MELI_CLIENT_ID}"
        f"&redirect_uri={MELI_REDIRECT_URI}"
    )


def exchange_code_for_token(code: str, session: Session) -> dict:
    """
    Trades the one-time ?code= from the OAuth callback for an
    access_token + refresh_token, and stores them in the database.
    Called once, at the very start, after the client clicks Allow.
    """
    resp = httpx.post(
        f"{API_BASE}/oauth/token",
        data={
            "grant_type": "authorization_code",
            "client_id": MELI_CLIENT_ID,
            "client_secret": MELI_CLIENT_SECRET,
            "code": code,
            "redirect_uri": MELI_REDIRECT_URI,
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    _save_token(session, data)
    return {"status": "connected", "expires_in": data.get("expires_in")}


def _save_token(session: Session, data: dict) -> None:
    """Insert or update the single row in meli_tokens."""
    existing = session.exec(select(MeliToken)).first()
    expires_at = datetime.utcnow() + timedelta(
        seconds=int(data.get("expires_in", 21600))  # default 6h
    )
    if existing:
        existing.access_token = data["access_token"]
        existing.refresh_token = data.get(
            "refresh_token", existing.refresh_token
        )
        existing.expires_at = expires_at
        existing.updated_at = datetime.utcnow()
    else:
        session.add(MeliToken(
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token", ""),
            expires_at=expires_at,
        ))
    session.commit()


def _refresh_token(session: Session, token_row: MeliToken) -> str:
    """Use the refresh_token to obtain a new access_token."""
    resp = httpx.post(
        f"{API_BASE}/oauth/token",
        data={
            "grant_type": "refresh_token",
            "client_id": MELI_CLIENT_ID,
            "client_secret": MELI_CLIENT_SECRET,
            "refresh_token": token_row.refresh_token,
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    _save_token(session, data)
    return data["access_token"]


def get_valid_access_token(session: Session) -> str:
    """
    Returns a fresh access token. Auto-refreshes if it is close to
    expiring. Raises if there is no token at all (means the client has
    not authorized the app yet).
    """
    token = session.exec(select(MeliToken)).first()
    if not token:
        raise RuntimeError(
            "No Mercado Libre token in DB. Client has not authorized the app."
        )
    # refresh if expiring in less than 10 minutes
    if datetime.utcnow() + timedelta(minutes=10) >= token.expires_at:
        return _refresh_token(session, token)
    return token.access_token


# ---------- ML API calls ----------

def _auth_headers(session: Session) -> dict:
    token = get_valid_access_token(session)
    return {"Authorization": f"Bearer {token}"}


def predict_category(title: str, session: Session) -> str | None:
    """
    Asks ML which category this product belongs to, based on title.
    Returns the ML category id (e.g. 'MCO165258') or None.
    """
    try:
        resp = httpx.get(
            f"{API_BASE}/sites/{MELI_SITE_ID}/domain_discovery/search",
            params={"q": title, "limit": 1},
            timeout=15,
        )
        resp.raise_for_status()
        results = resp.json()
        if results and len(results) > 0:
            return results[0].get("category_id")
    except Exception as e:
        print(f"[meli] category prediction failed: {e}")
    return None


def publish_listing(
    product: dict, price_cop: int, category_id: str, session: Session
) -> dict:
    """
    Creates a listing on the seller's Mercado Libre store.

    `product` should contain at minimum: title, description, image_url, stock.
    Returns {ok: bool, ml_item_id: str|None, error: str|None}.
    """
    # Build pictures list: use all_images if available, else fall back to image_url.
    # ML accepts up to 12 pictures; all must be HTTPS.
    all_images = product.get("images") or []
    if not all_images and product.get("image_url"):
        all_images = [product["image_url"]]
    pictures = [
        {"source": url}
        for url in all_images[:12]
        if url and url.startswith("https")
    ]
    if not pictures and product.get("image_url"):
        pictures = [{"source": product["image_url"]}]

    body = {
        "title": product["title"][:60],   # ML title limit
        "category_id": category_id,
        "price": int(price_cop),
        "currency_id": "COP",
        "available_quantity": int(product.get("stock", 1)),
        "buying_mode": "buy_it_now",
        "listing_type_id": "gold_special",  # standard listing tier
        "condition": "new",
        "pictures": pictures,
        "description": {
            "plain_text": (product.get("description") or product["title"])[:5000]
        },
    }

    try:
        resp = httpx.post(
            f"{API_BASE}/items",
            headers=_auth_headers(session),
            json=body,
            timeout=30,
        )
        if resp.status_code in (200, 201):
            data = resp.json()
            return {"ok": True, "ml_item_id": data.get("id"), "error": None}
        # listing rejected - return the reason for the audit log
        return {
            "ok": False, "ml_item_id": None,
            "error": f"{resp.status_code}: {resp.text[:300]}",
        }
    except Exception as e:
        return {"ok": False, "ml_item_id": None, "error": str(e)}


def update_listing_price_stock(
    ml_item_id: str, price_cop: int, stock: int, session: Session
) -> dict:
    """Update price and/or stock on an existing listing (used by daily sync)."""
    body = {"price": int(price_cop), "available_quantity": int(stock)}
    try:
        resp = httpx.put(
            f"{API_BASE}/items/{ml_item_id}",
            headers=_auth_headers(session),
            json=body,
            timeout=30,
        )
        if resp.status_code in (200, 201):
            return {"ok": True, "error": None}
        return {"ok": False, "error": f"{resp.status_code}: {resp.text[:300]}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def unpublish_listing(ml_item_id: str, session: Session) -> dict:
    """Pause a listing (used when an Amazon product goes out of stock)."""
    try:
        resp = httpx.put(
            f"{API_BASE}/items/{ml_item_id}",
            headers=_auth_headers(session),
            json={"status": "paused"},
            timeout=30,
        )
        if resp.status_code in (200, 201):
            return {"ok": True, "error": None}
        return {"ok": False, "error": f"{resp.status_code}: {resp.text[:300]}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}