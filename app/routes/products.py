"""Product endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database import get_session
from app.models import Product, BlacklistRule, AuditLog
from app.services.amazon import AmazonReader
from app.services.blacklist import BlacklistFilter

router = APIRouter(tags=["products"])


class ManualProductRequest(BaseModel):
    asin: str
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    amazon_price_usd: float = 0.0
    stock: int = 0
    is_prime: bool = False


@router.get("/products", response_model=List[dict])
def list_products(session: Session = Depends(get_session)):
    """Return all products in the database."""
    products = session.exec(select(Product)).all()
    return [
        {
            "id": p.id,
            "asin": p.asin,
            "title": p.title,
            "description": p.description,
            "image_url": p.image_url,
            "amazon_price_usd": p.amazon_price_usd,
            "converted_price_cop": p.converted_price_cop,
            "stock": p.stock,
            "is_prime": p.is_prime,
            "meli_item_id": p.meli_item_id,
            "meli_category": p.meli_category,
            "status": p.status,
            "block_reason": p.block_reason,
            "created_at": p.created_at.isoformat(),
            "updated_at": p.updated_at.isoformat(),
        }
        for p in products
    ]


@router.post("/manual/product", response_model=dict, status_code=status.HTTP_201_CREATED)
def add_manual_product(
    body: ManualProductRequest,
    session: Session = Depends(get_session),
):
    """Add a product manually (without fetching from Amazon)."""
    # Check for duplicate ASIN
    existing = session.exec(
        select(Product).where(Product.asin == body.asin)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Product with ASIN '{body.asin}' already exists.",
        )

    # Run blacklist check
    bl_filter = BlacklistFilter()
    bl_filter.load_from_db(session)
    check = bl_filter.check(body.title)

    product_status = "blocked" if check["blocked"] else "pending"
    block_reason = check["reason"] if check["blocked"] else None

    product = Product(
        asin=body.asin,
        title=body.title,
        description=body.description,
        image_url=body.image_url,
        amazon_price_usd=body.amazon_price_usd,
        stock=body.stock,
        is_prime=body.is_prime,
        status=product_status,
        block_reason=block_reason,
    )
    session.add(product)

    log = AuditLog(
        action="manual_add",
        asin=body.asin,
        detail=f"Manually added. Status: {product_status}."
        + (f" Reason: {block_reason}" if block_reason else ""),
    )
    session.add(log)
    session.commit()
    session.refresh(product)

    return {
        "id": product.id,
        "asin": product.asin,
        "title": product.title,
        "status": product.status,
        "block_reason": product.block_reason,
        "created_at": product.created_at.isoformat(),
    }
