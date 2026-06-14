from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, migrate_db, seed_margin_rules, engine
from app.routers import manual_products, meli
from app.routers import amazon as amazon_router
from app.routers import sync as sync_router
from app.routers import categories as categories_router

app = FastAPI(title="Meli Sync")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://*.railway.app",
        "http://melizone.tech",
        "https://melizone.tech",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(manual_products.router)
app.include_router(meli.router)
app.include_router(amazon_router.router)
app.include_router(sync_router.router)
app.include_router(categories_router.router)

_UNIT_SECONDS = {"seconds": 1, "minutes": 60, "hours": 3600, "days": 86400, "weeks": 604800}


def _unblock_if_disabled():
    """If blacklist is disabled, restore all blacklist-blocked products to pending."""
    from app.routers.manual_products import BLACKLIST_ENABLED
    if BLACKLIST_ENABLED:
        return
    from sqlmodel import Session, select
    from app.models import Product
    with Session(engine) as s:
        blocked = s.exec(
            select(Product)
            .where(Product.status == "blocked")
            .where(Product.block_reason.startswith("matched"))  # type: ignore[arg-type]
        ).all()
        if blocked:
            for p in blocked:
                p.status = "pending"
                p.block_reason = None
                s.add(p)
            s.commit()
            print(f"[blacklist] disabled — restored {len(blocked)} blocked product(s) to pending")


@app.on_event("startup")
def on_startup():
    init_db()
    migrate_db()
    seed_margin_rules()
    _unblock_if_disabled()

    # Load saved sync intervals from DB; fall back to None → cron defaults
    from app.models import Setting
    from sqlmodel import Session, select

    amazon_secs = None
    meli_secs = None
    with Session(engine) as s:
        def _g(key):
            row = s.exec(select(Setting).where(Setting.key == key)).first()
            return row.value if row else None

        a_val, a_unit = _g("amazon_sync_value"), _g("amazon_sync_unit")
        m_val, m_unit = _g("meli_sync_value"), _g("meli_sync_unit")
        a_enabled = _g("amazon_auto_enabled")
        m_enabled = _g("meli_auto_enabled")

        if a_val and a_unit and a_unit in _UNIT_SECONDS:
            amazon_secs = int(a_val) * _UNIT_SECONDS[a_unit]
        if m_val and m_unit and m_unit in _UNIT_SECONDS:
            meli_secs = int(m_val) * _UNIT_SECONDS[m_unit]

    from app.services.scheduler import start_scheduler, pause_amazon_sync, pause_meli_sync
    start_scheduler(amazon_secs, meli_secs)

    if a_enabled == "0":
        pause_amazon_sync()
    if m_enabled == "0":
        pause_meli_sync()


@app.get("/")
def root():
    return {"status": "ok", "message": "Meli Sync API running"}


@app.get("/health")
def health():
    return {"healthy": True}


@app.get("/routes")
def list_routes():
    return [
        {"path": r.path, "methods": list(r.methods) if hasattr(r, "methods") else []}
        for r in app.routes
    ]
