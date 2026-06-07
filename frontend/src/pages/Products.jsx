import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getProducts } from "../api.js";

function StatusBadge({ status, t }) {
  const styles = {
    published: { bg: "rgba(34,197,94,0.15)",  fg: "#22c55e", border: "rgba(34,197,94,0.3)" },
    blocked:   { bg: "rgba(239,68,68,0.15)",  fg: "#ef4444", border: "rgba(239,68,68,0.3)" },
    failed:    { bg: "rgba(245,158,11,0.15)", fg: "#f59e0b", border: "rgba(245,158,11,0.3)" },
    pending:   { bg: "rgba(80,160,250,0.15)", fg: "#50A0FA", border: "rgba(80,160,250,0.3)" },
  };
  const s = styles[status] || styles.pending;
  const labelKey =
    status === "published" ? "published" :
    status === "blocked"   ? "blocked"   :
    status === "failed"    ? "blocked"   :
                             "pending";
  return (
    <span
      className="px-2 py-0.5 rounded-md text-[11px] font-medium border"
      style={{ background: s.bg, color: s.fg, borderColor: s.border }}
    >
      {t(labelKey)}
    </span>
  );
}

function Products() {
  const { t } = useTranslation();
  const [all, setAll] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getProducts()
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : (data.products || data.items || []);
        setAll(list);
      })
      .catch(() => setError(t("errorLoading")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, []);

  if (loading) return <div className="text-[#a0adbb]">{t("loadingProducts")}</div>;
  if (error)   return <div className="text-red-400">{error}</div>;

  const q = search.toLowerCase().trim();
  const filtered = all.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (!q) return true;
    return (
      (p.title || "").toLowerCase().includes(q) ||
      (p.asin  || "").toLowerCase().includes(q)
    );
  });

  const counts = {
    all:       all.length,
    pending:   all.filter((p) => p.status === "pending").length,
    published: all.filter((p) => p.status === "published").length,
    blocked:   all.filter((p) => p.status === "blocked").length,
  };

  return (
    <div>
      <div className="fade-up mb-6">
        <h1 className="text-2xl font-medium text-white mb-1">{t("productsTitle")}</h1>
        <p className="text-sm text-[#6b7785]">{t("productsSubtitle")}</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", "pending", "published", "blocked"].map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all " +
              (filter === k
                ? "text-white"
                : "text-[#a0adbb] hover:text-white")
            }
            style={
              filter === k
                ? {
                    background: "#50A0FA",
                    color: "#0d1117",
                    boxShadow: "0 0 14px rgba(80,160,250,0.4)",
                  }
                : { background: "rgba(80,160,250,0.06)", border: "1px solid rgba(80,160,250,0.15)" }
            }
          >
            {k === "all" ? t("filterAll") : t(k)} ({counts[k]})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="card rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2"
           style={{ animation: "fadeUp 0.5s ease-out 0.1s backwards" }}>
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

      {/* Table - now with combined Price column */}
      <div className="card rounded-xl overflow-hidden"
           style={{ animation: "fadeUp 0.6s ease-out 0.2s backwards" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-[11px] uppercase tracking-wider text-[#6b7785]"
                style={{ background: "rgba(80,160,250,0.04)" }}
              >
                <th className="text-left p-3 font-medium">{t("asin")}</th>
                <th className="text-left p-3 font-medium">{t("title")}</th>
                <th className="text-right p-3 font-medium w-36">{t("price")}</th>
                <th className="text-right p-3 font-medium">{t("stock")}</th>
                <th className="text-left p-3 font-medium">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id || p.asin}
                  className="hover:bg-[#50A0FA]/[0.04] transition-colors"
                  style={{ borderTop: "1px solid rgba(80,160,250,0.08)" }}
                >
                  <td className="p-3 font-mono text-[11px] text-[#a0adbb]">{p.asin}</td>
                  <td className="p-3 text-[#e8ecf2] max-w-md truncate">{p.title}</td>
                  <td className="p-3 text-right">
                    <PriceBlock usd={p.amazon_price_usd} cop={p.converted_price_cop} />
                  </td>
                  <td className="p-3 text-right text-[#a0adbb]">{p.stock}</td>
                  <td className="p-3">
                    <StatusBadge status={p.status} t={t} />
                  </td>
                </tr>
              ))}
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

// USD on top (small grey) + COP below (bigger, blue)
function PriceBlock({ usd, cop }) {
  if (usd === undefined || usd === null) {
    return <span className="text-[#6b7785]">—</span>;
  }
  return (
    <div className="text-right leading-tight">
      <div className="text-[11px] text-[#6b7785]">${Number(usd).toFixed(2)} USD</div>
      <div className="text-sm font-medium" style={{ color: "#50A0FA" }}>
        {cop && cop > 0
          ? Number(cop).toLocaleString() + " COP"
          : "— COP"}
      </div>
    </div>
  );
}

export default Products;