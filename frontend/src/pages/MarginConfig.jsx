import { useState, useEffect } from "react";
import { getMarginRules, updateMarginRules, getExchangeRate, recalculatePrices } from "../api.js";
import { calcPrice, calcML, SHIPPING, INSURANCE } from "../utils/pricing.js";

export default function MarginConfig() {
  const [rules, setRules]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState("");
  const [rate, setRate]           = useState(null);
  const [preview, setPreview]     = useState("");
  const [confirm, setConfirm]     = useState(null); // { type: "add", afterIdx } | { type: "remove", idx }
  const [repricing, setRepricing] = useState(false);
  const [repriceDone, setRepriceDone] = useState(null); // number of products updated

  useEffect(() => {
    Promise.all([getMarginRules(), getExchangeRate()])
      .then(([rulesData, rateData]) => {
        setRules(rulesData.rules || []);
        setRate(rateData.usd_to_cop || null);
      })
      .catch(() => setError("Failed to load margin rules."))
      .finally(() => setLoading(false));
  }, []);

  function updateRule(idx, field, rawValue) {
    // Only allow empty string or non-negative whole numbers
    if (rawValue !== "" && !/^\d+$/.test(rawValue)) return;
    setRules(prev => {
      let next = prev.map((r, i) => i === idx ? { ...r, [field]: rawValue } : r);
      // When max of a row is set, auto-fill next row's min to max+1 to prevent gaps
      const num = parseInt(rawValue, 10);
      if (field === "max_price" && !isNaN(num) && rawValue !== "" && idx + 1 < next.length) {
        next = next.map((r, i) => i === idx + 1 ? { ...r, min_price: String(num + 1) } : r);
      }
      return next;
    });
    setSaved(false);
  }

  function addRule(afterIdx) {
    setRules(prev => {
      const after = prev[afterIdx];
      const mn = parseFloat(after?.min_price) || 0;
      const mx = parseFloat(after?.max_price);
      // split current row at midpoint
      const splitPoint = (!isNaN(mx) && mx > mn) ? Math.floor((mn + mx) / 2) : null;
      const newMin = splitPoint !== null ? splitPoint + 1 : (!isNaN(mx) ? Math.floor(mx) + 1 : mn + 1);
      const newRule = {
        id: undefined,
        sort_order: afterIdx + 2,
        min_price:  String(newMin),
        max_price:  "",
        markup_pct: "",
      };
      const next = prev.map((r, i) =>
        i === afterIdx && splitPoint !== null ? { ...r, max_price: String(splitPoint) } : r
      );
      next.splice(afterIdx + 1, 0, newRule);
      return next.map((r, i) => ({ ...r, sort_order: i + 1 }));
    });
    setSaved(false);
  }

  function removeRule(idx) {
    setRules(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sort_order: i + 1 })));
    setSaved(false);
  }

  async function handleSave() {
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      const mn = parseFloat(r.min_price) || 0;
      const mx = parseFloat(r.max_price) || 0;
      const mk = parseFloat(r.markup_pct) || 0;
      if (mn >= mx) {
        setError(`Row ${r.sort_order}: min price must be less than max price.`);
        return;
      }
      if (mk < 0) {
        setError("Markup % cannot be negative.");
        return;
      }
      if (i > 0) {
        const prevMax = parseInt(rules[i - 1].max_price, 10) || 0;
        if (mn !== prevMax + 1) {
          setError(`Row ${r.sort_order}: min must be exactly ${prevMax + 1} — no gaps between ranges are allowed.`);
          return;
        }
      }
    }
    if (Object.keys(minErrors).length > 0 || Object.keys(maxErrors).length > 0) {
      setError("Please fix the highlighted errors before saving.");
      return;
    }
    setError("");
    setSaving(true);
    const coerced = rules.map(r => ({
      ...r,
      min_price:  parseFloat(r.min_price)  || 0,
      max_price:  parseFloat(r.max_price)  || 0,
      markup_pct: parseFloat(r.markup_pct) || 0,
    }));
    try {
      const res = await updateMarginRules(coerced);
      setRules(res.rules || rules);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const previewPrice = parseFloat(preview);
  const previewCalc  = !isNaN(previewPrice) && previewPrice > 0 && rate ? calcPrice(previewPrice, rules, rate) : null;

  if (loading) return (
    <div className="flex items-center gap-3 p-4 text-[#a0adbb] text-sm">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Loading…
    </div>
  );

  // Inline per-row errors derived from current state
  const minErrors = {};
  const maxErrors = {};
  rules.forEach((r, idx) => {
    // min must be exactly previous row's max + 1 (no gaps allowed)
    if (idx > 0) {
      const prevMax = parseInt(rules[idx - 1].max_price, 10);
      const thisMin = parseInt(r.min_price, 10);
      if (!isNaN(prevMax) && !isNaN(thisMin) && thisMin !== prevMax + 1) {
        minErrors[idx] = `Must be exactly ${prevMax + 1} — gaps between ranges are not allowed`;
      }
    }
    // max must be greater than same row's min
    const mn = parseFloat(r.min_price);
    const mx = parseFloat(r.max_price);
    if (r.max_price !== "" && !isNaN(mn) && !isNaN(mx) && mx <= mn) {
      maxErrors[idx] = `Must be greater than min (${mn})`;
    }
  });

  function handleConfirm() {
    if (!confirm) return;
    if (confirm.type === "add") addRule(confirm.afterIdx);
    else removeRule(confirm.idx);
    setConfirm(null);
  }

  return (
    <div className="max-w-3xl">
      {/* Confirmation modal */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setConfirm(null)}
        >
          <div
            className="rounded-2xl p-6 w-80"
            style={{ background: "#0f1623", border: `1px solid ${confirm.type === "remove" ? "rgba(239,68,68,0.35)" : "rgba(80,160,250,0.35)"}`, boxShadow: `0 0 40px ${confirm.type === "remove" ? "rgba(239,68,68,0.12)" : "rgba(80,160,250,0.12)"}` }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-white font-semibold text-sm mb-1">
              {confirm.type === "add" ? "Add new range?" : "Remove this range?"}
            </p>
            <p className="text-[#6b7785] text-xs mb-5">
              {confirm.type === "add"
                ? "A new empty price range will be inserted after this row."
                : "This price range will be permanently removed."}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirm(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: "rgba(80,160,250,0.06)", border: "1px solid rgba(80,160,250,0.18)", color: "#a0adbb" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{
                  background: confirm.type === "remove" ? "rgba(239,68,68,0.85)" : "#50A0FA",
                  color: "#fff",
                  border: "none",
                }}
              >
                {confirm.type === "add" ? "Yes, Add" : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 fade-up">
        <h1 className="text-2xl font-medium text-white mb-1">Profit Margin Configuration</h1>
        <p className="text-sm text-[#6b7785]">
          Set markup per price range. Markup is applied to the Amazon price first, then $8 shipping + $5 insurance are added on top.
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
          <div className="col-span-2">Markup %</div>
          <div className="col-span-2">Sample result</div>
          <div className="col-span-1"></div>
        </div>

        {rules.map((rule, idx) => {
          const midpoint = ((parseFloat(rule.min_price) || 0) + (parseFloat(rule.max_price) || 0)) / 2;
          const sample = rate ? calcML(midpoint, parseFloat(rule.markup_pct) || 0, rate) : null;
          return (
            <div key={rule.id ?? `row-${idx}`}>
              {/* Row */}
              <div
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
                      onChange={e => updateRule(idx, "min_price", e.target.value)}
                      onKeyDown={e => { if (["-", "+", "e", "E", "."].includes(e.key)) e.preventDefault(); }}
                      className="w-full rounded-lg pl-6 pr-2 py-2 text-sm outline-none"
                      style={{
                        background: "rgba(80,160,250,0.06)",
                        border: `1px solid ${minErrors[idx] ? "rgba(239,68,68,0.5)" : "rgba(80,160,250,0.15)"}`,
                        color: "#e8ecf2",
                      }}
                    />
                  </div>
                  {minErrors[idx] && (
                    <p className="text-[10px] mt-1 leading-tight" style={{ color: "#ef4444" }}>
                      {minErrors[idx]}
                    </p>
                  )}
                </div>

                {/* Max price */}
                <div className="col-span-3">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6b7785] text-xs">$</span>
                    <input
                      type="number" min="0" step="1"
                      value={rule.max_price}
                      onChange={e => updateRule(idx, "max_price", e.target.value)}
                      onKeyDown={e => { if (["-", "+", "e", "E", "."].includes(e.key)) e.preventDefault(); }}
                      className="w-full rounded-lg pl-6 pr-2 py-2 text-sm outline-none"
                      style={{
                        background: "rgba(80,160,250,0.06)",
                        border: `1px solid ${maxErrors[idx] ? "rgba(239,68,68,0.5)" : "rgba(80,160,250,0.15)"}`,
                        color: "#e8ecf2",
                      }}
                    />
                  </div>
                  {maxErrors[idx] && (
                    <p className="text-[10px] mt-1 leading-tight" style={{ color: "#ef4444" }}>
                      {maxErrors[idx]}
                    </p>
                  )}
                </div>

                {/* Markup % */}
                <div className="col-span-2">
                  <div className="relative">
                    <input
                      type="number" min="0" step="1"
                      value={rule.markup_pct}
                      onChange={e => updateRule(idx, "markup_pct", e.target.value)}
                      onKeyDown={e => { if (["-", "+", "e", "E", "."].includes(e.key)) e.preventDefault(); }}
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

                {/* Delete */}
                <div className="col-span-1 flex justify-center">
                  {rules.length > 1 && (
                    <button
                      onClick={() => setConfirm({ type: "remove", idx })}
                      title="Remove this range"
                      className="w-6 h-6 rounded flex items-center justify-center transition-all hover:scale-110"
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Insert row button */}
              <div className="relative flex items-center justify-center" style={{ height: 18 }}>
                <div className="absolute inset-x-0" style={{ top: "50%", height: 1, background: "rgba(80,160,250,0.06)" }} />
                <button
                  onClick={() => setConfirm({ type: "add", afterIdx: idx })}
                  title="Add range after this row"
                  className="relative z-10 flex items-center justify-center rounded-full font-bold transition-all hover:scale-125"
                  style={{ width: 18, height: 18, fontSize: 14, lineHeight: 1, background: "rgba(80,160,250,0.15)", border: "1px solid rgba(80,160,250,0.35)", color: "#50A0FA" }}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info box */}
      <div className="rounded-xl px-4 py-3 mb-5 text-[12px] text-[#6b7785] leading-relaxed"
        style={{ background: "rgba(80,160,250,0.04)", border: "1px solid rgba(80,160,250,0.1)" }}>
        <div style={{ lineHeight: 1.8 }}>
          <div><span className="text-white">Step 1:</span> Amazon price + markup price = <span className="text-[#50A0FA]">selling price</span></div>
          <div><span className="text-white">Step 2:</span> Selling price + $8 shipping + $5 insurance = <span className="text-[#50A0FA]">final price (USD)</span></div>
          <div><span className="text-white">Step 3:</span> Final price (USD) × exchange rate = <span className="text-[#50A0FA]">final price (COP)</span></div>
          <div className="mt-1 text-[11px]">Example: $20 Amazon + 100% markup → $40 + $8 + $5 = <span className="text-white font-semibold">$53 USD</span></div>
        </div>
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

          {previewCalc && (
            <div className="flex flex-col gap-2 mt-3 w-full">
              {/* Rule matched */}
              <div className="text-[11px] text-[#6b7785]">
                Rule matched: <span className="text-white font-semibold">
                  ${previewCalc.rule.min_price}–${previewCalc.rule.max_price} → {previewCalc.rule.markup_pct}% markup
                </span>
              </div>
              {/* Breakdown */}
              <div className="rounded-lg px-4 py-3 text-[12px] leading-relaxed"
                style={{ background: "rgba(80,160,250,0.04)", border: "1px solid rgba(80,160,250,0.1)" }}>
                <div className="grid gap-1" style={{ gridTemplateColumns: "auto 1fr" }}>
                  <span className="text-[#6b7785] pr-4">Amazon price</span>
                  <span className="text-white">${previewPrice.toFixed(2)}</span>

                  <span className="text-[#6b7785] pr-4">Markup ({previewCalc.rule.markup_pct}%)</span>
                  <span className="text-green-400 font-semibold">+${previewCalc.profit.toFixed(2)}</span>

                  <span className="text-[#6b7785] pr-4">Shipping</span>
                  <span className="text-[#a0adbb]">+${SHIPPING.toFixed(2)}</span>

                  <span className="text-[#6b7785] pr-4">Insurance</span>
                  <span className="text-[#a0adbb]">+${INSURANCE.toFixed(2)}</span>

                  <div className="col-span-2 my-1" style={{ borderTop: "1px solid rgba(80,160,250,0.15)" }} />

                  <span className="text-white font-semibold pr-4">Final price (USD)</span>
                  <span className="font-bold" style={{ color: "#50A0FA" }}>${previewCalc.mlUsd.toFixed(2)}</span>

                  <span className="text-white font-semibold pr-4">Final price (COP)</span>
                  <span className="font-bold" style={{ color: "#50A0FA" }}>{previewCalc.mlCop.toLocaleString()}</span>

                  <div className="col-span-2 my-1" style={{ borderTop: "1px solid rgba(80,160,250,0.15)" }} />

                  <span className="text-green-400 font-bold pr-4">Our profit</span>
                  <span className="text-green-400 font-bold">+${previewCalc.profit.toFixed(2)}</span>
                </div>
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

      {/* Save + Reprice */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Reprice all products */}
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              setRepricing(true);
              setRepriceDone(null);
              try {
                const res = await recalculatePrices();
                setRepriceDone(res.updated ?? 0);
                setTimeout(() => setRepriceDone(null), 4000);
              } catch {
                setError("Failed to recalculate prices. Please try again.");
              } finally {
                setRepricing(false);
              }
            }}
            disabled={repricing}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            style={{
              background: repricing ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.12)",
              color: "#f59e0b",
              border: "1px solid rgba(245,158,11,0.3)",
            }}
          >
            {repricing ? "Recalculating…" : "Apply Rules to All Products"}
          </button>
          {repriceDone !== null && (
            <span className="text-[12px] font-semibold text-green-400">
              ✓ {repriceDone} products updated
            </span>
          )}
        </div>

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
