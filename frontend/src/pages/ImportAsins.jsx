import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { getCategories } from "../api.js";

const MAX_ASINS = 50;
const ASIN_RE = /^[A-Z0-9]{10}$/i;

function parseAsinInput(raw) {
  const tokens = raw.split(/[\n,\s]+/).map(s => s.trim()).filter(Boolean);
  const valid = [], invalid = [];
  for (const token of tokens) {
    if (token.includes("/") || token.toLowerCase().startsWith("http")) {
      invalid.push({ value: token.slice(0, 40), reason: "Links not allowed — use ASIN only" });
    } else if (!ASIN_RE.test(token)) {
      invalid.push({ value: token.slice(0, 40), reason: `Must be 10 alphanumeric characters (got ${token.length})` });
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

export default function ImportAsins() {
  const navigate = useNavigate();
  const [asinText, setAsinText] = useState("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [apiStatus, setApiStatus] = useState(null);
  const [categories, setCategories] = useState([]);
  const [mainId, setMainId] = useState("");
  const [subId, setSubId] = useState("");

  const parsed = parseAsinInput(asinText);

  useEffect(() => {
    api.get("/amazon/status")
      .then(r => setApiStatus(r.data))
      .catch(() => setApiStatus({ configured: false, message: "Backend unavailable" }));
    getCategories().then(setCategories).catch(() => {});
  }, []);

  async function handleImport() {
    setError("");
    if (!parsed.valid.length) return;
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
      setError(e?.response?.data?.detail || "Import failed. Is the backend running?");
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
          <button onClick={() => navigate("/add")} className="hover:text-[#50A0FA] transition-colors">Add Products</button>
          <span>/</span>
          <span className="text-[#6b7785]">By ASIN</span>
        </div>
        <h1 className="text-2xl font-medium text-white mb-1">Import by ASIN</h1>
        <p className="text-sm text-[#6b7785]">Enter Amazon ASINs to import product data directly. ASINs only — links are not accepted.</p>
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
          <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider">Amazon ASINs</label>
          <span className="text-[11px]" style={{ color: parsed.valid.length > 0 ? "#50A0FA" : "#4a5568" }}>
            {asinText.trim() ? `${parsed.valid.length} / ${MAX_ASINS} valid` : `Max ${MAX_ASINS} per batch`}
          </span>
        </div>

        <textarea
          value={asinText}
          onChange={e => { setAsinText(e.target.value); setError(""); setResults(null); }}
          rows={6}
          placeholder={"B08T8L371P\nB0DHRQXYCH\nB09G9HD3R9"}
          className="w-full rounded-lg px-3 py-2.5 text-sm text-[#e8ecf2] font-mono resize-y"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${parsed.invalid.length > 0 && asinText.trim() ? "rgba(239,68,68,0.4)" : "rgba(80,160,250,0.18)"}`,
          }}
        />
        <p className="text-[11px] text-[#4a5568] mt-1.5">One per line or comma-separated · 10 characters each · No URLs</p>

        {parsed.capped && (
          <div className="mt-2 px-3 py-2 rounded-lg text-xs flex items-center gap-2"
            style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
            ⚠ Only the first {MAX_ASINS} ASINs will be imported.
          </div>
        )}

        {parsed.invalid.length > 0 && asinText.trim() && (
          <div className="mt-3 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
              {parsed.invalid.length} invalid — will be skipped
            </div>
            {parsed.invalid.map((inv, i) => (
              <div key={i} className="px-3 py-1.5 flex items-center gap-3 text-xs"
                style={{ borderTop: "1px solid rgba(239,68,68,0.1)" }}>
                <code className="font-mono text-[#ef4444]">{inv.value}</code>
                <span className="text-[#6b7785]">{inv.reason}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider mb-1.5">Main Category</label>
            <select value={mainId} onChange={e => { setMainId(e.target.value); setSubId(""); }}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={selStyle}>
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
              ? `Importing ${parsed.valid.length} ASIN${parsed.valid.length !== 1 ? "s" : ""}...`
              : parsed.valid.length > 0
                ? `Import ${parsed.valid.length} ASIN${parsed.valid.length !== 1 ? "s" : ""} →`
                : "Import →"}
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
              <span className="text-green-400">✓ {results.summary.added} added</span>
              <span className="text-red-400">⊘ {results.summary.blocked} blocked</span>
              <span className="text-[#6b7785]">↷ {results.summary.skipped} skipped</span>
              <span className="text-amber-400">✗ {results.summary.failed} failed</span>
            </div>
            <button onClick={() => navigate("/products")}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: "rgba(80,160,250,0.15)", color: "#50A0FA" }}>
              View Products →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-[#6b7785]"
                  style={{ background: "rgba(80,160,250,0.04)" }}>
                  <th className="text-left p-2 font-medium">ASIN</th>
                  <th className="text-left p-2 font-medium">Title</th>
                  <th className="text-right p-2 font-medium w-32">Price</th>
                  <th className="text-left p-2 font-medium w-24">Status</th>
                  <th className="text-left p-2 font-medium">Note</th>
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
  const styles = {
    added:   { bg: "rgba(34,197,94,0.15)",  fg: "#22c55e",  label: "Added" },
    blocked: { bg: "rgba(239,68,68,0.15)",  fg: "#ef4444",  label: "Blocked" },
    skipped: { bg: "rgba(107,119,133,0.2)", fg: "#a0adbb",  label: "Skipped" },
    failed:  { bg: "rgba(245,158,11,0.15)", fg: "#f59e0b",  label: "Failed" },
  };
  const s = styles[status] || styles.skipped;
  return (
    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium"
      style={{ background: s.bg, color: s.fg }}>{s.label}</span>
  );
}
