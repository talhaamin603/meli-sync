import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { addManualProduct, getCategories } from "../api.js";

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

// Returns true if the string is a valid http/https URL
function isValidHttpUrl(str) {
  try {
    const { protocol } = new URL(str);
    return protocol === "http:" || protocol === "https:";
  } catch { return false; }
}

// ── image URL manager ─────────────────────────────────────────────────────────

function ImageURLManager({ urls, onChange, onLoadErrors, error }) {
  const [loadFailed, setLoadFailed] = useState(new Set());

  function markFailed(idx) {
    setLoadFailed(prev => {
      const next = new Set(prev);
      next.add(idx);
      onLoadErrors(next);
      return next;
    });
  }

  function markOk(idx) {
    setLoadFailed(prev => {
      if (!prev.has(idx)) return prev;
      const next = new Set(prev);
      next.delete(idx);
      onLoadErrors(next);
      return next;
    });
  }

  function setUrl(idx, val) {
    const next = [...urls];
    next[idx] = val;
    onChange(next);
    // clear error for this slot when user clears/edits the field
    if (!val.trim()) markOk(idx);
  }

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
          const val     = urls[idx];
          const trimmed = val.trim();
          const dup     = isDuplicate(idx);
          const hasVal  = trimmed.length > 0;
          const isCover = idx === 0;
          const badUrl  = hasVal && !isValidHttpUrl(trimmed);
          const imgFail = loadFailed.has(idx);
          const isError = dup || badUrl || imgFail;

          return (
            <div key={idx}>
              <div className="flex items-center gap-2">
                {/* thumbnail preview or numbered placeholder */}
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center text-[10px] font-semibold"
                  style={{
                    background: hasVal ? "transparent" : "rgba(80,160,250,0.06)",
                    border: isError
                      ? "1.5px solid rgba(239,68,68,0.6)"
                      : isCover
                      ? "1.5px solid rgba(80,160,250,0.5)"
                      : "1.5px solid rgba(80,160,250,0.12)",
                    minWidth: 36,
                  }}
                >
                  {hasVal && !badUrl ? (
                    <img
                      src={trimmed}
                      alt=""
                      className="w-full h-full object-cover"
                      onLoad={() => markOk(idx)}
                      onError={() => markFailed(idx)}
                    />
                  ) : imgFail || badUrl ? (
                    <span style={{ color: "#ef4444", fontSize: 12 }}>✕</span>
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
                      borderColor: isError
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
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-red-400">duplicate</span>
                  )}
                </div>
              </div>

              {/* per-slot error hint */}
              {badUrl && (
                <p className="text-[10px] text-red-400 mt-0.5 ml-11">Must be a valid https:// URL</p>
              )}
              {!badUrl && imgFail && (
                <p className="text-[10px] text-red-400 mt-0.5 ml-11">URL did not load as an image</p>
              )}
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

// ── Category picker ───────────────────────────────────────────────────────────

const selStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(80,160,250,0.18)",
  color: "#e8ecf2",
  cursor: "pointer",
  appearance: "none",
};
const selDisabledStyle = {
  ...selStyle,
  opacity: 0.4,
  cursor: "not-allowed",
  color: "#4a5568",
};

function CategoryPicker({ categories, mainId, subId, onMain, onSub }) {
  const mains = categories.filter(c => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name));
  const subs  = mainId
    ? categories.filter(c => String(c.parent_id) === String(mainId)).sort((a, b) => a.name.localeCompare(b.name))
    : [];
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Main Category">
        <select
          value={mainId} onChange={e => { onMain(e.target.value); onSub(""); }}
          className={iClass} style={selStyle}
        >
          <option value="" disabled style={{ background: "#0f1623", color: "#4a5568" }}>Select main category</option>
          {mains.map(c => <option key={c.id} value={c.id} style={{ background: "#0f1623" }}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Subcategory">
        <select
          value={subId} onChange={e => onSub(e.target.value)}
          disabled={!mainId}
          className={iClass}
          style={mainId ? selStyle : selDisabledStyle}
        >
          <option value="" disabled style={{ background: "#0f1623", color: "#4a5568" }}>Select subcategory</option>
          {subs.map(c => <option key={c.id} value={c.id} style={{ background: "#0f1623" }}>{c.name}</option>)}
        </select>
      </Field>
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
    brand: "", rating: "", total_ratings: "",
  };

  const [form, setForm]       = useState(emptyForm);
  const [urls, setUrls]           = useState(Array(MAX_IMAGES).fill(""));
  const [imgError, setImgError]   = useState("");
  const [imgLoadErrors, setImgLoadErrors] = useState(new Set());
  const [message, setMessage] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [categories, setCategories] = useState([]);
  const [mainId, setMainId]   = useState("");
  const [subId, setSubId]     = useState("");

  useEffect(() => { getCategories().then(setCategories).catch(() => {}); }, []);

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

    // all filled URLs must be valid http/https
    const badFormat = filled.filter(u => !isValidHttpUrl(u));
    if (badFormat.length > 0) {
      setImgError("All image URLs must start with https:// or http://");
      return;
    }

    // none may have failed to load as an image
    if (imgLoadErrors.size > 0) {
      setImgError("One or more URLs did not load as images. Fix or remove them.");
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
      const categoryId = subId ? parseInt(subId) : mainId ? parseInt(mainId) : undefined;
      const payload = {
        ...form,
        amazon_price_usd: parseFloat(form.amazon_price_usd) || 0,
        stock: parseInt(form.stock) || 0,
        rating: form.rating !== "" ? parseFloat(form.rating) : 0,
        total_ratings: form.total_ratings !== "" ? parseInt(form.total_ratings) : 0,
        image_url: filled[0],
        images: filled,
        ...(categoryId ? { category_id: categoryId } : {}),
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

        {/* Brand + Rating */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <Field label="Brand Name">
              <input
                value={form.brand}
                onChange={(e) => update("brand", e.target.value)}
                placeholder="e.g. Sony"
                className={iClass}
                style={iStyle}
              />
            </Field>
          </div>
          <Field label="Rating (0–5)">
            <input
              type="number" step="0.1" min="0" max="5"
              value={form.rating}
              onChange={(e) => update("rating", e.target.value)}
              placeholder="4.5"
              className={iClass}
              style={iStyle}
            />
          </Field>
          <Field label="Total Ratings">
            <input
              type="number" min="0"
              value={form.total_ratings}
              onChange={(e) => update("total_ratings", e.target.value)}
              placeholder="2 712"
              className={iClass}
              style={iStyle}
            />
          </Field>
        </div>

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

        {/* Category */}
        <CategoryPicker
          categories={categories}
          mainId={mainId} subId={subId}
          onMain={setMainId} onSub={setSubId}
        />

        {/* Image URLs */}
        <div
          className="rounded-xl p-4"
          style={{ background: "rgba(80,160,250,0.03)", border: "1px solid rgba(80,160,250,0.1)" }}
        >
          <ImageURLManager
            urls={urls}
            onChange={handleUrlChange}
            onLoadErrors={setImgLoadErrors}
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
