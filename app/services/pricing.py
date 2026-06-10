"""
app/services/pricing.py

How the final price is calculated (step by step):

    Step 1:  amazon price + markup price   = selling price
    Step 2:  selling price + shipping cost + insurance = final price (USD)
    Step 3:  final price (USD) x exchange rate         = final price (COP)

Example with $20 Amazon price and 100% markup:
    Step 1:  $20 + $20 (100% of $20)  = $40  (selling price)
    Step 2:  $40 + $8 + $5            = $53  (final price USD)
    Step 3:  $53 x exchange rate      = final price in COP (rounded to nearest 100)
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
        if rule.min_price <= amazon_price_usd <= rule.max_price:
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
    Step 1: amazon price + markup price   = selling price
    Step 2: selling price + shipping + insurance = final price (USD)
    Step 3: final price (USD) x exchange rate    = final price (COP)
    """
    after_markup_usd = amazon_price_usd * (1 + margin_pct / 100)
    with_margin_usd = after_markup_usd + shipping_usd + INSURANCE_USD
    raw_cop = with_margin_usd * usd_to_cop_rate

    # round to nearest 100 COP - cleaner price for Colombian buyers
    final_cop = round(raw_cop / 100) * 100

    return {
        "amazon_usd": round(amazon_price_usd, 2),
        "after_markup_usd": round(after_markup_usd, 2),
        "shipping_usd": round(shipping_usd, 2),
        "insurance_usd": INSURANCE_USD,
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