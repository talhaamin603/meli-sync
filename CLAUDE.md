# Meli-Sync — Project Overview for Claude

## What this project does

This is an **Amazon → Mercado Libre sync dashboard**. The owner buys/imports products from Amazon and resells them on Mercado Libre (Colombia). The dashboard handles the full pipeline:

1. Import products from Amazon (manually, by ASIN, or by search)
2. Apply a tiered markup + shipping + insurance to calculate the COP selling price
3. Publish products to Mercado Libre via their API
4. Daily re-sync to update prices on already-published listings

---

## How to run

### Backend (FastAPI — port 8000)
```
cd "w:\Fiverr\Project 1\meli-sync"
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend (React/Vite — port 5173 or 5174)
```
cd "w:\Fiverr\Project 1\meli-sync\frontend"
npm install
npm run dev
```

The frontend proxies API calls to `http://localhost:8000` via the `VITE_API_URL` env var.

---

## Tech stack

| Layer | Stack |
|---|---|
| Backend | Python, FastAPI, SQLModel, SQLite, APScheduler |
| Frontend | React 19, Vite, Tailwind CSS, axios, react-router-dom, i18next (ES/EN) |
| External APIs | Amazon via RapidAPI (`real-time-amazon-data.p.rapidapi.com`), Mercado Libre OAuth |
| Exchange rate | `open.er-api.com` — cached daily in the `ExchangeRate` DB table |

---

## Key business logic

### Pricing formula
```
profit     = amazon_price_usd × (markup_pct / 100)
ml_price_usd = amazon_price_usd + profit + $8 (shipping) + $5 (insurance)
ml_price_cop = round(ml_price_usd × exchange_rate / 100) × 100   ← nearest 100 COP
```

**Profit = markup amount only** — shipping and insurance are costs passed to the buyer, not profit.

### Tiered markup (MarginRule table)
Rules have `min_price`, `max_price`, `markup_pct`. Matching logic:
1. Find rule where `min_price ≤ amazon_price ≤ max_price`
2. If no exact match (price falls between ranges), use the **first rule whose `min_price > price`** (round up to next range)
3. If price is above all ranges, use the last rule

This logic lives in **both**:
- `app/services/pricing.py` → `get_tiered_markup()`
- `frontend/src/pages/MarginConfig.jsx` → `matchingRule()` and `calcML()`

### Dynamic price calculation
The frontend does **not** rely on the stored `converted_price_cop` for display — that value can be stale if the exchange rate changed. Instead, Products.jsx, Dashboard.jsx, and MarginConfig.jsx all fetch margin rules + exchange rate on load and calculate prices live using `calcPrice()` helpers.

### Blacklist
Products whose title/description contain any blacklisted term are imported with `status="blocked"` instead of `status="pending"`. Uses Aho-Corasick for fast multi-term matching. Terms are accent-normalized.

---

## Project structure

```
meli-sync/
├── app/
│   ├── main.py                 # FastAPI app, CORS, router registration, DB init
│   ├── config.py               # Env vars (DATABASE_URL, RAPIDAPI_KEY, JWT_SECRET)
│   ├── models.py               # All SQLModel table definitions
│   ├── database.py             # DB session, migrations
│   ├── routers/
│   │   ├── manual_products.py  # Product CRUD, blacklist, margin rules, recycle bin
│   │   ├── amazon.py           # Amazon import (ASINs + search)
│   │   ├── meli.py             # Mercado Libre OAuth + publishing + exchange rate
│   │   ├── sync.py             # Sync trigger + history log
│   │   └── categories.py       # Category tree CRUD
│   └── services/
│       ├── pricing.py          # Markup calc, exchange rate, COP rounding
│       ├── amazon.py           # RapidAPI calls
│       ├── mercadolibre.py     # ML OAuth, token refresh, publish, update
│       ├── publisher.py        # Publish orchestration (one + batch)
│       ├── blacklist.py        # Aho-Corasick blacklist filter
│       └── scheduler.py        # APScheduler daily re-sync job
└── frontend/
    └── src/
        ├── api.js              # All axios API functions
        ├── App.jsx             # Route definitions
        ├── pages/
        │   ├── Dashboard.jsx       # Stats, product table, quick actions
        │   ├── Products.jsx        # Full product list (table + grid)
        │   ├── ProductEdit.jsx     # Edit product fields
        │   ├── AddProduct.jsx      # Manual add (form with image URL validation)
        │   ├── AddProductHub.jsx   # Entry hub for import methods
        │   ├── ImportAsins.jsx     # Paste/CSV ASIN import
        │   ├── SearchAmazon.jsx    # Search Amazon and pick products
        │   ├── MarginConfig.jsx    # Tiered markup rules + price calculator
        │   ├── Categories.jsx      # Category tree management
        │   ├── Blacklist.jsx       # Blacklist term management
        │   └── RecycleBin.jsx      # Restore/delete soft-deleted products
        ├── components/
        │   └── Layout.jsx          # Sidebar nav, language toggle
        └── i18n/
            ├── en.js
            └── es.js
```

