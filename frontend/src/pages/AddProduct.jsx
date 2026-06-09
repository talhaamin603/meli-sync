import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { addManualProduct } from "../api.js";

const MAX_IMAGES = 8;

// ── helpers ──────────────────────────────────────────────────────────────────

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-[#50A0FA]">*</span>}
      </label>
      {children}
    </div>
  );
}

const iStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(80,160,250,0.18)" };
const iClass  = "w-full rounded-lg px-3 py-2.5 text-sm text-[#e8ecf2] outline-none transition-colors";

// ── image URL manager ─────────────────────────────────────────────────────────

function ImageURLManager({ urls, onChange, error }) {
  // urls = array of 8 strings (some may be empty)

  function setUrl(idx, val) {
    const next = [...urls];
    next[idx] = val;
    onChange(next);
  }

  // check if a url is a duplicate of another slot
  function isDuplicate(idx) {
    const v = urls[idx].trim();
    if (!v) return false;
    return urls.some((u, i) => i !== idx && u.trim() === v);
  }

  return (
    <div>
      {/* header */}
      <div className="flex items-center justify-between mb-3">
        <label className="text-[11px] text-[#6b7785] uppercase tracking-wider">
          Images <span className="text-[#50A0FA]">*</span>
        </label>
        <span className="text-[10px] text-[#4a5568]">
          First URL is the cover photo shown in the listing
        </span>
      </div>

      {/* 2 rows × 4 cols grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: MAX_IMAGES }, (_, idx) => {
          const val  = urls[idx];
          const dup  = isDuplicate(idx);
          const hasVal = val.trim().length > 0;
          const isCover = idx === 0;

          return (
            <div key={idx} className="flex items-center gap-2">
              {/* thumbnail preview or numbered placeholder */}
              <div
                className="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center text-[10px] font-semibold"
                style={{
                  background: hasVal ? "transparent" : "rgba(80,160,250,0.06)",
                  border: isCover
                    ? "1.5px solid rgba(80,160,250,0.5)"
                    : "1.5px solid rgba(80,160,250,0.12)",
                  color: "#4a5568",
                  minWidth: 36,
                }}
              >
                {hasVal ? (
                  <img
                    src={val}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = "none"; e.target.parentNode.innerHTML = `<span style="color:#ef4444;font-size:10px">✕</span>`; }}
                  />
                ) : (
                  <span style={{ color: isCover ? "#50A0FA" : "#4a5568" }}>{idx + 1}</span>
                )}
              </div>

              {/* input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={val}
                  onChange={(e) => setUrl(idx, e.target.value)}
                  placeholder={isCover ? "Cover photo URL — https://..." : `Photo ${idx + 1} URL`}
                  className={iClass}
                  style={{
                    ...iStyle,
                    borderColor: dup
                      ? "rgba(239,68,68,0.5)"
                      : isCover && !hasVal
                      ? "rgba(80,160,250,0.35)"
                      : "rgba(80,160,250,0.18)",
                    fontSize: 11,
                    paddingTop: 7,
                    paddingBottom: 7,
                  }}
                />
                {isCover && !hasVal && (
                  <span
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(80,160,250,0.15)", color: "#50A0FA" }}
                  >
                    Cover
                  </span>
                )}
                {dup && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-red-400">
                    duplicate
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-[11px] text-red-400 mt-2">{error}</p>
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

function AddProduct() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const emptyForm = {
    asin: "", title: "", description: "",
    amazon_price_usd: "", stock: 10, is_prime: true,
  };

  const [form, setForm]       = useState(emptyForm);
  const [urls, setUrls]       = useState(Array(MAX_IMAGES).fill(""));
  const [imgError, setImgError] = useState("");
  const [message, setMessage] = useState(null);
  const [saving, setSaving]   = useState(false);

  function update(field, value) { setForm({ ...form, [field]: value }); }

  function handleUrlChange(next) {
    setUrls(next);
    setImgError(""); // clear error on edit
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.asin.trim() || !form.title.trim()) {
      setMessage({ type: "error", text: "ASIN and Title are required." });
      return;
    }

    // at least one image
    const filled = urls.map((u) => u.trim()).filter(Boolean);
    if (filled.length === 0) {
      setImgError("At least one image URL is required.");
      return;
    }

    // no duplicates
    const unique = new Set(filled);
    if (unique.size !== filled.length) {
      setImgError("Remove duplicate URLs before saving.");
      return;
    }

    setSaving(true);
    setMessage(null);
    setImgError("");

    try {
      const payload = {
        ...form,
        amazon_price_usd: parseFloat(form.amazon_price_usd) || 0,
        stock: parseInt(form.stock) || 0,
        image_url: filled[0],
        images: filled,
      };

      const result = await addManualProduct(payload);
      setMessage({
        type: result.status === "added" ? "success" : "info",
        text: `${result.status}${result.reason ? " — " + result.reason : ""}`,
      });
      if (result.status === "added") {
        setForm(emptyForm);
        setUrls(Array(MAX_IMAGES).fill(""));
      }
    } catch {
      setMessage({ type: "error", text: t("errorLoading") });
    } finally {
      setSaving(false);
    }
  }

  const msgBg = message?.type === "success" ? "rgba(34,197,94,0.12)"
              : message?.type === "error"   ? "rgba(239,68,68,0.12)"
              :                               "rgba(80,160,250,0.12)";
  const msgFg = message?.type === "success" ? "#22c55e"
              : message?.type === "error"   ? "#ef4444"
              :                               "#50A0FA";

  return (
    <div>
      <div className="fade-up mb-6">
        <div className="flex items-center gap-1.5 text-[11px] text-[#4a5568] mb-3">
          <button onClick={() => navigate("/add")} className="hover:text-[#50A0FA] transition-colors">Add Products</button>
          <span>/</span>
          <span className="text-[#6b7785]">Manually</span>
        </div>
        <h1 className="text-2xl font-medium text-white mb-1">{t("addProductTitle")}</h1>
        <p className="text-sm text-[#6b7785]">{t("addProductSubtitle")}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card rounded-xl p-6 max-w-2xl space-y-5"
        style={{ animation: "fadeUp 0.6s ease-out 0.1s backwards" }}
      >
        {/* ASIN + Price */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="ASIN" required>
            <input
              value={form.asin}
              onChange={(e) => update("asin", e.target.value)}
              placeholder="B08T8L371P"
              className={iClass + " font-mono"}
              style={iStyle}
            />
          </Field>
          <Field label={t("priceUsd")} required>
            <input
              type="number" step="0.01"
              value={form.amazon_price_usd}
              onChange={(e) => update("amazon_price_usd", e.target.value)}
              placeholder="16.99"
              className={iClass}
              style={iStyle}
            />
          </Field>
        </div>

        {/* Title */}
        <Field label={t("title")} required>
          <input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className={iClass}
            style={iStyle}
          />
        </Field>

        {/* Description */}
        <Field label={t("description")}>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            className={iClass + " resize-y"}
            style={iStyle}
          />
        </Field>

        {/* Image URLs */}
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(80,160,250,0.03)", border: "1px solid rgba(80,160,250,0.1)" }}
        >
          <ImageURLManager
            urls={urls}
            onChange={handleUrlChange}
            error={imgError}
          />
        </div>

        {/* Stock + Prime */}
        <div className="grid grid-cols-2 gap-4 items-end">
          <Field label={t("stock")}>
            <input
              type="number"
              value={form.stock}
              onChange={(e) => update("stock", e.target.value)}
              className={iClass}
              style={iStyle}
            />
          </Field>
          <div className="pb-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-[#e8ecf2]">
              <input
                type="checkbox"
                checked={form.is_prime}
                onChange={(e) => update("is_prime", e.target.checked)}
                className="w-4 h-4 accent-[#50A0FA]"
              />
              {t("primeProduct")}
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{ background: "#50A0FA", color: "#0d1117", boxShadow: "0 0 18px rgba(80,160,250,0.45)" }}
          >
            {saving ? t("saving") : t("add") + " →"}
          </button>
          {message && (
            <div className="px-3 py-2 rounded-lg text-xs" style={{ background: msgBg, color: msgFg }}>
              {message.text}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

export default AddProduct;
