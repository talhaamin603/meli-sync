import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
  Package, CheckCircle2, ShieldOff, Clock, DollarSign, RefreshCw,
  AlertTriangle, TrendingUp, TrendingDown, Minus, ChevronRight,
  ArrowUpDown, ChevronsLeft, ChevronLeft, ChevronsRight,
  Image as ImageIcon, Inbox, Zap, Activity, BarChart3,
} from "lucide-react";
import { getProducts, getExchangeRate, getSyncHistory, getMarginRules, getSyncSettings } from "../api.js";
import { calcPrice } from "../utils/pricing.js";

/* ─── Status badge ─────────────────────────────────────────── */
function StatusBadge({ status, stock }) {
  const { t } = useTranslation();
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
        style={{ background: "rgba(239,68,68,0.12)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.2)" }}>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#EF4444" }} />
        {t("outOfStockLabel")}
      </span>
    );
  }
  const map = {
    published: { bg: "rgba(34,197,94,0.1)",  fg: "#4ADE80", border: "rgba(34,197,94,0.2)",  dot: "#22C55E", label: t("activeLabel") },
    blocked:   { bg: "rgba(239,68,68,0.1)",  fg: "#FCA5A5", border: "rgba(239,68,68,0.2)",  dot: "#EF4444", label: t("blocked") },
    failed:    { bg: "rgba(245,158,11,0.1)", fg: "#FCD34D", border: "rgba(245,158,11,0.2)", dot: "#F59E0B", label: t("syncFailedLabel") },
    pending:   { bg: "rgba(59,130,246,0.1)", fg: "#93C5FD", border: "rgba(59,130,246,0.2)", dot: "#3B82F6", label: t("pending") },
  };
  const s = map[status] || map.pending;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.fg, border: `1px solid ${s.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

/* ─── Stat card — three variants ───────────────────────────── */
function StatCard({ label, value, icon: Icon, subtext, accentColor, delay, variant = "featured" }) {
  const [display, setDisplay] = useState(0);

  // ── ALL LOGIC UNTOUCHED ──
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

  const baseAnim = { animation: `fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) ${delay}s backwards` };

  /* ── Hero variant — largest, gradient number, watermark icon ── */
  if (variant === "hero") {
    return (
      <div
        className="card-feature gradient-border rounded-2xl overflow-hidden relative h-full cursor-pointer"
        style={{ ...baseAnim, minHeight: 180, transition: 'box-shadow 250ms ease, border-color 250ms ease' }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-xl), var(--shadow-glow-blue)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; }}
      >
        {/* Ambient radial glow */}
        <div style={{
          position: 'absolute', bottom: '-20%', left: '-10%',
          width: '65%', height: '80%', borderRadius: '50%', pointerEvents: 'none',
          background: `radial-gradient(circle, ${accentColor}1a 0%, transparent 70%)`,
        }} />
        {/* Watermark icon */}
        <div style={{
          position: 'absolute', right: -24, top: -24, opacity: 0.045,
          color: accentColor, pointerEvents: 'none', lineHeight: 1,
        }}>
          <Icon size={200} strokeWidth={0.6} />
        </div>
        <div className="relative p-7 h-full flex flex-col justify-between">
          <div className="flex items-start justify-between mb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--color-disabled)' }}>
              {label}
            </p>
            <span className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
              style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}25` }}>
              <Icon size={16} strokeWidth={2} />
            </span>
          </div>
          <div>
            <div className="tabular-nums leading-none"
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: 72,
                fontWeight: 700,
                letterSpacing: '-0.04em',
                background: `linear-gradient(135deg, #F8FAFC 30%, ${accentColor} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
              {display.toLocaleString()}
            </div>
            {subtext && (
              <p className="text-[12px] font-medium mt-3" style={{ color: `${accentColor}88`, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {subtext}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Featured variant — medium glass card ── */
  if (variant === "featured") {
    return (
      <div
        className="card-glass rounded-2xl overflow-hidden relative h-full cursor-pointer"
        style={{
          ...baseAnim,
          border: `1px solid ${accentColor}20`,
          transition: 'border-color 220ms ease, box-shadow 220ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = `${accentColor}45`;
          e.currentTarget.style.boxShadow = `var(--shadow-lg), 0 0 30px ${accentColor}14`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = `${accentColor}20`;
          e.currentTarget.style.boxShadow = '';
        }}
      >
        {/* Subtle top gradient strip */}
        <div style={{ height: 2, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}44, transparent)` }} />
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-start justify-between mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--color-disabled)' }}>
              {label}
            </p>
            <span className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
              style={{ background: `${accentColor}14`, color: accentColor, border: `1px solid ${accentColor}20` }}>
              <Icon size={16} strokeWidth={2} />
            </span>
          </div>
          <div className="tabular-nums leading-none mb-3"
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: '-0.04em',
              color: accentColor,
            }}>
            {display.toLocaleString()}
          </div>
          {subtext && (
            <p className="text-[12px] font-medium mt-auto" style={{ color: `${accentColor}77`, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {subtext}
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ── Compact variant — slim pill-style side-by-side ── */
  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer"
      style={{
        ...baseAnim,
        background: 'rgba(255,255,255,0.025)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${accentColor}18`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        transition: 'all 200ms ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.borderColor = `${accentColor}40`;
        e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.3), 0 0 20px ${accentColor}12`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
        e.currentTarget.style.borderColor = `${accentColor}18`;
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
      }}
    >
      <div className="px-5 py-4 flex items-center gap-4">
        <span className="flex items-center justify-center w-11 h-11 rounded-xl flex-shrink-0"
          style={{ background: `${accentColor}14`, color: accentColor, border: `1px solid ${accentColor}22` }}>
          <Icon size={20} strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-1"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--color-disabled)' }}>
            {label}
          </p>
          <div className="tabular-nums leading-none"
            style={{ fontFamily: "'Fira Code', monospace", fontSize: 30, fontWeight: 700, color: accentColor, letterSpacing: '-0.03em' }}>
            {display.toLocaleString()}
          </div>
        </div>
        {subtext && (
          <p className="text-[11px] font-semibold text-right flex-shrink-0"
            style={{ color: `${accentColor}66`, fontFamily: "'Plus Jakarta Sans', sans-serif", maxWidth: 64 }}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Donut ring ────────────────────────────────────────────── */
function DonutRing({ pctPublished, pctPending, pctBlocked, total }) {
  const { t } = useTranslation();
  const r = 38; const circ = 2 * Math.PI * r; const sw = 8;
  const sp = isFinite(pctPublished) ? pctPublished : 0;
  const sn = isFinite(pctPending)   ? pctPending   : 0;
  const sb = isFinite(pctBlocked)   ? pctBlocked   : 0;
  const pd = (sp / 100) * circ, nd = (sn / 100) * circ, bd = (sb / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: 108, height: 108 }}>
      <svg width="108" height="108" viewBox="0 0 108 108" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="54" cy="54" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={sw} />
        <circle cx="54" cy="54" r={r} fill="none" stroke="#22C55E" strokeWidth={sw}
          strokeDasharray={`${pd} ${circ - pd}`} strokeDashoffset={0}
          style={{ transition: "stroke-dasharray 1.1s ease-out" }} />
        <circle cx="54" cy="54" r={r} fill="none" stroke="#F59E0B" strokeWidth={sw}
          strokeDasharray={`${nd} ${circ - nd}`} strokeDashoffset={-pd}
          style={{ transition: "stroke-dasharray 1.1s ease-out 0.1s" }} />
        <circle cx="54" cy="54" r={r} fill="none" stroke="#EF4444" strokeWidth={sw}
          strokeDasharray={`${bd} ${circ - bd}`} strokeDashoffset={-(pd + nd)}
          style={{ transition: "stroke-dasharray 1.1s ease-out 0.2s" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="tabular-nums leading-none"
          style={{ fontFamily: "'Fira Code', monospace", fontSize: 22, fontWeight: 700, color: '#F8FAFC' }}>
          {total}
        </div>
        <div className="text-[9px] font-bold uppercase tracking-wider mt-0.5"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#334155' }}>
          {t("totalLabel")}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ────────────────────────────────────────── */
function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [now, setNow]                 = useState(new Date());
  const [page, setPage]               = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [exchangeRate, setExchangeRate] = useState(null);
  const [rules, setRules]             = useState([]);
  const [syncHistory, setSyncHistory] = useState([]);
  const [autoSync, setAutoSync]       = useState({ amazonEnabled: true, meliEnabled: true });
  const [sortCol, setSortCol]         = useState(null);
  const [sortDir, setSortDir]         = useState("asc");
  const PAGE_SIZE = 10;

  // ── ALL LOGIC UNTOUCHED ──
  function handleSort(col) {
    if (sortCol === col) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
    else { setSortCol(col); setSortDir("asc"); }
    setPage(1);
  }
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(id); }, []);
  useEffect(() => {
    Promise.all([getProducts(), getExchangeRate(), getMarginRules()])
      .then(([pd, rd, rld]) => {
        const list = Array.isArray(pd) ? pd : (pd.products || pd.items || []);
        setProducts(list);
        setExchangeRate(rd.usd_to_cop || null);
        setRules(rld.rules || []);
      })
      .catch(() => setError(t("errorLoading")))
      .finally(() => setLoading(false));
    getSyncHistory().then(d => setSyncHistory(Array.isArray(d) ? d : [])).catch(() => {});
    getSyncSettings().then(s => setAutoSync({ amazonEnabled: s.amazon?.enabled !== false, meliEnabled: s.meli?.enabled !== false })).catch(() => {});
    // eslint-disable-next-line
  }, []);

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div>
        <div className="grid grid-cols-12 gap-4 mb-5">
          <div className="col-span-5 rounded-2xl p-7" style={{ background: 'linear-gradient(145deg,#0d1f3c,#0F172A)', border: '1px solid rgba(59,130,246,0.15)', minHeight: 190 }}>
            <div className="skeleton h-2.5 w-24 mb-6 rounded" /><div className="skeleton h-16 w-28 mb-4 rounded" /><div className="skeleton h-2.5 w-32 rounded" />
          </div>
          <div className="col-span-4 rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <div className="skeleton h-2.5 w-20 mb-6 rounded" /><div className="skeleton h-12 w-20 mb-3 rounded" /><div className="skeleton h-2.5 w-28 rounded" />
          </div>
          <div className="col-span-3 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-center h-full"><div className="skeleton w-24 h-24 rounded-full" /></div>
          </div>
          {[0,1,2,3].map(i => (
            <div key={i} className="col-span-3 rounded-2xl px-5 py-4 flex items-center gap-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="skeleton w-11 h-11 rounded-xl flex-shrink-0" />
              <div className="flex-1"><div className="skeleton h-2 w-16 mb-2 rounded" /><div className="skeleton h-7 w-10 rounded" /></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-12 gap-4 mb-5">
          <div className="col-span-8 rounded-2xl p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', minHeight: 140 }}>
            <div className="skeleton h-2.5 w-28 mb-5 rounded" /><div className="skeleton h-10 w-20 mb-3 rounded" /><div className="skeleton h-2.5 w-40 rounded" />
          </div>
          <div className="col-span-4 rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div className="skeleton h-2 w-20 mb-5 rounded" /><div className="skeleton h-12 w-24 mb-3 rounded" /><div className="skeleton h-2 w-28 rounded" />
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-elevated)' }}>
            <div className="skeleton h-3 w-32 rounded" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4"
              style={{ borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1"><div className="skeleton h-3 w-48 mb-2 rounded" /><div className="skeleton h-2 w-24 rounded" /></div>
              <div className="skeleton h-3 w-16 rounded" /><div className="skeleton h-3 w-20 rounded" />
              <div className="skeleton h-6 w-18 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl"
        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5" }}>
        <AlertTriangle size={16} strokeWidth={2} className="flex-shrink-0" />{error}
      </div>
    );
  }

  /* ── Computed values — ALL LOGIC UNTOUCHED ── */
  const total     = products.length;
  const published = products.filter(p => p.status === "published").length;
  const blocked   = products.filter(p => p.status === "blocked").length;
  const failed    = products.filter(p => p.status === "failed").length;
  const pending   = products.filter(p => p.status === "pending").length;
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
  const getStatusOrder = p => p.stock === 0 ? 2 : (statusOrder[p.status] ?? 1);
  const sortedProducts = sortCol ? [...filteredProducts].sort((a, b) => {
    const rate = exchangeRate || 1;
    let av, bv;
    if (sortCol === "product")  { av = (a.title||"").toLowerCase();  bv = (b.title||"").toLowerCase(); }
    else if (sortCol === "asin")    { av = (a.asin||"").toLowerCase();   bv = (b.asin||"").toLowerCase(); }
    else if (sortCol === "amazon")  { av = a.amazon_price_usd||0;        bv = b.amazon_price_usd||0; }
    else if (sortCol === "ml")      { av = (a.converted_price_cop||0)/rate; bv = (b.converted_price_cop||0)/rate; }
    else if (sortCol === "stock")   { av = a.stock||0;                   bv = b.stock||0; }
    else if (sortCol === "margin")  {
      av = calcPrice(a.amazon_price_usd||0, rules, exchangeRate||1)?.profit ?? 0;
      bv = calcPrice(b.amazon_price_usd||0, rules, exchangeRate||1)?.profit ?? 0;
    }
    else if (sortCol === "status")  { av = getStatusOrder(a); bv = getStatusOrder(b); }
    else if (sortCol === "updated") { av = a.updated_at||a.created_at||""; bv = b.updated_at||b.created_at||""; }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  }) : filteredProducts;
  const totalPages  = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));
  const safePage    = Math.min(page, totalPages);
  const pageProducts = sortedProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageNums    = Array.from({ length: totalPages }, (_, i) => i + 1).filter(n => n >= safePage - 2 && n <= safePage + 2);
  const filterTabs  = [
    { key: "all",          label: t("filterAll"),       count: products.length },
    { key: "pending",      label: t("pending"),          count: products.filter(p => p.status === "pending").length },
    { key: "published",    label: t("activeLabel"),      count: products.filter(p => p.status === "published").length },
    { key: "blocked",      label: t("blocked"),          count: products.filter(p => p.status === "blocked").length },
    { key: "failed",       label: t("syncFailedLabel"),  count: products.filter(p => p.status === "failed").length },
    { key: "out_of_stock", label: t("outOfStockLabel"),  count: products.filter(p => p.stock === 0).length },
  ];

  /* ── ML + exchange rate derived values ── */
  const nowMs = Date.now(), h24 = 86400000;
  const added24h      = products.filter(p => nowMs - new Date(p.created_at).getTime() <= h24).length;
  const added48to24h  = products.filter(p => { const a = nowMs - new Date(p.created_at).getTime(); return a > h24 && a <= 2*h24; }).length;
  const delta = added24h - added48to24h;
  const deltaColor = delta > 0 ? "#4ADE80" : delta < 0 ? "#FCA5A5" : "#475569";

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const syncsToday = syncHistory.filter(s => new Date(s.started_at) >= todayStart).length;
  const lastSync   = syncHistory.find(s => s.finished_at);
  let lastSyncLabel = t("neverLabel");
  if (lastSync) {
    const d = Date.now() - new Date(lastSync.finished_at).getTime();
    const m = Math.floor(d/60000), h = Math.floor(m/60), dy = Math.floor(h/24);
    lastSyncLabel = m<1 ? t("justNow") : m<60 ? t("minAgo",{n:m}) : h<24 ? t("hrAgo",{n:h}) : t("dAgo",{n:dy});
  }

  const rate        = exchangeRate || 1;
  const withPricing = products.filter(p => p.amazon_price_usd > 0);
  const getPPct     = p => calcPrice(p.amazon_price_usd, rules, rate)?.markupPct ?? 0;
  const avgMargin   = withPricing.length > 0 ? withPricing.reduce((s,p) => s + getPPct(p), 0) / withPricing.length : null;
  const week = 604800000;
  const recent = withPricing.filter(p => Date.now() - new Date(p.created_at).getTime() <= week);
  const older  = withPricing.filter(p => Date.now() - new Date(p.created_at).getTime() > week);
  const rAvg = recent.length > 0 ? recent.reduce((s,p)=>s+getPPct(p),0)/recent.length : null;
  const oAvg = older.length  > 0 ? older.reduce((s,p)=>s+getPPct(p),0)/older.length   : null;
  const marginTrend = rAvg !== null && oAvg !== null ? rAvg - oAvg : 0;

  const oos          = products.filter(p => p.stock === 0);
  const oosCount     = oos.length;
  const oosPublished = oos.filter(p => p.status === "published").length;
  const oosColor     = oosCount === 0 ? "#4ADE80" : oosPublished > 0 ? "#FCA5A5" : "#FCD34D";

  /* ─────────────────────────────────────────────────────────── */
  return (
    <div>

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="fade-up-1 mb-8 flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1
              className="font-bold leading-none"
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: 30,
                letterSpacing: '-0.03em',
                background: 'linear-gradient(135deg, #F8FAFC 0%, #93C5FD 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t("dashboardTitle")}
            </h1>
            {/* Live pill */}
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                background: 'rgba(34,197,94,0.1)',
                color: '#4ADE80',
                border: '1px solid rgba(34,197,94,0.2)',
                boxShadow: '0 0 12px rgba(34,197,94,0.12)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full pulse-dot flex-shrink-0" style={{ background: '#22C55E' }} />
              {t("liveLabel")}
            </span>
          </div>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: 'var(--color-disabled)' }}>
            {t("dashboardSubtitle")}
          </p>
        </div>

        {/* Clock */}
        <div
          className="rounded-2xl px-4 py-3 text-right select-none"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            backdropFilter: 'blur(12px)',
          }}
          aria-hidden="true"
        >
          <div className="tabular-nums leading-none"
            style={{ fontFamily: "'Fira Code', monospace", fontSize: 20, fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
            {timeStr}
          </div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#334155', marginTop: 3 }}>
            {dateStr}
          </div>
        </div>
      </div>

      {/* ── Auto-sync OFF banner ──────────────────────────────── */}
      {(!autoSync.amazonEnabled || !autoSync.meliEnabled) && (
        <div
          className="rounded-2xl px-5 py-4 mb-6 fade-up-2 flex items-center justify-between gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.04) 100%)',
            border: '1px solid rgba(245,158,11,0.2)',
            boxShadow: '0 0 30px rgba(245,158,11,0.06)',
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertTriangle size={18} strokeWidth={2} style={{ color: '#FCD34D' }} />
            </div>
            <div>
              <p className="font-bold text-[14px]"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#FCD34D' }}>
                {t("autoSyncOffBannerTitle")}
              </p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#475569', marginTop: 2 }}>
                {!autoSync.amazonEnabled && !autoSync.meliEnabled ? t("autoSyncBothOffDesc")
                  : !autoSync.amazonEnabled ? t("autoSyncAmazonOffDesc") : t("autoSyncMeliOffDesc")}
              </p>
            </div>
          </div>
          <Link to="/sync"
            className="flex-shrink-0 text-[12px] font-bold px-4 py-2 rounded-xl transition-all duration-200 whitespace-nowrap cursor-pointer"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              background: 'rgba(245,158,11,0.14)',
              color: '#FCD34D',
              border: '1px solid rgba(245,158,11,0.25)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.14)'; }}
          >
            {t("goToSyncBtn")}
          </Link>
        </div>
      )}

      {/* ── Bento KPI grid ───────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4 mb-5">

        {/* Hero — Total Products: 5 cols, tall */}
        <div className="col-span-12 lg:col-span-5 fade-up-1" style={{ minHeight: 190 }}>
          <StatCard label={t("totalProducts")} value={total} icon={Package}
            accentColor="#3B82F6" variant="hero"
            subtext={t("fullCatalog")} delay={0.08} />
        </div>

        {/* Published — 4 cols */}
        <div className="col-span-7 lg:col-span-4 fade-up-2">
          <StatCard label={t("published")} value={published} icon={CheckCircle2}
            accentColor="#22C55E" variant="featured"
            subtext={t("pctOfTotal", { pct: pctPublished.toFixed(1) })} delay={0.16} />
        </div>

        {/* Status Donut — 3 cols */}
        <div className="col-span-5 lg:col-span-3 fade-up-3">
          <div
            className="card-glass rounded-2xl p-5 h-full flex flex-col cursor-pointer"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-4"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--color-disabled)' }}>
              {t("status")}
            </p>
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <DonutRing pctPublished={pctPublished} pctPending={pctPending} pctBlocked={pctBlocked} total={total} />
              <div className="flex flex-col gap-1.5 w-full">
                {[
                  { label: t("activeLabel"), color: "#22C55E", val: published },
                  { label: t("pending"),     color: "#F59E0B", val: pending },
                  { label: t("blocked"),     color: "#EF4444", val: blocked },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between text-[11px]"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
                      <span style={{ color: 'var(--color-muted)' }}>{row.label}</span>
                    </div>
                    <span className="font-bold tabular-nums" style={{ fontFamily: "'Fira Code', monospace", color: row.color }}>
                      {row.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Blocked — 3 cols */}
        <div className="col-span-6 lg:col-span-3 fade-up-4">
          <StatCard label={t("blocked")} value={blocked} icon={ShieldOff}
            accentColor="#EF4444" variant="compact"
            subtext={`${((blocked/safe)*100).toFixed(1)}%`} delay={0.24} />
        </div>

        {/* Pending — 3 cols */}
        <div className="col-span-6 lg:col-span-3 fade-up-4">
          <StatCard label={t("pending")} value={pending} icon={Clock}
            accentColor="#F59E0B" variant="compact"
            subtext={`${pctPending.toFixed(1)}%`} delay={0.32} />
        </div>

        {/* Exchange Rate — 6 cols, spans the right half */}
        <div className="col-span-12 lg:col-span-6 fade-up-5">
          <div
            className="card-glass gradient-border rounded-2xl relative overflow-hidden flex flex-col cursor-pointer h-full"
            style={{
              border: '1px solid rgba(59,130,246,0.2)',
              transition: 'border-color 220ms ease, box-shadow 220ms ease',
              minHeight: 120,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)';
              e.currentTarget.style.boxShadow = 'var(--shadow-glow-blue)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            {/* Inner ambient glow */}
            <div style={{
              position: 'absolute', right: '-10%', top: '-30%',
              width: '50%', height: '120%', borderRadius: '50%', pointerEvents: 'none',
              background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
            }} />
            <div className="relative flex items-stretch" style={{ flex: 1 }}>
              {/* Left: rate info */}
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-1"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--color-disabled)' }}>
                      {t("exchangeRate")}
                    </p>
                    <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, color: '#334155', letterSpacing: '0.05em' }}>
                      USD → COP
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      background: 'rgba(34,197,94,0.1)',
                      color: '#4ADE80',
                      border: '1px solid rgba(34,197,94,0.2)',
                    }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: '#22C55E' }} />
                    {t("liveLabel")}
                  </span>
                </div>
                <div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#334155', marginBottom: 6 }}>
                    {t("currentRate")}
                  </p>
                  <div className="tabular-nums leading-none"
                    style={{
                      fontFamily: "'Fira Code', monospace",
                      fontSize: 48,
                      fontWeight: 700,
                      letterSpacing: '-0.04em',
                      background: 'linear-gradient(135deg, #93C5FD 0%, #818CF8 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>
                    {exchangeRate ? exchangeRate.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—"}
                  </div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#334155', marginTop: 6 }}>
                    {t("updatedToday")}
                  </p>
                </div>
              </div>
              {/* Right: sparkline */}
              <div className="w-[45%] flex-shrink-0 flex flex-col justify-end overflow-hidden" style={{ opacity: 0.7 }}>
                <svg className="w-full" style={{ height: '100%', display: 'block' }} viewBox="0 0 100 60" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="spark-fill2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 44 C10 40, 18 50, 28 36 C38 22, 46 34, 56 26 C66 18, 74 30, 82 20 C90 10, 96 22, 100 14 L100 60 L0 60 Z" fill="url(#spark-fill2)" />
                  <path className="sparkline-draw" d="M0 44 C10 40, 18 50, 28 36 C38 22, 46 34, 56 26 C66 18, 74 30, 82 20 C90 10, 96 22, 100 14"
                    fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── ML Overview + secondary stats ───────────────────── */}
      <div className="grid grid-cols-12 gap-4 mb-5">

        {/* ML Overview — 8 cols */}
        <div className="col-span-12 lg:col-span-8 fade-up-5">
          <div
            className="rounded-2xl overflow-hidden cursor-pointer h-full"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-md)',
              transition: 'border-color 220ms ease, box-shadow 220ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          >
            {/* Colored top accent */}
            <div style={{ height: 2, background: 'linear-gradient(90deg, #3B82F6, #6366F1, transparent)' }} />
            <div className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <Activity size={13} strokeWidth={2.5} style={{ color: 'var(--color-primary)' }} />
                <p className="text-[11px] font-bold uppercase tracking-[0.1em]"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--color-muted)' }}>
                  {t("mlOverview")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Active on ML */}
                <div className="rounded-xl p-4"
                  style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={12} strokeWidth={2.5} style={{ color: '#22C55E', flexShrink: 0 }} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em]"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#475569' }}>{t("activeOnMl")}</p>
                  </div>
                  <div className="tabular-nums leading-none mb-1.5"
                    style={{ fontFamily: "'Fira Code', monospace", fontSize: 42, fontWeight: 700, letterSpacing: '-0.04em', color: '#4ADE80' }}>
                    {published.toLocaleString()}
                  </div>
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 600, color: 'rgba(74,222,128,0.65)' }}>
                    {t("pctOfCatalog", { pct: pctPublished.toFixed(1) })}
                  </p>
                </div>
                {/* Added 24h */}
                <div className="rounded-xl p-4"
                  style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={12} strokeWidth={2.5} style={{ color: '#3B82F6', flexShrink: 0 }} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em]"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#475569' }}>{t("addedLast24h")}</p>
                  </div>
                  <div className="tabular-nums leading-none mb-1.5"
                    style={{ fontFamily: "'Fira Code', monospace", fontSize: 42, fontWeight: 700, letterSpacing: '-0.04em', color: '#93C5FD' }}>
                    {added24h}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {delta > 0 && <TrendingUp  size={12} strokeWidth={2.5} style={{ color: deltaColor }} />}
                    {delta < 0 && <TrendingDown size={12} strokeWidth={2.5} style={{ color: deltaColor }} />}
                    {delta === 0 && <Minus size={12} strokeWidth={2.5} style={{ color: deltaColor }} />}
                    <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 600, color: deltaColor }}>
                      {delta === 0 ? t("sameAsYesterday") : delta > 0 ? t("moreVsYesterday", { n: Math.abs(delta) }) : t("fewerVsYesterday", { n: Math.abs(delta) })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right stacked — 4 cols: OOS + Avg Margin */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 fade-up-6">

          {/* Out of stock */}
          <div
            className="rounded-2xl p-5 flex-1 cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.022)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${oosColor}18`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              transition: 'all 200ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${oosColor}38`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${oosColor}18`; }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em]"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--color-disabled)' }}>
                {t("needsAttention")}
              </p>
              <span className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0"
                style={{ background: `${oosColor}14`, color: oosColor, border: `1px solid ${oosColor}22` }}>
                {oosCount === 0 ? <CheckCircle2 size={14} strokeWidth={2} /> : <AlertTriangle size={14} strokeWidth={2} />}
              </span>
            </div>
            <div className="tabular-nums leading-none mb-1"
              style={{ fontFamily: "'Fira Code', monospace", fontSize: 32, fontWeight: 700, color: oosColor, letterSpacing: '-0.03em' }}>
              {oosCount}
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: 'var(--color-disabled)' }}>
              {oosCount === 0 ? t("allInStock") : t("outOfStockSubtitle", { s: oosCount !== 1 ? "s" : "" })}
            </p>
          </div>

          {/* Avg Margin */}
          <div
            className="rounded-2xl p-5 flex-1 cursor-pointer"
            style={{
              background: 'rgba(255,255,255,0.022)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(59,130,246,0.14)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              transition: 'all 200ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.14)'; }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em]"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--color-disabled)' }}>
                {t("avgProfitMargin")}
              </p>
              <span className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0"
                style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--color-primary)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <BarChart3 size={14} strokeWidth={2} />
              </span>
            </div>
            <div className="tabular-nums leading-none mb-1"
              style={{
                fontFamily: "'Fira Code', monospace", fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em',
                background: 'linear-gradient(135deg, #93C5FD 0%, #818CF8 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
              {avgMargin !== null ? `${avgMargin.toFixed(1)}%` : "—"}
            </div>
            <div className="flex items-center gap-1.5">
              {marginTrend > 0.5  && <TrendingUp  size={12} strokeWidth={2.5} style={{ color: '#4ADE80' }} />}
              {marginTrend < -0.5 && <TrendingDown size={12} strokeWidth={2.5} style={{ color: '#FCA5A5' }} />}
              {Math.abs(marginTrend) <= 0.5 && <Minus size={12} strokeWidth={2.5} style={{ color: '#475569' }} />}
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: 'var(--color-disabled)' }}>
                {marginTrend > 0.5 ? t("trendVsOlderUp", { pct: Math.abs(marginTrend).toFixed(1) })
                  : marginTrend < -0.5 ? t("trendVsOlderDown", { pct: Math.abs(marginTrend).toFixed(1) })
                  : t("stableMargin")}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Secondary stats row ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5 fade-up-6">

        {/* Sales */}
        <div className="rounded-2xl px-5 py-4 cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(16px)', border: '1px solid rgba(59,130,246,0.12)', boxShadow: '0 4px 16px rgba(0,0,0,0.25)', transition: 'all 200ms ease' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.035)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.12)'; }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--color-disabled)' }}>
              {t("salesThisMonth")}
            </p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--color-primary)' }}>
              <DollarSign size={13} strokeWidth={2} />
            </span>
          </div>
          <div className="tabular-nums leading-none mb-1"
            style={{ fontFamily: "'Fira Code', monospace", fontSize: 24, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            $0.00
          </div>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: 'var(--color-disabled)' }}>{t("zeroOrders")}</p>
        </div>

        {/* Sync runs */}
        <div className="rounded-2xl px-5 py-4 cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(16px)', border: '1px solid rgba(59,130,246,0.12)', boxShadow: '0 4px 16px rgba(0,0,0,0.25)', transition: 'all 200ms ease' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.035)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.12)'; }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--color-disabled)' }}>
              {t("amazonSyncShort")}
            </p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--color-primary)' }}>
              <RefreshCw size={13} strokeWidth={2} />
            </span>
          </div>
          <div className="tabular-nums leading-none mb-1"
            style={{ fontFamily: "'Fira Code', monospace", fontSize: 24, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
            {syncsToday}
          </div>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: lastSync ? 'var(--color-primary)' : 'var(--color-disabled)' }}>
            {t("lastSyncLabel")} {lastSyncLabel}
          </p>
        </div>

        {/* OOS compact */}
        <div className="rounded-2xl px-5 py-4 cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(16px)', border: `1px solid ${oosColor}14`, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', transition: 'all 200ms ease' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.035)'; e.currentTarget.style.borderColor = `${oosColor}30`; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = `${oosColor}14`; }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--color-disabled)' }}>
              {t("outOfStockLabel")}
            </p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${oosColor}12`, color: oosColor }}>
              {oosCount === 0 ? <CheckCircle2 size={13} strokeWidth={2} /> : <AlertTriangle size={13} strokeWidth={2} />}
            </span>
          </div>
          <div className="tabular-nums leading-none mb-1"
            style={{ fontFamily: "'Fira Code', monospace", fontSize: 24, fontWeight: 700, color: oosColor, letterSpacing: '-0.02em' }}>
            {oosCount}
          </div>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: 'var(--color-disabled)' }}>
            {oosCount === 0 ? t("allInStock") : oosPublished > 0 ? t("listedMlUrgent", { n: oosPublished }) : t("notListedRestock")}
          </p>
        </div>

        {/* Failed */}
        <div className="rounded-2xl px-5 py-4 cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(16px)', border: `1px solid ${failed > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.12)'}`, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', transition: 'all 200ms ease' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.035)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--color-disabled)' }}>
              {t("syncFailedLabel")}
            </p>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: failed > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', color: failed > 0 ? '#FCA5A5' : 'var(--color-primary)' }}>
              <AlertTriangle size={13} strokeWidth={2} />
            </span>
          </div>
          <div className="tabular-nums leading-none mb-1"
            style={{ fontFamily: "'Fira Code', monospace", fontSize: 24, fontWeight: 700, color: failed > 0 ? '#FCA5A5' : 'var(--color-text)', letterSpacing: '-0.02em' }}>
            {failed}
          </div>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: 'var(--color-disabled)' }}>
            {failed === 0 ? t("noActionNeeded") : t("syncFailedLabel")}
          </p>
        </div>

      </div>

      {/* ── Products table ────────────────────────────────────── */}
      <div
        className="fade-up-6 rounded-2xl overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Table topbar */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <BarChart3 size={14} strokeWidth={2} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p className="font-bold text-[14px]"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--color-text)' }}>
                {t("recentProducts")}
              </p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: 'var(--color-disabled)' }}>
                {t("itemsPerPage", { n: PAGE_SIZE })}
              </p>
            </div>
          </div>
          <Link to="/products"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold cursor-pointer transition-all duration-200"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              background: 'rgba(59,130,246,0.08)',
              color: '#93C5FD',
              border: '1px solid rgba(59,130,246,0.18)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.16)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; }}
          >
            {t("viewAll")} <ChevronRight size={13} strokeWidth={2.5} />
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center px-6 gap-1"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', overflowX: 'auto' }}>
          {filterTabs.map(tab => {
            const active = statusFilter === tab.key;
            const accent = tab.key === "pending" ? "#F59E0B" : tab.key === "published" ? "#22C55E"
              : tab.key === "blocked" ? "#EF4444" : tab.key === "out_of_stock" ? "#A78BFA"
              : "var(--color-primary)";
            return (
              <button key={tab.key}
                onClick={() => { setStatusFilter(tab.key); setPage(1); }}
                className="flex items-center gap-1.5 px-3 py-3 text-[12px] font-semibold border-b-2 -mb-px transition-all duration-150 whitespace-nowrap cursor-pointer"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  borderColor: active ? accent : 'transparent',
                  color: active ? 'var(--color-text)' : 'var(--color-disabled)',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--color-muted)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--color-disabled)'; }}
              >
                {tab.label}
                <span className="text-[10px] font-bold tabular-nums"
                  style={{ fontFamily: "'Fira Code', monospace", color: active ? accent : '#1E293B' }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => { setSortCol("updated"); setSortDir("desc"); setPage(1); }}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all duration-150 cursor-pointer"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              background: sortCol === "updated" ? 'rgba(59,130,246,0.1)' : 'transparent',
              color: sortCol === "updated" ? '#93C5FD' : 'var(--color-disabled)',
              border: `1px solid ${sortCol === "updated" ? 'rgba(59,130,246,0.25)' : 'transparent'}`,
            }}
          >
            <Clock size={11} strokeWidth={2} />{t("sortByLatestBtn")}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.015)' }}>
                {[
                  { col: "product",  label: t("colProduct"),    align: "left",   minW: 260 },
                  { col: "asin",     label: "ASIN",             align: "left",   minW: 120 },
                  { col: "category", label: t("categoryHeader"), align: "left",   minW: 150 },
                  { col: "amazon",   label: t("colAmazonPrice"), align: "right",  minW: 110 },
                  { col: "ml",       label: t("colMlPrice"),     align: "right",  minW: 110 },
                  { col: "margin",   label: t("colMargin"),      align: "right",  minW: 90  },
                  { col: "stock",    label: t("stock"),          align: "right",  minW: 70  },
                  { col: "status",   label: t("status"),         align: "center", minW: 110 },
                ].map(({ col, label, align, minW }) => (
                  <th key={col} className={`px-5 py-3 text-${align}`} style={{ minWidth: minW }}>
                    <button onClick={() => handleSort(col)}
                      className="inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: sortCol === col ? '#93C5FD' : 'var(--color-disabled)',
                      }}
                      onMouseEnter={e => { if (sortCol !== col) e.currentTarget.style.color = 'var(--color-muted)'; }}
                      onMouseLeave={e => { if (sortCol !== col) e.currentTarget.style.color = 'var(--color-disabled)'; }}
                    >
                      {label}
                      <ArrowUpDown size={10} strokeWidth={2.5} style={{ opacity: sortCol === col ? 1 : 0.35 }} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageProducts.map(p => {
                const aUsd   = Number(p.amazon_price_usd || 0);
                const calc   = calcPrice(aUsd, rules, exchangeRate);
                const mlUsd  = calc?.mlUsd  ?? null;
                const profit = calc?.profit ?? null;
                return (
                  <tr key={p.id || p.asin}
                    className="transition-colors duration-150 cursor-pointer"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.025)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Product */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                          style={{ background: 'var(--color-elevated)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {p.image_url
                            ? <img src={p.image_url} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = "none"; }} />
                            : <ImageIcon size={14} strokeWidth={1.5} style={{ color: '#334155' }} />}
                        </div>
                        <button
                          onClick={() => navigate(`/products/${p.id}/edit`, { state: { product: p } })}
                          className="text-left font-medium text-[12px] max-w-[240px] truncate transition-colors duration-150 cursor-pointer"
                          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--color-muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#93C5FD'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-muted)'; }}
                          title={p.title}
                        >{p.title}</button>
                      </div>
                    </td>
                    {/* ASIN */}
                    <td className="px-5 py-3.5">
                      <code className="text-[11px] font-bold px-2 py-1 rounded-lg"
                        style={{ fontFamily: "'Fira Code', monospace", background: 'rgba(99,102,241,0.1)', color: '#A5B4FC' }}>
                        {p.asin}
                      </code>
                    </td>
                    {/* Category */}
                    <td className="px-5 py-3.5">
                      {p.category_path ? (
                        <div title={p.category_path}>
                          <span className="block truncate max-w-[120px]"
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 9, color: '#334155' }}>
                            {p.category_path.split(" > ")[0]}
                          </span>
                          <span className="block truncate max-w-[120px] px-1.5 py-0.5 rounded-md mt-0.5"
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, background: 'rgba(59,130,246,0.07)', color: 'var(--color-muted)', border: '1px solid rgba(59,130,246,0.1)' }}>
                            {p.category_path.split(" > ").pop()}
                          </span>
                        </div>
                      ) : <span style={{ color: '#334155', fontSize: 12 }}>—</span>}
                    </td>
                    {/* Amazon price */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="font-bold text-[13px] tabular-nums"
                        style={{ fontFamily: "'Fira Code', monospace", color: 'var(--color-text-2)' }}>
                        ${aUsd.toFixed(2)}
                      </div>
                      {exchangeRate && (
                        <div className="text-[10px] tabular-nums"
                          style={{ fontFamily: "'Fira Code', monospace", color: '#334155' }}>
                          {(Math.round(aUsd * exchangeRate / 100) * 100).toLocaleString()} COP
                        </div>
                      )}
                    </td>
                    {/* ML price */}
                    <td className="px-5 py-3.5 text-right">
                      {mlUsd !== null ? (
                        <div>
                          <div className="font-bold text-[13px] tabular-nums"
                            style={{ fontFamily: "'Fira Code', monospace", color: '#93C5FD' }}>
                            ${mlUsd.toFixed(2)}
                          </div>
                          {calc?.mlCop != null && (
                            <div className="text-[10px] tabular-nums"
                              style={{ fontFamily: "'Fira Code', monospace", color: '#334155' }}>
                              {calc.mlCop.toLocaleString()} COP
                            </div>
                          )}
                        </div>
                      ) : <span style={{ color: '#334155' }}>—</span>}
                    </td>
                    {/* Margin */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {profit !== null ? (
                        <div>
                          <span className="font-bold text-[13px] tabular-nums"
                            style={{ fontFamily: "'Fira Code', monospace", color: '#4ADE80' }}>
                            +${profit.toFixed(2)}
                          </span>
                          {exchangeRate && (
                            <div className="text-[10px] tabular-nums"
                              style={{ fontFamily: "'Fira Code', monospace", color: 'rgba(74,222,128,0.45)' }}>
                              +{(Math.round(profit * exchangeRate / 100) * 100).toLocaleString()} COP
                            </div>
                          )}
                        </div>
                      ) : <span style={{ color: '#334155' }}>—</span>}
                    </td>
                    {/* Stock */}
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-bold text-[13px] tabular-nums"
                        style={{ fontFamily: "'Fira Code', monospace", color: p.stock === 0 ? '#FCA5A5' : 'var(--color-text-2)' }}>
                        {p.stock}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={p.status} stock={p.stock} />
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr><td colSpan="8" className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: 'var(--color-elevated)', border: '1px solid var(--color-border)' }}>
                      <Inbox size={24} strokeWidth={1.5} style={{ color: '#334155' }} />
                    </div>
                    <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: 'var(--color-disabled)' }}>
                      {t("noProducts")}
                    </p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {products.length > 0 && (
          <div className="px-6 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: 'var(--color-disabled)' }}>
              {t("showing")}{" "}
              <span className="font-bold tabular-nums" style={{ fontFamily: "'Fira Code', monospace", color: 'var(--color-muted)' }}>
                {sortedProducts.length === 0 ? 0 : (safePage-1)*PAGE_SIZE+1}–{Math.min(safePage*PAGE_SIZE, sortedProducts.length)}
              </span>{" "}{t("of")}{" "}
              <span className="font-bold tabular-nums" style={{ fontFamily: "'Fira Code', monospace", color: 'var(--color-muted)' }}>
                {sortedProducts.length}
              </span>{" "}{t("productsLabel")}
            </p>
            <div className="flex items-center gap-1">
              {[
                { onClick: () => setPage(1),            icon: ChevronsLeft,   disabled: safePage === 1,          label: "First page" },
                { onClick: () => setPage(p=>Math.max(1,p-1)), icon: ChevronLeft, disabled: safePage === 1,       label: "Prev page" },
              ].map(({ onClick, icon: Icon, disabled, label }) => (
                <button key={label} onClick={onClick} disabled={disabled} aria-label={label}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                  style={{
                    background: disabled ? 'transparent' : 'rgba(59,130,246,0.08)',
                    color: disabled ? '#1E293B' : '#93C5FD',
                    border: `1px solid ${disabled ? '#1E293B' : 'rgba(59,130,246,0.2)'}`,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}>
                  <Icon size={13} strokeWidth={2.5} />
                </button>
              ))}
              {pageNums.map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className="w-7 h-7 rounded-lg text-[11px] font-bold transition-all duration-150 cursor-pointer"
                  style={n === safePage ? {
                    background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                    color: '#F8FAFC', border: 'none',
                    boxShadow: '0 0 12px rgba(59,130,246,0.4)',
                    fontFamily: "'Fira Code', monospace",
                  } : {
                    background: 'transparent',
                    color: 'var(--color-disabled)',
                    border: '1px solid #1E293B',
                    cursor: 'pointer',
                    fontFamily: "'Fira Code', monospace",
                  }}>
                  {n}
                </button>
              ))}
              {[
                { onClick: () => setPage(p=>Math.min(totalPages,p+1)), icon: ChevronRight, disabled: safePage === totalPages, label: "Next page" },
                { onClick: () => setPage(totalPages),                  icon: ChevronsRight,        disabled: safePage === totalPages, label: "Last page" },
              ].map(({ onClick, icon: Icon, disabled, label }) => (
                <button key={label} onClick={onClick} disabled={disabled} aria-label={label}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                  style={{
                    background: disabled ? 'transparent' : 'rgba(59,130,246,0.08)',
                    color: disabled ? '#1E293B' : '#93C5FD',
                    border: `1px solid ${disabled ? '#1E293B' : 'rgba(59,130,246,0.2)'}`,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}>
                  <Icon size={13} strokeWidth={2.5} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default Dashboard;
