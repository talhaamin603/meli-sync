"""
app/services/publisher.py
Orchestrates the full publish-one-product flow.

Takes a Product row that is 'pending' in our DB and runs it through:
  1. Get current pricing (shipping + insurance + margin + USD->COP)
  2. Predict the Mercado Libre category from the title
  3. Publish to Mercado Libre
  4. Update our DB with the result and log it

This module is the bridge between Module 1 (data) and Mercado Libre.
"""
from sqlmodel import Session, select
from app.models import Product, AuditLog
from app.services.pricing import price_product_for_meli
from app.services.mercadolibre import predict_category, publish_listing


def publish_product(product_id: int, session: Session) -> dict:
    """
    Publishes a single product from our DB to Mercado Libre.
    Returns a status dict for the API/dashboard.
    """
    p = session.get(Product, product_id)
    if not p:
        return {"status": "error", "reason": f"product {product_id} not found"}
    if p.status != "pending":
        return {
            "status": "skipped",
            "reason": f"product is not pending (currently '{p.status}')",
        }

    # 1) calculate price
    pricing = price_product_for_meli(p.amazon_price_usd, session)

    # 2) predict category
    category = predict_category(p.title, session)
    if not category:
        p.status = "failed"
        p.block_reason = "category prediction returned no result"
        session.add(AuditLog(
            action="publish_failed", asin=p.asin,
            detail="no ML category found",
        ))
        session.commit()
        return {"status": "failed", "reason": "no category found"}

    # 3) publish to ML
    result = publish_listing(
        product={
            "title": p.title, "description": p.description,
            "image_url": p.image_url, "stock": p.stock,
        },
        price_cop=pricing["final_cop"],
        category_id=category,
        session=session,
    )

    # 4) update our DB
    if result["ok"]:
        p.status = "published"
        p.meli_item_id = result["ml_item_id"]
        p.meli_category = category
        p.converted_price_cop = pricing["final_cop"]
        session.add(AuditLog(
            action="published", asin=p.asin,
            detail=(
                f"ml_id={result['ml_item_id']} "
                f"price_cop={pricing['final_cop']} "
                f"category={category}"
            ),
        ))
        session.commit()
        return {
            "status": "published", "ml_item_id": result["ml_item_id"],
            "price_cop": pricing["final_cop"], "category": category,
            "pricing_breakdown": pricing,
        }
    else:
        p.status = "failed"
        p.block_reason = result["error"][:500] if result["error"] else "unknown"
        session.add(AuditLog(
            action="publish_failed", asin=p.asin,
            detail=result["error"][:500] if result["error"] else "unknown",
        ))
        session.commit()
        return {"status": "failed", "reason": result["error"]}


def publish_all_pending(session: Session, limit: int = 50) -> dict:
    """Publish all pending products up to a limit (default 50)."""
    pending = session.exec(
        select(Product).where(Product.status == "pending").limit(limit)
    ).all()
    results = {"published": 0, "failed": 0, "details": []}
    for p in pending:
        r = publish_product(p.id, session)
        results["details"].append({"asin": p.asin, **r})
        if r["status"] == "published":
            results["published"] += 1
        else:
            results["failed"] += 1
    return results