# Meli-Sync

A full-stack dashboard for importing products from Amazon and reselling them on **Mercado Libre** (Colombia). Handles the complete pipeline — product import, automatic pricing in COP, publishing to Mercado Libre, and daily price re-sync.

---

## Features

- **3 ways to import products from Amazon**
  - Manually: fill in ASIN, title, description, price, and images
  - By ASIN: paste one or more ASINs (or Amazon URLs) and fetch data automatically via RapidAPI
  - By search: search Amazon directly from the dashboard and pick products to import

- **Automatic COP pricing**
  - Tiered markup rules by price range (fully configurable)
  - Fixed shipping ($8 USD) and insurance ($5 USD) added on top
  - Real-time USD → COP conversion (rate cached daily from open.er-api.com)
  - Prices always calculated live — never stale

- **Mercado Libre publishing**
  - OAuth 2.0 integration (token auto-refreshes)
  - Publish one product or batch-publish all pending
  - Automatic ML category prediction from product title

- **Daily re-sync**
  - Scheduled job updates prices and stock on all published listings every night

- **Blacklist**
  - Block products by brand or keyword
  - Blacklisted products are imported as "blocked" instead of rejected outright

- **Product management**
  - Edit title, description, price, images, stock
  - Soft-delete with recycle bin (restore or permanently delete)
  - Category tree for organizing products

- **Dashboard**
  - Stats: total products, published, pending, blocked
  - Per-product: Amazon price (USD + COP), ML price (USD + COP), profit (USD + COP), markup %
  - Sync history log

- **Bilingual UI** — English and Spanish

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, SQLModel, SQLite |
| Frontend | React 19, Vite, Tailwind CSS |
| HTTP client | Axios |
| Routing | react-router-dom |
| Translations | i18next (EN / ES) |
| Scheduling | APScheduler |
| Blacklist matching | pyahocorasick |
| Amazon data | RapidAPI — Real-Time Amazon Data |
| Mercado Libre | Official ML API (OAuth 2.0) |
| Exchange rate | open.er-api.com |

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- A [RapidAPI](https://rapidapi.com) key subscribed to **Real-Time Amazon Data**
- A Mercado Libre developer app (for OAuth)

---

## Setup

### 1. Clone and configure environment

```bash
git clone <repo-url>
cd meli-sync
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=sqlite:///./meli_sync.db
RAPIDAPI_KEY=your_rapidapi_key_here
RAPIDAPI_HOST=real-time-amazon-data.p.rapidapi.com
JWT_SECRET=your-secret-key-change-this
```

### 2. Start the backend

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The dashboard will open at `http://localhost:5173` (or `5174` if that port is busy).

---

## How pricing works

```
profit       = amazon_price × markup_pct / 100
ml_price_usd = amazon_price + profit + $8 (shipping) + $5 (insurance)
ml_price_cop = round(ml_price_usd × exchange_rate / 100) × 100
```

**Profit is the markup amount only.** Shipping and insurance are costs passed to the buyer — they are not counted as profit.

Markup tiers are configured on the **Margin Rules** page. If a product's price falls between two ranges, the system rounds up to the next range.

Default tiers seeded on first run:

| Price range | Markup |
|---|---|
| $1 – $30 | 100% |
| $30 – $60 | 90% |
| $60 – $100 | 80% |
| $100+ | 70% |

---

## Project structure

```
meli-sync/
├── app/
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Environment variable config
│   ├── models.py               # Database models (SQLModel)
│   ├── database.py             # DB session & migrations
│   ├── routers/
│   │   ├── manual_products.py  # Product CRUD, blacklist, margin rules, recycle bin
│   │   ├── amazon.py           # Amazon import endpoints
│   │   ├── meli.py             # Mercado Libre OAuth & publishing
│   │   ├── sync.py             # Manual sync trigger & history
│   │   └── categories.py       # Category tree CRUD
│   └── services/
│       ├── pricing.py          # Markup calculation, exchange rate, COP rounding
│       ├── amazon.py           # RapidAPI integration
│       ├── mercadolibre.py     # ML OAuth, publish, update listings
│       ├── publisher.py        # Publish orchestration
│       ├── blacklist.py        # Aho-Corasick blacklist filter
│       └── scheduler.py        # APScheduler daily re-sync job
└── frontend/
    └── src/
        ├── api.js              # All Axios API functions
        ├── App.jsx             # Route definitions
        ├── pages/              # One file per page/screen
        ├── components/         # Shared UI components (Layout, nav)
        └── i18n/               # en.js and es.js translation strings
```

---

## API reference (key endpoints)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products` | List all active products |
| `POST` | `/api/manual/product` | Add a product manually |
| `PUT` | `/api/products/{id}` | Update product fields |
| `DELETE` | `/api/products/{id}` | Soft-delete to recycle bin |
| `GET` | `/api/margin-rules` | Get tiered markup config |
| `PUT` | `/api/margin-rules` | Save rules and recalculate all prices |
| `POST` | `/api/admin/recalculate-prices` | Recalculate COP prices for all products |
| `GET` | `/api/meli/exchange-rate` | Current USD → COP rate |
| `GET` | `/api/meli/auth-url` | Start Mercado Libre OAuth flow |
| `POST` | `/api/meli/publish/{id}` | Publish one product to ML |
| `POST` | `/api/meli/publish-all` | Batch publish pending products |
| `GET` | `/api/amazon/search` | Search Amazon products |
| `POST` | `/api/amazon/import-asins` | Import products by ASIN list |
| `POST` | `/api/amazon/add-from-search` | Import selected search results |
| `GET` | `/api/sync/history` | Last 20 sync run logs |
| `POST` | `/api/sync/run` | Trigger a manual re-sync now |

Full interactive docs available at `http://localhost:8000/docs` when the backend is running.

---

## Product lifecycle

```
Import (manual / ASIN / search)
        │
        ▼
   Blacklist check
        │
   ┌────┴────┐
blocked    pending
              │
              ▼
         Publish to ML
              │
              ▼
          published ──► daily re-sync updates price/stock
              │
       soft-delete
              │
              ▼
         recycle bin ──► restore  or  permanent delete
```

---

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite or PostgreSQL connection string |
| `RAPIDAPI_KEY` | RapidAPI key for Amazon data |
| `RAPIDAPI_HOST` | RapidAPI host (`real-time-amazon-data.p.rapidapi.com`) |
| `JWT_SECRET` | Secret key for internal JWT signing |
