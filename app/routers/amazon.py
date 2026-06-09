"""
app/routers/amazon.py
Bulk-import products from Amazon by ASIN.

Now also rejects products that came back without a price, since saving
those would lead to selling at cost or below.
"""
import re
import json
import unicodedata
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.database import get_session
from app.models import Product, BlacklistRule, AuditLog
from app.services.amazon import fetch_product, search_products, is_configured

try:
    from app.services.pricing import price_product_for_meli
    HAS_PRICING = True
except Exception as e:
    print(f"[amazon] pricing service not available: {e}")
    HAS_PRICING = False


router = APIRouter(prefix="/api/amazon", tags=["amazon"])


class ImportBody(BaseModel):
    asins: list[str]


class SearchProductItem(BaseModel):
    asin: str
    title: str
    image_url: str
    amazon_price_usd: float
    is_prime: bool = False


class AddFromSearchBody(BaseModel):
    products: list[SearchProductItem]


def _normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.lower().strip()
    text = "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )
    return " ".join(text.split())


def _blacklist_hit(text: str, terms: set) -> str | None:
    clean = _normalize_text(text)
    if not clean:
        return None
    tokens = clean.split()
    for w in tokens:
        if w in terms:
            return w
    for i in range(len(tokens) - 1):
        if (p := f"{tokens[i]} {tokens[i + 1]}") in terms:
            return p
    for i in range(len(tokens) - 2):
        if (p := f"{tokens[i]} {tokens[i + 1]} {tokens[i + 2]}") in terms:
            return p
    return None


def _load_blacklist_set(session: Session) -> set:
    s = set()
    for rule in session.exec(select(BlacklistRule)).all():
        n = _normalize_text(rule.value)
        if n:
            s.add(n)
    return s


def _safe_calculate_cop(usd_price: float, session: Session) -> float:
    if not HAS_PRICING:
        return 0.0
    try:
        breakdown = price_product_for_meli(usd_price, session)
        return float(breakdown.get("final_cop", 0))
    except Exception as e:
        print(f"[amazon] COP calc skipped for ${usd_price}: {e}")
        return 0.0


@router.get("/status")
def status():
    return {
        "configured": is_configured(),
        "message": (
            "Amazon RapidAPI conectado"
            if is_configured()
            else "Falta la configuración: agregar RAPIDAPI_KEY en .env"
        ),
    }


@router.post("/import-asins")
def import_asins(
    body: ImportBody,
    session: Session = Depends(get_session),
):
    if not is_configured():
        raise HTTPException(
            status_code=400,
            detail="Amazon RapidAPI not configured. Set RAPIDAPI_KEY in .env",
        )

    if not body.asins:
        return {"results": [], "summary": {"added": 0, "blocked": 0, "skipped": 0, "failed": 0}}

    asins = [_extract_asin(a) for a in body.asins]
    asins = [a for a in asins if a]
    seen = set()
    asins = [a for a in asins if not (a in seen or seen.add(a))]

    terms = _load_blacklist_set(session)
    results = []
    summary = {"added": 0, "blocked": 0, "skipped": 0, "failed": 0}

    for asin in asins:
        existing = session.exec(
            select(Product).where(Product.asin == asin)
        ).first()
        if existing:
            results.append({"asin": asin, "status": "skipped",
                            "reason": "Already exists in catalog"})
            summary["skipped"] += 1
            continue

        product_data = fetch_product(asin)
        if product_data is None:
            results.append({"asin": asin, "status": "failed",
                            "reason": "no se pudo obtener de Amazon"})
            summary["failed"] += 1
            continue

        # NEW: Reject products without a usable price.
        # If Amazon returns 0 (out of stock, unavailable, price hidden),
        # we should NOT save - selling at cost = losing money.
        usd_price = product_data.get("amazon_price_usd") or 0
        if usd_price <= 0:
            results.append({
                "asin": asin, "status": "failed",
                "title": product_data["title"][:80],
                "reason": "Amazon no devolvió precio (sin stock o no disponible)"
            })
            summary["failed"] += 1
            continue

        hit = _blacklist_hit(product_data["title"], terms) or \
              _blacklist_hit(product_data["description"], terms)

        if hit:
            session.add(Product(
                asin=asin,
                title=product_data["title"],
                description=product_data["description"],
                image_url=product_data["image_url"],
                images=json.dumps(product_data.get("images") or []),
                amazon_price_usd=usd_price,
                converted_price_cop=0.0,
                stock=product_data["stock"],
                is_prime=product_data["is_prime"],
                amazon_category=product_data.get("amazon_category") or "",
                status="blocked",
                block_reason=f"matched: {hit}",
            ))
            session.add(AuditLog(
                action="amazon_import_blocked", asin=asin,
                detail=f"matched: {hit}",
            ))
            results.append({"asin": asin, "status": "blocked",
                            "title": product_data["title"][:80],
                            "price_usd": usd_price,
                            "reason": f"bloqueado por: {hit}"})
            summary["blocked"] += 1
            session.commit()
            continue

        cop_price = _safe_calculate_cop(usd_price, session)

        session.add(Product(
            asin=asin,
            title=product_data["title"],
            description=product_data["description"],
            image_url=product_data["image_url"],
            images=json.dumps(product_data.get("images") or []),
            amazon_price_usd=usd_price,
            converted_price_cop=cop_price,
            stock=product_data["stock"],
            is_prime=product_data["is_prime"],
            amazon_category=product_data.get("amazon_category") or "",
            status="pending",
        ))
        session.add(AuditLog(
            action="amazon_import_added", asin=asin,
            detail=f"price=${usd_price} -> {cop_price} COP",
        ))
        results.append({
            "asin": asin, "status": "added",
            "title": product_data["title"][:80],
            "price_usd": usd_price,
            "price_cop": cop_price,
        })
        summary["added"] += 1
        session.commit()

    return {"results": results, "summary": summary}


