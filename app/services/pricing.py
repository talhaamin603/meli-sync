"""
app/services/pricing.py
The single source of truth for how Mercado Libre prices are calculated.

Formula (per client requirement):
    subtotal_usd = amazon_price + shipping + $5 insurance
    with_margin  = subtotal_usd * (1 + margin_pct/100)
    final_cop    = with_margin * usd_to_cop_rate
    final_cop    = rounded up to nearest 100 COP for clean display

IMPORTANT NOTE ON THE FORMULA:
The client's formula multiplies (product + shipping + insurance) by the
margin. This means profit margin is applied to shipping and insurance too,
not just the product cost. That is unusual - most resellers apply margin
only to the product. Building it exactly as specified, but worth
clarifying with the client before going live.

All settings (shipping_usd, margin_pct, exchange_rate) come from the
Setting table so the dashboard can change them without code changes.
"""
from datetime import datetime, timedelta
import httpx
from sqlmodel import Session, select
from app.models import Setting, ExchangeRate, MarginRule


INSURANCE_USD = 5.00              # fixed per client spec
DEFAULT_SHIPPING_USD = 8.00       # default if no setting saved yet
DEFAULT_MARGIN_PCT = 25.0         # default if no setting saved yet
EXCHANGE_API = "https://open.er-api.com/v6/latest/USD"
RATE_TTL_HOURS = 24               # refresh once a day


# ---------- settings helpers ----------

def _get_setting(session: Session, key: str, default: float) -> float:
    """Read a numeric setting, with a fallback if not present."""
    row = session.exec(select(Setting).where(Setting.key == key)).first()
    if row is None or not row.value:
        return default
    try:
        return float(row.value)
    except ValueError:
        return default


def get_shipping_usd(session: Session) -> float:
    return _get_setting(session, "shipping_usd", DEFAULT_SHIPPING_USD)


def get_margin_pct(session: Session) -> float:
    return _get_setting(session, "profit_margin_pct", DEFAULT_MARGIN_PCT)


def get_tiered_markup(amazon_price_usd: float, session: Session) -> float:
    """Return the markup % for the given price from the MarginRule table.
    Falls back to the global margin setting if no rules exist."""
    rules = session.exec(
        select(MarginRule).order_by(MarginRule.sort_order)
    ).all()
    if not rules:
        return get_margin_pct(session)
    for rule in rules:
        if rule.min_price <= amazon_price_usd < rule.max_price:
            return rule.markup_pct
    # price is at or above the last rule's max — use the last rule
    return rules[-1].markup_pct


# ---------- exchange rate ----------

def get_usd_to_cop(session: Session) -> float:
    """
    Returns the current USD->COP rate. Caches in DB and refreshes daily.
    If the API call fails, returns the last known rate. If there is no
    known rate at all, returns a sane fallback so the pipeline doesn't
    crash.
    """
    # check the most recent cached rate
    cached = session.exec(
        select(ExchangeRate)
        .where(ExchangeRate.base == "USD", ExchangeRate.target == "COP")
        .order_by(ExchangeRate.fetched_at.desc())
    ).first()

    if cached:
        age = datetime.utcnow() - cached.fetched_at
        if age < timedelta(hours=RATE_TTL_HOURS):
            return cached.rate

    # cache stale or missing - fetch a fresh rate
    try:
        resp = httpx.get(EXCHANGE_API, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        rate = float(data["rates"]["COP"])
        session.add(ExchangeRate(base="USD", target="COP", rate=rate))
        session.commit()
        return rate
    except Exception as e:
        print(f"[pricing] exchange API failed: {e}")
        if cached:
            return cached.rate  # use stale cached rate rather than crash
        return 4100.0           # last-resort fallback


# ---------- the calculation ----------

def calculate_final_cop(
    amazon_price_usd: float,
    shipping_usd: float,
    margin_pct: float,
    usd_to_cop_rate: float,
) -> dict:
    """
    The exact formula. Returns a dict with the full breakdown for logging
    and dashboard display. Always use this function - never inline the math.
    """
    subtotal_usd = amazon_price_usd + shipping_usd + INSURANCE_USD
    with_margin_usd = subtotal_usd * (1 + margin_pct / 100)
    raw_cop = with_margin_usd * usd_to_cop_rate

    # round UP to nearest 100 COP - cleaner price for Colombian buyers
    final_cop = round(raw_cop / 100) * 100

    return {
        "amazon_usd": round(amazon_price_usd, 2),
        "shipping_usd": round(shipping_usd, 2),
        "insurance_usd": INSURANCE_USD,
        "subtotal_usd": round(subtotal_usd, 2),
        "margin_pct": margin_pct,
        "with_margin_usd": round(with_margin_usd, 2),
        "exchange_rate": round(usd_to_cop_rate, 2),
        "final_cop": int(final_cop),
    }


def price_product_for_meli(amazon_price_usd: float, session: Session) -> dict:
    """High-level helper: applies tiered markup + live rate to a price."""
    shipping = get_shipping_usd(session)
    margin = get_tiered_markup(amazon_price_usd, session)
    rate = get_usd_to_cop(session)
    return calculate_final_cop(amazon_price_usd, shipping, margin, rate)