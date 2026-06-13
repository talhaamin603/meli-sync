import json
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from app.database import get_session
from app.models import Product, AuditLog, BlacklistRule, Setting, MarginRule, Category
from app.services.blacklist import BlacklistFilter, normalize_text
from app.services.pricing import price_product_for_meli

# Set to False to disable all blacklist checks (e.g. during testing).
BLACKLIST_ENABLED = False


def _calc_cop(usd: float, session: Session) -> float:
    try:
        return float(price_product_for_meli(usd, session).get("final_cop", 0))
    except Exception as e:
        print(f"[manual] COP calc failed: {e}")
        return 0.0


router = APIRouter(prefix="/api", tags=["manual"])


class ProductInput(BaseModel):
    asin: str
    title: str
    description: str = ""
    image_url: str = ""
    images: List[str] = []
    amazon_price_usd: float = 0.0
    stock: int = 0
    is_prime: bool = True
    category_id: Optional[int] = None


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
    category_id: Optional[int] = None
    whats_in_the_box: Optional[str] = None


class MarginRuleInput(BaseModel):
    id: Optional[int] = None
    min_price: float
    max_price: float
    markup_pct: float
    sort_order: int


def _build_blacklist(session: Session) -> BlacklistFilter:
    if not BLACKLIST_ENABLED:
        # Return a filter that never blocks anything
        bl = BlacklistFilter()
        return bl  # term_count=0 → check() always returns blocked=False
    bl = BlacklistFilter()
    bl.load_from_db(session)
    return bl


def _rescan_products(session: Session, bl: BlacklistFilter) -> dict:
    products = session.exec(select(Product).where(Product.deleted_at == None)).all()
    blocked = unblocked = 0
    for p in products:
        result = bl.check_product(p.title or "", p.description or "")
        if result["blocked"]:
            if p.status != "blocked":
                p.status = "blocked"
                p.block_reason = result["reason"]
                session.add(p)
                blocked += 1
        elif p.status == "blocked" and (p.block_reason or "").startswith("matched"):
            p.status = "pending"
            p.block_reason = None
            session.add(p)
            unblocked += 1
    return {"checked": len(products), "blocked": blocked, "unblocked": unblocked}


def _add_one(data: ProductInput, session: Session, blacklist: BlacklistFilter) -> dict:
    asin = data.asin.strip()
    title = data.title.strip()

    if not asin or not title:
        return {"asin": asin, "status": "error", "reason": "asin and title are required"}

    if session.exec(select(Product).where(Product.asin == asin)).first():
        return {"asin": asin, "status": "skipped", "reason": "product already exists"}

    if not data.is_prime:
        return {"asin": asin, "status": "skipped", "reason": "not a Prime product"}

    imgs = data.images or []
    primary_image = imgs[0] if imgs else data.image_url
    result = blacklist.check_product(title, data.description)
    cop = _calc_cop(data.amazon_price_usd, session)

    if result["blocked"]:
        session.add(Product(
            asin=asin, title=title, description=data.description,
            image_url=primary_image,
            images=json.dumps(imgs) if imgs else None,
            amazon_price_usd=data.amazon_price_usd,
            converted_price_cop=cop,
            stock=data.stock, initial_stock=data.stock, is_prime=data.is_prime,
            status="blocked", block_reason=result["reason"],
        ))
        return {"asin": asin, "status": "blocked", "reason": result["reason"]}

    session.add(Product(
        asin=asin, title=title, description=data.description,
        image_url=primary_image,
        images=json.dumps(imgs) if imgs else None,
        amazon_price_usd=data.amazon_price_usd,
        converted_price_cop=cop,
        stock=data.stock, initial_stock=data.stock, is_prime=data.is_prime,
        category_id=data.category_id,
        status="pending",
    ))
    session.add(AuditLog(action="manual_entry", asin=asin, detail=f"Manually added: {title[:50]}"))
    return {"asin": asin, "status": "added", "reason": "ready to publish"}


@router.post("/manual/product")
def add_product(data: ProductInput, session: Session = Depends(get_session)):
    blacklist = _build_blacklist(session)
    result = _add_one(data, session, blacklist)
    session.commit()
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["reason"])
    return result


@router.post("/manual/bulk")
def add_products_bulk(items: List[ProductInput], session: Session = Depends(get_session)):
    blacklist = _build_blacklist(session)
    results = [_add_one(item, session, blacklist) for item in items]
    session.commit()
    return {
        "summary": {
            "total":   len(results),
            "added":   sum(1 for r in results if r["status"] == "added"),
            "blocked": sum(1 for r in results if r["status"] == "blocked"),
            "skipped": sum(1 for r in results if r["status"] == "skipped"),
            "errors":  sum(1 for r in results if r["status"] == "error"),
        },
        "results": results,
    }


