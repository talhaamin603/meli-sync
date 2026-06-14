from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    asin: str = Field(index=True, unique=True)
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    images: Optional[str] = None          # JSON array of image URLs
    amazon_price_usd: float = 0.0
    converted_price_cop: float = 0.0
    stock: int = 0
    initial_stock: Optional[int] = None
    times_ordered: int = 0
    is_prime: bool = False
    rating: float = 0.0
    total_ratings: int = 0
    whats_in_the_box: Optional[str] = None
    amazon_category: Optional[str] = None  # stores brand name from Amazon
    category_id: Optional[int] = Field(default=None, foreign_key="category.id")
    meli_item_id: Optional[str] = None
    meli_category: Optional[str] = None
    last_synced_at: Optional[datetime] = None
    status: str = "pending"              # pending / blocked / published / failed
    block_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None  # None = active; set = soft-deleted


class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    parent_id: Optional[int] = Field(default=None, foreign_key="category.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BlacklistRule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    rule_type: str = "brand"             # "brand" or "keyword"
    value: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    action: str
    asin: Optional[str] = None
    detail: Optional[str] = None


class MeliToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    access_token: str
    refresh_token: str
    expires_at: datetime
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ExchangeRate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    base: str = "USD"
    target: str = "COP"
    rate: float = 0.0
    fetched_at: datetime = Field(default_factory=datetime.utcnow)


class SyncHistory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sync_type: str = "daily"             # "daily" or "manual"
    started_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = None
    products_updated: int = 0
    products_failed: int = 0
    notes: str = ""


class Setting(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(index=True, unique=True)
    value: str = ""


class MarginRule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    min_price: float = 0.0      # inclusive lower bound (USD)
    max_price: float = 0.0      # exclusive upper bound; last rule is inclusive
    markup_pct: float = 100.0
    sort_order: int = 0
