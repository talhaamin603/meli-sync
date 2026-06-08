# """
# app/routers/manual_products.py
# API endpoints for adding products MANUALLY (without the Amazon API).

# This gives the dashboard a way to add products one at a time, or in a
# small batch, by sending JSON. The client will use this later to add
# his own products.

# Endpoints:
#   POST /api/manual/product   -> add ONE product
#   POST /api/manual/bulk      -> add MANY products at once
# """
# from fastapi import APIRouter, Depends, HTTPException
# from sqlmodel import Session, select
# from pydantic import BaseModel
# from typing import List
# from app.database import get_session
# from app.models import Product, AuditLog
# from app.services.blacklist import BlacklistFilter

# router = APIRouter(prefix="/api/manual", tags=["manual"])


# # --- the shape of the data the dashboard must send ---
# class ProductInput(BaseModel):
#     asin: str
#     title: str
#     description: str = ""
#     image_url: str = ""
#     amazon_price_usd: float = 0.0
#     stock: int = 0
#     is_prime: bool = True


# def _build_blacklist(session: Session) -> BlacklistFilter:
#     """Load the blacklist fresh for a request."""
#     bl = BlacklistFilter()
#     bl.load_from_db(session)
#     return bl


# def _add_one(data: ProductInput, session: Session,
#              blacklist: BlacklistFilter) -> dict:
#     """Shared logic: validate, blacklist-check, and insert one product."""
#     asin = data.asin.strip()
#     title = data.title.strip()

#     if not asin or not title:
#         return {"asin": asin, "status": "error",
#                 "reason": "asin and title are required"}

#     # duplicate check
#     existing = session.exec(
#         select(Product).where(Product.asin == asin)
#     ).first()
#     if existing:
#         return {"asin": asin, "status": "skipped",
#                 "reason": "product already exists"}

#     # Prime check
#     if not data.is_prime:
#         return {"asin": asin, "status": "skipped",
#                 "reason": "not a Prime product"}

#     # blacklist check
#     result = blacklist.check(title)
#     if result["blocked"]:
#         product = Product(
#             asin=asin, title=title, description=data.description,
#             image_url=data.image_url,
#             amazon_price_usd=data.amazon_price_usd,
#             stock=data.stock, is_prime=data.is_prime,
#             status="blocked", block_reason=result["reason"],
#         )
#         session.add(product)
#         return {"asin": asin, "status": "blocked",
#                 "reason": result["reason"]}

#     # all good - add it
#     product = Product(
#         asin=asin, title=title, description=data.description,
#         image_url=data.image_url,
#         amazon_price_usd=data.amazon_price_usd,
#         stock=data.stock, is_prime=data.is_prime,
#         status="pending",
#     )
#     session.add(product)
#     session.add(AuditLog(
#         action="manual_entry", asin=asin,
#         detail=f"Manually added: {title[:50]}",
#     ))
#     return {"asin": asin, "status": "added",
#             "reason": "ready to publish"}


# @router.post("/product")
# def add_product(data: ProductInput,
#                 session: Session = Depends(get_session)):
#     """Add ONE product manually."""
#     blacklist = _build_blacklist(session)
#     result = _add_one(data, session, blacklist)
#     session.commit()
#     if result["status"] == "error":
#         raise HTTPException(status_code=400, detail=result["reason"])
#     return result


# @router.post("/bulk")
# def add_products_bulk(items: List[ProductInput],
#                       session: Session = Depends(get_session)):
#     """Add MANY products at once. Send a JSON array of products."""
#     blacklist = _build_blacklist(session)
#     results = []
#     for item in items:
#         results.append(_add_one(item, session, blacklist))
#     session.commit()

#     # build a summary
#     summary = {
#         "total": len(results),
#         "added": sum(1 for r in results if r["status"] == "added"),
#         "blocked": sum(1 for r in results if r["status"] == "blocked"),
#         "skipped": sum(1 for r in results if r["status"] == "skipped"),
#         "errors": sum(1 for r in results if r["status"] == "error"),
#     }
#     return {"summary": summary, "results": results}






