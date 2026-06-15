# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Meli Sync
**Generated:** 2026-06-15
**Category:** B2B SaaS — Data-Dense Seller Dashboard (Amazon → MercadoLibre Sync)
**Style:** Dark Mode OLED
**Stack:** React 19 + Tailwind CSS

---

## Global Rules

### Color Palette

| Role | Hex | Tailwind Equiv | CSS Variable | Usage |
|------|-----|----------------|--------------|-------|
| Background | `#020617` | `slate-950` | `--color-bg` | Page background (OLED black) |
| Surface | `#0F172A` | `slate-900` | `--color-surface` | Cards, sidebar, panels |
| Surface Elevated | `#1E293B` | `slate-800` | `--color-surface-elevated` | Dropdowns, modals, hover rows |
| Border | `#334155` | `slate-700` | `--color-border` | Dividers, card borders, inputs |
| Primary | `#3B82F6` | `blue-500` | `--color-primary` | Links, active nav, selected state |
| Primary Dark | `#1D4ED8` | `blue-700` | `--color-primary-dark` | Primary button bg |
| CTA / Accent | `#F59E0B` | `amber-500` | `--color-cta` | CTA buttons, publish, key actions |
| Text Primary | `#F8FAFC` | `slate-50` | `--color-text` | Headings, labels, primary content |
| Text Muted | `#94A3B8` | `slate-400` | `--color-text-muted` | Secondary text, timestamps, hints |
| Text Disabled | `#475569` | `slate-600` | `--color-text-disabled` | Placeholder, disabled state |
| Success | `#22C55E` | `green-500` | `--color-success` | Published status, price up, synced |
| Error | `#EF4444` | `red-500` | `--color-error` | Failed sync, blocked products |
| Warning | `#F59E0B` | `amber-500` | `--color-warning` | Pending, price stale, low stock |
| Info | `#38BDF8` | `sky-400` | `--color-info` | Informational badges, tooltips |

**Color Notes:** OLED-safe near-black background. Blue primary for data hierarchy. Amber CTA for seller actions (publish, sync). Green/red for ML status indicators.

---

### Typography

- **Heading Font:** Fira Code (weights: 400, 500, 600, 700)
- **Body Font:** Fira Sans (weights: 300, 400, 500, 600, 700)
- **Mood:** Technical, precise, dashboard-native, data-dense
- **Best For:** Admin panels, analytics dashboards, data tables, code-adjacent tools
- **Google Fonts:** [Fira Code + Fira Sans](https://fonts.google.com/share?selection.family=Fira+Code:wght@400;500;600;700|Fira+Sans:wght@300;400;500;600;700)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
```

**Type Scale:**
| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `text-xs` | 11px | 400 | Badge labels, table metadata |
| `text-sm` | 13px | 400 | Table cells, secondary labels |
| `text-base` | 15px | 400 | Body text, form inputs |
| `text-lg` | 18px | 600 | Card titles, section headers |
| `text-xl` | 22px | 700 | KPI stat values |
| `text-2xl` | 28px | 700 | Page titles |
| `text-3xl` | 36px | 700 | Hero/large KPI numbers |

**Rules:**
- Line height: `1.5` for body text, `1.2` for headings
- Use Fira Code for: ASIN codes, prices, numeric values, status codes
- Use Fira Sans for: all prose, labels, descriptions, nav items
- Max line length: 72 characters for readable descriptions

---

### Spacing System

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` | Icon gaps, badge padding |
| `--space-sm` | `8px` | Inline spacing, tight rows |
| `--space-md` | `16px` | Card padding, standard gaps |
| `--space-lg` | `24px` | Section padding |
| `--space-xl` | `32px` | Page section gaps |
| `--space-2xl` | `48px` | Major layout gaps |

---

### Shadow System (Dark Mode)

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.4)` | Subtle card lift |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.5)` | Cards, dropdowns |
| `--shadow-lg` | `0 10px 30px rgba(0,0,0,0.6)` | Modals, floating panels |
| `--shadow-glow-blue` | `0 0 12px rgba(59,130,246,0.3)` | Active element highlight |
| `--shadow-glow-amber` | `0 0 12px rgba(245,158,11,0.3)` | CTA button hover |

