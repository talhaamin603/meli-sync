import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getProducts, deleteProduct, getExchangeRate, getMarginRules, syncProductFromAmazon } from "../api.js";
import { calcPrice } from "../utils/pricing.js";

function StatusBadge({ status, stock, t }) {
  if (stock === 0) {
    return (
      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium border whitespace-nowrap"
        style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}>
        Out of Stock
      </span>
    );
  }
  const styles = {
    published: { bg: "rgba(34,197,94,0.15)",  fg: "#22c55e", border: "rgba(34,197,94,0.3)",  label: "Active" },
    blocked:   { bg: "rgba(239,68,68,0.15)",  fg: "#ef4444", border: "rgba(239,68,68,0.3)",  label: "Blocked" },
    failed:    { bg: "rgba(245,158,11,0.15)", fg: "#f59e0b", border: "rgba(245,158,11,0.3)", label: "Sync Failed" },
    pending:   { bg: "rgba(80,160,250,0.15)", fg: "#50A0FA", border: "rgba(80,160,250,0.3)", label: "Pending" },
  };
  const s = styles[status] || styles.pending;
  return (
    <span
      className="px-2 py-0.5 rounded-md text-[11px] font-medium border whitespace-nowrap"
      style={{ background: s.bg, color: s.fg, borderColor: s.border }}
    >
      {s.label}
    </span>
  );
}

function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function IconSync() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <polyline points="23 20 23 14 17 14"/>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
    </svg>
  );
}

function IconView() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}

function IconDelete() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}


