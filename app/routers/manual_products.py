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
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import List, Optional
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

    # blacklist check
    result = blacklist.check(title)
    cop = _calc_cop(data.amazon_price_usd, session)
    if result["blocked"]:
        product = Product(
            asin=asin, title=title, description=data.description,
            image_url=data.image_url,
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
        image_url=data.image_url,
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
    """Get all products"""
    products = session.exec(select(Product).order_by(Product.created_at.desc())).all()
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