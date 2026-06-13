import { useState, useEffect, useCallback } from "react";
import { getSyncHistory, triggerAmazonSync, triggerMeliSync, getSyncSettings, saveSyncSettings } from "../api";

const UNITS = ["seconds", "minutes", "hours", "days", "weeks"];

const UNIT_SECONDS = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
  weeks: 604800,
};

function toSeconds(value, unit) {
  return value * (UNIT_SECONDS[unit] || 1);
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function duration(start, end) {
  if (!start || !end) return "—";
  const ms = new Date(end) - new Date(start);
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function SyncTypeBadge({ type }) {
  const map = {
    amazon: { label: "Amazon", color: "#f59e0b" },
    meli: { label: "Mercado Libre", color: "#50A0FA" },
    daily: { label: "ML (legacy)", color: "#6b7785" },
    daily_price_stock: { label: "ML (legacy)", color: "#6b7785" },
  };
  const { label, color } = map[type] || { label: type, color: "#6b7785" };
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-semibold"
      style={{ background: `${color}22`, color }}
    >
      {label}
    </span>
  );
}

function SyncCard({ title, description, schedule, onRun, running, result }) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{
        background: "linear-gradient(135deg, #161d2e 0%, #111827 100%)",
        border: "1px solid rgba(80,160,250,0.12)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white text-sm">{title}</h3>
          <p className="text-xs text-[#6b7785] mt-0.5">{description}</p>
          <p className="text-xs text-[#4a5568] mt-1">Next run: {schedule}</p>
        </div>
        <button
          onClick={onRun}
          disabled={running}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex-shrink-0"
          style={{
            background: running
              ? "rgba(80,160,250,0.1)"
              : "linear-gradient(135deg, #50A0FA 0%, #3d7fd1 100%)",
            color: running ? "#6b7785" : "#0d1117",
            cursor: running ? "not-allowed" : "pointer",
          }}
        >
          {running ? "Running…" : "Run Now"}
        </button>
      </div>

      {result && (
        <div
          className="rounded-lg px-3 py-2 text-xs font-mono"
          style={{
            background: result.error ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
            border: `1px solid ${result.error ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`,
            color: result.error ? "#f87171" : "#86efac",
          }}
        >
          {result.error
            ? `Error: ${result.error}`
            : `Updated: ${result.updated ?? 0}  Failed: ${result.failed ?? 0}${result.skipped != null ? `  Unchanged: ${result.skipped}` : ""}`}
        </div>
      )}
    </div>
  );
}