@router.get("/products")
def get_products(session: Session = Depends(get_session)):
    products = session.exec(
        select(Product).where(Product.deleted_at == None).order_by(Product.created_at.desc())
    ).all()

    cats = session.exec(select(Category)).all()
    cat_map = {c.id: c for c in cats}

    def cat_path(cat_id):
        if not cat_id or cat_id not in cat_map:
            return None
        sub = cat_map[cat_id]
        if sub.parent_id and sub.parent_id in cat_map:
            return f"{cat_map[sub.parent_id].name} > {sub.name}"
        return sub.name

    result = []
    for p in products:
        d = p.model_dump()
        d["category_path"] = cat_path(p.category_id)
        result.append(d)
    return {"total": len(result), "products": result}


@router.post("/admin/recalculate-prices")
def recalculate_prices(session: Session = Depends(get_session)):
    products = session.exec(select(Product).where(Product.amazon_price_usd > 0)).all()
    for p in products:
        p.converted_price_cop = _calc_cop(p.amazon_price_usd, session)
        p.updated_at = datetime.utcnow()
        session.add(p)
    session.commit()
    return {"updated": len(products)}


@router.post("/admin/rescan-blacklist")
def rescan_blacklist(session: Session = Depends(get_session)):
    bl = _build_blacklist(session)
    stats = _rescan_products(session, bl)
    session.commit()
    if stats["blocked"] or stats["unblocked"]:
        session.add(AuditLog(
            action="blacklist_rescan", asin="",
            detail=f"rescan: {stats['blocked']} blocked, {stats['unblocked']} unblocked",
        ))
        session.commit()
    return stats