---

## Database models (app/models.py)

| Model | Purpose |
|---|---|
| `Product` | Core — ASIN, title, prices, images, stock, status, ML item ID |
| `Category` | Hierarchical (parent_id self-ref) |
| `BlacklistRule` | rule_type + value (brand or keyword) |
| `AuditLog` | Action log (imports, blocks, syncs) |
| `MeliToken` | Single-row OAuth token storage |
| `ExchangeRate` | Cached USD→COP rate with timestamp |
| `SyncHistory` | Log of each sync run |
| `Setting` | Key-value store |
| `MarginRule` | Tiered markup rules (min_price, max_price, markup_pct, sort_order) |

### Product.status lifecycle
`pending` → published by ML API → `published`
`pending` → blacklist hit at import → `blocked`
`published` / `pending` → soft-delete → `deleted_at` set (recycle bin)

### initial_stock
When a product is created (manually or via Amazon API), `initial_stock` must equal the stock value at that moment. It never changes after creation — it records what the stock was when the product was first added.

---

## Product import methods

### 1. Manual add (`POST /api/manual/product`)
- User fills form: ASIN, title, description, price, images, stock
- Image URLs are validated: must be valid `https://` URLs AND must actually load as images (checked via `<img>` onLoad/onError in the form)
- Handled in `app/routers/manual_products.py` → `_add_one()`

### 2. ASIN import (`POST /api/amazon/import-asins`)
- User pastes one or more ASINs (or Amazon URLs)
- Backend calls RapidAPI for each ASIN, runs blacklist check, calculates COP price
- Products with price=0 are rejected (unavailable/out-of-stock on Amazon)

### 3. Search import (`POST /api/amazon/add-from-search`)
- User searches Amazon from within the dashboard
- Picks products from search results to add
- Stock defaults to 10 (Amazon search results don't return stock level)

---

## Key API endpoints

| Endpoint | What it does |
|---|---|
| `GET /api/products` | List all active products |
| `PUT /api/products/{id}` | Update product |
| `DELETE /api/products/{id}` | Soft-delete to recycle bin |
| `GET /api/margin-rules` | Get tiered markup config |
| `PUT /api/margin-rules` | Save rules + recalculate all product COP prices |
| `POST /api/admin/recalculate-prices` | Recalculate COP for all products |
| `GET /api/meli/exchange-rate` | Current USD→COP rate |
| `POST /api/meli/publish/{id}` | Publish one product to ML |
| `POST /api/meli/publish-all` | Batch publish (default limit 50) |
| `GET /api/amazon/search` | Search Amazon |
| `POST /api/amazon/import-asins` | Import by ASIN list |
| `POST /api/amazon/add-from-search` | Import from search picks |
| `GET /api/sync/history` | Last 20 sync runs |
| `POST /api/sync/run` | Trigger manual re-sync |

---

## Constants (frontend)
```js
const SHIPPING  = 8;   // USD — fixed cost added to every ML price
const INSURANCE = 5;   // USD — fixed cost added to every ML price
```
These are defined locally in Dashboard.jsx, Products.jsx, and MarginConfig.jsx.

---

## Things removed / not present
- There is **no Settings page** — it was removed. The `/settings` route, Settings.jsx, and related i18n keys no longer exist. The `Setting` DB model still exists in the backend but is unused by the frontend.
- The `getSettings` and `updateSettings` functions were removed from `api.js`.
