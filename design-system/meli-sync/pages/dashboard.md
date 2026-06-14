# Dashboard Page — Design Overrides

> Overrides `design-system/meli-sync/MASTER.md` for `/dashboard` only.
> Rules here take precedence over MASTER. Unmentioned rules inherit from MASTER.

---

**Page:** Dashboard (`/dashboard`)
**Last updated:** 2026-06-15 (second-pass rewrite)

---

## Layout Structure

```
[Page header: gradient title + Live pill + clock widget]
[Auto-sync OFF banner — conditional, amber, glassmorphism]
[Bento KPI grid — 12 columns, asymmetric spans]
  Row 1: Total Products (col-5, hero) | Published (col-4, featured) | Status Donut (col-3)
  Row 2: Blocked (col-3, compact) | Pending (col-3, compact) | Exchange Rate (col-6, glass+sparkline)
[ML Overview (col-8) + secondary stats stacked (col-4)]
[Secondary stat pills row — 4 even columns]
[Products table — full width, filterable, sortable, paginated]
```

---

## StatCard — Three Variants

### Hero (`variant="hero"`)
- Used for: **Total Products** (most important KPI)
- Card class: `.card-feature` + `.gradient-border`
- Number size: **72px** Fira Code, gradient text (`#F8FAFC → accentColor`)
- Watermark icon: `size={200}` at `opacity: 0.045`, positioned `right: -24, top: -24`
- Ambient glow: `radial-gradient(circle, {accentColor}1a 0%, transparent 70%)` bottom-left
- Min height: `180px`
- Hover: gradient-border glow + `var(--shadow-xl), var(--shadow-glow-blue)`

### Featured (`variant="featured"`)
- Used for: **Published** count, **Exchange Rate** card (custom layout)
- Card class: `.card-glass` with accent-color border tint (`{accentColor}20`)
- Number size: **52px** Fira Code, solid accent color (no gradient text)
- Accent strip: 2px top strip `linear-gradient(90deg, {accentColor}, {accentColor}44, transparent)`
- Hover: border tightens to `{accentColor}45`, ambient box-shadow `{accentColor}14`

### Compact (`variant="compact"`)
- Used for: **Blocked**, **Pending** (lesser-weight stats)
- Horizontal layout: icon pill (left) + label/number (right)
- Number size: **30px** Fira Code, solid accent color
- Number never uses gradient text — compact cards de-emphasize with direct color
- Background: `rgba(255,255,255,0.025)` + `backdrop-filter: blur(20px)`
- Hover: background lifts to `rgba(255,255,255,0.04)`, border brightens

---

## KPI Card Hierarchy

| Card | Variant | Col Span | Accent Color |
|------|---------|----------|--------------|
| Total Products | hero | 5 | `#3B82F6` (blue) |
| Published | featured | 4 | `#22C55E` (green) |
| Status Donut | custom | 3 | multi-color legend |
| Blocked | compact | 3 | `#EF4444` (red) |
| Pending | compact | 3 | `#F59E0B` (amber) |
| Exchange Rate | custom | 6 | `#3B82F6` + violet sparkline |

Visual weight descends: hero > featured > compact. Donut is unique — equal weight to featured.

---

## Status Donut Card (page-specific)

Positioned in top row, 3-column span. Renders `<DonutRing>` SVG + legend table.

- Ring radius: `r=38`, stroke-width: `8`
- Segments: green (published) → amber (pending) → red (blocked)
- Center label: total count in Fira Code `22px` + "TOTAL" label in Plus Jakarta Sans `9px`
- Legend: 3 rows, each `flex justify-between` with dot + label + Fira Code count
- Transitions: `stroke-dasharray 1.1s ease-out` staggered (`0s`, `0.1s`, `0.2s`)

---

## Exchange Rate Card (page-specific)

Left: rate info panel + Live pill badge
Right: 45% width SVG sparkline (decorative, opacity 0.7)

Rate number: **48px** Fira Code, gradient text `linear-gradient(135deg, #93C5FD 0%, #818CF8 100%)`
Inner ambient glow: `radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)` top-right
Sparkline: `.sparkline-draw` draw-in animation, blue `#3B82F6`, fill with `url(#spark-fill2)`

---

## ML Overview Panel