function IntervalRow({ label, usesCredits, productCount, value, unit, onChange, onSave, saving, saved, error }) {
  const secs = toSeconds(value, unit);
  const showCreditWarning = usesCredits && (unit === "seconds" || unit === "minutes");
  const tooShort = secs < 60;

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{
        background: "linear-gradient(135deg, #161d2e 0%, #111827 100%)",
        border: "1px solid rgba(80,160,250,0.12)",
      }}
    >
      <h3 className="text-sm font-semibold text-white">{label}</h3>

      <div className="flex items-center gap-2">
        <span className="text-xs text-[#6b7785] w-20 flex-shrink-0">Run every</span>

        {/* Number input */}
        <input
          type="number"
          min={1}
          value={value}
          onChange={(e) => onChange({ value: Math.max(1, parseInt(e.target.value) || 1), unit })}
          className="w-24 px-3 py-1.5 rounded-lg text-sm text-white outline-none transition-all"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(80,160,250,0.2)",
          }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(80,160,250,0.6)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(80,160,250,0.2)")}
        />

        {/* Unit selector */}
        <select
          value={unit}
          onChange={(e) => onChange({ value, unit: e.target.value })}
          className="px-3 py-1.5 rounded-lg text-sm text-white outline-none transition-all"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(80,160,250,0.2)",
            cursor: "pointer",
          }}
        >
          {UNITS.map((u) => (
            <option key={u} value={u} style={{ background: "#161d2e" }}>
              {u}
            </option>
          ))}
        </select>

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={saving || tooShort}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex-shrink-0"
          style={{
            background: saved
              ? "rgba(34,197,94,0.15)"
              : tooShort
              ? "rgba(80,160,250,0.05)"
              : "linear-gradient(135deg, #50A0FA 0%, #3d7fd1 100%)",
            color: saved ? "#86efac" : tooShort ? "#4a5568" : "#0d1117",
            cursor: saving || tooShort ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving…" : saved ? "Saved!" : "Save"}
        </button>
      </div>

      {/* Validation error */}
      {tooShort && (
        <p className="text-xs text-red-400">
          Minimum interval is 60 seconds. Current value: {secs}s.
        </p>
      )}

      {/* Credit warning — only for Amazon sync when unit is seconds or minutes */}
      {showCreditWarning && !tooShort && (
        <div
          className="rounded-lg px-3 py-2.5 flex items-start gap-2"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          <span className="text-amber-400 mt-0.5">⚠</span>
          <p className="text-xs text-amber-300 leading-relaxed">
            You have <strong>{productCount}</strong> products, so{" "}
            <strong>{productCount} scrape.do credits</strong> will be used every{" "}
            <strong>
              {value} {unit}
            </strong>
            . That is{" "}
            <strong>
              {(productCount * Math.floor(86400 / secs)).toLocaleString()} credits/day
            </strong>
            . Make sure your plan supports this.
          </p>
        </div>
      )}

      {/* API error */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

export default function Sync() {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [amazonRunning, setAmazonRunning] = useState(false);
  const [meliRunning, setMeliRunning] = useState(false);
  const [amazonResult, setAmazonResult] = useState(null);
  const [meliResult, setMeliResult] = useState(null);

  // Schedule settings
  const [productCount, setProductCount] = useState(0);
  const [amazonInterval, setAmazonInterval] = useState({ value: 24, unit: "hours" });
  const [meliInterval, setMeliInterval] = useState({ value: 24, unit: "hours" });
  const [savingAmazon, setSavingAmazon] = useState(false);
  const [savingMeli, setSavingMeli] = useState(false);
  const [savedAmazon, setSavedAmazon] = useState(false);
  const [savedMeli, setSavedMeli] = useState(false);
  const [amazonSaveError, setAmazonSaveError] = useState("");
  const [meliSaveError, setMeliSaveError] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      const data = await getSyncHistory();
      setHistory(data);
    } catch {
      /* ignore */
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    getSyncSettings()
      .then((s) => {
        setProductCount(s.product_count);
        setAmazonInterval({ value: s.amazon.value, unit: s.amazon.unit });
        setMeliInterval({ value: s.meli.value, unit: s.meli.unit });
      })
      .catch(() => {});
  }, [loadHistory]);

  function scheduleLabel(interval) {
    return `Every ${interval.value} ${interval.unit}`;
  }

  async function handleAmazonSync() {
    setAmazonRunning(true);
    setAmazonResult(null);
    try {
      const res = await triggerAmazonSync();
      setAmazonResult(res);
    } catch (e) {
      setAmazonResult({ error: e?.response?.data?.detail || e.message });
    } finally {
      setAmazonRunning(false);
      loadHistory();
    }
  }

  async function handleMeliSync() {
    setMeliRunning(true);
    setMeliResult(null);
    try {
      const res = await triggerMeliSync();
      setMeliResult(res);
    } catch (e) {
      setMeliResult({ error: e?.response?.data?.detail || e.message });
    } finally {
      setMeliRunning(false);
      loadHistory();
    }
  }

  async function handleSaveAmazon() {
    setSavingAmazon(true);
    setSavedAmazon(false);
    setAmazonSaveError("");
    try {
      await saveSyncSettings({
        amazon_value: amazonInterval.value,
        amazon_unit: amazonInterval.unit,
        meli_value: meliInterval.value,
        meli_unit: meliInterval.unit,
      });
      setSavedAmazon(true);
      setTimeout(() => setSavedAmazon(false), 2500);
    } catch (e) {
      setAmazonSaveError(e?.response?.data?.detail || e.message);
    } finally {
      setSavingAmazon(false);
    }
  }

  async function handleSaveMeli() {
    setSavingMeli(true);
    setSavedMeli(false);
    setMeliSaveError("");
    try {
      await saveSyncSettings({
        amazon_value: amazonInterval.value,
        amazon_unit: amazonInterval.unit,
        meli_value: meliInterval.value,
        meli_unit: meliInterval.unit,
      });
      setSavedMeli(true);
      setTimeout(() => setSavedMeli(false), 2500);
    } catch (e) {
      setMeliSaveError(e?.response?.data?.detail || e.message);
    } finally {
      setSavingMeli(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Sync</h1>
        <p className="text-sm text-[#6b7785] mt-1">
          Automatic sync keeps your Amazon data and Mercado Libre listings up to date.
        </p>
      </div>

      {/* Run Now cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SyncCard
          title="Amazon Price & Rating Sync"
          description="Re-fetches price, rating, review count, and Prime status from Amazon for every product."
          schedule={scheduleLabel(amazonInterval)}
          onRun={handleAmazonSync}
          running={amazonRunning}
          result={amazonResult}
        />
        <SyncCard
          title="Mercado Libre Price Sync"
          description="Recalculates COP prices with the latest exchange rate and pushes updates to published listings."
          schedule={scheduleLabel(meliInterval)}
          onRun={handleMeliSync}
          running={meliRunning}
          result={meliResult}
        />
      </div>

      {/* Schedule configuration */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Schedule Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IntervalRow
            label="Amazon Sync Interval"
            usesCredits={true}
            productCount={productCount}
            value={amazonInterval.value}
            unit={amazonInterval.unit}
            onChange={setAmazonInterval}
            onSave={handleSaveAmazon}
            saving={savingAmazon}
            saved={savedAmazon}
            error={amazonSaveError}
          />
          <IntervalRow
            label="Mercado Libre Sync Interval"
            usesCredits={false}
            productCount={productCount}
            value={meliInterval.value}
            unit={meliInterval.unit}
            onChange={setMeliInterval}
            onSave={handleSaveMeli}
            saving={savingMeli}
            saved={savedMeli}
            error={meliSaveError}
          />
        </div>
      </div>

      {/* History table */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Sync History</h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(80,160,250,0.1)" }}
        >
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "rgba(80,160,250,0.06)", borderBottom: "1px solid rgba(80,160,250,0.1)" }}>
                <th className="text-left px-4 py-2.5 text-[#6b7785] font-medium">Type</th>
                <th className="text-left px-4 py-2.5 text-[#6b7785] font-medium">Started</th>
                <th className="text-left px-4 py-2.5 text-[#6b7785] font-medium">Duration</th>
                <th className="text-right px-4 py-2.5 text-[#6b7785] font-medium">Updated</th>
                <th className="text-right px-4 py-2.5 text-[#6b7785] font-medium">Failed</th>
                <th className="text-left px-4 py-2.5 text-[#6b7785] font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#4a5568]">Loading…</td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#4a5568]">
                    No sync runs yet. Click "Run Now" to trigger a sync.
                  </td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr
                    key={row.id}
                    style={{ borderBottom: "1px solid rgba(80,160,250,0.06)" }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-2.5"><SyncTypeBadge type={row.sync_type} /></td>
                    <td className="px-4 py-2.5 text-[#a0aec0]">{formatDate(row.started_at)}</td>
                    <td className="px-4 py-2.5 text-[#a0aec0]">{duration(row.started_at, row.finished_at)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-green-400 font-semibold">{row.products_updated}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={row.products_failed > 0 ? "text-red-400 font-semibold" : "text-[#4a5568]"}>
                        {row.products_failed}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[#6b7785]">{row.notes || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
