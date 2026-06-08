import { useState, useEffect } from "react";
import { getMarginRules, updateMarginRules, getExchangeRate } from "../api.js";

const SHIPPING = 8;
const INSURANCE = 5;

function calcML(amazonUsd, markupPct, rate) {
  const subtotal = amazonUsd + SHIPPING + INSURANCE;
  const withMargin = subtotal * (1 + markupPct / 100);
  return { mlUsd: withMargin, mlCop: Math.round(withMargin * rate / 100) * 100 };
}

export default function MarginConfig() {
  const [rules, setRules]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState("");
  const [rate, setRate]           = useState(null);
  const [preview, setPreview]     = useState("");

  useEffect(() => {
    Promise.all([getMarginRules(), getExchangeRate()])
      .then(([rulesData, rateData]) => {
        setRules(rulesData.rules || []);
        setRate(rateData.usd_to_cop || null);
      })
      .catch(() => setError("Failed to load margin rules."))
      .finally(() => setLoading(false));
  }, []);

  function updateRule(idx, field, value) {
    setRules(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    setSaved(false);
  }

  async function handleSave() {
    for (const r of rules) {
      if (r.min_price >= r.max_price) {
        setError(`Row ${r.sort_order}: min price must be less than max price.`);
        return;
      }
      if (r.markup_pct < 0) {
        setError("Markup % cannot be negative.");
        return;
      }
    }
    setError("");
    setSaving(true);
    try {
      const res = await updateMarginRules(rules);
      setRules(res.rules || rules);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function matchingRule(price) {
    for (const r of rules) {
      if (price >= r.min_price && price < r.max_price) return r;
    }
    return rules[rules.length - 1] || null;
  }

  const previewPrice = parseFloat(preview);
  const previewRule  = !isNaN(previewPrice) && previewPrice > 0 ? matchingRule(previewPrice) : null;
  const previewCalc  = previewRule && rate ? calcML(previewPrice, previewRule.markup_pct, rate) : null;

  if (loading) return (
    <div className="flex items-center gap-3 p-4 text-[#a0adbb] text-sm">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Loading…
    </div>
  );

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6 fade-up">
        <h1 className="text-2xl font-medium text-white mb-1">Profit Margin Configuration</h1>
        <p className="text-sm text-[#6b7785]">
          Set how much to mark up the Amazon price based on price range. Markup applies to
          product + $8 shipping + $5 insurance.
        </p>
      </div>

      {/* Rules table */}
      <div className="card rounded-xl overflow-hidden mb-5">
        {/* Column headers */}
        <div className="grid grid-cols-12 gap-3 px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-[#4a5568]"
          style={{ background: "rgba(80,160,250,0.04)", borderBottom: "1px solid rgba(80,160,250,0.08)" }}>
          <div className="col-span-1">#</div>
          <div className="col-span-3">Min Price (USD)</div>
          <div className="col-span-3">Max Price (USD)</div>
          <div className="col-span-3">Markup %</div>
          <div className="col-span-2">Sample result</div>
        </div>

        {rules.map((rule, idx) => {
          const midpoint = (rule.min_price + rule.max_price) / 2;
          const sample = rate ? calcML(midpoint, rule.markup_pct, rate) : null;
          return (
            <div key={rule.id ?? idx}
              className="grid grid-cols-12 gap-3 px-5 py-3 items-center"
              style={{ borderBottom: "1px solid rgba(80,160,250,0.06)" }}
            >
              {/* Row number */}
              <div className="col-span-1">
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(80,160,250,0.1)", color: "#50A0FA" }}>
                  {rule.sort_order}
                </span>
              </div>

              {/* Min price */}
              <div className="col-span-3">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b7785] text-xs">$</span>
                  <input
                    type="number" min="0" step="1"
                    value={rule.min_price}
                    onChange={e => updateRule(idx, "min_price", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg pl-6 pr-2 py-2 text-sm outline-none"
                    style={{ background: "rgba(80,160,250,0.06)", border: "1px solid rgba(80,160,250,0.15)", color: "#e8ecf2" }}
                  />
                </div>
              </div>

              {/* Max price */}
              <div className="col-span-3">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b7785] text-xs">$</span>
                  <input
                    type="number" min="0" step="1"
                    value={rule.max_price}
                    onChange={e => updateRule(idx, "max_price", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg pl-6 pr-2 py-2 text-sm outline-none"
                    style={{ background: "rgba(80,160,250,0.06)", border: "1px solid rgba(80,160,250,0.15)", color: "#e8ecf2" }}
                  />
                </div>
              </div>

              {/* Markup % */}
              <div className="col-span-3">
                <div className="relative">
                  <input
                    type="number" min="0" step="1"
                    value={rule.markup_pct}
                    onChange={e => updateRule(idx, "markup_pct", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg pl-3 pr-7 py-2 text-sm outline-none"
                    style={{ background: "rgba(80,160,250,0.06)", border: "1px solid rgba(80,160,250,0.15)", color: "#e8ecf2" }}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b7785] text-xs">%</span>
                </div>
              </div>

              {/* Sample */}
              <div className="col-span-2 text-right">
                {sample ? (
                  <div className="leading-tight">
                    <div className="text-[12px] font-bold" style={{ color: "#50A0FA" }}>
                      ${sample.mlUsd.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-[#4a5568]">
                      at ${midpoint.toFixed(0)}
                    </div>
                  </div>
                ) : <span className="text-[#4a5568] text-xs">—</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info box */}
      <div className="rounded-xl px-4 py-3 mb-5 text-[12px] text-[#6b7785] leading-relaxed"
        style={{ background: "rgba(80,160,250,0.04)", border: "1px solid rgba(80,160,250,0.1)" }}>
        <span className="font-semibold text-[#a0adbb]">Formula: </span>
        (Amazon price + $8 shipping + $5 insurance) × (1 + markup%) × exchange rate, rounded up to nearest 100 COP.
        The <span className="text-[#50A0FA]">Sample result</span> column shows the ML price in USD at the midpoint of each range.
      </div>

      {/* Price preview calculator */}
      <div className="card rounded-xl p-5 mb-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#50A0FA] mb-4">Price Calculator</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7785] text-sm">$</span>
            <input
              type="number" min="0" step="0.01"
              value={preview}
              onChange={e => setPreview(e.target.value)}
              placeholder="Enter Amazon price"
              className="rounded-lg pl-7 pr-3 py-2.5 text-sm outline-none w-52"
              style={{ background: "rgba(80,160,250,0.06)", border: "1px solid rgba(80,160,250,0.2)", color: "#e8ecf2" }}
            />
          </div>

          {previewCalc && previewRule && (
            <div className="flex items-center gap-5 flex-wrap">
              <div className="text-[11px] text-[#6b7785]">
                Rule matched: <span className="text-white font-semibold">
                  ${previewRule.min_price}–${previewRule.max_price} → {previewRule.markup_pct}% markup
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#6b7785]">ML Price:</span>
                <span className="text-lg font-black" style={{ color: "#50A0FA" }}>
                  ${previewCalc.mlUsd.toFixed(2)}
                </span>
                <span className="text-sm text-[#6b7785]">
                  / {previewCalc.mlCop.toLocaleString()} COP
                </span>
              </div>
              <div className="text-[11px] text-green-400 font-semibold">
                +${(previewCalc.mlUsd - previewPrice).toFixed(2)} profit
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg px-4 py-3 mb-4 text-sm"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving || saved}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
          style={{
            background:  saved ? "rgba(34,197,94,0.15)" : "#50A0FA",
            color:       saved ? "#22c55e" : "#0d1117",
            border:      saved ? "1px solid rgba(34,197,94,0.4)" : "none",
            boxShadow:   saving || saved ? "none" : "0 0 18px rgba(80,160,250,0.45)",
          }}>
          {saved ? "Saved!" : saving ? "Saving…" : "Save Rules"}
        </button>
      </div>
    </div>
  );
}
