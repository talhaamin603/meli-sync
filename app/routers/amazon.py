import re
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.database import get_session
from app.models import Product
from app.services.amazon import is_configured, fetch_product, search_products
# from app.services.blacklist import BlacklistFilter
from app.services.pricing import price_product_for_meli

router = APIRouter(prefix="/api/amazon", tags=["amazon"])


class ImportBody(BaseModel):
    asins: list[str]
    category_id: int | None = None


class PreviewProduct(BaseModel):
    asin: str
    name: str
    brand: str
    url: str
    thumbnail: str
    images: list[str]
    rating: float
    total_ratings: int
    price: float
    is_prime: bool
    description: str = ""


class ImportFromPreviewBody(BaseModel):
    products: list[PreviewProduct]
    category_id: int | None = None


class SearchProductItem(BaseModel):
    asin: str
    title: str
    image_url: str
    amazon_price_usd: float
    is_prime: bool = False


class AddFromSearchBody(BaseModel):
    products: list[SearchProductItem]
    category_id: int | None = None


_ASIN_RE = re.compile(r"/(?:dp|gp/product|product)/([A-Z0-9]{10})", re.I)


def _extract_asin(raw: str) -> str | None:
    if not raw:
        return None
    raw = raw.strip()
    if "amazon." in raw:
        m = _ASIN_RE.search(raw)
        return m.group(1).upper() if m else None
    clean = raw.upper()
    return clean if len(clean) == 10 and clean.isalnum() else None


def _calc_cop(usd: float, session: Session) -> float:
    try:
        return float(price_product_for_meli(usd, session).get("final_cop", 0))
    except Exception:
        return 0.0


def _save_product(data: dict, category_id, session: Session) -> dict:
    asin = data["asin"]
    title = data["name"]
    description = data.get("description", "")

    existing = session.exec(select(Product).where(Product.asin == asin)).first()
    if existing:
        return {"asin": asin, "title": title, "price_usd": data["price"], "status": "skipped", "reason": "Already exists"}

    # bl = blacklist.check_product(title, description)
    # if bl["blocked"]:
    #     p = Product(
    #         asin=asin, title=title, description=description,
    #         image_url=data["thumbnail"], images=json.dumps(data["images"]),
    #         amazon_price_usd=data["price"], is_prime=data["is_prime"],
    #         amazon_category=data.get("brand", ""), category_id=category_id,
    #         status="blocked", block_reason=f"matched: {bl['term']}",
    #         stock=10, initial_stock=10,
    #     )
    #     session.add(p)
    #     session.commit()
    #     return {"asin": asin, "title": title, "price_usd": data["price"], "status": "blocked", "reason": f"Blacklisted: {bl['term']}"}

    cop = _calc_cop(data["price"], session)
    p = Product(
        asin=asin, title=title, description=description,
        image_url=data["thumbnail"], images=json.dumps(data["images"]),
        amazon_price_usd=data["price"], converted_price_cop=cop,
        is_prime=data["is_prime"], rating=data.get("rating", 0.0),
        total_ratings=data.get("total_ratings", 0),
        whats_in_the_box=data.get("whats_in_the_box") or None,
        amazon_category=data.get("brand", ""), category_id=category_id,
        status="pending", stock=10, initial_stock=10,
    )
    session.add(p)
    session.commit()
    return {"asin": asin, "title": title, "price_usd": data["price"], "price_cop": cop, "status": "added"}


@router.get("/status")
def status():
    return {
        "configured": is_configured(),
        "message": "scrape.do connected" if is_configured() else "Set SCRAPEDO_TOKEN in .env",
    }


@router.get("/product")
def get_product(asin: str):
    clean = _extract_asin(asin)
    if not clean:
        raise HTTPException(status_code=400, detail="Invalid ASIN or Amazon URL")
    if not is_configured():
        raise HTTPException(status_code=503, detail="SCRAPEDO_TOKEN not configured")
    try:
        return fetch_product(clean)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Fetch failed: {e}")


@router.post("/import-from-preview")
def import_from_preview(body: ImportFromPreviewBody, session: Session = Depends(get_session)):
    results = []
    summary = {"added": 0, "blocked": 0, "skipped": 0, "failed": 0}
    for p in body.products:
        r = _save_product(p.model_dump(), body.category_id, session)
        results.append(r)
        summary[r["status"]] = summary.get(r["status"], 0) + 1
    return {"summary": summary, "results": results}


@router.post("/import-asins")
def import_asins(body: ImportBody, session: Session = Depends(get_session)):
    if not is_configured():
        raise HTTPException(status_code=503, detail="SCRAPEDO_TOKEN not configured")
    results = []
    summary = {"added": 0, "blocked": 0, "skipped": 0, "failed": 0}
    for raw in body.asins:
        asin = _extract_asin(raw) or raw.strip().upper()
        try:
            data = fetch_product(asin)
        except Exception as e:
            results.append({"asin": asin, "title": None, "status": "failed", "reason": str(e)})
            summary["failed"] += 1
            continue
        r = _save_product(data, body.category_id, session)
        results.append(r)
        summary[r["status"]] = summary.get(r["status"], 0) + 1
    return {"summary": summary, "results": results}


@router.get("/search")
def search_amazon(q: str, page: int = 1):
    if not q.strip():
        raise HTTPException(status_code=400, detail="Search query is empty")
    if not is_configured():
        raise HTTPException(status_code=503, detail="SCRAPEDO_TOKEN not configured")
    try:
        data = search_products(q.strip(), page)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Search failed: {e}")
    return {
        "keyword": q.strip(),
        "page": data["page"],
        "total_results": data["total_results"],
        "results": data["products"],
        "has_more": len(data["products"]) > 0,
    }


@router.post("/add-from-search")
def add_from_search(body: AddFromSearchBody, session: Session = Depends(get_session)):
    if not is_configured():
        raise HTTPException(status_code=503, detail="SCRAPEDO_TOKEN not configured")
    results = []
    summary = {"added": 0, "blocked": 0, "skipped": 0, "failed": 0}
    for item in body.products:
        # Skip duplicates before spending a credit on the full PDP fetch
        existing = session.exec(select(Product).where(Product.asin == item.asin)).first()
        if existing:
            results.append({"asin": item.asin, "title": item.title, "status": "skipped", "reason": "Already exists"})
            summary["skipped"] += 1
            continue
        try:
            data = fetch_product(item.asin)
        except Exception as e:
            results.append({"asin": item.asin, "title": item.title, "status": "failed", "reason": str(e)})
            summary["failed"] += 1
            continue
        r = _save_product(data, body.category_id, session)
        results.append(r)
        summary[r["status"]] = summary.get(r["status"], 0) + 1
    return {"summary": summary, "results": results}
