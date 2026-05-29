"""Blacklist endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from pydantic import BaseModel

from app.database import get_session
from app.models import BlacklistRule

router = APIRouter(tags=["blacklist"])


class BlacklistTermRequest(BaseModel):
    rule_type: str = "keyword"
    value: str


@router.get("/blacklist", response_model=List[dict])
def list_blacklist(session: Session = Depends(get_session)):
    """Return all blacklist rules."""
    rules = session.exec(select(BlacklistRule)).all()
    return [
        {
            "id": r.id,
            "rule_type": r.rule_type,
            "value": r.value,
            "created_at": r.created_at.isoformat(),
        }
        for r in rules
    ]


@router.post("/blacklist", response_model=dict, status_code=status.HTTP_201_CREATED)
def add_blacklist_term(
    body: BlacklistTermRequest,
    session: Session = Depends(get_session),
):
    """Add a new blacklist rule."""
    value_lower = body.value.strip().lower()
    if not value_lower:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Blacklist term value must not be empty.",
        )

    existing = session.exec(
        select(BlacklistRule).where(BlacklistRule.value == value_lower)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Blacklist term '{value_lower}' already exists.",
        )

    rule = BlacklistRule(rule_type=body.rule_type, value=value_lower)
    session.add(rule)
    session.commit()
    session.refresh(rule)

    return {
        "id": rule.id,
        "rule_type": rule.rule_type,
        "value": rule.value,
        "created_at": rule.created_at.isoformat(),
    }


@router.delete("/blacklist/{rule_id}", status_code=status.HTTP_200_OK)
def delete_blacklist_term(
    rule_id: int,
    session: Session = Depends(get_session),
):
    """Delete a blacklist rule by ID."""
    rule = session.get(BlacklistRule, rule_id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Blacklist rule with id {rule_id} not found.",
        )
    session.delete(rule)
    session.commit()
    return {"deleted": True, "id": rule_id}
