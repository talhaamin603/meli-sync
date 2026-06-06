"""
app/routers/meli.py
HTTP endpoints for Mercado Libre OAuth and publishing.

Endpoints:
  GET  /api/meli/auth-url        -> returns the URL the client clicks
  GET  /api/meli/callback        -> OAuth redirect target (catches ?code=)
  GET  /api/meli/status          -> are we connected? token expires when?
  POST /api/meli/publish/{id}    -> publish one product
  POST /api/meli/publish-all     -> publish all pending products
  GET  /api/meli/preview-price   -> preview the price calc for a USD amount
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from app.database import get_session
from app.models import MeliToken
from app.services.mercadolibre import (
    build_authorize_url, exchange_code_for_token, get_valid_access_token,
)
from app.services.publisher import publish_product, publish_all_pending
from app.services.pricing import (
    price_product_for_meli, get_usd_to_cop, get_shipping_usd, get_margin_pct,
    calculate_final_cop,
)

router = APIRouter(prefix="/api/meli", tags=["mercadolibre"])


@router.get("/auth-url")
def auth_url():
    """The URL the client clicks (from his Colombia browser) to authorize."""
    return {"url": build_authorize_url()}


@router.get("/callback")
def callback(code: str = Query(...), session: Session = Depends(get_session)):
    """ML redirects here after the client clicks Allow."""
    try:
        result = exchange_code_for_token(code, session)
        return {
            "status": "ok",
            "message": "Mercado Libre is now connected. You can close this tab.",
            **result,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth failed: {e}")


@router.get("/status")
def status(session: Session = Depends(get_session)):
    """Tells the dashboard whether ML is connected and the token's health."""
    token = session.exec(select(MeliToken)).first()
    if not token:
        return {"connected": False, "message": "No ML token yet. Authorize the app."}
    try:
        get_valid_access_token(session)  # forces refresh if needed
        return {
            "connected": True,
            "expires_at": token.expires_at.isoformat(),
        }
    except Exception as e:
        return {"connected": False, "message": str(e)}


@router.post("/publish/{product_id}")
def publish_one(product_id: int, session: Session = Depends(get_session)):
    """Publish a single product (used by a 'Publish' button in the dashboard)."""
    return publish_product(product_id, session)


@router.post("/publish-all")
def publish_all(
    limit: int = Query(50, ge=1, le=200),
    session: Session = Depends(get_session),
):
    """Publish all pending products. Defaults to 50 at a time (safety cap)."""
    return publish_all_pending(session, limit=limit)


@router.get("/preview-price")
def preview_price(
    amazon_usd: float = Query(..., gt=0),
    session: Session = Depends(get_session),
):
    """Show the full pricing breakdown for a given Amazon USD price.
    Useful for testing the formula from the dashboard before publishing."""
    return price_product_for_meli(amazon_usd, session)


@router.get("/exchange-rate")
def exchange_rate(session: Session = Depends(get_session)):
    """Current USD->COP rate the system is using."""
    return {
        "usd_to_cop": get_usd_to_cop(session),
        "current_shipping_usd": get_shipping_usd(session),
        "current_margin_pct": get_margin_pct(session),
    }