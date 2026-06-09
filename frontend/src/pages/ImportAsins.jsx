import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api, { getCategories } from "../api.js";

const MAX_ASINS = 50;
const ASIN_RE = /^[A-Z0-9]{10}$/i;

function parseAsinInput(raw) {
  const tokens = raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  const valid = [];
  const invalid = [];

  for (const token of tokens) {
    if (token.includes("/") || token.toLowerCase().startsWith("http")) {
      invalid.push({ value: token.slice(0, 40), reason: "Links are not allowed — use ASIN only" });
    } else if (!ASIN_RE.test(token)) {
      invalid.push({ value: token.slice(0, 40), reason: `Must be exactly 10 alphanumeric characters (got ${token.length})` });
    } else if (!valid.includes(token.toUpperCase())) {
      valid.push(token.toUpperCase());
    }
  }

  return { valid: valid.slice(0, MAX_ASINS), capped: valid.length > MAX_ASINS, invalid };
}

const selStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(80,160,250,0.18)",
  color: "#e8ecf2",
  cursor: "pointer",
  appearance: "none",
};

function ImportAsins() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [asinText, setAsinText] = useState("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [categories, setCategories] = useState([]);
  const [mainId, setMainId] = useState("");
  const [subId, setSubId]   = useState("");

  const parsed = parseAsinInput(asinText);

  useEffect(() => {
    api.get("/amazon/status")
      .then((r) => setApiStatus(r.data))
      .catch(() => setApiStatus({ configured: false, message: "Backend no disponible" }));
    getCategories().then(setCategories).catch(() => {});
  }, []);

  async function handleImport() {
    setSubmitError("");
    if (parsed.valid.length === 0) {
      setSubmitError("No valid ASINs entered.");
      return;
    }

    setImporting(true);
    setResults(null);
    try {
      const categoryId = subId ? parseInt(subId) : mainId ? parseInt(mainId) : undefined;
      const r = await api.post("/amazon/import-asins", {
        asins: parsed.valid,
        ...(categoryId ? { category_id: categoryId } : {}),
      });
      setResults(r.data);
    } catch (e) {
      setSubmitError(e?.response?.data?.detail || t("importError"));
    } finally {
      setImporting(false);
    }
  }

  const hasInput = asinText.trim().length > 0;

  return (
    <div>
      <div className="fade-up mb-6">
        <div className="flex items-center gap-1.5 text-[11px] text-[#4a5568] mb-3">
          <button onClick={() => navigate("/add")} className="hover:text-[#50A0FA] transition-colors">Add Products</button>
          <span>/</span>
          <span className="text-[#6b7785]">By ASIN</span>
        </div>
        <h1 className="text-2xl font-medium text-white mb-1">{t("importAsinsTitle")}</h1>
        <p className="text-sm text-[#6b7785]">Enter Amazon ASINs to import product data automatically. ASINs only — links are not accepted.</p>
      </div>

      {/* API status banner */}
      {apiStatus && (
        <div
          className="rounded-lg px-4 py-2.5 text-sm mb-4 flex items-center gap-2"
          style={{
            background: apiStatus.configured
              ? "rgba(34,197,94,0.08)"
              : "rgba(245,158,11,0.08)",
            border: `1px solid ${apiStatus.configured
              ? "rgba(34,197,94,0.25)"
              : "rgba(245,158,11,0.25)"}`,
            color: apiStatus.configured ? "#22c55e" : "#f59e0b",
          }}
        >
          <span>{apiStatus.configured ? "●" : "○"}</span>
          {apiStatus.message}
        </div>
      )}

      {/* Input card */}
      <div
        className="card rounded-xl p-5 mb-4"
        style={{ animation: "fadeUp 0.5s ease-out 0.1s backwards" }}
      >
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider">
            Amazon ASINs
          </label>
          <span className="text-[11px]" style={{ color: parsed.valid.length > 0 ? "#50A0FA" : "#4a5568" }}>
            {hasInput ? `${parsed.valid.length} / ${MAX_ASINS} valid` : `Max ${MAX_ASINS} per import`}
          </span>
        </div>

        <textarea
          value={asinText}
          onChange={(e) => { setAsinText(e.target.value); setSubmitError(""); setResults(null); }}
          rows={6}
          placeholder={"B08T8L371P\nB0DHRQXYCH, B09G9HD3R9\nB0CHX3QBCH"}
          className="w-full rounded-lg px-3 py-2.5 text-sm text-[#e8ecf2] font-mono resize-y"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${parsed.invalid.length > 0 && hasInput ? "rgba(239,68,68,0.4)" : "rgba(80,160,250,0.18)"}`,
          }}
        />

        <p className="text-[11px] text-[#4a5568] mt-1.5">
          One per line or comma-separated · Each ASIN must be exactly 10 characters · No URLs
        </p>

        {/* Overflow warning */}
        {parsed.capped && (
          <div className="mt-2 px-3 py-2 rounded-lg text-xs flex items-center gap-2"
            style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
            <span>⚠</span> Only the first {MAX_ASINS} ASINs will be imported. Remove the extras or split into batches.
          </div>
        )}

        {/* Invalid entries */}
        {parsed.invalid.length > 0 && hasInput && (
          <div className="mt-3 rounded-lg overflow-hidden"
            style={{ border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
              {parsed.invalid.length} invalid {parsed.invalid.length === 1 ? "entry" : "entries"} — will be skipped
            </div>
            <div className="divide-y" style={{ borderColor: "rgba(239,68,68,0.1)" }}>
              {parsed.invalid.map((inv, i) => (
                <div key={i} className="px-3 py-1.5 flex items-center gap-3 text-xs">
                  <code className="font-mono text-[#ef4444]">{inv.value}</code>
                  <span className="text-[#6b7785]">{inv.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {(() => {
            const mains = categories.filter(c => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name));
            const subs  = mainId
              ? categories.filter(c => String(c.parent_id) === String(mainId)).sort((a, b) => a.name.localeCompare(b.name))
              : [];
            return (
              <>
                <div>
                  <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider mb-1.5">Main Category</label>
                  <select value={mainId} onChange={e => { setMainId(e.target.value); setSubId(""); }}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={selStyle}>
                    <option value="" disabled style={{ background: "#0f1623", color: "#4a5568" }}>Select main category</option>
                    {mains.map(c => <option key={c.id} value={c.id} style={{ background: "#0f1623" }}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider mb-1.5">Subcategory</label>
                  <select value={subId} onChange={e => setSubId(e.target.value)} disabled={!mainId}
                    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                    style={{ ...selStyle, opacity: mainId ? 1 : 0.4, cursor: mainId ? "pointer" : "not-allowed" }}>
                    <option value="" disabled style={{ background: "#0f1623", color: "#4a5568" }}>Select subcategory</option>
                    {subs.map(c => <option key={c.id} value={c.id} style={{ background: "#0f1623" }}>{c.name}</option>)}
                  </select>
                </div>
              </>
            );
          })()}
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleImport}
            disabled={importing || !apiStatus?.configured || parsed.valid.length === 0}
            className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "#50A0FA",
              color: "#0d1117",
              boxShadow: parsed.valid.length > 0 ? "0 0 18px rgba(80,160,250,0.45)" : "none",
            }}
          >
            {importing
              ? t("importing")
              : parsed.valid.length > 0
                ? `Import ${parsed.valid.length} ASIN${parsed.valid.length !== 1 ? "s" : ""} →`
                : "Import →"}
          </button>
          {submitError && (
            <div
              className="px-3 py-2 rounded-lg text-xs"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
            >
              {submitError}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {results && (
        <div
          className="card rounded-xl p-5"
          style={{ animation: "fadeUp 0.5s ease-out backwards" }}
        >
          <div className="flex gap-4 mb-4 text-sm flex-wrap">
            <div className="text-green-400">
              ✓ {results.summary.added} {t("addedShort")}
            </div>
            <div className="text-red-400">
              ⊘ {results.summary.blocked} {t("blockedShort")}
            </div>
            <div className="text-[#6b7785]">
              ↷ {results.summary.skipped} {t("skippedShort")}
            </div>
            <div className="text-amber-400">
              ✗ {results.summary.failed} {t("failedShort")}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-[11px] uppercase tracking-wider text-[#6b7785]"
                  style={{ background: "rgba(80,160,250,0.04)" }}
                >
                  <th className="text-left p-2 font-medium">ASIN</th>
                  <th className="text-left p-2 font-medium">{t("title")}</th>
                  <th className="text-right p-2 font-medium w-28">{t("price")}</th>
                  <th className="text-left p-2 font-medium w-28">{t("status")}</th>
                  <th className="text-left p-2 font-medium">{t("blockReason")}</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((r, i) => (
                  <tr
                    key={i}
                    style={{ borderTop: "1px solid rgba(80,160,250,0.08)" }}
                  >
                    <td className="p-2 font-mono text-[11px] text-[#a0adbb]">
                      {r.asin}
                    </td>
                    <td className="p-2 text-[#e8ecf2] truncate max-w-xs">
                      {r.title || "—"}
                    </td>
                    <td className="p-2 text-right">
                      <PriceBlock usd={r.price_usd} cop={r.price_cop} />
                    </td>
                    <td className="p-2">
                      <StatusPill status={r.status} t={t} />
                    </td>
                    <td className="p-2 text-xs text-[#6b7785]">
                      {r.reason || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Shared component: shows USD on top (small grey) + COP below (bigger, blue)
function PriceBlock({ usd, cop }) {
  if (usd === undefined || usd === null) {
    return <span className="text-[#6b7785]">—</span>;
  }
  return (
    <div className="text-right">
      <div className="text-[11px] text-[#6b7785]">${Number(usd).toFixed(2)} USD</div>
      <div className="text-sm font-medium" style={{ color: "#50A0FA" }}>
        {cop && cop > 0
          ? Number(cop).toLocaleString() + " COP"
          : "—"}
      </div>
    </div>
  );
}

function StatusPill({ status, t }) {
  const styles = {
    added:   { bg: "rgba(34,197,94,0.15)",  fg: "#22c55e", label: t("added") },
    blocked: { bg: "rgba(239,68,68,0.15)",  fg: "#ef4444", label: t("blocked") },
    skipped: { bg: "rgba(107,119,133,0.2)", fg: "#a0adbb", label: t("skipped") },
    failed:  { bg: "rgba(245,158,11,0.15)", fg: "#f59e0b", label: t("failed") },
  };
  const s = styles[status] || styles.skipped;
  return (
    <span
      className="px-2 py-0.5 rounded-md text-[11px] font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

export default ImportAsins;