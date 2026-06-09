"""Database connection and session handling."""
import json
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text
from app.config import settings

# echo=False keeps the console clean. Set True to see every SQL query.
_connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, echo=False, connect_args=_connect_args)


def init_db():
    """Create all tables defined in models.py if they don't exist."""
    SQLModel.metadata.create_all(engine)


def migrate_db():
    """Add new columns to existing tables that predate them."""
    migrations = [
        "ALTER TABLE product ADD COLUMN images TEXT",
        "ALTER TABLE product ADD COLUMN initial_stock INTEGER",
        "ALTER TABLE product ADD COLUMN times_ordered INTEGER DEFAULT 0",
        "ALTER TABLE product ADD COLUMN deleted_at DATETIME",
        "ALTER TABLE product ADD COLUMN amazon_category TEXT",
        "ALTER TABLE product ADD COLUMN category_id INTEGER",
    ]
    with engine.connect() as conn:
        for stmt in migrations:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass  # column already exists

        # Backfill images from image_url for all products that still have images = NULL.
        # This ensures existing products show at least their one known image in the edit page.
        rows = conn.execute(
            text("SELECT id, image_url FROM product WHERE images IS NULL AND image_url IS NOT NULL")
        ).fetchall()
        for row_id, image_url in rows:
            conn.execute(
                text("UPDATE product SET images = :imgs WHERE id = :pid"),
                {"imgs": json.dumps([image_url]), "pid": row_id},
            )
        if rows:
            conn.commit()
            print(f"[migrate] backfilled images for {len(rows)} products")


_DEFAULT_MARGIN_RULES = [
    {"min": 1,   "max": 30,    "markup": 100, "order": 1},
    {"min": 30,  "max": 60,    "markup": 90,  "order": 2},
    {"min": 60,  "max": 100,   "markup": 80,  "order": 3},
    {"min": 100, "max": 200,   "markup": 70,  "order": 4},
    {"min": 200, "max": 10000, "markup": 75,  "order": 5},
]

def seed_margin_rules():
    """Insert default margin rules if the table is empty."""
    from app.models import MarginRule
    from sqlmodel import Session, select
    with Session(engine) as session:
        existing = session.exec(select(MarginRule)).first()
        if existing:
            return
        for r in _DEFAULT_MARGIN_RULES:
            session.add(MarginRule(
                min_price=r["min"], max_price=r["max"],
                markup_pct=r["markup"], sort_order=r["order"],
            ))
        session.commit()
        print("[migrate] seeded default margin rules")


def get_session():
    """Yields a database session for one request, then closes it."""
    with Session(engine) as session:
        yield session
