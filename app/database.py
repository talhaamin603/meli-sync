import json
from sqlmodel import SQLModel, create_engine, Session, select
from sqlalchemy import text
from app.config import settings

# check_same_thread=False is required for SQLite with FastAPI's threaded request handling
_connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, echo=False, connect_args=_connect_args)


def init_db():
    SQLModel.metadata.create_all(engine)


def migrate_db():
    """Add columns introduced after the initial schema — safe to re-run."""
    migrations = [
        "ALTER TABLE product ADD COLUMN images TEXT",
        "ALTER TABLE product ADD COLUMN initial_stock INTEGER",
        "ALTER TABLE product ADD COLUMN times_ordered INTEGER DEFAULT 0",
        "ALTER TABLE product ADD COLUMN deleted_at DATETIME",
        "ALTER TABLE product ADD COLUMN amazon_category TEXT",
        "ALTER TABLE product ADD COLUMN category_id INTEGER",
        "ALTER TABLE product ADD COLUMN rating REAL DEFAULT 0.0",
        "ALTER TABLE product ADD COLUMN total_ratings INTEGER DEFAULT 0",
        "ALTER TABLE product ADD COLUMN whats_in_the_box TEXT",
    ]
    with engine.connect() as conn:
        for stmt in migrations:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass  # column already exists

        # Backfill images from image_url for products created before the images column existed.
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


_DEFAULT_MARGIN_RULES = [
    {"min": 1,   "max": 30,    "markup": 100, "order": 1},
    {"min": 30,  "max": 60,    "markup": 90,  "order": 2},
    {"min": 60,  "max": 100,   "markup": 80,  "order": 3},
    {"min": 100, "max": 200,   "markup": 70,  "order": 4},
    {"min": 200, "max": 10000, "markup": 75,  "order": 5},
]


def seed_margin_rules():
    from app.models import MarginRule
    with Session(engine) as session:
        if session.exec(select(MarginRule)).first():
            return
        for r in _DEFAULT_MARGIN_RULES:
            session.add(MarginRule(
                min_price=r["min"], max_price=r["max"],
                markup_pct=r["markup"], sort_order=r["order"],
            ))
        session.commit()


def get_session():
    with Session(engine) as session:
        yield session
