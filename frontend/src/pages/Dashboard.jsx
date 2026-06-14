import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { getProducts, getExchangeRate, getSyncHistory, getMarginRules, getSyncSettings } from "../api.js";
import { calcPrice } from "../utils/pricing.js";

/* ─── Status badge ─────────────────────────────────────────── */
function DashboardStatusBadge({ status, stock }) {
  const { t } = useTranslation();
  if (stock === 0) {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1"
        style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", borderColor: "rgba(239,68,68,0.25)" }}>
        <span className="w-1.5 h-1.5 rounded-full inline-block bg-red-500" />
        {t("outOfStockLabel")}
      </span>
    );
  }
  const map = {
    published: { bg: "rgba(34,197,94,0.12)",  fg: "#22c55e", border: "rgba(34,197,94,0.25)",  label: t("activeLabel") },
    blocked:   { bg: "rgba(239,68,68,0.12)",  fg: "#ef4444", border: "rgba(239,68,68,0.25)",  label: t("blocked") },
    failed:    { bg: "rgba(245,158,11,0.12)", fg: "#f59e0b", border: "rgba(245,158,11,0.25)", label: t("syncFailedLabel") },
    pending:   { bg: "rgba(80,160,250,0.12)", fg: "#50A0FA", border: "rgba(80,160,250,0.25)", label: t("pending") },
  };
  const s = map[status] || map.pending;
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1"
      style={{ background: s.bg, color: s.fg, borderColor: s.border }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.fg }} />
      {s.label}
    </span>
  );
}

