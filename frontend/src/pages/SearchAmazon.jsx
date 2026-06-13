import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchAmazon, addFromSearch } from "../api.js";

const PAGE_SIZE = 16;

// ── Star rating display ───────────────────────────────────────────────────────
function Stars({ rating }) {
  const val = parseFloat(rating) || 0;
  const full = Math.floor(val);
  const half = val - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill={i <= full ? "#f59e0b" : i === full + 1 && half ? "url(#half)" : "none"} stroke="#f59e0b" strokeWidth="2">
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

// ── Single result row ─────────────────────────────────────────────────────────
function ResultRow({ product, selected, onToggle, addedStatus }) {
  const { asin, title, image_url, amazon_price_usd, rating, review_count, is_prime, is_sponsored, badge } = product;
  const clickable = !addedStatus;

  const statusChip = addedStatus && (
    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0"
      style={{
        background: addedStatus === "added" ? "rgba(34,197,94,0.15)" : addedStatus === "failed" || addedStatus === "blocked" ? "rgba(239,68,68,0.15)" : "rgba(107,119,133,0.15)",
        color: addedStatus === "added" ? "#22c55e" : addedStatus === "failed" || addedStatus === "blocked" ? "#ef4444" : "#a0adbb",
        border: `1px solid ${addedStatus === "added" ? "rgba(34,197,94,0.3)" : addedStatus === "failed" || addedStatus === "blocked" ? "rgba(239,68,68,0.3)" : "rgba(107,119,133,0.3)"}`,
      }}>
      {addedStatus === "added" ? "Added" : addedStatus === "blocked" ? "Blocked" : addedStatus === "skipped" ? "Already added" : "Failed"}
    </span>
  );

  return (
    <div
      onClick={() => clickable && onToggle(asin)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
      style={{
        background: selected
          ? "linear-gradient(135deg, rgba(80,160,250,0.12), rgba(80,160,250,0.04))"
          : "rgba(255,255,255,0.03)",
        border: selected ? "1px solid rgba(80,160,250,0.5)" : "1px solid rgba(80,160,250,0.1)",
        cursor: clickable ? "pointer" : "default",
        opacity: addedStatus ? 0.65 : 1,
      }}
    >
      {/* Checkbox */}
      <div
        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all"
        style={{
          background: selected ? "#50A0FA" : "rgba(13,17,23,0.8)",
          border: selected ? "none" : "1px solid rgba(80,160,250,0.3)",
          visibility: addedStatus ? "hidden" : "visible",
        }}
      >
        {selected && (
          <svg width="11" height="11" fill="none" stroke="#0d1117" viewBox="0 0 24 24" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Image */}
      <div className="w-14 h-14 rounded-lg bg-white overflow-hidden shrink-0 flex items-center justify-center">
        {image_url ? (
          <img src={image_url} alt={title} className="w-full h-full object-contain p-1" />
        ) : (
          <span className="text-[#4a5568] text-[9px]">No image</span>
        )}
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#e8ecf2] leading-snug line-clamp-2" title={title}>{title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {rating > 0 && (
            <span className="flex items-center gap-1">
              <Stars rating={rating} />
              <span className="text-[10px] text-[#6b7785]">{rating.toFixed(1)}</span>
              {review_count > 0 && (
                <span className="text-[10px] text-[#4a5568]">
                  ({review_count >= 1000 ? (review_count / 1000).toFixed(1) + "k" : review_count})
                </span>
              )}
            </span>
          )}
          {is_prime && (
            <span className="px-1.5 py-px rounded text-[9px] font-bold" style={{ background: "#00A8E0", color: "#fff" }}>prime</span>
          )}
          {badge && (
            <span className="px-1.5 py-px rounded text-[9px] font-bold" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>{badge}</span>
          )}
          {is_sponsored && (
            <span className="text-[9px] text-[#4a5568]">Sponsored</span>
          )}
          <span className="text-[9px] text-[#4a5568] font-mono">{asin}</span>
        </div>
      </div>

      {statusChip}

      {/* Price */}
      <span className="text-sm font-bold shrink-0 w-20 text-right" style={{ color: "#50A0FA" }}>
        {amazon_price_usd > 0 ? `$${amazon_price_usd.toFixed(2)}` : "—"}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SearchAmazon() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");   // query the current results belong to
  const [loading, setLoading] = useState(false);        // initial search
  const [loadingMore, setLoadingMore] = useState(false); // fetching next Amazon page
  const [searchError, setSearchError] = useState("");
  const [searched, setSearched] = useState(false);

  const [all, setAll] = useState([]);          // accumulated, deduped results
  const [uiPage, setUiPage] = useState(1);     // 10-item UI page
  const [amazonPage, setAmazonPage] = useState(0); // last fetched Amazon page
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState("");

  const [selected, setSelected] = useState(new Set());
  const [adding, setAdding] = useState(false);
  const [addSummary, setAddSummary] = useState(null);
  const [addedMap, setAddedMap] = useState({});

  async function fetchPage(q, pageNum, existing) {
    const data = await searchAmazon(q, pageNum);
    const seen = new Set(existing.map(p => p.asin));
    const fresh = (data.results || []).filter(p => p.asin && !seen.has(p.asin));
    return { merged: [...existing, ...fresh], freshCount: fresh.length, total: data.total_results || "" };
  }

  async function handleSearch(e) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearchError("");
    setSearched(false);
    setAll([]);
    setSelected(new Set());
    setAddSummary(null);
    setAddedMap({});
    setHasMore(true);
    try {
      const { merged, total } = await fetchPage(q, 1, []);
      setActiveQuery(q);
      setAll(merged);
      setTotalResults(total);
      setAmazonPage(1);
      setUiPage(1);
      setHasMore(merged.length > 0);
      setSearched(true);
    } catch (err) {
      setSearchError(err?.response?.data?.detail || "Search failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  async function goNext() {
    // Enough buffered results for the next UI page? Just flip the page.
    if (all.length > uiPage * PAGE_SIZE) {
      setUiPage(uiPage + 1);
      return;
    }
    // Otherwise fetch the next Amazon page (1 credit) and append.
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setSearchError("");
    try {
      const { merged, freshCount } = await fetchPage(activeQuery, amazonPage + 1, all);
      setAmazonPage(amazonPage + 1);
      setAll(merged);
      if (freshCount === 0) {
        setHasMore(false);
      } else {
        setUiPage(uiPage + 1);
      }
    } catch (err) {
      setSearchError(err?.response?.data?.detail || "Failed to load more results.");
    } finally {
      setLoadingMore(false);
    }
  }

  function toggleSelect(asin) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(asin) ? next.delete(asin) : next.add(asin);
      return next;
    });
  }

  const visible = all.slice((uiPage - 1) * PAGE_SIZE, uiPage * PAGE_SIZE);
  const pageEligible = visible.filter(p => !addedMap[p.asin]).map(p => p.asin);
  const pageAllSelected = pageEligible.length > 0 && pageEligible.every(a => selected.has(a));
  const canGoNext = !loadingMore && (all.length > uiPage * PAGE_SIZE || hasMore);

  function togglePage() {
    setSelected(prev => {
      const next = new Set(prev);
      if (pageAllSelected) {
        pageEligible.forEach(a => next.delete(a));
      } else {
        pageEligible.forEach(a => next.add(a));
      }
      return next;
    });
  }

  async function handleImport() {
    if (selected.size === 0 || adding) return;
    const toAdd = all
      .filter(p => selected.has(p.asin))
      .map(p => ({
        asin: p.asin,
        title: p.title,
        image_url: p.image_url,
        amazon_price_usd: p.amazon_price_usd,
        is_prime: p.is_prime,
      }));
    setAdding(true);
    setSearchError("");
    try {
      const data = await addFromSearch(toAdd, undefined);
      setAddSummary(data.summary);
      setAddedMap(prev => {
        const map = { ...prev };
        for (const r of data.results) map[r.asin] = r.status;
        return map;
      });
      setSelected(new Set());
    } catch (err) {
      setSearchError(err?.response?.data?.detail || "Failed to import products.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[11px] text-[#4a5568] mb-3">
        <button onClick={() => navigate("/add")} className="hover:text-[#50A0FA] transition-colors">Add Products</button>
        <span>/</span>
        <span className="text-[#6b7785]">Search by Name</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-medium text-white mb-1">Search Amazon</h1>
        <p className="text-sm text-[#6b7785]">Search by product name, tick the ones you want, and import them in one go.</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="e.g. laptop stand, wireless headphones..."
          className="flex-1 rounded-lg px-4 py-2.5 text-sm text-[#e8ecf2] outline-none"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(80,160,250,0.2)",
          }}
          onFocus={e => e.target.style.borderColor = "rgba(80,160,250,0.5)"}
          onBlur={e => e.target.style.borderColor = "rgba(80,160,250,0.2)"}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ background: "#50A0FA", color: "#0d1117", boxShadow: "0 0 16px rgba(80,160,250,0.35)" }}
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Searching…
            </>
          ) : "Search →"}
        </button>
      </form>

      {searchError && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-sm"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
          {searchError}
        </div>
      )}

      {/* Import summary */}
      {addSummary && (
        <div className="mb-5 px-4 py-3 rounded-lg flex items-center gap-5 text-sm"
          style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <span className="text-green-400">✓ {addSummary.added} added</span>
          {addSummary.blocked > 0 && <span className="text-red-400">⊘ {addSummary.blocked} blocked</span>}
          {addSummary.skipped > 0 && <span className="text-[#6b7785]">↷ {addSummary.skipped} already existed</span>}
          {addSummary.failed > 0 && <span className="text-red-400">✕ {addSummary.failed} failed</span>}
        </div>
      )}

      {/* Results */}
      {searched && (
        all.length === 0 ? (
          <div className="text-center py-16 text-[#4a5568]">No products found for "{activeQuery}"</div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                {totalResults && <span className="text-xs text-[#6b7785]">{totalResults}</span>}
                <button
                  onClick={togglePage}
                  disabled={pageEligible.length === 0}
                  className="text-xs px-2.5 py-1 rounded-md transition-colors disabled:opacity-40"
                  style={{ background: "rgba(80,160,250,0.1)", color: "#50A0FA", border: "1px solid rgba(80,160,250,0.2)" }}
                >
                  {pageAllSelected ? "Deselect page" : "Select page"}
                </button>
                {selected.size > 0 && (
                  <span className="text-xs text-[#6b7785]">{selected.size} selected</span>
                )}
              </div>
              {selected.size > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#4a5568]">Uses {selected.size} scrape.do credit{selected.size !== 1 ? "s" : ""} (full details fetched per product)</span>
                  <button
                    onClick={handleImport}
                    disabled={adding}
                    className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2"
                    style={{ background: "#50A0FA", color: "#0d1117", boxShadow: "0 0 14px rgba(80,160,250,0.4)" }}
                  >
                    {adding ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Importing…
                      </>
                    ) : `Import ${selected.size} product${selected.size !== 1 ? "s" : ""} →`}
                  </button>
                </div>
              )}
            </div>

            {/* List — 10 per page */}
            <div className="flex flex-col gap-2">
              {visible.map(product => (
                <ResultRow
                  key={product.asin}
                  product={product}
                  selected={selected.has(product.asin)}
                  onToggle={toggleSelect}
                  addedStatus={addedMap[product.asin] || null}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setUiPage(p => Math.max(1, p - 1))}
                disabled={uiPage === 1 || loadingMore}
                className="px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: "rgba(255,255,255,0.04)", color: "#e8ecf2", border: "1px solid rgba(80,160,250,0.2)" }}
              >
                ← Previous
              </button>
              <span className="text-sm text-[#6b7785] px-2">Page {uiPage}</span>
              <button
                onClick={goNext}
                disabled={!canGoNext}
                className="px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ background: "rgba(255,255,255,0.04)", color: "#e8ecf2", border: "1px solid rgba(80,160,250,0.2)" }}
              >
                {loadingMore ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Loading from Amazon…
                  </>
                ) : "Next →"}
              </button>
            </div>
            {!hasMore && all.length <= uiPage * PAGE_SIZE && (
              <p className="text-center text-[11px] text-[#4a5568] mt-2">No more results on Amazon.</p>
            )}
          </>
        )
      )}
    </div>
  );
}