function Products() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [all, setAll]             = useState([]);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("all");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [syncingId, setSyncingId]           = useState(null);
  const [confirmSync, setConfirmSync]       = useState(null); // product object
  const [toast, setToast]                   = useState(null); // { msg, ok }
  const [confirmDelete, setConfirmDelete]   = useState(null); // product object
  const [deleting, setDeleting]             = useState(false);
  const [exchangeRate, setExchangeRate]     = useState(null);
  const [rules, setRules]                   = useState([]);
  const [statusSort, setStatusSort]         = useState(null); // null | "asc" | "desc"

  useEffect(() => {
    Promise.all([getProducts(), getExchangeRate(), getMarginRules()])
      .then(([productsData, rateData, rulesData]) => {
        const list = Array.isArray(productsData) ? productsData : (productsData.products || productsData.items || []);
        setAll(list);
        setExchangeRate(rateData.usd_to_cop || null);
        setRules(rulesData.rules || []);
      })
      .catch(() => setError(t("errorLoading")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, []);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }


  async function handleConfirmSync() {
    if (!confirmSync) return;
    const product = confirmSync;
    setConfirmSync(null);
    setSyncingId(product.id);
    try {
      const res = await syncProductFromAmazon(product.id);
      if (res.changed && res.changed.length > 0) {
        setAll((prev) => prev.map((p) =>
          p.id === product.id ? { ...p, ...res.product } : p
        ));
        showToast(res.changed.join(" · "), true);
      } else {
        showToast("Product is already up to date.", true);
      }
    } catch (e) {
      showToast(e?.response?.data?.detail || "Sync failed.", false);
    } finally {
      setSyncingId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteProduct(confirmDelete.id);
      setAll((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      showToast(`"${confirmDelete.title?.slice(0, 40)}…" deleted.`, true);
    } catch {
      showToast("Delete failed.", false);
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }

  function meliUrl(product) {
    if (!product.meli_item_id) return null;
    const id = product.meli_item_id;
    // MCO123456789 → https://articulo.mercadolibre.com.co/MCO-123456789-...
    const formatted = id.replace(/^([A-Z]+)(\d+)$/, "$1-$2");
    return `https://articulo.mercadolibre.com.co/${formatted}`;
  }

  if (loading) return <div className="text-[#a0adbb]">{t("loadingProducts")}</div>;
  if (error)   return <div className="text-red-400">{error}</div>;

  // Status sort order: Active → Pending → Out of Stock → Sync Failed → Blocked
  const STATUS_ORDER = { published: 0, pending: 1, out_of_stock: 2, failed: 3, blocked: 4 };
  function statusRank(p) {
    if (p.stock === 0) return STATUS_ORDER.out_of_stock;
    return STATUS_ORDER[p.status] ?? 2;
  }

  const q = search.toLowerCase().trim();
  const base = all.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (!q) return true;
    return (
      (p.title || "").toLowerCase().includes(q) ||
      (p.asin  || "").toLowerCase().includes(q)
    );
  });

  const filtered = statusSort
    ? [...base].sort((a, b) =>
        statusSort === "asc"
          ? statusRank(a) - statusRank(b)
          : statusRank(b) - statusRank(a)
      )
    : base;

  const counts = {
    all:       all.length,
    pending:   all.filter((p) => p.status === "pending").length,
    published: all.filter((p) => p.status === "published").length,
    blocked:   all.filter((p) => p.status === "blocked").length,
    failed:    all.filter((p) => p.status === "failed").length,
  };

  return (
    <div>
      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={() => !deleting && setConfirmDelete(null)}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full mx-4"
            style={{ background: "#0f1623", border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 0 40px rgba(239,68,68,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <IconDelete />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Delete Product</p>
                <p className="text-[#6b7785] text-xs">This cannot be undone</p>
              </div>
            </div>
            <p className="text-[#a0adbb] text-sm mb-5 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="text-white font-medium">
                {confirmDelete.title?.length > 60
                  ? confirmDelete.title.slice(0, 60) + "…"
                  : confirmDelete.title}
              </span>?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: "rgba(80,160,250,0.06)", border: "1px solid rgba(80,160,250,0.18)", color: "#a0adbb" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: "rgba(239,68,68,0.85)", color: "#fff", border: "none" }}
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync confirmation modal */}
      {confirmSync && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={() => setConfirmSync(null)}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full mx-4"
            style={{ background: "#0f1623", border: "1px solid rgba(34,197,94,0.3)", boxShadow: "0 0 40px rgba(34,197,94,0.1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}
              >
                <IconSync />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Sync Product</p>
                <p className="text-[#6b7785] text-xs">Checks Amazon · Updates Mercado Libre if needed</p>
              </div>
            </div>
            <p className="text-[#a0adbb] text-sm mb-2 leading-relaxed">
              Sync{" "}
              <span className="text-white font-medium">
                {confirmSync.title?.length > 55
                  ? confirmSync.title.slice(0, 55) + "…"
                  : confirmSync.title}
              </span>?
            </p>
            <ul className="text-xs text-[#6b7785] mb-5 space-y-1 pl-1">
              <li>· Fetches latest price, rating &amp; Prime status from Amazon</li>
              <li>· Updates your database if anything changed</li>
              {confirmSync.status === "published" && confirmSync.meli_item_id && (
                <li>· Pushes new price to Mercado Libre automatically</li>
              )}
              <li className="text-[#4a5568]">· Uses 1 scrape.do credit</li>
            </ul>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmSync(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(80,160,250,0.06)", border: "1px solid rgba(80,160,250,0.18)", color: "#a0adbb" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSync}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(34,197,94,0.85)", color: "#0d1117", border: "none" }}
              >
                Yes, Sync
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl transition-all"
          style={{
            background: toast.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            border: `1px solid ${toast.ok ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
            color: toast.ok ? "#22c55e" : "#ef4444",
          }}
        >
          {toast.msg}
        </div>
      )}

      <div className="fade-up mb-6">
        <h1 className="text-2xl font-medium text-white mb-1">{t("productsTitle")}</h1>
        <p className="text-sm text-[#6b7785]">{t("productsSubtitle")}</p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {["all", "pending", "published", "blocked", "failed"].map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all " +
              (filter === k ? "text-white" : "text-[#a0adbb] hover:text-white")
            }
            style={
              filter === k
                ? { background: "#50A0FA", color: "#0d1117", boxShadow: "0 0 14px rgba(80,160,250,0.4)" }
                : { background: "rgba(80,160,250,0.06)", border: "1px solid rgba(80,160,250,0.15)" }
            }
          >
            {k === "all" ? t("filterAll") : k === "failed" ? "Sync Failed" : t(k)} ({counts[k]})
          </button>
        ))}
      </div>

      {/* Search */}
      <div
        className="card rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2"
        style={{ animation: "fadeUp 0.5s ease-out 0.1s backwards" }}
      >
        <span className="text-[#6b7785]">🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="flex-1 bg-transparent text-sm text-[#e8ecf2] focus:outline-none"
          style={{ border: 0, padding: 0 }}
        />
      </div>

      {/* Table */}
      <div
        className="card rounded-xl overflow-hidden"
        style={{ animation: "fadeUp 0.6s ease-out 0.2s backwards" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: "950px" }}>
            <thead>
              <tr
                className="text-[11px] uppercase tracking-wider text-[#6b7785]"
                style={{ background: "rgba(80,160,250,0.04)" }}
              >
                <th className="p-3 font-medium" style={{ width: "72px", minWidth: "72px" }}></th>
                <th className="text-left p-3 font-medium">{t("title")}</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-right p-3 font-medium">Amazon Price</th>
                <th className="text-right p-3 font-medium">ML Price</th>
                <th className="text-right p-3 font-medium">Margin</th>
                <th className="text-right p-3 font-medium">{t("stock")}</th>
                <th className="text-left p-3 font-medium">
                  <button
                    onClick={() => setStatusSort(s => s === "asc" ? "desc" : "asc")}
                    className="inline-flex items-center gap-1 hover:text-white transition-colors"
                    style={{ color: statusSort ? "#50A0FA" : undefined }}
                    title="Sort by status"
                  >
                    {t("status")}
                    <span className="flex flex-col leading-none" style={{ fontSize: 8 }}>
                      <span style={{ opacity: statusSort === "asc"  ? 1 : 0.3 }}>▲</span>
                      <span style={{ opacity: statusSort === "desc" ? 1 : 0.3 }}>▼</span>
                    </span>
                  </button>
                </th>
                <th className="text-center p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const url = meliUrl(p);
                const isSyncing = syncingId === p.id;
                const amazonUsd = Number(p.amazon_price_usd || 0);
                const calc = calcPrice(amazonUsd, rules, exchangeRate);
                const mlUsd    = calc?.mlUsd    ?? null;
                const profit   = calc?.profit   ?? null;
                const profitPct = calc && amazonUsd > 0 ? calc.markupPct : null;
                return (
                  <tr
                    key={p.id || p.asin}
                    className="hover:bg-[#50A0FA]/[0.04] transition-colors"
                    style={{ borderTop: "1px solid rgba(80,160,250,0.08)" }}
                  >
                    <td className="p-3" style={{ width: "72px", minWidth: "72px" }}>
                      {p.image_url
                        ? <img src={p.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" style={{ background: "#1f2937" }} />
                        : <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: "#1a2233" }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(80,160,250,0.2)" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="3"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <path d="M21 15l-5-5L5 21"/>
                            </svg>
                          </div>}
                    </td>
                    <td className="p-3 max-w-md truncate">
                      <button
                        onClick={() => navigate(`/products/${p.id}/edit`, { state: { product: p } })}
                        className="text-left hover:text-white transition-colors truncate max-w-full"
                        style={{ color: "#e8ecf2" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#50A0FA"}
                        onMouseLeave={e => e.currentTarget.style.color = "#e8ecf2"}
                        title={p.title}
                      >
                        {p.title}
                      </button>
                    </td>
                    {/* Category */}
                    <td className="p-3 max-w-[160px]">
                      {p.category_path ? (
                        <div title={p.category_path}>
                          <span className="text-[9px] block truncate" style={{ color: "#4a5568" }}>
                            {p.category_path.split(" > ")[0]}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded truncate block mt-0.5"
                            style={{ background: "rgba(80,160,250,0.08)", color: "#a0adbb", border: "1px solid rgba(80,160,250,0.12)", maxWidth: 160 }}
                          >
                            {p.category_path.split(" > ").pop()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#3a4250] text-[11px]">—</span>
                      )}
                    </td>

                    {/* Amazon Price */}
                    <td className="p-3 text-right">
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
                    <td className="p-3 text-right">
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
                    <td className="p-3 text-right">
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
                              {profitPct.toFixed(1)}% markup
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#4a5568]">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-[#a0adbb]">{p.stock}</td>
                    <td className="p-3">
                      <StatusBadge status={p.status} stock={p.stock} t={t} />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit */}
                        <ActionBtn
                          title="Edit product"
                          color="#50A0FA"
                          onClick={() => navigate(`/products/${p.id}/edit`, { state: { product: p } })}
                        >
                          <IconEdit />
                        </ActionBtn>

                        {/* Sync */}
                        <ActionBtn
                          title="Sync product (checks Amazon, updates Mercado Libre)"
                          color="#22c55e"
                          onClick={() => setConfirmSync(p)}
                          disabled={isSyncing}
                          spinning={isSyncing}
                        >
                          <IconSync />
                        </ActionBtn>

                        {/* View on MercadoLibre */}
                        <ActionBtn
                          title={url ? "View on MercadoLibre" : "Not published yet"}
                          color={url ? "#a0adbb" : "#3a4250"}
                          disabled={!url}
                          href={url}
                        >
                          <IconView />
                        </ActionBtn>

                        {/* Delete */}
                        <ActionBtn
                          title="Delete product"
                          color="#ef4444"
                          onClick={() => setConfirmDelete(p)}
                        >
                          <IconDelete />
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-[#6b7785] text-sm">{t("noProducts")}</div>
        )}
      </div>

      <div className="text-xs text-[#6b7785] mt-3">
        {t("showing")} {filtered.length} {t("of")} {all.length}
      </div>
    </div>
  );
}

function ActionBtn({ title, color, onClick, disabled, href, spinning, children }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 7,
    border: `1px solid ${color}33`,
    background: `${color}14`,
    color: disabled ? "#3a4250" : color,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.15s",
    opacity: disabled ? 0.45 : 1,
    animation: spinning ? "spin 0.9s linear infinite" : "none",
  };

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" title={title} style={base}>
        {children}
      </a>
    );
  }
  return (
    <button title={title} style={base} onClick={disabled ? undefined : onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export default Products;
