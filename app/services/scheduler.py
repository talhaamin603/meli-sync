"""
app/services/scheduler.py
Daily background job: refreshes prices & stock on every PUBLISHED product.

WHAT IT DOES (once per day):
  For each product in our DB where status == 'published':
    - Recalculate price using the current USD->COP rate and current settings
    - If price changed or stock changed, push the update to Mercado Libre
    - Log to sync_history table

WHY: Amazon prices move and the COP rate moves. Without daily resync, the
client's listings drift from his cost base and he loses margin.

NOTE FOR THE CLIENT: this implementation re-syncs PRICE only. It does not
re-fetch Amazon stock (we have no Amazon API). When the client wants to
mark something out of stock, he changes it manually in the dashboard.
"""
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from sqlmodel import Session, select
from app.database import engine
from app.models import Product, SyncHistory, AuditLog
from app.services.pricing import price_product_for_meli
from app.services.mercadolibre import update_listing_price_stock


def run_daily_sync():
    """Called by the scheduler once a day. Also callable manually."""
    print(f"[sync] starting daily sync at {datetime.utcnow().isoformat()}")
    history = SyncHistory(sync_type="daily_price_stock")
    updated = failed = 0

    with Session(engine) as session:
        session.add(history)
        session.commit()
        session.refresh(history)

        products = session.exec(
            select(Product).where(Product.status == "published")
        ).all()

        for p in products:
            try:
                pricing = price_product_for_meli(p.amazon_price_usd, session)
                new_cop = pricing["final_cop"]

                # only push update if price or stock changed
                if (
                    new_cop != p.converted_price_cop
                    or p.last_synced_at is None
                ):
                    if not p.meli_item_id:
                        continue  # safety: published but no ml id, skip
                    result = update_listing_price_stock(
                        p.meli_item_id, new_cop, p.stock, session
                    )
                    if result["ok"]:
                        p.converted_price_cop = new_cop
                        p.last_synced_at = datetime.utcnow()
                        updated += 1
                        session.add(AuditLog(
                            action="daily_sync_updated", asin=p.asin,
                            detail=f"new_cop={new_cop}",
                        ))
                    else:
                        failed += 1
                        session.add(AuditLog(
                            action="daily_sync_failed", asin=p.asin,
                            detail=result["error"][:300]
                            if result["error"] else "unknown",
                        ))
            except Exception as e:
                failed += 1
                session.add(AuditLog(
                    action="daily_sync_error", asin=p.asin, detail=str(e)[:300],
                ))

        history.finished_at = datetime.utcnow()
        history.products_updated = updated
        history.products_failed = failed
        history.notes = f"checked {len(products)} published products"
        session.commit()

    print(f"[sync] done: updated={updated} failed={failed}")
    return {"updated": updated, "failed": failed}


def start_scheduler():
    """Starts the background daily job. Called once from main.py."""
    scheduler = BackgroundScheduler(daemon=True)
    # run every day at 03:00 UTC (works for any timezone since prices don't change at midnight)
    scheduler.add_job(run_daily_sync, "cron", hour=3, minute=0)
    scheduler.start()
    print("[sync] daily scheduler started (03:00 UTC)")
    return scheduler