- Two sub-cards side by side:
  - **Active on ML**: green tinted `rgba(34,197,94,0.06)`, 42px Fira Code green number
  - **Added 24h**: blue tinted `rgba(59,130,246,0.06)`, 42px Fira Code blue number, trend icon
- Trend: `<TrendingUp>` / `<TrendingDown>` / `<Minus>` Lucide icons with color-matched label
- Section header uses `<Activity>` icon + `ACTIVITY` label (Plus Jakarta Sans caps)

---

## Secondary Stats Row (4 columns)

Pills style: `rgba(255,255,255,0.02)` base, `backdrop-filter: blur(16px)`, subtle border
- Sales This Month, Sync Runs Today, Out-of-Stock count, Failed syncs
- 24px Fira Code numbers; 11px Plus Jakarta Sans subtext
- Hover: background lifts, border accent brightens
- Failed count turns red when > 0

---

## Needs Attention + Avg Margin Cards (right stacked)

Stacked in the 4-col right column next to ML Overview.
- OOS card: accent color adapts: green (0 OOS), amber (OOS but not published), red (OOS + published on ML)
- Margin card: gradient text `#93C5FD → #818CF8`, trend icon reads recent vs older products
- Both: `flex-1` to split height evenly

---

## Products Table

- Table topbar: `<BarChart3>` icon + title + `View All` link (blue pill button)
- Filter tabs: colored bottom-border on active tab, accent color per status
- Sort button: "Sort by Latest" chip with `<Clock>` icon, right-aligned in tab row
- ASIN cells: `<code>` badge, indigo `rgba(99,102,241,0.1)` tint, Fira Code
- Category: two-line display (top-level dimmed + leaf node badge)
- Row hover: `rgba(59,130,246,0.025)` — very subtle, no layout shift
- Pagination: icon-only First/Prev/Next/Last (Lucide), gradient active page pill

### Column Sort Buttons
- 10px Plus Jakarta Sans, bold, uppercase, 0.08em letter-spacing
- `<ArrowUpDown>` icon at 35% opacity unless active
- Active: `#93C5FD` blue, icon fully opaque

---

## Page Header

- Title: Fira Code 30px, gradient `linear-gradient(135deg, #F8FAFC 0%, #93C5FD 100%)`
- Live pill: green `#4ADE80` + `pulse-dot` animated dot, `rgba(34,197,94,0.1)` bg
- Clock widget: Fira Code 20px time + Plus Jakarta Sans 11px date, glass background

---

## Signature Touch — LiveBar

Position: `top: 0` of `<main>` in Layout.jsx (absolute, `position: absolute`).
Height: `2px`.
Base: `linear-gradient(90deg, #1D4ED8, #334155 60%, transparent)` — faint blue baseline.
Sweep: amber `rgba(245,158,11,0.95)` glow travels left→right, `3.2s ease-in-out infinite`.
Disabled when: `prefers-reduced-motion: reduce`.

---

## Motion Spec

| Element | Duration | Easing | Notes |
|---------|----------|--------|-------|
| Card entrance (fadeUp) | 450ms | `cubic-bezier(0.16,1,0.3,1)` | Stagger: 80ms per class |
| KPI count-up | 900ms | Cubic ease-out `(1-(1-t)³)` | Logic untouched from original |
| Sparkline draw | 1000ms | `cubic-bezier(0.16,1,0.3,1)` | 500ms delay |
| DonutRing segments | 1100ms | ease-out | Staggered 0/100/200ms |
| LiveBar sweep | 3200ms | ease-in-out | Infinite |
| Card border hover | 200–220ms | ease | All interactive cards |
| Table row hover bg | 150ms | ease | No scale, no layout shift |

## Accessibility Checklist

- [x] Live badge: `pulse-dot` animation + text "LIVE" — color not sole indicator
- [x] All icon-only pagination buttons have `aria-label`
- [x] Sync banner links to `/sync` via `<Link>` — not dismissible
- [x] Table sort buttons are `<button>` with `:focus-visible` ring
- [x] Empty state: `<Inbox>` icon + text (not just empty space)
- [x] Error state: `<AlertTriangle>` icon + text message
- [x] Donut ring: legend table — color not the only indicator
- [x] Product images: `alt=""` (decorative) + `<ImageIcon>` fallback
- [x] `prefers-reduced-motion` — all animations disabled via global rule in index.css
