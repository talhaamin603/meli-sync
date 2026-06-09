import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchAmazon, addFromSearch } from "../api.js";

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

// ── Single product card ───────────────────────────────────────────────────────
function ProductCard({ product, selected, onToggle, addedStatus }) {
  const { asin, title, image_url, amazon_price_usd, star_rating, num_ratings, is_prime } = product;

  const statusColor = addedStatus === "added"
    ? "rgba(34,197,94,0.2)"
    : addedStatus === "blocked"
    ? "rgba(239,68,68,0.2)"
    : addedStatus === "skipped"
    ? "rgba(107,119,133,0.2)"
    : null;

  return (
    <div
      onClick={() => !addedStatus && onToggle(asin)}
      className="relative rounded-xl overflow-hidden transition-all duration-200 cursor-pointer"
      style={{
        background: selected
          ? "linear-gradient(135deg, rgba(80,160,250,0.12), rgba(80,160,250,0.04))"
          : addedStatus
          ? statusColor
          : "rgba(255,255,255,0.03)",
        border: selected
          ? "1px solid rgba(80,160,250,0.5)"
          : addedStatus === "added"
          ? "1px solid rgba(34,197,94,0.4)"
          : addedStatus === "blocked"
          ? "1px solid rgba(239,68,68,0.4)"
          : "1px solid rgba(80,160,250,0.1)",
        cursor: addedStatus ? "default" : "pointer",
      }}
    >
      {/* Checkbox */}
      {!addedStatus && (
        <div
          className="absolute top-2.5 left-2.5 z-10 w-5 h-5 rounded-md flex items-center justify-center transition-all"
          style={{
            background: selected ? "#50A0FA" : "rgba(13,17,23,0.8)",
            border: selected ? "none" : "1px solid rgba(80,160,250,0.3)",
          }}
        >
          {selected && (
            <svg width="11" height="11" fill="none" stroke="#0d1117" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      )}

      {/* Status overlay badge */}
      {addedStatus && (
        <div className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-md text-[10px] font-bold"
          style={{
            background: addedStatus === "added" ? "rgba(34,197,94,0.2)" : addedStatus === "blocked" ? "rgba(239,68,68,0.2)" : "rgba(107,119,133,0.2)",
            color: addedStatus === "added" ? "#22c55e" : addedStatus === "blocked" ? "#ef4444" : "#a0adbb",
            border: `1px solid ${addedStatus === "added" ? "rgba(34,197,94,0.3)" : addedStatus === "blocked" ? "rgba(239,68,68,0.3)" : "rgba(107,119,133,0.3)"}`,
          }}>
          {addedStatus === "added" ? "Added" : addedStatus === "blocked" ? "Blocked" : "Skipped"}
        </div>
      )}

      {/* Image */}
      <div className="relative w-full aspect-square bg-white overflow-hidden">
        {image_url ? (
          <img src={image_url} alt={title} className="w-full h-full object-contain p-2" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#4a5568] text-xs">No image</div>
        )}
        {is_prime && (
          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold"
            style={{ background: "#00A8E0", color: "#fff" }}>prime</div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-[11px] text-[#e8ecf2] leading-snug line-clamp-2 mb-1.5" title={title}>{title}</p>
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <span className="text-sm font-bold" style={{ color: "#50A0FA" }}>
            {amazon_price_usd > 0 ? `$${amazon_price_usd.toFixed(2)}` : "—"}
          </span>
          {star_rating && (
            <div className="flex items-center gap-1">
              <Stars rating={star_rating} />
              {num_ratings > 0 && (
                <span className="text-[9px] text-[#4a5568]">
                  ({num_ratings >= 1000 ? (num_ratings / 1000).toFixed(1) + "k" : num_ratings})
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SearchAmazon() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [adding, setAdding] = useState(false);
  const [addResults, setAddResults] = useState(null);
  const [addedMap, setAddedMap] = useState({});

  async function handleSearch(e) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearchError("");
    setResults(null);
    setSelected(new Set());
    setAddResults(null);
    setAddedMap({});
    try {
      const data = await searchAmazon(query.trim());
      setResults(data.results || []);
    } catch (err) {
      setSearchError(err?.response?.data?.detail || "Search failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(asin) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(asin) ? next.delete(asin) : next.add(asin);
      return next;
    });
  }

  function toggleAll() {
    if (!results) return;
    const eligible = results.filter(r => !addedMap[r.asin]).map(r => r.asin);
    if (selected.size === eligible.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligible));
    }
  }

  async function handleAdd() {
    if (selected.size === 0 || !results) return;
    const toAdd = results
      .filter(r => selected.has(r.asin))
      .map(r => ({
        asin: r.asin,
        title: r.title,
        image_url: r.image_url,
        amazon_price_usd: r.amazon_price_usd,
        is_prime: r.is_prime,
      }));

    setAdding(true);
    try {
      const data = await addFromSearch(toAdd);
      setAddResults(data.summary);
      const map = {};
      for (const r of data.results) map[r.asin] = r.status;
      setAddedMap(map);
      setSelected(new Set());
    } catch (err) {
      setSearchError(err?.response?.data?.detail || "Failed to add products.");
    } finally {
      setAdding(false);
    }
  }

  const eligibleCount = results ? results.filter(r => !addedMap[r.asin]).length : 0;
  const allSelected = eligibleCount > 0 && selected.size === eligibleCount;

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[11px] text-[#4a5568] mb-3">
        <button onClick={() => navigate("/add")} className="hover:text-[#50A0FA] transition-colors">Add Products</button>
        <span>/</span>
        <span className="text-[#6b7785]">Search by Name</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-medium text-white mb-1">Search Amazon</h1>
        <p className="text-sm text-[#6b7785]">Search by product name and select the ones you want to add.</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="e.g. black 5kg dumbbell, apple airpods..."
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

      {/* Add results summary */}
      {addResults && (
        <div className="mb-5 px-4 py-3 rounded-lg flex items-center gap-5 text-sm"
          style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <span className="text-green-400">✓ {addResults.added} added</span>
          {addResults.blocked > 0 && <span className="text-red-400">⊘ {addResults.blocked} blocked</span>}
          {addResults.skipped > 0 && <span className="text-[#6b7785]">↷ {addResults.skipped} skipped</span>}
        </div>
      )}

      {/* Results */}
      {results !== null && (
        <>
          {results.length === 0 ? (
            <div className="text-center py-16 text-[#4a5568]">No products found for "{query}"</div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#6b7785]">{results.length} results</span>
                  <button
                    onClick={toggleAll}
                    disabled={eligibleCount === 0}
                    className="text-xs px-2.5 py-1 rounded-md transition-colors disabled:opacity-40"
                    style={{ background: "rgba(80,160,250,0.1)", color: "#50A0FA", border: "1px solid rgba(80,160,250,0.2)" }}
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                </div>
                {selected.size > 0 && (
                  <button
                    onClick={handleAdd}
                    disabled={adding}
                    className="px-4 py-2 rounded-lg font-medium text-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2"
                    style={{ background: "#50A0FA", color: "#0d1117", boxShadow: "0 0 14px rgba(80,160,250,0.4)" }}
                  >
                    {adding ? "Adding…" : `Add ${selected.size} product${selected.size !== 1 ? "s" : ""} →`}
                  </button>
                )}
              </div>

              {/* Grid */}
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
                {results.map(product => (
                  <ProductCard
                    key={product.asin}
                    product={product}
                    selected={selected.has(product.asin)}
                    onToggle={toggleSelect}
                    addedStatus={addedMap[product.asin] || null}
                  />
                ))}
              </div>

              {/* Bottom add bar (sticky when items selected) */}
              {selected.size > 0 && (
                <div className="sticky bottom-6 mt-6 flex justify-center">
                  <button
                    onClick={handleAdd}
                    disabled={adding}
                    className="px-8 py-3 rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 shadow-2xl"
                    style={{ background: "#50A0FA", color: "#0d1117", boxShadow: "0 8px 32px rgba(80,160,250,0.5)" }}
                  >
                    {adding ? "Adding…" : `Add ${selected.size} selected product${selected.size !== 1 ? "s" : ""} →`}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
