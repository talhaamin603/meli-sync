"""Settings endpoints."""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List
from pydantic import BaseModel

from app.database import get_session
from app.models import Setting

router = APIRouter(tags=["settings"])

# Default settings seeded on first read if the table is empty.
DEFAULT_SETTINGS = {
    "search_query": "electronics",
    "max_products": "100",
    "min_price_usd": "0",
    "max_price_usd": "1000",
    "require_prime": "false",
    "markup_percent": "30",
    "fetch_interval_hours": "6",
}


def _ensure_defaults(session: Session):
    """Insert default settings rows if they don't exist yet."""
    for key, value in DEFAULT_SETTINGS.items():
        existing = session.exec(
            select(Setting).where(Setting.key == key)
        ).first()
        if not existing:
            session.add(Setting(key=key, value=value))
    session.commit()


class SettingsUpdateRequest(BaseModel):
    settings: dict  # {key: value, ...}


@router.get("/settings", response_model=dict)
def get_settings(session: Session = Depends(get_session)):
    """Return all settings as a flat key/value dict."""
    _ensure_defaults(session)
    rows = session.exec(select(Setting)).all()
    return {row.key: row.value for row in rows}


@router.put("/settings", response_model=dict)
def update_settings(
    body: SettingsUpdateRequest,
    session: Session = Depends(get_session),
):
    """Update one or more settings. Unknown keys are created automatically."""
    _ensure_defaults(session)
    for key, value in body.settings.items():
        row = session.exec(select(Setting).where(Setting.key == key)).first()
        if row:
            row.value = str(value)
            session.add(row)
        else:
            session.add(Setting(key=key, value=str(value)))
    session.commit()

    rows = session.exec(select(Setting)).all()
    return {row.key: row.value for row in rows}