---

### Z-Index Scale

| Level | Value | Usage |
|-------|-------|-------|
| `--z-base` | `0` | Default content |
| `--z-dropdown` | `10` | Dropdowns, tooltips |
| `--z-sticky` | `20` | Sticky table headers, top bar |
| `--z-sidebar` | `30` | Sidebar overlay on mobile |
| `--z-modal` | `50` | Modals, dialogs |
| `--z-toast` | `60` | Toast notifications |

---

## Component Specs

### Buttons

```css
/* Primary CTA — Publish / Sync actions */
.btn-primary {
  background: #F59E0B;
  color: #020617;
  padding: 10px 20px;
  border-radius: 8px;
  font-family: 'Fira Sans', sans-serif;
  font-weight: 600;
  font-size: 14px;
  transition: all 200ms ease;
  cursor: pointer;
  border: none;
}
.btn-primary:hover {
  background: #D97706;
  box-shadow: 0 0 12px rgba(245,158,11,0.3);
}
.btn-primary:disabled {
  background: #475569;
  color: #94A3B8;
  cursor: not-allowed;
  box-shadow: none;
}

/* Secondary — navigation actions, filters */
.btn-secondary {
  background: transparent;
  color: #3B82F6;
  border: 1px solid #334155;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  transition: all 200ms ease;
  cursor: pointer;
}
.btn-secondary:hover {
  background: #1E293B;
  border-color: #3B82F6;
}

/* Danger — delete, block */
.btn-danger {
  background: transparent;
  color: #EF4444;
  border: 1px solid #EF4444;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 200ms ease;
  cursor: pointer;
}
.btn-danger:hover {
  background: rgba(239,68,68,0.1);
}
```

### Cards / Panels