"""
app/routers/manual_products.py
API endpoints for adding products MANUALLY (without the Amazon API).

This gives the dashboard a way to add products one at a time, or in a
small batch, by sending JSON. The client will use this later to add
his own products.

Endpoints:
  POST /api/manual/product   -> add ONE product
  POST /api/manual/bulk      -> add MANY products at once
  
  GET    /api/products       -> list all products
  GET    /api/products/{asin}-> get single product
  GET    /api/blacklist      -> list blacklist terms
  POST   /api/blacklist      -> add blacklist term
  DELETE /api/blacklist/{id} -> delete blacklist term
  GET    /api/settings       -> get settings
  PUT    /api/settings       -> update settings
  GET    /api/import/stats   -> get import statistics
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.database import get_session
from app.models import Product, AuditLog, BlacklistRule, Setting
from app.services.blacklist import BlacklistFilter
from app.services.pricing import price_product_for_meli


def _calc_cop(usd: float, session: Session) -> float:
    try:
        return float(price_product_for_meli(usd, session).get("final_cop", 0))
    except Exception as e:
        print(f"[manual] COP calc failed: {e}")
        return 0.0

router = APIRouter(prefix="/api", tags=["manual"])


# --- the shape of the data the dashboard must send ---
class ProductInput(BaseModel):
    asin: str
    title: str
    description: str = ""
    image_url: str = ""
    images: List[str] = []
    amazon_price_usd: float = 0.0
    stock: int = 0
    is_prime: bool = True


class BlacklistInput(BaseModel):
    rule_type: str = "keyword"
    value: str


class SettingsInput(BaseModel):
    safety_margin: float = 10.0
    profit_markup: float = 15.0
    sync_hours: int = 24


class ProductUpdateInput(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    amazon_price_usd: Optional[float] = None
    stock: Optional[int] = None
    initial_stock: Optional[int] = None
    times_ordered: Optional[int] = None


def _build_blacklist(session: Session) -> BlacklistFilter:
    """Load the blacklist fresh for a request."""
    bl = BlacklistFilter()
    bl.load_from_db(session)
    return bl


def _add_one(data: ProductInput, session: Session,
             blacklist: BlacklistFilter) -> dict:
    """Shared logic: validate, blacklist-check, and insert one product."""
    asin = data.asin.strip()
    title = data.title.strip()

    if not asin or not title:
        return {"asin": asin, "status": "error",
                "reason": "asin and title are required"}

    # duplicate check
    existing = session.exec(
        select(Product).where(Product.asin == asin)
    ).first()
    if existing:
        return {"asin": asin, "status": "skipped",
                "reason": "product already exists"}

    # Prime check
    if not data.is_prime:
        return {"asin": asin, "status": "skipped",
                "reason": "not a Prime product"}

    # resolve images
    imgs = data.images or []
    primary_image = imgs[0] if imgs else data.image_url

    # blacklist check
    result = blacklist.check(title)
    cop = _calc_cop(data.amazon_price_usd, session)
    if result["blocked"]:
        product = Product(
            asin=asin, title=title, description=data.description,
            image_url=primary_image,
            images=json.dumps(imgs) if imgs else None,
            amazon_price_usd=data.amazon_price_usd,
            converted_price_cop=cop,
            stock=data.stock, is_prime=data.is_prime,
            status="blocked", block_reason=result["reason"],
        )
        session.add(product)
        return {"asin": asin, "status": "blocked",
                "reason": result["reason"]}

    # all good - add it
    product = Product(
        asin=asin, title=title, description=data.description,
        image_url=primary_image,
        images=json.dumps(imgs) if imgs else None,
        amazon_price_usd=data.amazon_price_usd,
        converted_price_cop=cop,
        stock=data.stock, is_prime=data.is_prime,
        status="pending",
    )
    session.add(product)
    session.add(AuditLog(
        action="manual_entry", asin=asin,
        detail=f"Manually added: {title[:50]}",
    ))
    return {"asin": asin, "status": "added",
            "reason": "ready to publish"}


# ============================================================
# MANUAL PRODUCT ENDPOINTS (Already existing)
# ============================================================

@router.post("/manual/product")
def add_product(data: ProductInput,
                session: Session = Depends(get_session)):
    """Add ONE product manually."""
    blacklist = _build_blacklist(session)
    result = _add_one(data, session, blacklist)
    session.commit()
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["reason"])
    return result


@router.post("/manual/bulk")
def add_products_bulk(items: List[ProductInput],
                      session: Session = Depends(get_session)):
    """Add MANY products at once. Send a JSON array of products."""
    blacklist = _build_blacklist(session)
    results = []
    for item in items:
        results.append(_add_one(item, session, blacklist))
    session.commit()

    # build a summary
    summary = {
        "total": len(results),
        "added": sum(1 for r in results if r["status"] == "added"),
        "blocked": sum(1 for r in results if r["status"] == "blocked"),
        "skipped": sum(1 for r in results if r["status"] == "skipped"),
        "errors": sum(1 for r in results if r["status"] == "error"),
    }
    return {"summary": summary, "results": results}


# ============================================================
# PRODUCT LISTING ENDPOINTS (NEW)
# ============================================================

@router.get("/products")
def get_products(session: Session = Depends(get_session)):
    """Get all active (non-deleted) products."""
    products = session.exec(
        select(Product)
        .where(Product.deleted_at == None)
        .order_by(Product.created_at.desc())
    ).all()
    return {"total": len(products), "products": products}


@router.post("/admin/recalculate-prices")
def recalculate_prices(session: Session = Depends(get_session)):
    """Recalculate converted_price_cop for all products that have 0 or null COP price."""
    products = session.exec(
        select(Product).where(Product.amazon_price_usd > 0)
    ).all()
    updated = 0
    for p in products:
        if not p.converted_price_cop or p.converted_price_cop == 0:
            p.converted_price_cop = _calc_cop(p.amazon_price_usd, session)
            session.add(p)
            updated += 1
    session.commit()
    return {"updated": updated, "total": len(products)}


@router.get("/products/{asin}")
def get_product(asin: str, session: Session = Depends(get_session)):
    """Get single product by ASIN"""
    product = session.exec(
        select(Product).where(Product.asin == asin)
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/products/{product_id}")
def update_product(product_id: int, data: ProductUpdateInput, session: Session = Depends(get_session)):
    """Update editable fields of a product."""
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if data.title is not None:
        product.title = data.title
    if data.description is not None:
        product.description = data.description
    if data.images is not None:
        product.images = json.dumps(data.images)
        if data.images:
            product.image_url = data.images[0]
    if data.image_url is not None:
        product.image_url = data.image_url
    if data.stock is not None:
        product.stock = data.stock
    if data.initial_stock is not None:
        product.initial_stock = data.initial_stock
    if data.times_ordered is not None:
        product.times_ordered = data.times_ordered
    if data.amazon_price_usd is not None:
        product.amazon_price_usd = data.amazon_price_usd
        product.converted_price_cop = _calc_cop(data.amazon_price_usd, session)
    product.updated_at = datetime.utcnow()
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@router.delete("/products/{product_id}")
def delete_product(product_id: int, session: Session = Depends(get_session)):
    """Soft-delete: moves product to recycle bin for 7 days."""
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.deleted_at = datetime.utcnow()
    session.add(product)
    session.commit()
    return {"message": "Moved to recycle bin", "id": product_id}


# ============================================================
# RECYCLE BIN ENDPOINTS
# ============================================================

RECYCLE_BIN_DAYS = 7

@router.get("/recycle-bin")
def get_recycle_bin(session: Session = Depends(get_session)):
    """List soft-deleted products. Auto-purges items older than 7 days."""
    cutoff = datetime.utcnow() - __import__("datetime").timedelta(days=RECYCLE_BIN_DAYS)
    # Auto-purge expired items
    expired = session.exec(
        select(Product).where(Product.deleted_at != None).where(Product.deleted_at < cutoff)
    ).all()
    for p in expired:
        session.delete(p)
    if expired:
        session.commit()

    items = session.exec(
        select(Product).where(Product.deleted_at != None).order_by(Product.deleted_at.desc())
    ).all()
    return {"total": len(items), "products": items}


@router.post("/recycle-bin/restore-all")
def restore_all(session: Session = Depends(get_session)):
    """Restore every product currently in the recycle bin."""
    items = session.exec(select(Product).where(Product.deleted_at != None)).all()
    for p in items:
        p.deleted_at = None
        session.add(p)
    session.commit()
    return {"restored": len(items)}


@router.delete("/recycle-bin")
def empty_recycle_bin(session: Session = Depends(get_session)):
    """Permanently delete every product in the recycle bin."""
    items = session.exec(select(Product).where(Product.deleted_at != None)).all()
    count = len(items)
    for p in items:
        session.delete(p)
    session.commit()
    return {"deleted": count}


@router.post("/recycle-bin/{product_id}/restore")
def restore_product(product_id: int, session: Session = Depends(get_session)):
    """Restore one product from the recycle bin."""
    product = session.get(Product, product_id)
    if not product or product.deleted_at is None:
        raise HTTPException(status_code=404, detail="Not found in recycle bin")
    product.deleted_at = None
    session.add(product)
    session.commit()
    return {"message": "Restored", "id": product_id}


@router.delete("/recycle-bin/{product_id}")
def permanent_delete(product_id: int, session: Session = Depends(get_session)):
    """Permanently delete one product from the recycle bin."""
    product = session.get(Product, product_id)
    if not product or product.deleted_at is None:
        raise HTTPException(status_code=404, detail="Not found in recycle bin")
    session.delete(product)
    session.commit()
    return {"message": "Permanently deleted", "id": product_id}


@router.get("/import/stats")
def get_import_stats(session: Session = Depends(get_session)):
    """Get import statistics"""
    total = session.exec(select(Product)).count()
    pending = session.exec(
        select(Product).where(Product.status == "pending")
    ).count()
    blocked = session.exec(
        select(Product).where(Product.status == "blocked")
    ).count()
    published = session.exec(
        select(Product).where(Product.status == "published")
    ).count()
    return {
        "total": total,
        "pending": pending,
        "blocked": blocked,
        "published": published
    }


# ============================================================
# BLACKLIST MANAGEMENT ENDPOINTS (NEW)
# ============================================================

@router.get("/blacklist")
def get_blacklist(session: Session = Depends(get_session)):
    """Get all blacklist terms"""
    rules = session.exec(select(BlacklistRule)).all()
    return {"total": len(rules), "rules": rules}


@router.post("/blacklist")
def add_blacklist_term(data: BlacklistInput,
                       session: Session = Depends(get_session)):
    """Add a blacklist term"""
    if not data.value.strip():
        raise HTTPException(status_code=400, detail="Term value is required")
    
    existing = session.exec(
        select(BlacklistRule).where(BlacklistRule.value == data.value)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Term already exists")
    
    new_rule = BlacklistRule(rule_type=data.rule_type, value=data.value)
    session.add(new_rule)
    session.commit()
    session.refresh(new_rule)
    return new_rule


@router.delete("/blacklist/{rule_id}")
def delete_blacklist_term(rule_id: int,
                          session: Session = Depends(get_session)):
    """Delete a blacklist term"""
    rule = session.get(BlacklistRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Term not found")
    session.delete(rule)
    session.commit()
    return {"message": "Deleted", "id": rule_id}


# ============================================================
# SETTINGS ENDPOINTS (NEW)
# ============================================================

@router.get("/settings")
def get_settings(session: Session = Depends(get_session)):
    """Get all settings"""
    settings = session.exec(select(Setting)).all()
    return {s.key: float(s.value) if s.value.replace('.', '').isdigit() else s.value 
            for s in settings}


@router.put("/settings")
def update_settings(data: SettingsInput,
                    session: Session = Depends(get_session)):
    """Update settings"""
    settings_data = {
        "safety_margin": str(data.safety_margin),
        "profit_markup": str(data.profit_markup),
        "sync_hours": str(data.sync_hours)
    }
    
    for key, value in settings_data.items():
        existing = session.exec(
            select(Setting).where(Setting.key == key)
        ).first()
        if existing:
            existing.value = value
        else:
            session.add(Setting(key=key, value=value))
    
    session.commit()
    return {"message": "Settings saved"}