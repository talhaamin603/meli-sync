from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from sqlmodel import Session, select
from app.database import engine
from app.models import Product, SyncHistory, AuditLog
from app.services.pricing import price_product_for_meli
from app.services.mercadolibre import update_listing_price_stock

_scheduler = None  # singleton — set once in start_scheduler()


def reschedule_amazon_sync(seconds: int):
    if _scheduler and _scheduler.running:
        _scheduler.reschedule_job("amazon_sync", trigger="interval", seconds=seconds)
        print(f"[scheduler] amazon sync rescheduled: every {seconds}s")


def reschedule_meli_sync(seconds: int):
    if _scheduler and _scheduler.running:
        _scheduler.reschedule_job("ml_sync", trigger="interval", seconds=seconds)
        print(f"[scheduler] ml sync rescheduled: every {seconds}s")


def run_amazon_sync():
    """Re-fetch price, rating and prime status from Amazon for every active product."""
    from app.services.amazon import fetch_product_for_sync, is_configured
    if not is_configured():
        print("[amazon-sync] SCRAPEDO_TOKEN not configured — skipping")
        return {"updated": 0, "failed": 0, "skipped": 0}

    print(f"[amazon-sync] starting at {datetime.utcnow().isoformat()}")
    history = SyncHistory(sync_type="amazon")
    updated = failed = skipped = 0

    with Session(engine) as session:
        session.add(history)
        session.commit()
        session.refresh(history)

        products = session.exec(
            select(Product).where(Product.deleted_at == None)  # noqa: E711
        ).all()

        for p in products:
            if not p.asin:
                skipped += 1
                continue
            try:
                data = fetch_product_for_sync(p.asin)
            except Exception as e:
                failed += 1
                session.add(AuditLog(
                    action="amazon_sync_failed", asin=p.asin, detail=str(e)[:300],
                ))
                continue

            changed = []
            new_price = data["price"]
            if new_price > 0 and round(new_price, 2) != round(p.amazon_price_usd, 2):
                changed.append(f"price ${p.amazon_price_usd:.2f}→${new_price:.2f}")
                p.amazon_price_usd = new_price
                try:
                    p.converted_price_cop = float(
                        price_product_for_meli(new_price, session).get("final_cop", 0)
                    )
                except Exception:
                    pass

            if round(data["rating"], 1) != round(p.rating, 1):
                changed.append(f"rating {p.rating}→{data['rating']}")
                p.rating = data["rating"]

            if data["total_ratings"] != p.total_ratings:
                changed.append(f"ratings_count {p.total_ratings}→{data['total_ratings']}")
                p.total_ratings = data["total_ratings"]

            if data["is_prime"] != p.is_prime:
                changed.append(f"prime {p.is_prime}→{data['is_prime']}")
                p.is_prime = data["is_prime"]

            p.last_synced_at = datetime.utcnow()
            if changed:
                session.add(AuditLog(
                    action="amazon_sync_updated", asin=p.asin,
                    detail="; ".join(changed),
                ))
                updated += 1
            else:
                skipped += 1

        history.finished_at = datetime.utcnow()
        history.products_updated = updated
        history.products_failed = failed
        history.notes = f"checked {len(products)} products; {skipped} unchanged"
        session.commit()

    print(f"[amazon-sync] done: updated={updated} failed={failed} unchanged={skipped}")
    return {"updated": updated, "failed": failed, "skipped": skipped}


def run_daily_sync():
    """Re-calculate COP prices and push updates to Mercado Libre for published products."""
    print(f"[ml-sync] starting at {datetime.utcnow().isoformat()}")
    history = SyncHistory(sync_type="meli")
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

                if new_cop != p.converted_price_cop or p.last_synced_at is None:
                    if not p.meli_item_id:
                        continue
                    result = update_listing_price_stock(
                        p.meli_item_id, new_cop, p.stock, session
                    )
                    if result["ok"]:
                        p.converted_price_cop = new_cop
                        p.last_synced_at = datetime.utcnow()
                        updated += 1
                        session.add(AuditLog(
                            action="ml_sync_updated", asin=p.asin,
                            detail=f"new_cop={new_cop}",
                        ))
                    else:
                        failed += 1
                        session.add(AuditLog(
                            action="ml_sync_failed", asin=p.asin,
                            detail=(result["error"] or "unknown")[:300],
                        ))
            except Exception as e:
                failed += 1
                session.add(AuditLog(
                    action="ml_sync_error", asin=p.asin, detail=str(e)[:300],
                ))

        history.finished_at = datetime.utcnow()
        history.products_updated = updated
        history.products_failed = failed
        history.notes = f"checked {len(products)} published products"
        session.commit()

    print(f"[ml-sync] done: updated={updated} failed={failed}")
    return {"updated": updated, "failed": failed}


def start_scheduler(amazon_seconds=None, meli_seconds=None):
    """Start both background jobs. Pass seconds to use interval trigger; None for cron defaults."""
    global _scheduler
    _scheduler = BackgroundScheduler(daemon=True)

    if amazon_seconds:
        _scheduler.add_job(run_amazon_sync, "interval", seconds=amazon_seconds, id="amazon_sync")
        print(f"[scheduler] amazon sync: every {amazon_seconds}s")
    else:
        _scheduler.add_job(run_amazon_sync, "cron", hour=2, minute=0, id="amazon_sync")
        print("[scheduler] amazon sync: cron 02:00 UTC")

    if meli_seconds:
        _scheduler.add_job(run_daily_sync, "interval", seconds=meli_seconds, id="ml_sync")
        print(f"[scheduler] ml sync: every {meli_seconds}s")
    else:
        _scheduler.add_job(run_daily_sync, "cron", hour=3, minute=0, id="ml_sync")
        print("[scheduler] ml sync: cron 03:00 UTC")

    _scheduler.start()
    return _scheduler
