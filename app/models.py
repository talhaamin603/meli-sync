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
    amazon_price_usd: float = 0.0
    converted_price_cop: float = 0.0   # filled in Module 2
    stock: int = 0
    is_prime: bool = False
    meli_item_id: Optional[str] = None  # filled in Module 2
    meli_category: Optional[str] = None  # filled in Module 2
    status: str = "pending"  # pending / blocked / published / failed
    block_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


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


# These tables are created now but only USED in later modules.
# Defining them now means no migration headaches later.

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
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    products_checked: int = 0
    products_updated: int = 0
    failures: int = 0
    status: str = "running"


class Setting(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(index=True, unique=True)
    value: str = ""