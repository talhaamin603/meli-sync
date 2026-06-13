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
)

router = APIRouter(prefix="/api/meli", tags=["mercadolibre"])


@router.get("/auth-url")
def auth_url():
    return {"url": build_authorize_url()}


@router.get("/callback")
def callback(code: str = Query(...), session: Session = Depends(get_session)):
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
    return publish_product(product_id, session)


@router.post("/publish-all")
def publish_all(
    limit: int = Query(50, ge=1, le=200),
    session: Session = Depends(get_session),
):
    return publish_all_pending(session, limit=limit)


@router.get("/preview-price")
def preview_price(
    amazon_usd: float = Query(..., gt=0),
    session: Session = Depends(get_session),
):
    return price_product_for_meli(amazon_usd, session)


@router.get("/exchange-rate")
def exchange_rate(session: Session = Depends(get_session)):
    return {
        "usd_to_cop": get_usd_to_cop(session),
        "current_shipping_usd": get_shipping_usd(session),
        "current_margin_pct": get_margin_pct(session),
    }
