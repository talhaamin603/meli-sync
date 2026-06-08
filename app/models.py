"""All database tables for the project."""
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class Product(SQLModel, table=True):
    """One Amazon product we have fetched."""
    id: Optional[int] = Field(default=None, primary_key=True)
    asin: str = Field(index=True, unique=True)
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    images: Optional[str] = None          # JSON array of all image URLs
    amazon_price_usd: float = 0.0
    converted_price_cop: float = 0.0   # filled in Module 2
    stock: int = 0
    initial_stock: Optional[int] = None
    times_ordered: int = 0
    is_prime: bool = False
    meli_item_id: Optional[str] = None  # filled in Module 2
    meli_category: Optional[str] = None  # filled in Module 2
    last_synced_at: Optional[datetime] = None  # ✅ ADDED for Module 2
    status: str = "pending"  # pending / blocked / published / failed
    block_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None  # set on soft-delete, None = active


class BlacklistRule(SQLModel, table=True):
    """One blacklisted brand or keyword."""
    id: Optional[int] = Field(default=None, primary_key=True)
    rule_type: str = "brand"  # "brand" or "keyword"
    value: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AuditLog(SQLModel, table=True):
    """A record of every important action the system takes."""
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    action: str          # "fetch", "blocked", "prime_filtered", etc.
    asin: Optional[str] = None
    detail: Optional[str] = None


# ============================================================
# MODULE 2 TABLES
# ============================================================

class MeliToken(SQLModel, table=True):
    """Mercado Libre OAuth tokens - only one row"""
    id: Optional[int] = Field(default=None, primary_key=True)
    access_token: str
    refresh_token: str
    expires_at: datetime
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ExchangeRate(SQLModel, table=True):
    """Cached USD → COP exchange rate"""
    id: Optional[int] = Field(default=None, primary_key=True)
    base: str = "USD"
    target: str = "COP"
    rate: float = 0.0
    fetched_at: datetime = Field(default_factory=datetime.utcnow)


class SyncHistory(SQLModel, table=True):
    """Sync operation log - CORRECTED for Module 2"""
    id: Optional[int] = Field(default=None, primary_key=True)
    sync_type: str = "daily"  # ✅ ADDED: "daily" or "manual"
    started_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = None  # ✅ CHANGED from completed_at
    products_updated: int = 0
    products_failed: int = 0  # ✅ CHANGED from failures
    notes: str = ""  # ✅ ADDED


class Setting(SQLModel, table=True):
    """System settings (shipping, margins, etc.)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(index=True, unique=True)
    value: str = ""