/* ─── Animated stat card ────────────────────────────────────── */
function StatCard({ label, value, iconColor, iconBg, icon, subtext, accentColor, delay }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const start = Date.now();
    const duration = 900;
    const id = setInterval(() => {
      const elapsed = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setDisplay(Math.round(value * eased));
      if (elapsed >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [value]);

  return (
    <div
      className="relative rounded-xl overflow-hidden group transition-all duration-300 hover:-translate-y-1"
      style={{
        animation: `fadeUp 0.6s ease-out ${delay}s backwards`,
        background: "linear-gradient(135deg, rgba(80,160,250,0.04) 0%, rgba(16,21,31,0.7) 100%)",
        border: "1px solid rgba(80,160,250,0.12)",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${accentColor}55`; e.currentTarget.style.boxShadow = `0 8px 32px ${accentColor}18`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(80,160,250,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}80, transparent)` }} />

      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 130%, ${accentColor}18, transparent 70%)` }}
      />

      <div className="p-5 relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[10px] text-[#6b7785] uppercase tracking-widest font-bold mb-0.5">
              {label}
            </div>
            <div className="text-3xl font-black text-white tracking-tight" style={{ textShadow: `0 0 30px ${accentColor}30` }}>
              {display.toLocaleString()}
            </div>
            {subtext && (
              <div className="text-[11px] mt-1.5 font-medium" style={{ color: accentColor + "99" }}>
                {subtext}
              </div>
            )}
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 flex-shrink-0"
            style={{ background: iconBg, color: iconColor, boxShadow: `0 4px 12px ${accentColor}25` }}
          >
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Mini donut ring ───────────────────────────────────────── */
function DonutRing({ pctPublished, pctPending, pctBlocked, total }) {
  const { t } = useTranslation();
  const r = 36;
  const circ = 2 * Math.PI * r;
  const strokeWidth = 7;

  // Safe guard against NaN
  const safePublished = isFinite(pctPublished) ? pctPublished : 0;
  const safePending   = isFinite(pctPending) ? pctPending : 0;
  const safeBlocked   = isFinite(pctBlocked) ? pctBlocked : 0;

  const pubDash  = (safePublished / 100) * circ;
  const pendDash = (safePending   / 100) * circ;
  const blkDash  = (safeBlocked   / 100) * circ;

  const pubOffset  = 0;
  const pendOffset = -(pubDash);
  const blkOffset  = -(pubDash + pendDash);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
      <svg width="96" height="96" viewBox="0 0 96 96" className="rotate-[-90deg]">
        {/* Track */}
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
        {/* Published */}
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke="#22c55e" strokeWidth={strokeWidth}
          strokeDasharray={`${pubDash} ${circ - pubDash}`}
          strokeDashoffset={pubOffset}
          strokeLinecap="butt"
          style={{ transition: "stroke-dasharray 1s ease-out" }}
        />
        {/* Pending */}
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke="#f59e0b" strokeWidth={strokeWidth}
          strokeDasharray={`${pendDash} ${circ - pendDash}`}
          strokeDashoffset={pendOffset}
          strokeLinecap="butt"
          style={{ transition: "stroke-dasharray 1s ease-out 0.1s" }}
        />
        {/* Blocked */}
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke="#ef4444" strokeWidth={strokeWidth}
          strokeDasharray={`${blkDash} ${circ - blkDash}`}
          strokeDashoffset={blkOffset}
          strokeLinecap="butt"
          style={{ transition: "stroke-dasharray 1s ease-out 0.2s" }}
        />
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-lg font-black text-white leading-none">{total}</div>
        <div className="text-[9px] text-[#6b7785] font-semibold uppercase tracking-wider mt-0.5">{t("totalLabel")}</div>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ────────────────────────────────────────── */
function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(new Date());
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [exchangeRate, setExchangeRate] = useState(null);
  const [rules, setRules] = useState([]);
  const [syncHistory, setSyncHistory] = useState([]);
  const [autoSync, setAutoSync] = useState({ amazonEnabled: true, meliEnabled: true });
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const PAGE_SIZE = 10;

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
    setPage(1);
  }

  // Update clock every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // Load products, exchange rate, margin rules and sync history on mount
  useEffect(() => {
    Promise.all([getProducts(), getExchangeRate(), getMarginRules()])
      .then(([productsData, rateData, rulesData]) => {
        const list = Array.isArray(productsData)
          ? productsData
          : (productsData.products || productsData.items || []);
        setProducts(list);
        setExchangeRate(rateData.usd_to_cop || null);
        setRules(rulesData.rules || []);
      })
      .catch(() => setError(t("errorLoading")))
      .finally(() => setLoading(false));
    getSyncHistory()
      .then((data) => setSyncHistory(Array.isArray(data) ? data : []))
      .catch(() => {});
    getSyncSettings()
      .then((s) => setAutoSync({
        amazonEnabled: s.amazon?.enabled !== false,
        meliEnabled: s.meli?.enabled !== false,
      }))
      .catch(() => {});
    // eslint-disable-next-line
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-4 text-[#a0adbb]">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        {t("loadingDashboard")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl text-red-400" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        {error}
      </div>
    );
  }

  // Compute stats
  const total     = products.length;
  const published = products.filter((p) => p.status === "published").length;
  const blocked   = products.filter((p) => p.status === "blocked").length;
  const failed    = products.filter((p) => p.status === "failed").length;
  const pending   = products.filter((p) => p.status === "pending").length;
  const safe      = total || 1;
  const pctPublished = (published / safe) * 100;
  const pctPending   = (pending   / safe) * 100;
  const pctBlocked   = (blocked   / safe) * 100;

  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  const filteredProducts = products.filter(p => {
    if (statusFilter === "all") return true;
    if (statusFilter === "out_of_stock") return p.stock === 0;
    return p.status === statusFilter;
  });

  const statusOrder = { published: 0, pending: 1, failed: 3, blocked: 4 };
  const getStatusOrder = (p) => p.stock === 0 ? 2 : (statusOrder[p.status] ?? 1);

  const sortedProducts = sortCol ? [...filteredProducts].sort((a, b) => {
    const rate = exchangeRate || 1;
    let av, bv;
    if (sortCol === "product")  { av = (a.title || "").toLowerCase(); bv = (b.title || "").toLowerCase(); }
    else if (sortCol === "asin")  { av = (a.asin || "").toLowerCase();  bv = (b.asin || "").toLowerCase(); }
    else if (sortCol === "amazon") { av = a.amazon_price_usd || 0;       bv = b.amazon_price_usd || 0; }
    else if (sortCol === "ml")    { av = (a.converted_price_cop || 0) / rate; bv = (b.converted_price_cop || 0) / rate; }
    else if (sortCol === "stock") { av = a.stock || 0;                   bv = b.stock || 0; }
    else if (sortCol === "margin") {
      av = calcPrice(a.amazon_price_usd || 0, rules, exchangeRate || 1)?.profit ?? 0;
      bv = calcPrice(b.amazon_price_usd || 0, rules, exchangeRate || 1)?.profit ?? 0;
    }
    else if (sortCol === "status")  { av = getStatusOrder(a); bv = getStatusOrder(b); }
    else if (sortCol === "updated") { av = a.updated_at || a.created_at || ""; bv = b.updated_at || b.created_at || ""; }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  }) : filteredProducts;

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageProducts = sortedProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Page numbers: up to 2 before and 2 after current, clamped to valid range
  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(n => n >= safePage - 2 && n <= safePage + 2);

  const filterTabs = [
    { key: "all",          label: t("filterAll"),        count: products.length },
    { key: "pending",      label: t("pending"),           count: products.filter(p => p.status === "pending").length },
    { key: "published",    label: t("activeLabel"),       count: products.filter(p => p.status === "published").length },
    { key: "blocked",      label: t("blocked"),           count: products.filter(p => p.status === "blocked").length },
    { key: "failed",       label: t("syncFailedLabel"),   count: products.filter(p => p.status === "failed").length },
    { key: "out_of_stock", label: t("outOfStockLabel"),   count: products.filter(p => p.stock === 0).length },
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div className="fade-up mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-black text-white tracking-tight">
              {t("dashboardTitle")}
            </h1>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {t("liveLabel")}
            </span>
          </div>
          <p className="text-sm text-[#6b7785]">{t("dashboardSubtitle")}</p>
        </div>

        {/* Clock widget */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(80,160,250,0.1)",
          }}
        >
          <svg className="w-4 h-4 text-[#50A0FA]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="text-white font-bold text-sm leading-none">{timeStr}</div>
            <div className="text-[10px] text-[#6b7785] mt-0.5">{dateStr}</div>
          </div>
        </div>
      </div>

      {/* ── Auto Sync OFF banner ── */}
      {(!autoSync.amazonEnabled || !autoSync.meliEnabled) && (
        <div
          className="rounded-xl px-4 py-3 mb-2 flex items-center justify-between gap-4 fade-up"
          style={{
            background: "rgba(245,158,11,0.07)",
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(245,158,11,0.12)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="#f59e0b" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#f59e0b" }}>
                {t("autoSyncOffBannerTitle")}
              </p>
              <p className="text-xs text-[#6b7785] mt-0.5">
                {!autoSync.amazonEnabled && !autoSync.meliEnabled
                  ? t("autoSyncBothOffDesc")
                  : !autoSync.amazonEnabled
                  ? t("autoSyncAmazonOffDesc")
                  : t("autoSyncMeliOffDesc")}
              </p>
            </div>
          </div>
          <Link
            to="/sync"
            className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0 transition-all duration-200 whitespace-nowrap"
            style={{
              background: "rgba(245,158,11,0.12)",
              color: "#f59e0b",
              border: "1px solid rgba(245,158,11,0.3)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(245,158,11,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(245,158,11,0.12)"; }}
          >
            {t("goToSyncBtn")}
          </Link>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label={t("totalProducts")}
          value={total}
          iconBg="rgba(80,160,250,0.1)"
          iconColor="#50A0FA"
          accentColor="#50A0FA"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          subtext={t("fullCatalog")}
          delay={0.1}
        />
        <StatCard
          label={t("published")}
          value={published}
          iconBg="rgba(34,197,94,0.1)"
          iconColor="#22c55e"
          accentColor="#22c55e"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          subtext={t("pctOfTotal", { pct: pctPublished.toFixed(1) })}
          delay={0.2}
        />
        <StatCard
          label={t("blocked")}
          value={blocked}
          iconBg="rgba(239,68,68,0.1)"
          iconColor="#ef4444"
          accentColor="#ef4444"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          }
          subtext={t("pctOfTotal", { pct: ((blocked / safe) * 100).toFixed(1) })}
          delay={0.3}
        />
        <StatCard
          label={t("pending")}
          value={pending}
          iconBg="rgba(245,158,11,0.1)"
          iconColor="#f59e0b"
          accentColor="#f59e0b"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          subtext={t("pctOfTotal", { pct: pctPending.toFixed(1) })}
          delay={0.4}
        />
      </div>

      {/* ── MercadoLibre Stats + Exchange Rate ── */}
      {(() => {
        const nowMs = Date.now();
        const h24 = 24 * 60 * 60 * 1000;
        const added24h = products.filter(p => nowMs - new Date(p.created_at).getTime() <= h24).length;
        const added48to24h = products.filter(p => {
          const age = nowMs - new Date(p.created_at).getTime();
          return age > h24 && age <= 2 * h24;
        }).length;
        const delta = added24h - added48to24h;
        const deltaUp = delta > 0;
        const deltaDown = delta < 0;
        const deltaColor = deltaUp ? "#22c55e" : deltaDown ? "#ef4444" : "#6b7785";

        return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* MercadoLibre Stats Card */}
        <div
          className="card rounded-xl p-5 lg:col-span-2 group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
          style={{ animation: "fadeUp 0.6s ease-out 0.5s backwards" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(80,160,250,0.3)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(80,160,250,0.15)"; }}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: "radial-gradient(circle at 50% 110%, rgba(80,160,250,0.07), transparent 70%)" }}
          />

          <div className="relative z-10">
            <div className="text-sm font-bold text-white mb-5">{t("mlOverview")}</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Active on ML */}
              <div className="rounded-xl p-4" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-[#6b7785]">{t("activeOnMl")}</div>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
                    <svg className="w-4 h-4" fill="none" stroke="#22c55e" viewBox="0 0 24 24" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-4xl font-black text-white tracking-tight" style={{ textShadow: "0 0 30px rgba(34,197,94,0.3)" }}>
                  {published.toLocaleString()}
                </div>
                <div className="text-[11px] mt-1.5 font-medium" style={{ color: "#22c55e99" }}>
                  {t("pctOfCatalog", { pct: pctPublished.toFixed(1) })}
                </div>
              </div>

              {/* Added in last 24h */}
              <div className="rounded-xl p-4" style={{ background: "rgba(80,160,250,0.06)", border: "1px solid rgba(80,160,250,0.15)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-[#6b7785]">{t("addedLast24h")}</div>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(80,160,250,0.12)" }}>
                    <svg className="w-4 h-4" fill="none" stroke="#50A0FA" viewBox="0 0 24 24" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
                <div className="text-4xl font-black text-white tracking-tight" style={{ textShadow: "0 0 30px rgba(80,160,250,0.3)" }}>
                  {added24h}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {deltaUp && (
                    <svg className="w-3.5 h-3.5" fill="none" stroke={deltaColor} viewBox="0 0 24 24" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                  {deltaDown && (
                    <svg className="w-3.5 h-3.5" fill="none" stroke={deltaColor} viewBox="0 0 24 24" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                  <span className="text-[11px] font-bold" style={{ color: deltaColor }}>
                    {delta === 0
                      ? t("sameAsYesterday")
                      : deltaUp
                      ? t("moreVsYesterday", { n: Math.abs(delta) })
                      : t("fewerVsYesterday", { n: Math.abs(delta) })}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Exchange rate card */}
        <div
          className="card rounded-xl p-5 group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col"
          style={{ animation: "fadeUp 0.6s ease-out 0.6s backwards" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(80,160,250,0.35)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(80,160,250,0.12)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(80,160,250,0.15)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: "radial-gradient(circle at 50% 120%, rgba(80,160,250,0.12), transparent 70%)" }}
          />

          <div className="relative z-10 flex-1">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-sm font-bold text-white mb-0.5">{t("exchangeRate")}</div>
                <div className="text-[10px] text-[#6b7785] font-semibold tracking-widest uppercase">USD → COP</div>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-400"
                style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", padding: "2px 8px", borderRadius: "999px" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {t("liveLabel")}
              </span>
            </div>

            <div className="mb-1">
              <div className="text-[11px] text-[#6b7785] mb-1">{t("currentRate")}</div>
              <div className="text-4xl font-black tracking-tight"
                style={{ color: "#50A0FA", textShadow: "0 0 30px rgba(80,160,250,0.4)" }}
              >
                {exchangeRate ? exchangeRate.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—"}
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[11px] text-[#6b7785]">{t("updatedToday")}</span>
            </div>
          </div>

          {/* Sparkline */}
          <div className="h-14 -mx-5 -mb-5 mt-3 overflow-hidden opacity-50 group-hover:opacity-80 transition-opacity duration-300 relative z-10">
            <svg className="w-full h-full" viewBox="0 0 100 35" preserveAspectRatio="none">
              <defs>
                <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#50A0FA" stopOpacity="0.35"/>
                  <stop offset="100%" stopColor="#50A0FA" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d="M0 28 C8 26, 15 30, 22 22 C30 14, 38 20, 46 15 C54 10, 62 18, 70 12 C78 6, 86 16, 94 10 L100 7 L100 35 L0 35 Z"
                fill="url(#spark-fill)" />
              <path d="M0 28 C8 26, 15 30, 22 22 C30 14, 38 20, 46 15 C54 10, 62 18, 70 12 C78 6, 86 16, 94 10 L100 7"
                fill="none" stroke="#50A0FA" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
        );
      })()}

      {/* ── Secondary Stat Boxes ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

        {/* Box 1 — Sales This Month */}
        <div
          className="rounded-xl p-5 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300"
          style={{
            animation: "fadeUp 0.6s ease-out 0.5s backwards",
            background: "linear-gradient(135deg, rgba(80,160,250,0.04) 0%, rgba(16,21,31,0.7) 100%)",
            border: "1px solid rgba(80,160,250,0.12)",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(80,160,250,0.35)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(80,160,250,0.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(80,160,250,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent, rgba(80,160,250,0.6), transparent)" }} />

          <div className="flex items-start justify-between mb-3">
            <div className="text-[10px] uppercase tracking-widest font-bold text-[#6b7785]">{t("salesThisMonth")}</div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
              style={{ background: "rgba(80,160,250,0.1)", boxShadow: "0 4px 12px rgba(80,160,250,0.2)" }}>
              💵
            </div>
          </div>

          {/* Dollar amount */}
          <div className="text-2xl font-black text-white tracking-tight mb-0.5" style={{ textShadow: "0 0 20px rgba(80,160,250,0.3)" }}>
            $0.00
          </div>

          {/* Order count */}
          <div className="text-[11px] text-[#6b7785] mb-2">
            {t("zeroOrders")}
          </div>

          {/* Delta */}
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="#6b7785" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
            <span className="text-[11px] font-bold text-[#6b7785]">{t("noDataYet")}</span>
          </div>
        </div>

        {/* Box 2 — Amazon Sync */}
        {(() => {
          const todayStart = new Date(); todayStart.setHours(0,0,0,0);
          const syncsToday = syncHistory.filter(s => new Date(s.started_at) >= todayStart).length;
          const lastSync = syncHistory.find(s => s.finished_at);
          let lastSyncLabel = t("neverLabel");
          if (lastSync) {
            const diffMs = Date.now() - new Date(lastSync.finished_at).getTime();
            const diffMin = Math.floor(diffMs / 60000);
            const diffHr  = Math.floor(diffMin / 60);
            const diffDay = Math.floor(diffHr / 24);
            lastSyncLabel = diffMin < 1 ? t("justNow")
              : diffMin < 60 ? t("minAgo", { n: diffMin })
              : diffHr  < 24 ? t("hrAgo", { n: diffHr })
              : t("dAgo", { n: diffDay });
          }
          return (
            <div
              className="rounded-xl p-5 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300"
              style={{
                animation: "fadeUp 0.6s ease-out 0.6s backwards",
                background: "linear-gradient(135deg, rgba(80,160,250,0.04) 0%, rgba(16,21,31,0.7) 100%)",
                border: "1px solid rgba(80,160,250,0.12)",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(80,160,250,0.35)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(80,160,250,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(80,160,250,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent, rgba(80,160,250,0.6), transparent)" }} />

              <div className="flex items-start justify-between mb-3">
                <div className="text-[10px] uppercase tracking-widest font-bold text-[#6b7785]">{t("amazonSyncShort")}</div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(80,160,250,0.1)", boxShadow: "0 4px 12px rgba(80,160,250,0.2)" }}>
                  <svg className={`w-4 h-4 text-[#50A0FA] ${syncsToday > 0 ? "animate-spin" : ""}`} style={{ animationDuration: "3s" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>

              <div className="text-2xl font-black text-white tracking-tight mb-0.5" style={{ textShadow: "0 0 20px rgba(80,160,250,0.3)" }}>
                {syncsToday}
              </div>

              <div className="text-[11px] text-[#6b7785] mb-2">
                {syncsToday === 1 ? t("syncRunToday") : t("syncsRunToday")}
              </div>

              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3 text-[#6b7785]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[11px] font-bold" style={{ color: lastSync ? "#50A0FA" : "#6b7785" }}>
                  {t("lastSyncLabel")} {lastSyncLabel}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Box 3 — Out of Stock Warning */}
        {(() => {
          const outOfStock = products.filter(p => p.stock === 0);
          const count = outOfStock.length;
          const publishedOos = outOfStock.filter(p => p.status === "published").length;
          const urgent = publishedOos > 0;
          const accentColor = count === 0 ? "#22c55e" : urgent ? "#ef4444" : "#f59e0b";
          const borderColor = count === 0 ? "rgba(34,197,94,0.2)" : urgent ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)";
          const bgColor = count === 0 ? "rgba(34,197,94,0.04)" : urgent ? "rgba(239,68,68,0.04)" : "rgba(245,158,11,0.04)";
          return (
            <div
              className="rounded-xl p-5 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300"
              style={{
                animation: "fadeUp 0.6s ease-out 0.7s backwards",
                background: `linear-gradient(135deg, ${bgColor} 0%, rgba(16,21,31,0.7) 100%)`,
                border: `1px solid ${borderColor}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor + "55"; e.currentTarget.style.boxShadow = `0 8px 32px ${accentColor}18`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}80, transparent)` }} />

              <div className="flex items-start justify-between mb-3">
                <div className="text-[10px] uppercase tracking-widest font-bold text-[#6b7785]">{t("needsAttention")}</div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: `${accentColor}18`, boxShadow: `0 4px 12px ${accentColor}30` }}>
                  {count === 0 ? "✅" : "⚠️"}
                </div>
              </div>

              <div className="text-2xl font-black tracking-tight mb-0.5" style={{ color: accentColor, textShadow: `0 0 20px ${accentColor}40` }}>
                {count}
              </div>

              <div className="text-[11px] text-[#6b7785] mb-2">
                {count === 0 ? t("allInStock") : t("outOfStockSubtitle", { s: count !== 1 ? "s" : "" })}
              </div>

              <div className="flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" stroke={accentColor} viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span className="text-[11px] font-bold" style={{ color: accentColor }}>
                  {urgent
                    ? t("listedMlUrgent", { n: publishedOos })
                    : count > 0
                    ? t("notListedRestock")
                    : t("noActionNeeded")}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Box 4 — Average Margin */}
        {(() => {
          const rate = exchangeRate || 1;
          const withPricing = products.filter(p => p.amazon_price_usd > 0);
          const getProfitPct = p => calcPrice(p.amazon_price_usd, rules, rate)?.markupPct ?? 0;
          const avgMargin = withPricing.length > 0
            ? withPricing.reduce((sum, p) => sum + getProfitPct(p), 0) / withPricing.length
            : null;

          // Compare recent (last 7 days) avg vs older avg for the arrow
          const week = 7 * 24 * 60 * 60 * 1000;
          const recent = withPricing.filter(p => Date.now() - new Date(p.created_at).getTime() <= week);
          const older  = withPricing.filter(p => Date.now() - new Date(p.created_at).getTime() >  week);
          const recentAvg = recent.length > 0 ? recent.reduce((s, p) => s + getProfitPct(p), 0) / recent.length : null;
          const olderAvg  = older.length  > 0 ? older.reduce((s, p)  => s + getProfitPct(p), 0) / older.length  : null;
          const trend = recentAvg !== null && olderAvg !== null ? recentAvg - olderAvg : 0;
          const trendUp   = trend > 0.5;
          const trendDown = trend < -0.5;
          const accentColor = trendUp ? "#22c55e" : trendDown ? "#ef4444" : "#50A0FA";

          return (
            <div
              className="rounded-xl p-5 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300"
              style={{
                animation: "fadeUp 0.6s ease-out 0.8s backwards",
                background: "linear-gradient(135deg, rgba(80,160,250,0.04) 0%, rgba(16,21,31,0.7) 100%)",
                border: "1px solid rgba(80,160,250,0.12)",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${accentColor}55`; e.currentTarget.style.boxShadow = `0 8px 32px ${accentColor}18`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(80,160,250,0.12)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}80, transparent)` }} />

              <div className="flex items-start justify-between mb-3">
                <div className="text-[10px] uppercase tracking-widest font-bold text-[#6b7785]">{t("avgProfitMargin")}</div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${accentColor}18`, boxShadow: `0 4px 12px ${accentColor}25` }}>
                  <svg className="w-4 h-4" fill="none" stroke={accentColor} viewBox="0 0 24 24" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>

              <div className="text-2xl font-black tracking-tight mb-0.5" style={{ color: accentColor, textShadow: `0 0 20px ${accentColor}40` }}>
                {avgMargin !== null ? `${avgMargin.toFixed(1)}%` : "—"}
              </div>

              <div className="text-[11px] text-[#6b7785] mb-2">
                {t("acrossPricedProducts", { n: withPricing.length, s: withPricing.length !== 1 ? "s" : "" })}
              </div>

              <div className="flex items-center gap-1.5">
                {trendUp && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke={accentColor} viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                )}
                {trendDown && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke={accentColor} viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
                {!trendUp && !trendDown && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke={accentColor} viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                  </svg>
                )}
                <span className="text-[11px] font-bold" style={{ color: accentColor }}>
                  {trendUp   ? t("trendVsOlderUp",   { pct: Math.abs(trend).toFixed(1) }) :
                   trendDown ? t("trendVsOlderDown", { pct: Math.abs(trend).toFixed(1) }) :
                               t("stableMargin")}
                </span>
              </div>
            </div>
          );
        })()}

      </div>

      {/* ── Recent Products ── */}
      <div
        className="card rounded-xl overflow-hidden"
        style={{ animation: "fadeUp 0.6s ease-out 0.7s backwards" }}
      >
        {/* Table header bar */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(80,160,250,0.08)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(80,160,250,0.1)", color: "#50A0FA" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-white">{t("recentProducts")}</div>
              <div className="text-[10px] text-[#6b7785]">{t("itemsPerPage", { n: PAGE_SIZE })}</div>
            </div>
          </div>
          <Link
            to="/products"
            className="text-xs font-bold text-[#50A0FA] flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 hover:-translate-x-0.5"
            style={{ background: "rgba(80,160,250,0.08)", border: "1px solid rgba(80,160,250,0.15)" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(80,160,250,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(80,160,250,0.08)"; }}
          >
            {t("viewAll")}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 px-5 py-3 flex-wrap"
          style={{ borderBottom: "1px solid rgba(80,160,250,0.08)" }}
        >
          {filterTabs.map(tab => {
            const active = statusFilter === tab.key;
            const accent = tab.key === "pending" ? "#f59e0b"
              : tab.key === "published" ? "#22c55e"
              : tab.key === "blocked" ? "#ef4444"
              : tab.key === "out_of_stock" ? "#a78bfa"
              : "#50A0FA";
            return (
              <button
                key={tab.key}
                onClick={() => { setStatusFilter(tab.key); setPage(1); }}
                className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-bold transition-all duration-150"
                style={active ? {
                  background: accent,
                  color: "#0d1117",
                  border: `1px solid ${accent}`,
                  boxShadow: `0 0 10px ${accent}50`,
                } : {
                  background: "rgba(255,255,255,0.03)",
                  color: "#6b7785",
                  border: "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer",
                }}
              >
                {tab.label}
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={active
                    ? { background: "rgba(0,0,0,0.2)", color: "#0d1117" }
                    : { background: "rgba(255,255,255,0.06)", color: "#4a5568" }
                  }
                >
                  {tab.count}
                </span>
              </button>
            );
          })}

          {/* Sort by latest update — pushed to the right */}
          <button
            onClick={() => { setSortCol("updated"); setSortDir("desc"); setPage(1); }}
            className="ml-auto flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-bold transition-all duration-150"
            style={sortCol === "updated" ? {
              background: "rgba(80,160,250,0.15)",
              color: "#50A0FA",
              border: "1px solid rgba(80,160,250,0.4)",
              boxShadow: "0 0 10px rgba(80,160,250,0.2)",
            } : {
              background: "rgba(255,255,255,0.03)",
              color: "#6b7785",
              border: "1px solid rgba(255,255,255,0.06)",
              cursor: "pointer",
            }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t("sortByLatestBtn")}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#4a5568] text-[10px] uppercase tracking-widest font-bold"
                style={{ background: "rgba(255,255,255,0.015)" }}
              >
                {[
                  { col: "product",  label: t("colProduct"),      align: "left",   minW: 260 },
                  { col: "asin",     label: "ASIN",               align: "left",   minW: 110 },
                  { col: "category", label: t("categoryHeader"),   align: "left",   minW: 150 },
                  { col: "amazon",   label: t("colAmazonPrice"),   align: "right",  minW: 110 },
                  { col: "ml",       label: t("colMlPrice"),       align: "right",  minW: 110 },
                  { col: "margin",   label: t("colMargin"),        align: "right",  minW: 80  },
                  { col: "stock",    label: t("stock"),            align: "right",  minW: 70  },
                  { col: "status",   label: t("status"),           align: "center", minW: 110 },
                ].map(({ col, label, align, minW }) => (
                  <th key={col} className={`px-4 py-3 text-${align}`} style={{ minWidth: minW }}>
                    <button
                      onClick={() => handleSort(col)}
                      className="inline-flex items-center gap-1 hover:text-white transition-colors duration-150"
                      style={{ color: sortCol === col ? "#50A0FA" : undefined }}
                    >
                      {label}
                      <span className="flex flex-col leading-none" style={{ fontSize: 8 }}>
                        <span style={{ opacity: sortCol === col && sortDir === "asc" ? 1 : 0.3 }}>▲</span>
                        <span style={{ opacity: sortCol === col && sortDir === "desc" ? 1 : 0.3 }}>▼</span>
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageProducts.map((p) => {
                const amazonUsd = Number(p.amazon_price_usd || 0);
                const calc = calcPrice(amazonUsd, rules, exchangeRate);
                const mlUsd    = calc?.mlUsd    ?? null;
                const profit   = calc?.profit   ?? null;
                const profitPct = calc ? calc.markupPct : null;

                return (
                  <tr
                    key={p.id || p.asin}
                    className="transition-colors duration-150"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.035)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(80,160,250,0.025)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-full h-full object-cover"
                              onError={e => { e.target.style.display = "none"; }} />
                          ) : (
                            <svg className="w-4 h-4 text-[#4a5568]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <button
                          onClick={() => navigate(`/products/${p.id}/edit`, { state: { product: p } })}
                          className="text-left font-medium text-[12px] max-w-[240px] truncate transition-colors"
                          style={{ color: "#c8d0db" }}
                          onMouseEnter={e => e.currentTarget.style.color = "#50A0FA"}
                          onMouseLeave={e => e.currentTarget.style.color = "#c8d0db"}
                          title={p.title}
                        >
                          {p.title}
                        </button>
                      </div>
                    </td>

                    {/* ASIN */}
                    <td className="px-4 py-3">
                      <code className="text-[11px] font-bold px-2 py-1 rounded"
                        style={{ background: "rgba(80,160,250,0.08)", color: "#50A0FA" }}>
                        {p.asin}
                      </code>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      {p.category_path ? (
                        <div title={p.category_path}>
                          <span className="text-[9px] block truncate max-w-[120px]" style={{ color: "#4a5568" }}>
                            {p.category_path.split(" > ")[0]}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded block truncate max-w-[120px] mt-0.5"
                            style={{ background: "rgba(80,160,250,0.08)", color: "#a0adbb", border: "1px solid rgba(80,160,250,0.12)" }}
                          >
                            {p.category_path.split(" > ").pop()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#3a4250] text-[11px]">—</span>
                      )}
                    </td>

                    {/* Amazon Price */}
                    <td className="px-4 py-3 text-right">
                      <div className="leading-tight">
                        <div className="text-[#c8d0db] font-bold text-[13px]">${amazonUsd.toFixed(2)}</div>
                        {exchangeRate && (
                          <div className="text-[10px] text-[#6b7785]">
                            {(Math.round(amazonUsd * exchangeRate / 100) * 100).toLocaleString()} COP
                          </div>
                        )}
                      </div>
                    </td>

                    {/* ML Price */}
                    <td className="px-4 py-3 text-right">
                      {mlUsd !== null ? (
                        <div className="leading-tight">
                          <div className="font-bold text-[13px]" style={{ color: "#50A0FA" }}>${mlUsd.toFixed(2)}</div>
                          {calc?.mlCop != null && (
                            <div className="text-[10px] text-[#6b7785]">
                              {calc.mlCop.toLocaleString()} COP
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#4a5568]">—</span>
                      )}
                    </td>

                    {/* Margin */}
                    <td className="px-4 py-3 text-right">
                      {profit !== null ? (
                        <div className="leading-tight">
                          <div className="text-[13px] font-bold text-green-400">
                            +${profit.toFixed(2)}
                          </div>
                          {exchangeRate && (
                            <div className="text-[10px] text-green-600">
                              +{(Math.round(profit * exchangeRate / 100) * 100).toLocaleString()} COP
                            </div>
                          )}
                          {profitPct !== null && (
                            <div className="text-[10px] text-[#6b7785]">
                              {profitPct.toFixed(1)}% {t("markupSuffix")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#4a5568]">—</span>
                      )}
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold text-sm ${p.stock === 0 ? "text-red-400" : "text-[#c8d0db]"}`}>
                        {p.stock}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <DashboardStatusBadge status={p.status} stock={p.stock} />
                    </td>

                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-[#4a5568]">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <span className="text-sm">{t("noProducts")}</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {products.length > 0 && (
          <div className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(255,255,255,0.035)" }}
          >
            <span className="text-[11px] text-[#4a5568]">
              {t("showing")}{" "}
              <span className="text-[#6b7785] font-bold">
                {sortedProducts.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sortedProducts.length)}
              </span>{" "}
              {t("of")} <span className="text-[#6b7785] font-bold">{sortedProducts.length}</span> {t("productsLabel")}
            </span>

            <div className="flex items-center gap-1">
              {/* First button */}
              <button
                onClick={() => setPage(1)}
                disabled={safePage === 1}
                className="h-7 px-2 rounded-lg text-[11px] font-bold transition-all duration-150"
                style={{
                  background: safePage === 1 ? "rgba(255,255,255,0.02)" : "rgba(80,160,250,0.08)",
                  color: safePage === 1 ? "#3a4350" : "#50A0FA",
                  border: "1px solid " + (safePage === 1 ? "rgba(255,255,255,0.04)" : "rgba(80,160,250,0.2)"),
                  cursor: safePage === 1 ? "not-allowed" : "pointer",
                }}
              >
                {t("first")}
              </button>

              {/* Prev arrow */}
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                style={{
                  background: safePage === 1 ? "rgba(255,255,255,0.02)" : "rgba(80,160,250,0.08)",
                  color: safePage === 1 ? "#3a4350" : "#50A0FA",
                  border: "1px solid " + (safePage === 1 ? "rgba(255,255,255,0.04)" : "rgba(80,160,250,0.2)"),
                  cursor: safePage === 1 ? "not-allowed" : "pointer",
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Page numbers */}
              {pageNums.map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className="w-7 h-7 rounded-lg text-[11px] font-bold transition-all duration-150"
                  style={n === safePage ? {
                    background: "#50A0FA",
                    color: "#0d1117",
                    border: "1px solid #50A0FA",
                    boxShadow: "0 0 10px rgba(80,160,250,0.4)",
                  } : {
                    background: "rgba(80,160,250,0.06)",
                    color: "#6b7785",
                    border: "1px solid rgba(80,160,250,0.12)",
                    cursor: "pointer",
                  }}
                >
                  {n}
                </button>
              ))}

              {/* Next arrow */}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                style={{
                  background: safePage === totalPages ? "rgba(255,255,255,0.02)" : "rgba(80,160,250,0.08)",
                  color: safePage === totalPages ? "#3a4350" : "#50A0FA",
                  border: "1px solid " + (safePage === totalPages ? "rgba(255,255,255,0.04)" : "rgba(80,160,250,0.2)"),
                  cursor: safePage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Last button */}
              <button
                onClick={() => setPage(totalPages)}
                disabled={safePage === totalPages}
                className="h-7 px-2 rounded-lg text-[11px] font-bold transition-all duration-150"
                style={{
                  background: safePage === totalPages ? "rgba(255,255,255,0.02)" : "rgba(80,160,250,0.08)",
                  color: safePage === totalPages ? "#3a4350" : "#50A0FA",
                  border: "1px solid " + (safePage === totalPages ? "rgba(255,255,255,0.04)" : "rgba(80,160,250,0.2)"),
                  cursor: safePage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                {t("last")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;