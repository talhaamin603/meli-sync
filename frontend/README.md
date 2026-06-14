# Meli-Sync — Frontend

The React dashboard for the Meli-Sync project. Provides the UI for importing products from Amazon, configuring pricing rules, publishing to Mercado Libre, and managing the catalog.

Connects to the FastAPI backend at `http://localhost:8000` by default.

---

## Tech stack

| | |
|---|---|
| Framework | React 19 |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 3 |
| Routing | react-router-dom 7 |
| HTTP | Axios |
| Translations | i18next + react-i18next (English / Spanish) |

---

## Getting started

```bash
# from the meli-sync/frontend directory
npm install
npm run dev
```

Opens at `http://localhost:5173` (falls back to `5174` if that port is in use).

The backend must be running on port 8000 for the dashboard to work — see the root README for backend setup.

---

## Available scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

---

## Environment variables

Create a `.env` file in this directory if you need to point the frontend at a different backend URL:

```env
VITE_API_URL=http://localhost:8000/api
```

If the variable is not set, it defaults to `http://localhost:8000/api`.

---

## Pages and routes

| Route | Page | Description |
|---|---|---|
| `/login` | `Login.jsx` | Mercado Libre OAuth entry point |
| `/dashboard` | `Dashboard.jsx` | Stats overview, product table, sync history |
| `/products` | `Products.jsx` | Full product catalog (table + grid view) |
| `/products/:id/edit` | `ProductEdit.jsx` | Edit a product's details, images, price, stock |
| `/add` | `AddProductHub.jsx` | Choose how to add products |
| `/add/manual` | `AddProduct.jsx` | Manually enter ASIN, title, price, images |
| `/add/asin` | `ImportAsins.jsx` | Paste ASINs or Amazon URLs to bulk import |
| `/add/search` | `SearchAmazon.jsx` | Search Amazon and pick products to import |
| `/blacklist` | `Blacklist.jsx` | Manage blocked brands and keywords |
| `/recycle-bin` | `RecycleBin.jsx` | Restore or permanently delete removed products |
| `/margin-config` | `MarginConfig.jsx` | Configure tiered markup rules + price calculator |
| `/categories` | `Categories.jsx` | Manage hierarchical product categories |

---

## Source structure

```
frontend/
├── public/
├── src/
│   ├── main.jsx            # React entry point, router, i18n setup
│   ├── App.jsx             # Route definitions
│   ├── api.js              # All Axios API functions (single source of truth)
│   ├── index.css           # Global styles and Tailwind directives
│   ├── App.css             # App-level animation/style overrides
│   ├── assets/             # Static images and icons
│   ├── components/
│   │   ├── Layout.jsx      # Sidebar nav, outlet, language toggle
│   │   └── LangToggle.jsx  # EN / ES switcher
│   ├── i18n/
│   │   ├── index.js        # i18next configuration
│   │   ├── en.js           # English strings
│   │   └── es.js           # Spanish strings
│   └── pages/              # One file per route (listed above)
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## API layer (`src/api.js`)

All backend calls go through `src/api.js`. It exports named async functions — pages import only what they need. The Axios instance is created once with the base URL from `VITE_API_URL`.

| Function | Endpoint |
|---|---|
| `getProducts()` | `GET /products` |
| `addManualProduct(data)` | `POST /manual/product` |
| `updateProduct(id, data)` | `PUT /products/{id}` |
| `deleteProduct(id)` | `DELETE /products/{id}` |
| `syncProduct(id)` | `POST /meli/publish/{id}` |
| `getMarginRules()` | `GET /margin-rules` |
| `updateMarginRules(rules)` | `PUT /margin-rules` |
| `recalculatePrices()` | `POST /admin/recalculate-prices` |
| `getExchangeRate()` | `GET /meli/exchange-rate` |
| `getRecycleBin()` | `GET /recycle-bin` |
| `restoreProduct(id)` | `POST /recycle-bin/{id}/restore` |
| `permanentDeleteProduct(id)` | `DELETE /recycle-bin/{id}` |
| `emptyRecycleBin()` | `DELETE /recycle-bin` |
| `restoreAllProducts()` | `POST /recycle-bin/restore-all` |
| `getBlacklist()` | `GET /blacklist` |
| `addBlacklistTerm(term)` | `POST /blacklist` |
| `deleteBlacklistTerm(id)` | `DELETE /blacklist/{id}` |
| `getCategories()` | `GET /categories` |
| `createCategory(name, parent_id)` | `POST /categories` |
| `updateCategory(id, name)` | `PUT /categories/{id}` |
| `deleteCategory(id)` | `DELETE /categories/{id}` |
| `searchAmazon(q, page)` | `GET /amazon/search` |
| `addFromSearch(products, category_id)` | `POST /amazon/add-from-search` |
| `refetchImages()` | `POST /amazon/refetch-images` |
| `getSyncHistory()` | `GET /sync/history` |

---

## Pricing logic (frontend)

Prices are calculated **live** in the frontend using the current margin rules and exchange rate — never from stale stored values.

```js
const SHIPPING  = 8;   // USD
const INSURANCE = 5;   // USD

function calcPrice(amazonUsd, rules, rate) {
  // find matching rule (rounds up to next range if no exact match)
  const rule = rules.find(r => r.min_price <= amazonUsd && amazonUsd <= r.max_price)
            || rules.find(r => r.min_price > amazonUsd)
            || rules[rules.length - 1];

  const profit  = amazonUsd * (rule.markup_pct / 100);
  const mlUsd   = amazonUsd + profit + SHIPPING + INSURANCE;
  const mlCop   = Math.round(mlUsd * rate / 100) * 100;   // nearest 100 COP

  return { mlUsd, mlCop, profit, markupPct: rule.markup_pct };
}
```

This same logic runs in `Dashboard.jsx`, `Products.jsx`, and `MarginConfig.jsx`.

---

## Translations

The UI supports English and Spanish. Strings live in `src/i18n/en.js` and `src/i18n/es.js`. The language toggle in the sidebar switches between them instantly without a page reload.

To add a new translated string:
1. Add the key + English value to `en.js`
2. Add the same key + Spanish value to `es.js`
3. Use `const { t } = useTranslation()` and call `t("yourKey")` in the component

---

## Production build

```bash
npm run build
```

Output goes to `frontend/dist/`. Serve it with any static file server or configure your backend to serve it directly.

To preview the build locally before deploying:

```bash
npm run preview
```
