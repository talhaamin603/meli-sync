import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { searchAmazon, addFromSearch, getCategories } from "../api.js";

const PAGE_SIZE = 16;

// Deterministic accent color per category name
function catColor(name) {
  const palette = ["#50A0FA", "#a78bfa", "#10b981", "#f59e0b", "#ec4899", "#22c55e", "#f97316", "#38bdf8", "#fb7185", "#84cc16"];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return palette[Math.abs(h) % palette.length];
}

function Stars({ rating }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const fill = rating >= i ? 1 : rating >= i - 0.5 ? 0.5 : 0;
    stars.push(
      <span key={i} style={{ position: "relative", display: "inline-block", width: 12, height: 12 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" style={{ position: "absolute", top: 0, left: 0 }}>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#2a3345" stroke="none" />
        </svg>
        {fill > 0 && (
          <svg width="12" height="12" viewBox="0 0 24 24" style={{ position: "absolute", top: 0, left: 0, clipPath: fill === 1 ? "none" : "inset(0 50% 0 0)" }}>
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#f59e0b" stroke="none" />
          </svg>
        )}
      </span>
    );
  }
  return <span style={{ display: "inline-flex", gap: 1, verticalAlign: "middle" }}>{stars}</span>;
}

function ResultRow({ item, checked, onToggle, addedStatus }) {
  const statusColor = addedStatus === "added" ? "#22c55e"
    : addedStatus === "skipped" ? "#f59e0b"
    : addedStatus === "blocked" ? "#ef4444"
    : addedStatus === "failed" ? "#ef4444"
    : null;
  const statusLabel = addedStatus === "added" ? "Added"
    : addedStatus === "skipped" ? "Skipped"
    : addedStatus === "blocked" ? "Blocked"
    : addedStatus === "failed" ? "Failed"
    : null;

  return (
    <div
      onClick={() => !addedStatus && onToggle(item.asin)}
      className="flex items-center gap-3 px-4 py-3 transition-colors"
      style={{
        borderBottom: "1px solid rgba(80,160,250,0.07)",
        cursor: addedStatus ? "default" : "pointer",
        background: checked ? "rgba(80,160,250,0.06)" : "transparent",
      }}
      onMouseEnter={e => { if (!addedStatus) e.currentTarget.style.background = "rgba(80,160,250,0.04)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = checked ? "rgba(80,160,250,0.06)" : "transparent"; }}
    >
      {/* Checkbox */}
      {!addedStatus ? (
        <div
          className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all"
          style={{
            border: `1.5px solid ${checked ? "#50A0FA" : "rgba(80,160,250,0.3)"}`,
            background: checked ? "#50A0FA" : "transparent",
          }}
        >
          {checked && (
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
              <polyline points="2,6 5,9 10,3" stroke="#0d1117" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      ) : (
        <div className="flex-shrink-0 w-4" />
      )}

      {/* Thumbnail */}
      <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden"
        style={{ background: "#1a2235", border: "1px solid rgba(80,160,250,0.1)" }}>
        {item.image_url ? (
          <img src={item.image_url} alt="" className="w-full h-full object-contain"
            onError={e => { e.target.style.display = "none"; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="20" height="20" fill="none" stroke="#3a4250" viewBox="0 0 24 24" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21,15 16,10 5,21" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#e8ecf2] leading-snug line-clamp-2 mb-1">{item.title}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {item.rating > 0 && (
            <span className="flex items-center gap-1">
              <Stars rating={item.rating} />
              <span className="text-[11px]" style={{ color: "#f59e0b" }}>{item.rating.toFixed(1)}</span>
            </span>
          )}
          {item.review_count > 0 && (
            <span className="text-[11px]" style={{ color: "#4a5568" }}>({item.review_count.toLocaleString()})</span>
          )}
          {item.is_prime && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: "rgba(0,112,243,0.15)", color: "#0070F3", border: "1px solid rgba(0,112,243,0.3)" }}>
              Prime
            </span>
          )}
          {item.badge && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
              {item.badge}
            </span>
          )}
          {item.is_sponsored && (
            <span className="text-[10px]" style={{ color: "#3a4250" }}>Sponsored</span>
          )}
          <span className="text-[10px]" style={{ color: "#3a4250" }}>ASIN: {item.asin}</span>
        </div>
      </div>

      {/* Price / status */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {statusLabel ? (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}35` }}>
            {statusLabel}
          </span>
        ) : (
          item.amazon_price_usd > 0 && (
            <span className="text-sm font-semibold" style={{ color: "#e8ecf2" }}>
              ${item.amazon_price_usd.toFixed(2)}
            </span>
          )
        )}
      </div>
    </div>
  );
}

export default function CategoryImport() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [catsLoading, setCatsLoading] = useState(true);

  // Amazon browse state
  const [selectedMain, setSelectedMain] = useState(null); // {id, name} from DB
  const [all, setAll] = useState([]);
  const [uiPage, setUiPage] = useState(1);
  const [amazonPage, setAmazonPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Selection state
  const [selected, setSelected] = useState(new Set());
  const [adding, setAdding] = useState(false);
  const [addSummary, setAddSummary] = useState(null);
  const [addedMap, setAddedMap] = useState({});

  // Subcategory picker
  const [subCatId, setSubCatId] = useState("");

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setCatsLoading(false));
  }, []);

  const mains = categories.filter(c => c.parent_id === null).sort((a, b) => a.name.localeCompare(b.name));

  function subsOf(mainId) {
    return categories
      .filter(c => String(c.parent_id) === String(mainId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async function pickMain(cat) {
    setSelectedMain(cat);
    setAll([]);
    setUiPage(1);
    setAmazonPage(1);
    setHasMore(true);
    setSelected(new Set());
    setSubCatId("");
    setAddSummary(null);
    setAddedMap({});
    setFetchError("");
    setLoading(true);
    try {
      const data = await searchAmazon(cat.name, 1);
      setAll(data.results || []);
      setHasMore((data.results || []).length >= PAGE_SIZE);
    } catch {
      setFetchError("Failed to load products. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const visible = all.slice((uiPage - 1) * PAGE_SIZE, uiPage * PAGE_SIZE);
  const canGoNext = uiPage * PAGE_SIZE < all.length || hasMore;

  async function goNext() {
    if (uiPage * PAGE_SIZE < all.length) {
      setUiPage(p => p + 1);
      return;
    }
    if (!hasMore) return;
    setLoadingMore(true);
    try {
      const next = amazonPage + 1;
      const data = await searchAmazon(selectedMain.name, next);
      const fresh = (data.results || []).filter(r => !all.find(a => a.asin === r.asin));
      if (fresh.length === 0) {
        setHasMore(false);
      } else {
        setAll(prev => [...prev, ...fresh]);
        setAmazonPage(next);
        setUiPage(p => p + 1);
        setHasMore(fresh.length >= PAGE_SIZE);
      }
    } catch {
      /* user can retry */
    } finally {
      setLoadingMore(false);
    }
  }

  function toggleSelect(asin) {
    if (addedMap[asin]) return;
    setSelected(prev => {
      const n = new Set(prev);
      n.has(asin) ? n.delete(asin) : n.add(asin);
      return n;
    });
  }

  function togglePage() {
    const eligible = visible.filter(p => !addedMap[p.asin]).map(p => p.asin);
    const allSel = eligible.every(a => selected.has(a));
    setSelected(prev => {
      const n = new Set(prev);
      if (allSel) eligible.forEach(a => n.delete(a));
      else eligible.forEach(a => n.add(a));
      return n;
    });
  }

  const subs = selectedMain ? subsOf(selectedMain.id) : [];
  const noSubs = selectedMain && subs.length === 0;
  const categoryId = subCatId ? parseInt(subCatId) : undefined;
  const canImport = selected.size > 0 && !!categoryId && !adding;

  async function handleImport() {
    if (!canImport) return;
    const toAdd = [...selected].map(asin => {
      const p = all.find(x => x.asin === asin);
      return {
        asin,
        title: p?.title || "",
        image_url: p?.image_url || "",
        amazon_price_usd: p?.amazon_price_usd || 0,
        is_prime: p?.is_prime || false,
      };
    });
    setAdding(true);
    try {
      const result = await addFromSearch(toAdd, categoryId);
      setAddSummary(result.summary);
      const map = {};
      (result.results || []).forEach(r => { map[r.asin] = r.status; });
      setAddedMap(prev => ({ ...prev, ...map }));
      setSelected(new Set());
    } catch {
      /* silent — rows still show status */
    } finally {
      setAdding(false);
    }
  }

  // ── Phase 1: main category grid ──
  if (!selectedMain) {
    return (
      <div>
        <div className="mb-6 fade-up">
          <button
            onClick={() => navigate("/add")}
            className="flex items-center gap-1.5 text-sm mb-4 transition-colors"
            style={{ color: "#4a5568" }}
            onMouseEnter={e => e.currentTarget.style.color = "#e8ecf2"}
            onMouseLeave={e => e.currentTarget.style.color = "#4a5568"}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-medium text-white mb-1">Import by Category</h1>
          <p className="text-sm" style={{ color: "#6b7785" }}>
            Pick one of your categories — Amazon will be searched for products matching that name.
          </p>
        </div>

        {catsLoading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "#4a5568" }}>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading categories…
          </div>
        ) : mains.length === 0 ? (
          <div className="card rounded-xl flex flex-col items-center justify-center py-16 text-center">
            <svg width="40" height="40" fill="none" stroke="#3a4250" viewBox="0 0 24 24" strokeWidth="1.5" className="mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            <p className="text-sm text-white mb-1">No categories yet</p>
            <p className="text-xs mb-4" style={{ color: "#4a5568" }}>
              Create at least one main category before using this import method.
            </p>
            <button
              onClick={() => navigate("/categories")}
              className="text-sm px-4 py-2 rounded-lg font-medium"
              style={{ background: "rgba(80,160,250,0.1)", color: "#50A0FA", border: "1px solid rgba(80,160,250,0.25)" }}
            >
              Go to Categories
            </button>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
            {mains.map(cat => {
              const color = catColor(cat.name);
              const subCount = subsOf(cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => pickMain(cat)}
                  className="rounded-xl p-4 text-left transition-all hover:-translate-y-0.5"
                  style={{ background: "#0f1623", border: "1px solid rgba(80,160,250,0.1)" }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = color + "55";
                    e.currentTarget.style.boxShadow = `0 4px 20px ${color}18`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "rgba(80,160,250,0.1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Initial avatar */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 text-base font-bold select-none"
                    style={{ background: color + "20", border: `1px solid ${color}35`, color }}
                  >
                    {cat.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-medium text-[#e8ecf2] leading-tight mb-1 truncate">{cat.name}</p>
                  {subCount > 0 && (
                    <p className="text-[11px]" style={{ color: "#4a5568" }}>
                      {subCount} subcategor{subCount === 1 ? "y" : "ies"}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Phase 2: product list ──
  const color = catColor(selectedMain.name);
  const eligibleOnPage = visible.filter(p => !addedMap[p.asin]);
  const allPageSelected = eligibleOnPage.length > 0 && eligibleOnPage.every(p => selected.has(p.asin));

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 fade-up">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedMain(null)}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: "#4a5568" }}
            onMouseEnter={e => e.currentTarget.style.color = "#e8ecf2"}
            onMouseLeave={e => e.currentTarget.style.color = "#4a5568"}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Change category
          </button>
          <span style={{ color: "#2a3345" }}>|</span>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold select-none"
              style={{ background: color + "20", color }}
            >
              {selectedMain.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-lg font-semibold text-white">{selectedMain.name}</h1>
          </div>
        </div>
        {all.length > 0 && (
          <span className="text-xs" style={{ color: "#4a5568" }}>{all.length} products loaded</span>
        )}
      </div>

      <div className="flex gap-4 items-start">
        {/* ── Product panel ── */}
        <div className="flex-1 min-w-0 card rounded-xl overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: "1px solid rgba(80,160,250,0.08)" }}>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: "#6b7785" }}>
              <div
                onClick={togglePage}
                className="w-4 h-4 rounded flex items-center justify-center transition-all cursor-pointer"
                style={{
                  border: `1.5px solid ${allPageSelected ? "#50A0FA" : "rgba(80,160,250,0.3)"}`,
                  background: allPageSelected ? "#50A0FA" : "transparent",
                }}
              >
                {allPageSelected && (
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                    <polyline points="2,6 5,9 10,3" stroke="#0d1117" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span onClick={togglePage}>Select page</span>
            </label>
            {selected.size > 0 && (
              <span className="text-xs font-semibold" style={{ color: "#50A0FA" }}>
                {selected.size} selected
              </span>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20 text-[#4a5568]">
              <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Searching Amazon for "{selectedMain.name}"…</span>
            </div>
          )}

          {/* Error */}
          {!loading && fetchError && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <p className="text-sm text-red-400 mb-3">{fetchError}</p>
              <button
                onClick={() => pickMain(selectedMain)}
                className="text-sm px-4 py-2 rounded-lg"
                style={{ background: "rgba(80,160,250,0.1)", color: "#50A0FA", border: "1px solid rgba(80,160,250,0.25)" }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Rows */}
          {!loading && !fetchError && visible.map(item => (
            <ResultRow
              key={item.asin}
              item={item}
              checked={selected.has(item.asin)}
              onToggle={toggleSelect}
              addedStatus={addedMap[item.asin]}
            />
          ))}

          {/* Empty */}
          {!loading && !fetchError && visible.length === 0 && (
            <div className="flex items-center justify-center py-16 text-[#4a5568] text-sm">
              No products found for "{selectedMain.name}".
            </div>
          )}

          {/* Pagination */}
          {!loading && !fetchError && visible.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: "1px solid rgba(80,160,250,0.08)" }}>
              <button
                onClick={() => setUiPage(p => p - 1)}
                disabled={uiPage <= 1}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: "rgba(80,160,250,0.08)", color: "#50A0FA", border: "1px solid rgba(80,160,250,0.18)" }}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Prev
              </button>
              <span className="text-xs" style={{ color: "#4a5568" }}>
                Page {uiPage} · {all.length} loaded
              </span>
              <button
                onClick={goNext}
                disabled={!canGoNext || loadingMore}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: "rgba(80,160,250,0.08)", color: "#50A0FA", border: "1px solid rgba(80,160,250,0.18)" }}
              >
                {loadingMore ? (
                  <>
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading…
                  </>
                ) : (
                  <>
                    Next
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Subcategory picker panel ── */}
        {selected.size > 0 && (
          <div className="w-64 flex-shrink-0 card rounded-xl p-4 space-y-4" style={{ animation: "fadeUp 0.2s ease-out" }}>
            <p className="text-sm font-semibold text-white">Assign to Category</p>

            {/* Main category — locked to what was picked */}
            <div>
              <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider mb-1.5">
                Main Category
              </label>
              <div
                className="w-full rounded-lg px-3 py-2 text-sm flex items-center gap-2"
                style={{ background: "#1a2235", border: "1px solid rgba(80,160,250,0.28)", color: "#e8ecf2" }}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ background: color + "25", color }}
                >
                  {selectedMain.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{selectedMain.name}</span>
              </div>
            </div>

            {/* Subcategory — required */}
            <div>
              <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider mb-1.5">
                Subcategory <span style={{ color: "#ef4444" }}>*</span>
              </label>
              {noSubs ? (
                <div className="rounded-lg p-2.5 text-[11px]"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b" }}>
                  No subcategories under "{selectedMain.name}".{" "}
                  <button onClick={() => navigate("/categories")} className="underline font-semibold">
                    Add one first.
                  </button>
                </div>
              ) : (
                <select
                  value={subCatId}
                  onChange={e => setSubCatId(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    background: "#1a2235",
                    border: `1px solid ${!subCatId ? "rgba(239,68,68,0.4)" : "rgba(80,160,250,0.28)"}`,
                    color: subCatId ? "#e8ecf2" : "#4a5568",
                  }}
                >
                  <option value="">Select subcategory…</option>
                  {subs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>

            {/* Credit note */}
            <div className="rounded-lg px-3 py-2 text-[11px]"
              style={{ background: "rgba(80,160,250,0.05)", border: "1px solid rgba(80,160,250,0.12)", color: "#4a5568" }}>
              1 credit per product imported (full PDP fetch).
            </div>

            {/* Import button */}
            <button
              onClick={handleImport}
              disabled={!canImport}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5"
              style={{
                background: canImport ? "linear-gradient(135deg, #50A0FA, #3b82f6)" : "#1a2235",
                color: canImport ? "#fff" : "#4a5568",
                boxShadow: canImport ? "0 4px 16px rgba(80,160,250,0.3)" : "none",
              }}
            >
              {adding ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Importing…
                </span>
              ) : (
                `Import ${selected.size} product${selected.size !== 1 ? "s" : ""}`
              )}
            </button>

            {!subCatId && !noSubs && (
              <p className="text-[11px] text-center" style={{ color: "#4a5568" }}>
                Select a subcategory to enable import.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Import summary */}
      {addSummary && (
        <div className="mt-4 card rounded-xl px-5 py-4 flex items-center gap-6 text-sm fade-up">
          <span className="font-medium text-white">Import complete</span>
          {addSummary.added > 0 && <span style={{ color: "#22c55e" }}>{addSummary.added} added</span>}
          {addSummary.skipped > 0 && <span style={{ color: "#f59e0b" }}>{addSummary.skipped} skipped (already exist)</span>}
          {addSummary.blocked > 0 && <span style={{ color: "#ef4444" }}>{addSummary.blocked} blocked</span>}
          {addSummary.failed > 0 && <span style={{ color: "#ef4444" }}>{addSummary.failed} failed</span>}
          <button
            onClick={() => navigate("/products")}
            className="ml-auto text-sm px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(80,160,250,0.1)", color: "#50A0FA", border: "1px solid rgba(80,160,250,0.2)" }}
          >
            View Products
          </button>
        </div>
      )}
    </div>
  );
}
