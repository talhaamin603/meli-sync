from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.database import get_session
from app.models import SyncHistory, Setting, Product
from app.services.scheduler import run_daily_sync, run_amazon_sync, reschedule_amazon_sync, reschedule_meli_sync

router = APIRouter(prefix="/api/sync", tags=["sync"])

UNIT_SECONDS = {
    "seconds": 1,
    "minutes": 60,
    "hours": 3600,
    "days": 86400,
    "weeks": 604800,
}
MIN_INTERVAL_SECONDS = 60  # never allow less than 1 minute


class SyncSettingsBody(BaseModel):
    amazon_value: int
    amazon_unit: str
    meli_value: int
    meli_unit: str


def _get_setting(session: Session, key: str, default: str) -> str:
    row = session.exec(select(Setting).where(Setting.key == key)).first()
    return row.value if row else default


def _upsert_setting(session: Session, key: str, value: str):
    row = session.exec(select(Setting).where(Setting.key == key)).first()
    if row:
        row.value = value
        session.add(row)
    else:
        session.add(Setting(key=key, value=value))


@router.get("/settings")
def get_sync_settings(session: Session = Depends(get_session)):
    product_count = len(session.exec(
        select(Product).where(Product.deleted_at == None)  # noqa: E711
    ).all())

    return {
        "amazon": {
            "value": int(_get_setting(session, "amazon_sync_value", "24")),
            "unit": _get_setting(session, "amazon_sync_unit", "hours"),
        },
        "meli": {
            "value": int(_get_setting(session, "meli_sync_value", "24")),
            "unit": _get_setting(session, "meli_sync_unit", "hours"),
        },
        "product_count": product_count,
    }


@router.post("/settings")
def save_sync_settings(body: SyncSettingsBody, session: Session = Depends(get_session)):
    if body.amazon_unit not in UNIT_SECONDS:
        raise HTTPException(status_code=400, detail=f"Invalid unit: {body.amazon_unit}")
    if body.meli_unit not in UNIT_SECONDS:
        raise HTTPException(status_code=400, detail=f"Invalid unit: {body.meli_unit}")
    if body.amazon_value < 1 or body.meli_value < 1:
        raise HTTPException(status_code=400, detail="Value must be at least 1")

    amazon_secs = body.amazon_value * UNIT_SECONDS[body.amazon_unit]
    meli_secs = body.meli_value * UNIT_SECONDS[body.meli_unit]

    if amazon_secs < MIN_INTERVAL_SECONDS:
        raise HTTPException(status_code=400, detail=f"Amazon sync interval must be at least 60 seconds (got {amazon_secs}s)")
    if meli_secs < MIN_INTERVAL_SECONDS:
        raise HTTPException(status_code=400, detail=f"ML sync interval must be at least 60 seconds (got {meli_secs}s)")

    _upsert_setting(session, "amazon_sync_value", str(body.amazon_value))
    _upsert_setting(session, "amazon_sync_unit", body.amazon_unit)
    _upsert_setting(session, "meli_sync_value", str(body.meli_value))
    _upsert_setting(session, "meli_sync_unit", body.meli_unit)
    session.commit()

    reschedule_amazon_sync(amazon_secs)
    reschedule_meli_sync(meli_secs)

    return {
        "ok": True,
        "amazon_seconds": amazon_secs,
        "meli_seconds": meli_secs,
    }


@router.post("/amazon")
def trigger_amazon_sync():
    """Re-fetch Amazon prices and ratings for all products now."""
    return run_amazon_sync()


@router.post("/product/{product_id}")
def sync_single_product(product_id: int, session: Session = Depends(get_session)):
    """
    Full sync for one product:
      1. Re-fetch latest data from Amazon.
      2. Update DB fields (price, rating, total_ratings, is_prime).
      3. If price changed AND product is published on ML, push new price to ML.
    Returns a human-readable list of what changed.
    """
    from app.services.amazon import fetch_product_for_sync, is_configured
    from app.services.pricing import price_product_for_meli
    from app.services.mercadolibre import update_listing_price_stock
    from app.models import AuditLog
    from datetime import datetime

    if not is_configured():
        raise HTTPException(status_code=503, detail="SCRAPEDO_TOKEN not configured")

    product = session.get(Product, product_id)
    if not product or product.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Product not found")
    if not product.asin:
        raise HTTPException(status_code=400, detail="Product has no ASIN")

    try:
        data = fetch_product_for_sync(product.asin)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Amazon fetch failed: {e}")

    changed = []
    price_changed = False

    new_price = data["price"]
    if new_price > 0 and round(new_price, 2) != round(product.amazon_price_usd, 2):
        changed.append(f"Amazon price: ${product.amazon_price_usd:.2f} → ${new_price:.2f}")
        product.amazon_price_usd = new_price
        price_changed = True
        try:
            product.converted_price_cop = float(
                price_product_for_meli(new_price, session).get("final_cop", 0)
            )
        except Exception:
            pass

    if round(data["rating"], 1) != round(product.rating, 1):
        changed.append(f"Rating: {product.rating} → {data['rating']}")
        product.rating = data["rating"]

    if data["total_ratings"] != product.total_ratings:
        changed.append(f"Reviews: {product.total_ratings:,} → {data['total_ratings']:,}")
        product.total_ratings = data["total_ratings"]

    if data["is_prime"] != product.is_prime:
        changed.append(f"Prime: {product.is_prime} → {data['is_prime']}")
        product.is_prime = data["is_prime"]

    # Push updated price to Mercado Libre if price changed and listing exists
    ml_updated = False
    ml_error = None
    if price_changed and product.status == "published" and product.meli_item_id:
        try:
            result = update_listing_price_stock(
                product.meli_item_id, int(product.converted_price_cop), product.stock, session
            )
            if result["ok"]:
                ml_updated = True
                cop_fmt = f"{int(product.converted_price_cop):,}"
                changed.append(f"Mercado Libre price updated to ${new_price:.2f} (COP {cop_fmt})")
            else:
                ml_error = result.get("error", "Unknown ML error")
        except Exception as e:
            ml_error = str(e)

    product.last_synced_at = datetime.utcnow()
    session.add(AuditLog(
        action="sync_single",
        asin=product.asin,
        detail="; ".join(changed) if changed else "no changes",
    ))
    session.commit()
    session.refresh(product)

    return {
        "ok": True,
        "changed": changed,
        "ml_updated": ml_updated,
        "ml_error": ml_error,
        "product": {
            "id": product.id,
            "asin": product.asin,
            "amazon_price_usd": product.amazon_price_usd,
            "converted_price_cop": product.converted_price_cop,
            "rating": product.rating,
            "total_ratings": product.total_ratings,
            "is_prime": product.is_prime,
        },
    }


@router.post("/run")
def trigger_meli_sync():
    """Push updated COP prices to Mercado Libre for all published products now."""
    return run_daily_sync()


@router.get("/history")
def get_history(session: Session = Depends(get_session)):
    rows = session.exec(
        select(SyncHistory).order_by(SyncHistory.started_at.desc()).limit(50)
    ).all()
    return rows
