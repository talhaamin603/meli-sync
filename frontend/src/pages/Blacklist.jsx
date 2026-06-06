import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getBlacklist, addBlacklistTerm, deleteBlacklistTerm } from "../api.js";

function Blacklist() {
  const { t } = useTranslation();
  const [terms, setTerms] = useState([]);
  const [search, setSearch] = useState("");
  const [newTerm, setNewTerm] = useState("");
  const [type, setType] = useState("brand");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function reload() {
    getBlacklist()
      .then((data) => {
        // Backend returns {"total": 6340, "rules": [...]}
        const list = Array.isArray(data)
          ? data
          : (data.rules || data.terms || data.items || []);
        setTerms(list);
        setLoading(false);
      })
      .catch(() => setError(t("errorLoading")))
      .finally(() => setLoading(false));
  }

  useEffect(() => { reload(); }, []);

  async function add() {
    if (!newTerm.trim()) return;
    try {
      await addBlacklistTerm({ rule_type: type, value: newTerm.trim() });
      setNewTerm("");
      reload();
    } catch { setError(t("errorLoading")); }
  }
  
  async function remove(id) {
    try { await deleteBlacklistTerm(id); reload(); }
    catch { setError(t("errorLoading")); }
  }

  if (loading) return <div className="text-[#a0adbb]">{t("loadingBlacklist")}</div>;

  const q = search.toLowerCase().trim();
  const filtered = terms.filter((row) =>
    !q ? true : (row.value || "").toLowerCase().includes(q)
  );

  return (
    <div>
      <div className="fade-up mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium text-white mb-1">{t("blacklistTitle")}</h1>
          <p className="text-sm text-[#6b7785]">{t("blacklistSubtitle")}</p>
        </div>
        <div
          className="px-3 py-1.5 rounded-lg text-sm"
          style={{
            background: "rgba(80,160,250,0.08)",
            border: "1px solid rgba(80,160,250,0.2)",
            color: "#50A0FA",
          }}
        >
          {terms.length.toLocaleString()} {t("termsCount")}
        </div>
      </div>

      {error && <div className="text-red-400 text-sm mb-3">{error}</div>}

      {/* Add term row */}
      <div
        className="card rounded-xl p-4 mb-4 flex flex-wrap gap-3"
        style={{ animation: "fadeUp 0.5s ease-out 0.1s backwards" }}
      >
        <input
          value={newTerm}
          onChange={(e) => setNewTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder={t("newTerm")}
          className="flex-1 min-w-[200px] rounded-lg px-3 py-2 text-sm text-[#e8ecf2]"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(80,160,250,0.18)",
          }}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm text-[#e8ecf2]"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(80,160,250,0.18)",
          }}
        >
          <option value="brand">{t("brandType")}</option>
          <option value="keyword">{t("keywordType")}</option>
        </select>
        <button
          onClick={add}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:-translate-y-0.5"
          style={{
            background: "#50A0FA",
            color: "#0d1117",
            boxShadow: "0 0 14px rgba(80,160,250,0.4)",
          }}
        >
          + {t("addTerm")}
        </button>
      </div>

      {/* Search */}
      <div
        className="card rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2"
        style={{ animation: "fadeUp 0.5s ease-out 0.2s backwards" }}
      >
        <span className="text-[#6b7785]">🔍</span>
        <input
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
        style={{ animation: "fadeUp 0.5s ease-out 0.3s backwards" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-[11px] uppercase tracking-wider text-[#6b7785]"
              style={{ background: "rgba(80,160,250,0.04)" }}
            >
              <th className="text-left p-3 font-medium">{t("title")}</th>
              <th className="text-left p-3 font-medium w-32">{t("status")}</th>
              <th className="text-right p-3 font-medium w-24"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 300).map((row) => (
              <tr
                key={row.id}
                className="hover:bg-[#50A0FA]/[0.04] transition-colors"
                style={{ borderTop: "1px solid rgba(80,160,250,0.08)" }}
              >
                <td className="p-3 text-[#e8ecf2]">{row.value}</td>
                <td className="p-3">
                  <span
                    className="px-2 py-0.5 rounded-md text-[11px]"
                    style={{
                      background: row.rule_type === "brand"
                        ? "rgba(80,160,250,0.15)"
                        : "rgba(245,158,11,0.15)",
                      color: row.rule_type === "brand" ? "#50A0FA" : "#f59e0b",
                    }}
                  >
                    {row.rule_type === "brand" ? t("brandType") : t("keywordType")}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => remove(row.id)}
                    className="text-[#ef4444] hover:text-red-300 text-xs font-medium"
                  >{t("delete")}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-[#6b7785] text-sm">{t("noTerms")}</div>
        )}
      </div>

      <div className="text-xs text-[#6b7785] mt-3">
        {t("showing")} {Math.min(filtered.length, 300)} {t("of")} {filtered.length}
      </div>
    </div>
  );
}

export default Blacklist;