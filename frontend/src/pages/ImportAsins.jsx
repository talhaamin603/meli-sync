import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../api.js";

function ImportAsins() {
  const { t } = useTranslation();
  const [asinText, setAsinText] = useState("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/amazon/status")
      .then((r) => setApiStatus(r.data))
      .catch(() => setApiStatus({ configured: false, message: "Backend no disponible" }));
  }, []);

  async function handleImport() {
    setError("");
    const asins = asinText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (asins.length === 0) {
      setError(t("noAsinsEntered"));
      return;
    }

    setImporting(true);
    setResults(null);
    try {
      const r = await api.post("/amazon/import-asins", { asins });
      setResults(r.data);
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
        t("importError")
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div className="fade-up mb-6">
        <h1 className="text-2xl font-medium text-white mb-1">{t("importAsinsTitle")}</h1>
        <p className="text-sm text-[#6b7785]">{t("importAsinsSubtitle")}</p>
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
        <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider mb-2">
          {t("pasteAsins")}
        </label>
        <textarea
          value={asinText}
          onChange={(e) => setAsinText(e.target.value)}
          rows={6}
          placeholder={"B08T8L371P\nB0DHRQXYCH\nhttps://www.amazon.com/.../dp/B08L8B5JR2/..."}
          className="w-full rounded-lg px-3 py-2.5 text-sm text-[#e8ecf2] font-mono resize-y"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(80,160,250,0.18)",
          }}
        />
        <div className="text-[11px] text-[#6b7785] mt-2">
          {t("asinHelp")}
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleImport}
            disabled={importing || !apiStatus?.configured}
            className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "#50A0FA",
              color: "#0d1117",
              boxShadow: "0 0 18px rgba(80,160,250,0.45)",
            }}
          >
            {importing ? t("importing") : t("importNow") + " →"}
          </button>
          {error && (
            <div
              className="px-3 py-2 rounded-lg text-xs"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
            >
              {error}
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