@router.get("/products/{asin}")
def get_product(asin: str, session: Session = Depends(get_session)):
    product = session.exec(select(Product).where(Product.asin == asin)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/products/{product_id}")
def update_product(product_id: int, data: ProductUpdateInput, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if data.title is not None:       product.title = data.title
    if data.description is not None: product.description = data.description
    if data.images is not None:
        product.images = json.dumps(data.images)
        if data.images:
            product.image_url = data.images[0]
    if data.image_url is not None:   product.image_url = data.image_url
    if data.stock is not None:       product.stock = data.stock
    if data.initial_stock is not None:  product.initial_stock = data.initial_stock
    if data.times_ordered is not None:  product.times_ordered = data.times_ordered
    if data.amazon_price_usd is not None:
        product.amazon_price_usd = data.amazon_price_usd
        product.converted_price_cop = _calc_cop(data.amazon_price_usd, session)
    if data.category_id is not None: product.category_id = data.category_id
    if data.whats_in_the_box is not None: product.whats_in_the_box = data.whats_in_the_box or None

    # Reject the save if title/description now contains a blacklisted word.
    # Also unblocks a product if the offending word was edited out.
    if data.title is not None or data.description is not None:
        bl = _build_blacklist(session)
        result = bl.check_product(product.title or "", product.description or "")
        if result["blocked"]:
            raise HTTPException(status_code=400, detail={"code": "blacklisted", "term": result["term"]})
        if product.status == "blocked" and (product.block_reason or "").startswith("matched"):
            product.status = "pending"
            product.block_reason = None

    product.updated_at = datetime.utcnow()
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@router.delete("/products/{product_id}")
def delete_product(product_id: int, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.deleted_at = datetime.utcnow()
    session.add(product)
    session.commit()
    return {"message": "Moved to recycle bin", "id": product_id}


RECYCLE_BIN_DAYS = 7


@router.get("/recycle-bin")
def get_recycle_bin(session: Session = Depends(get_session)):
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(days=RECYCLE_BIN_DAYS)
    for p in session.exec(
        select(Product).where(Product.deleted_at != None).where(Product.deleted_at < cutoff)
    ).all():
        session.delete(p)
    session.commit()

    items = session.exec(
        select(Product).where(Product.deleted_at != None).order_by(Product.deleted_at.desc())
    ).all()
    return {"total": len(items), "products": items}


@router.post("/recycle-bin/restore-all")
def restore_all(session: Session = Depends(get_session)):
    items = session.exec(select(Product).where(Product.deleted_at != None)).all()
    for p in items:
        p.deleted_at = None
        session.add(p)
    session.commit()
    return {"restored": len(items)}


@router.delete("/recycle-bin")
def empty_recycle_bin(session: Session = Depends(get_session)):
    items = session.exec(select(Product).where(Product.deleted_at != None)).all()
    count = len(items)
    for p in items:
        session.delete(p)
    session.commit()
    return {"deleted": count}


@router.post("/recycle-bin/{product_id}/restore")
def restore_product(product_id: int, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product or product.deleted_at is None:
        raise HTTPException(status_code=404, detail="Not found in recycle bin")
    product.deleted_at = None
    session.add(product)
    session.commit()
    return {"message": "Restored", "id": product_id}


@router.delete("/recycle-bin/{product_id}")
def permanent_delete(product_id: int, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product or product.deleted_at is None:
        raise HTTPException(status_code=404, detail="Not found in recycle bin")
    session.delete(product)
    session.commit()
    return {"message": "Permanently deleted", "id": product_id}


@router.get("/import/stats")
def get_import_stats(session: Session = Depends(get_session)):
    return {
        "total":     session.exec(select(Product)).count(),
        "pending":   session.exec(select(Product).where(Product.status == "pending")).count(),
        "blocked":   session.exec(select(Product).where(Product.status == "blocked")).count(),
        "published": session.exec(select(Product).where(Product.status == "published")).count(),
    }


@router.get("/blacklist")
def get_blacklist(session: Session = Depends(get_session)):
    rules = session.exec(select(BlacklistRule)).all()
    return {"total": len(rules), "rules": rules}


@router.post("/blacklist")
def add_blacklist_term(data: BlacklistInput, session: Session = Depends(get_session)):
    value = data.value.strip().lower()
    if not value:
        raise HTTPException(status_code=400, detail="Term value is required")

    if session.exec(select(BlacklistRule).where(func.lower(BlacklistRule.value) == value)).first():
        raise HTTPException(status_code=400, detail="Term already exists")

    new_rule = BlacklistRule(rule_type=data.rule_type, value=value)
    session.add(new_rule)
    session.commit()
    session.refresh(new_rule)

    # Auto-block existing products only when blacklist is enabled.
    term = normalize_text(value)
    if BLACKLIST_ENABLED and term:
        bl = BlacklistFilter()
        bl.automaton.add_word(term, (term, value))
        bl.automaton.make_automaton()
        bl.term_count = 1
        products = session.exec(
            select(Product).where(Product.deleted_at == None).where(Product.status != "blocked")
        ).all()
        blocked = 0
        for p in products:
            result = bl.check_product(p.title or "", p.description or "")
            if result["blocked"]:
                p.status = "blocked"
                p.block_reason = result["reason"]
                session.add(p)
                blocked += 1
        if blocked:
            session.add(AuditLog(action="blacklist_block", asin="",
                                 detail=f"term '{value}' blocked {blocked} product(s)"))
            session.commit()

    return new_rule


@router.delete("/blacklist/{rule_id}")
def delete_blacklist_term(rule_id: int, session: Session = Depends(get_session)):
    rule = session.get(BlacklistRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Term not found")
    session.delete(rule)
    session.commit()

    # Re-check only currently-blocked products — some may now be clean.
    bl = _build_blacklist(session)
    unblocked = 0
    for p in session.exec(
        select(Product).where(Product.deleted_at == None).where(Product.status == "blocked")
    ).all():
        if not (p.block_reason or "").startswith("matched"):
            continue
        result = bl.check_product(p.title or "", p.description or "")
        if result["blocked"]:
            p.block_reason = result["reason"]  # may now match a different remaining term
        else:
            p.status = "pending"
            p.block_reason = None
            unblocked += 1
        session.add(p)
    session.commit()

    return {"message": "Deleted", "id": rule_id, "unblocked": unblocked}


@router.get("/settings")
def get_settings(session: Session = Depends(get_session)):
    settings = session.exec(select(Setting)).all()
    return {s.key: float(s.value) if s.value.replace(".", "").isdigit() else s.value for s in settings}


@router.put("/settings")
def update_settings(data: SettingsInput, session: Session = Depends(get_session)):
    for key, value in {
        "safety_margin": str(data.safety_margin),
        "profit_markup": str(data.profit_markup),
        "sync_hours":    str(data.sync_hours),
    }.items():
        existing = session.exec(select(Setting).where(Setting.key == key)).first()
        if existing:
            existing.value = value
        else:
            session.add(Setting(key=key, value=value))
    session.commit()
    return {"message": "Settings saved"}


@router.get("/margin-rules")
def get_margin_rules(session: Session = Depends(get_session)):
    rules = session.exec(select(MarginRule).order_by(MarginRule.sort_order)).all()
    return {"rules": rules}


@router.put("/margin-rules")
def update_margin_rules(rules: List[MarginRuleInput], session: Session = Depends(get_session)):
    """Replace all margin rules then reprice every product with the new rates."""
    for r in session.exec(select(MarginRule)).all():
        session.delete(r)
    for r in rules:
        session.add(MarginRule(
            min_price=r.min_price, max_price=r.max_price,
            markup_pct=r.markup_pct, sort_order=r.sort_order,
        ))
    session.commit()

    products = session.exec(select(Product).where(Product.amazon_price_usd > 0)).all()
    for p in products:
        p.converted_price_cop = _calc_cop(p.amazon_price_usd, session)
        p.updated_at = datetime.utcnow()
        session.add(p)
    session.commit()

    return {"rules": session.exec(select(MarginRule).order_by(MarginRule.sort_order)).all(), "repriced": len(products)}
