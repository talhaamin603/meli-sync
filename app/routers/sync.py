"""
app/routers/sync.py
Sync endpoints - lets the dashboard trigger a manual resync without
waiting for the daily cron job.

  POST /api/sync/run       -> kick off a sync now
  GET  /api/sync/history   -> last 20 sync runs (for dashboard display)
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.database import get_session
from app.models import SyncHistory
from app.services.scheduler import run_daily_sync


router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("/run")
def trigger_sync_now():
    """Run the daily sync immediately (e.g. button in dashboard)."""
    return run_daily_sync()


@router.get("/history")
def get_history(session: Session = Depends(get_session)):
    rows = session.exec(
        select(SyncHistory).order_by(SyncHistory.started_at.desc()).limit(20)
    ).all()
    return rows