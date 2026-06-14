import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api, { getCategories } from "../api.js";

const MAX_URLS = 50;
const ASIN_RE = /\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i;

function parseUrlInput(raw) {
  const lines = raw.split(/\n|,/).map(s => s.trim()).filter(Boolean);
  const valid = [], invalid = [];
  const seen = new Set();

  for (const line of lines) {
    const lc = line.toLowerCase();
    if (!lc.includes("amazon.") && !lc.startsWith("http")) {
      invalid.push({ value: line.slice(0, 60), reason: "Not a URL — paste a full Amazon product link" });
      continue;
    }
    const m = ASIN_RE.exec(line);
    if (!m) {
      invalid.push({ value: line.slice(0, 60), reason: "No product ASIN found — make sure the URL contains /dp/" });
      continue;
    }
    const asin = m[1].toUpperCase();
    if (seen.has(asin)) continue;
    seen.add(asin);
    valid.push({ url: line, asin });
  }

  const capped = valid.length > MAX_URLS;
  return { valid: valid.slice(0, MAX_URLS), capped, invalid };
}

const selStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(80,160,250,0.18)",
  color: "#e8ecf2",
  cursor: "pointer",
  appearance: "none",
};

export default function ImportUrls() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [urlText, setUrlText] = useState("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [apiStatus, setApiStatus] = useState(null);
  const [categories, setCategories] = useState([]);
  const [mainId, setMainId] = useState("");
  const [subId, setSubId] = useState("");

  const parsed = parseUrlInput(urlText);

  useEffect(() => {
    api.get("/amazon/status")
      .then(r => setApiStatus(r.data))
      .catch(() => setApiStatus({ configured: false, message: t("backendUnavailable") }));
    getCategories().then(setCategories).catch(() => {});
  }, []);

  async function handleImport() {
    setError("");
    if (!parsed.valid.length) return;
    setImporting(true);
    setResults(null);
    try {
      const categoryId = subId ? parseInt(subId) : mainId ? parseInt(mainId) : undefined;
      const r = await api.post("/amazon/import-urls", {
        urls: parsed.valid.map(v => v.url),
        ...(categoryId ? { category_id: categoryId } : {}),
      });
      setResults(r.data);
    } catch (e) {
      setError(e?.response?.data?.detail || t("importError2"));
    } finally {
      setImporting(false);
    }
  }

  const mains = categories.filter(c => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name));
  const subs = mainId
    ? categories.filter(c => String(c.parent_id) === String(mainId)).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <div>
      <div className="fade-up mb-6">
        <div className="flex items-center gap-1.5 text-[11px] text-[#4a5568] mb-3">
          <button onClick={() => navigate("/add")} className="hover:text-[#50A0FA] transition-colors">{t("addProductsBreadcrumb")}</button>
          <span>/</span>
          <span className="text-[#6b7785]">{t("byUrl")}</span>
        </div>
        <h1 className="text-2xl font-medium text-white mb-1">{t("importByUrlTitle")}</h1>
        <p className="text-sm text-[#6b7785]">{t("importByUrlSubtitle")}</p>
      </div>

      {apiStatus && (
        <div className="rounded-lg px-4 py-2.5 text-sm mb-4 flex items-center gap-2"
          style={{
            background: apiStatus.configured ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
            border: `1px solid ${apiStatus.configured ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.25)"}`,
            color: apiStatus.configured ? "#22c55e" : "#f59e0b",
          }}>
          <span>{apiStatus.configured ? "●" : "○"}</span>
          {apiStatus.message}
        </div>
      )}

      <div className="card rounded-xl p-5 mb-4" style={{ animation: "fadeUp 0.5s ease-out 0.1s backwards" }}>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider">{t("amazonUrls")}</label>
          <span className="text-[11px]" style={{ color: parsed.valid.length > 0 ? "#50A0FA" : "#4a5568" }}>
            {urlText.trim() ? t("validCount", { count: parsed.valid.length, max: MAX_URLS }) : t("maxPerBatch", { max: MAX_URLS })}
          </span>
        </div>

        <textarea
          value={urlText}
          onChange={e => { setUrlText(e.target.value); setError(""); setResults(null); }}
          rows={7}
          placeholder={"https://www.amazon.com/dp/B08T8L371P\nhttps://www.amazon.com/dp/B0DHRQXYCH\nhttps://www.amazon.com/dp/B09G9HD3R9"}
          className="w-full rounded-lg px-3 py-2.5 text-sm text-[#e8ecf2] resize-y"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${parsed.invalid.length > 0 && urlText.trim() ? "rgba(239,68,68,0.4)" : "rgba(80,160,250,0.18)"}`,
          }}
        />
        <p className="text-[11px] text-[#4a5568] mt-1.5">{t("urlHint")}</p>

        {parsed.valid.length > 0 && (
          <div className="mt-3 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(80,160,250,0.15)" }}>
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(80,160,250,0.08)", color: "#50A0FA" }}>
              {t("nProductsDetected", { n: parsed.valid.length, s: parsed.valid.length !== 1 ? "s" : "" })}
            </div>
            {parsed.valid.map((item, i) => (
              <div key={i} className="px-3 py-1.5 flex items-center gap-3 text-xs"
                style={{ borderTop: "1px solid rgba(80,160,250,0.08)" }}>
                <code className="font-mono text-[#50A0FA] shrink-0">{item.asin}</code>
                <span className="text-[#4a5568] truncate">{item.url}</span>
              </div>
            ))}
          </div>
        )}

        {parsed.capped && (
          <div className="mt-2 px-3 py-2 rounded-lg text-xs flex items-center gap-2"
            style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
            ⚠ {t("asinCapped", { max: MAX_URLS })}
          </div>
        )}

        {parsed.invalid.length > 0 && urlText.trim() && (
          <div className="mt-3 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
              {t("invalidWillSkip", { n: parsed.invalid.length })}
            </div>
            {parsed.invalid.map((inv, i) => (
              <div key={i} className="px-3 py-1.5 flex items-center gap-3 text-xs"
                style={{ borderTop: "1px solid rgba(239,68,68,0.1)" }}>
                <code className="font-mono text-[#ef4444] truncate max-w-xs">{inv.value}</code>
                <span className="text-[#6b7785] shrink-0">{inv.reason}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider mb-1.5">{t("mainCategory")}</label>
            <select value={mainId} onChange={e => { setMainId(e.target.value); setSubId(""); }}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={selStyle}>
              <option value="" disabled style={{ background: "#0f1623", color: "#4a5568" }}>{t("selectMainCat")}</option>
              {mains.map(c => <option key={c.id} value={c.id} style={{ background: "#0f1623" }}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider mb-1.5">{t("subcategory")}</label>
            <select value={subId} onChange={e => setSubId(e.target.value)} disabled={!mainId}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ ...selStyle, opacity: mainId ? 1 : 0.4, cursor: mainId ? "pointer" : "not-allowed" }}>
              <option value="" disabled style={{ background: "#0f1623", color: "#4a5568" }}>{t("selectSubcat")}</option>
              {subs.map(c => <option key={c.id} value={c.id} style={{ background: "#0f1623" }}>{c.name}</option>)}
            </select>
          </div>
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
              ? `${t("importing")} ${parsed.valid.length}...`
              : parsed.valid.length > 0
                ? `${t("importNow")} ${parsed.valid.length} →`
                : t("importBtnDefault")}
          </button>
          {error && (
            <div className="px-3 py-2 rounded-lg text-xs"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {results && (
        <div className="card rounded-xl p-5" style={{ animation: "fadeUp 0.5s ease-out backwards" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-4 text-sm flex-wrap">
              <span className="text-green-400">✓ {results.summary.added} {t("addedShort")}</span>
              <span className="text-red-400">⊘ {results.summary.blocked} {t("blockedShort")}</span>
              <span className="text-[#6b7785]">↷ {results.summary.skipped} {t("skippedShort")}</span>
              <span className="text-amber-400">✗ {results.summary.failed} {t("failedShort")}</span>
            </div>
            <button onClick={() => navigate("/products")}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: "rgba(80,160,250,0.15)", color: "#50A0FA" }}>
              {t("viewProducts")}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-[#6b7785]"
                  style={{ background: "rgba(80,160,250,0.04)" }}>
                  <th className="text-left p-2 font-medium">ASIN</th>
                  <th className="text-left p-2 font-medium">{t("titleCol")}</th>
                  <th className="text-right p-2 font-medium w-32">{t("priceCol")}</th>
                  <th className="text-left p-2 font-medium w-24">{t("statusCol")}</th>
                  <th className="text-left p-2 font-medium">{t("noteCol")}</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid rgba(80,160,250,0.08)" }}>
                    <td className="p-2 font-mono text-[11px] text-[#a0adbb]">{r.asin}</td>
                    <td className="p-2 text-[#e8ecf2] truncate max-w-xs">{r.title || "—"}</td>
                    <td className="p-2 text-right">
                      {r.price_usd != null ? (
                        <div>
                          <div className="text-[11px] text-[#6b7785]">${Number(r.price_usd).toFixed(2)} USD</div>
                          {r.price_cop > 0 && (
                            <div className="text-sm font-medium" style={{ color: "#50A0FA" }}>
                              {Number(r.price_cop).toLocaleString()} COP
                            </div>
                          )}
                        </div>
                      ) : <span className="text-[#6b7785]">—</span>}
                    </td>
                    <td className="p-2"><StatusPill status={r.status} /></td>
                    <td className="p-2 text-xs text-[#6b7785]">{r.reason || ""}</td>
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

function StatusPill({ status }) {
  const { t } = useTranslation();
  const styles = {
    added:   { bg: "rgba(34,197,94,0.15)",  fg: "#22c55e" },
    blocked: { bg: "rgba(239,68,68,0.15)",  fg: "#ef4444" },
    skipped: { bg: "rgba(107,119,133,0.2)", fg: "#a0adbb" },
    failed:  { bg: "rgba(245,158,11,0.15)", fg: "#f59e0b" },
  };
  const s = styles[status] || styles.skipped;
  const labels = { added: t("statusAdded"), blocked: t("statusBlocked"), skipped: t("statusSkipped"), failed: t("statusFailed") };
  return (
    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium"
      style={{ background: s.bg, color: s.fg }}>{labels[status] || status}</span>
  );
}