```css
.card {
  background: #0F172A;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  transition: border-color 200ms ease, box-shadow 200ms ease;
}
.card:hover {
  border-color: #3B82F6;
  box-shadow: 0 4px 20px rgba(59,130,246,0.15);
}

/* KPI stat card */
.card-stat {
  background: #0F172A;
  border: 1px solid #1E293B;
  border-radius: 12px;
  padding: 20px 24px;
}
.card-stat-value {
  font-family: 'Fira Code', monospace;
  font-size: 28px;
  font-weight: 700;
  color: #F8FAFC;
}
.card-stat-label {
  font-size: 12px;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

### Data Tables

```css
.table-wrapper {
  overflow-x: auto; /* Required — prevents horizontal scroll breakage */
  border: 1px solid #334155;
  border-radius: 12px;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.table thead th {
  background: #1E293B;
  color: #94A3B8;
  font-family: 'Fira Sans', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.06em;
  padding: 12px 16px;
  text-align: left;
  position: sticky;
  top: 0;
  z-index: 20;
}
.table tbody tr {
  border-bottom: 1px solid #1E293B;
  transition: background 150ms ease;
  cursor: pointer;
}
.table tbody tr:hover {
  background: #1E293B;
}
.table tbody td {
  padding: 12px 16px;
  color: #F8FAFC;
  vertical-align: middle;
}
/* Numeric / code cells use monospace */
.table td.cell-mono {
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: #94A3B8;
}
/* Multi-select checkbox column */
.table-checkbox-col { width: 40px; }
```

### Status Badges

```css
.badge { padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
.badge-published  { background: rgba(34,197,94,0.15);  color: #22C55E; border: 1px solid rgba(34,197,94,0.3); }
.badge-pending    { background: rgba(245,158,11,0.15); color: #F59E0B; border: 1px solid rgba(245,158,11,0.3); }
.badge-blocked    { background: rgba(239,68,68,0.15);  color: #EF4444; border: 1px solid rgba(239,68,68,0.3); }
.badge-syncing    { background: rgba(59,130,246,0.15); color: #3B82F6; border: 1px solid rgba(59,130,246,0.3); }
```

### Inputs & Forms

```css
.input {
  background: #0F172A;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #F8FAFC;
  font-family: 'Fira Sans', sans-serif;
  font-size: 14px;
  padding: 10px 14px;
  width: 100%;
  transition: border-color 200ms ease, box-shadow 200ms ease;
}
.input::placeholder { color: #475569; }
.input:focus {
  outline: none;
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
}
.input:disabled {
  background: #1E293B;
  color: #475569;
  cursor: not-allowed;
}
.input-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  position: fixed; inset: 0;
  z-index: 50;
  display: flex; align-items: center; justify-content: center;
}
.modal {
  background: #0F172A;
  border: 1px solid #334155;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.6);
  max-width: 540px;
  width: 90%;
}
.modal-title {
  font-family: 'Fira Code', monospace;
  font-size: 18px;
  font-weight: 600;
  color: #F8FAFC;
  margin-bottom: 16px;
}
```

### Sidebar Navigation

```css
.sidebar {
  width: 240px;
  background: #0F172A;
  border-right: 1px solid #1E293B;
  height: 100vh;
  position: fixed;
  left: 0; top: 0;
  padding: 20px 12px;
  display: flex; flex-direction: column;
  z-index: 30;
}
.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #94A3B8;
  font-size: 14px;
  font-weight: 500;
  transition: all 150ms ease;
  cursor: pointer;
  text-decoration: none;
}
.nav-item:hover {
  background: #1E293B;
  color: #F8FAFC;
}
.nav-item.active {
  background: rgba(59,130,246,0.15);
  color: #3B82F6;
  border: 1px solid rgba(59,130,246,0.2);
}
.nav-item svg { width: 18px; height: 18px; flex-shrink: 0; }
```

### Toast Notifications

```css
.toast {
  position: fixed; bottom: 24px; right: 24px;
  z-index: 60;
  background: #1E293B;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 14px 18px;
  font-size: 14px;
  color: #F8FAFC;
  box-shadow: 0 10px 30px rgba(0,0,0,0.6);
  max-width: 360px;
  display: flex; align-items: center; gap: 10px;
}
.toast-success { border-left: 3px solid #22C55E; }
.toast-error   { border-left: 3px solid #EF4444; }
.toast-warning { border-left: 3px solid #F59E0B; }
```

---

## Charts & Data Visualization

**Recommended library:** Recharts (already React-native, tree-shakable)

| Data Type | Chart | Colors |
|-----------|-------|--------|
| Sync history over time | Line chart | Primary `#3B82F6`, stroke 2px |
| Price vs Amazon price | Area chart (stacked) | Blue + Amber, opacity 0.2 fill |
| Product status breakdown | Donut chart | Green/Amber/Red per status |
| Revenue trend | Bar chart | `#3B82F6` bars, `#1E293B` background |
| Sync success rate | Radial gauge | Green `#22C55E`, track `#1E293B` |

**Chart rules:**
- Grid lines: `#1E293B` (subtle, never white)
- Axis labels: `#475569`, 11px Fira Sans
- Tooltip bg: `#1E293B`, border `#334155`
- No 3D charts — accuracy over style in data-dense dashboards
- Always provide a data table fallback for accessibility

---

## Layout

### Page Structure
```
[Sidebar 240px fixed] | [Main content area — margin-left: 240px]
                          [Top bar — sticky, z-20]
                          [Page content — padding: 24px]
```

### Grid for KPI Cards
```css
/* 4-column stat grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px)  { .stats-grid { grid-template-columns: 1fr; } }
```

### Breakpoints
| Name | Width | Behavior |
|------|-------|----------|
| mobile | 375px | Sidebar collapses to hamburger overlay |
| tablet | 768px | Sidebar collapses, 2-col KPI grid |
| desktop | 1024px | Full sidebar visible, 4-col KPI grid |
| wide | 1440px | Max content width `max-w-7xl` |

---

## Style Guidelines

**Style:** Dark Mode OLED

**Key Effects:**
- Minimal glow on active states: `box-shadow: 0 0 12px rgba(59,130,246,0.3)`
- Subtle `backdrop-filter: blur(8px)` on modals and overlays
- No heavy glass effects on data-dense tables — hurts readability
- Use `border` separators over box shadows for panels inside dark surfaces
- `transition: all 200ms ease` as default for interactive elements

**Page Pattern:** Admin Dashboard (not marketplace — ignore marketplace CTA pattern from initial generation)
- Sidebar nav → Page content with sticky topbar
- Dense data tables as primary content
- KPI stat cards above tables
- Action buttons in topbar or inline table row actions

---

## React-Specific Rules

| Rule | Guideline |
|------|-----------|
| Long product lists | Virtualize with `react-window` or `@tanstack/react-virtual` when > 100 rows |
| State batching | Let React 18 auto-batch; avoid `flushSync` |
| Price calculations | Always compute live from margin rules + exchange rate — never trust `converted_price_cop` from DB (may be stale) |
| Loading states | Skeleton screens matching table row height, not generic spinners |
| Bulk actions | Checkbox column + floating action bar — never repeated per-row action menus for bulk ops |

---

## Anti-Patterns (Do NOT Use)

- ❌ Light background on any surface (`#F8FAFC` as background — this is for text only)
- ❌ Emojis as icons — use Lucide React icons only
- ❌ `scale()` transforms on table row hover — causes layout shift
- ❌ Missing `cursor-pointer` on clickable rows, cards, buttons
- ❌ Low-contrast muted text — `#94A3B8` is the minimum for secondary text
- ❌ Instant state changes — always use `transition` (150–300ms)
- ❌ Invisible focus states — `outline: 2px solid #3B82F6; outline-offset: 2px`
- ❌ Rendering 500+ product rows without virtualization
- ❌ Hardcoded prices — always calculate live from margin rules
- ❌ `border-white/10` borders — too transparent on dark surfaces, use `#334155`

---

## Pre-Delivery Checklist

### Visual Quality
- [ ] All backgrounds use `#020617` / `#0F172A` / `#1E293B` hierarchy
- [ ] No light-theme surfaces or `#F8FAFC` as background
- [ ] No emojis as icons — Lucide React only
- [ ] Status badges use correct color tokens (green/amber/red)
- [ ] Numeric values use Fira Code font
- [ ] Brand: MercadoLibre logo yellow `#FFE600`, Amazon orange `#FF9900`

### Interaction
- [ ] `cursor-pointer` on all clickable rows, cards, buttons
- [ ] Hover states on table rows (`background: #1E293B`)
- [ ] All transitions 150–300ms
- [ ] Buttons disabled during async operations (publish, sync)
- [ ] Focus rings visible (`outline: 2px solid #3B82F6`)

### Data & Tables
- [ ] `overflow-x: auto` wrapper on all tables
- [ ] Sticky table headers (`position: sticky; top: 0`)
- [ ] Skeleton loaders (not spinners) for table loading states
- [ ] Bulk action checkbox column present
- [ ] Prices calculated live — not from stale DB value

### Accessibility
- [ ] All images have `alt` text
- [ ] Form inputs have associated `<label>`
- [ ] Color alone never conveys status — pair with icon or text label
- [ ] `prefers-reduced-motion` respected

### Responsive
- [ ] Sidebar collapses on mobile (hamburger menu)
- [ ] Tables scroll horizontally on mobile (`overflow-x: auto`)
- [ ] Touch targets minimum 44×44px
- [ ] No horizontal page scroll at 375px viewport
- [ ] Test at: 375px, 768px, 1024px, 1440px