@router.get("/search")
def search_amazon(q: str, page: int = 1):
    if not is_configured():
        raise HTTPException(status_code=400, detail="Amazon RapidAPI not configured.")
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    results = search_products(q.strip(), page=page)
    return {"results": results, "query": q.strip(), "page": page}


@router.post("/add-from-search")
def add_from_search(
    body: AddFromSearchBody,
    session: Session = Depends(get_session),
):
    if not body.products:
        return {"results": [], "summary": {"added": 0, "blocked": 0, "skipped": 0}}

    terms = _load_blacklist_set(session)
    results = []
    summary = {"added": 0, "blocked": 0, "skipped": 0}

    for item in body.products:
        asin = item.asin.strip().upper()

        existing = session.exec(select(Product).where(Product.asin == asin)).first()
        if existing:
            results.append({"asin": asin, "status": "skipped", "reason": "Already in catalog"})
            summary["skipped"] += 1
            continue

        hit = _blacklist_hit(item.title, terms)
        usd_price = item.amazon_price_usd or 0

        if hit:
            session.add(Product(
                asin=asin,
                title=item.title,
                description="",
                image_url=item.image_url,
                images=json.dumps([item.image_url] if item.image_url else []),
                amazon_price_usd=usd_price,
                converted_price_cop=0.0,
                stock=10,
                is_prime=item.is_prime,
                status="blocked",
                block_reason=f"matched: {hit}",
            ))
            session.add(AuditLog(action="search_import_blocked", asin=asin, detail=f"matched: {hit}"))
            results.append({"asin": asin, "status": "blocked", "title": item.title[:80], "reason": f"Blacklisted: {hit}"})
            summary["blocked"] += 1
            session.commit()
            continue

        cop_price = _safe_calculate_cop(usd_price, session)

        session.add(Product(
            asin=asin,
            title=item.title,
            description="",
            image_url=item.image_url,
            images=json.dumps([item.image_url] if item.image_url else []),
            amazon_price_usd=usd_price,
            converted_price_cop=cop_price,
            stock=10,
            is_prime=item.is_prime,
            status="pending",
        ))
        session.add(AuditLog(action="search_import_added", asin=asin, detail=f"price=${usd_price} -> {cop_price} COP"))
        results.append({"asin": asin, "status": "added", "title": item.title[:80]})
        summary["added"] += 1
        session.commit()

    return {"results": results, "summary": summary}


@router.post("/refetch-images")
def refetch_images(session: Session = Depends(get_session)):
    """
    Re-calls the Amazon API for every product that has only one image stored
    and updates the images column with the full list. Adds a 1.2 s delay
    between calls to stay within RapidAPI rate limits.
    """
    import time

    if not is_configured():
        raise HTTPException(status_code=400, detail="Amazon RapidAPI not configured.")

    # Only process products that still have 0 or 1 image
    products = session.exec(select(Product)).all()
    needs_update = []
    for p in products:
        try:
            existing = json.loads(p.images) if p.images else []
        except Exception:
            existing = []
        if len(existing) <= 1:
            needs_update.append(p)

    updated = 0
    skipped = len(products) - len(needs_update)
    failed = 0

    for i, p in enumerate(needs_update):
        if i > 0:
            time.sleep(1.2)   # stay under rate limit

        product_data = fetch_product(p.asin)
        if not product_data:
            failed += 1
            continue

        all_images = product_data.get("images") or []
        if len(all_images) <= 1:
            failed += 1
            continue

        p.images = json.dumps(all_images)
        p.image_url = all_images[0]
        session.add(p)
        updated += 1
        # commit every 10 so progress is saved even if request times out
        if updated % 10 == 0:
            session.commit()

    session.commit()
    return {"updated": updated, "skipped": skipped, "failed": failed, "total": len(products)}


_ASIN_RE = re.compile(r"/(?:dp|gp/product|product)/([A-Z0-9]{10})", re.I)


def _extract_asin(raw: str) -> str | None:
    if not raw:
        return None
    raw = raw.strip()
    if "amazon." in raw:
        m = _ASIN_RE.search(raw)
        if m:
            return m.group(1).upper()
        return None
    clean = raw.upper()
    if len(clean) == 10 and clean.isalnum():
        return clean
    return None