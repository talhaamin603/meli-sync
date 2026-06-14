import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getProducts, updateProduct, getCategories, getBlacklist } from "../api.js";

const SLOTS = 8;

// ── helpers ────────────────────────────────────────────────────────────────

function parseImages(product) {
  let imgs = product.images;
  if (Array.isArray(imgs)) {
    const f = imgs.filter(Boolean);
    if (f.length) return f;
  }
  if (typeof imgs === "string" && imgs.trim()) {
    try {
      const parsed = JSON.parse(imgs);
      if (Array.isArray(parsed)) {
        const f = parsed.filter(Boolean);
        if (f.length) return f;
      }
    } catch (_) {}
  }
  return product.image_url ? [product.image_url] : [];
}

function toSlots(imgs) {
  // always 8 elements, padding with ""
  return Array(SLOTS).fill("").map((_, i) => imgs[i] || "");
}

// ── Image grid with drag-and-drop ──────────────────────────────────────────

function ImageGrid({ slots, onChange }) {
  const { t } = useTranslation();
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  function setUrl(idx, val) {
    const next = [...slots];
    next[idx] = val;
    onChange(next);
  }

  function onDragStart(e, idx) {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e, idx) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overIdx !== idx) setOverIdx(idx);
  }

  function onDrop(e, targetIdx) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null); setOverIdx(null); return;
    }
    const next = [...slots];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    onChange(next);
    setDragIdx(null); setOverIdx(null);
  }

  function onDragEnd() { setDragIdx(null); setOverIdx(null); }

  return (
    <div className="grid grid-cols-4 gap-3">
      {slots.map((url, idx) => {
        const hasImg   = Boolean(url.trim());
        const isCover  = idx === 0;
        const isDragging = dragIdx === idx;
        const isOver     = overIdx === idx && dragIdx !== idx;

        return (
          <div key={idx} className="flex flex-col gap-1.5">
            {/* ── image box ── */}
            <div
              draggable
              onDragStart={(e) => onDragStart(e, idx)}
              onDragOver={(e)  => onDragOver(e, idx)}
              onDrop={(e)      => onDrop(e, idx)}
              onDragEnd={onDragEnd}
              className="relative aspect-square rounded-xl overflow-hidden select-none"
              style={{
                background:   hasImg ? "transparent" : "rgba(80,160,250,0.03)",
                border:       isOver  ? "2px solid #50A0FA"
                            : isCover ? "2px solid rgba(80,160,250,0.45)"
                            :           "2px solid rgba(80,160,250,0.1)",
                opacity:      isDragging ? 0.35 : 1,
                cursor:       "grab",
                boxShadow:    isOver ? "0 0 0 4px rgba(80,160,250,0.18)" : "none",
                transition:   "border-color 0.15s, box-shadow 0.15s, opacity 0.15s",
              }}
            >
              {hasImg ? (
                <img
                  src={url}
                  alt={`Photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling && (e.target.nextSibling.style.display = "flex");
                  }}
                />
              ) : null}

              {/* empty-slot placeholder */}
              {!hasImg && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(80,160,250,0.2)" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="3"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                  <span className="text-[10px]" style={{ color: "rgba(80,160,250,0.2)" }}>
                    {t("photoN", { n: idx + 1 })}
                  </span>
                </div>
              )}

              {/* cover badge */}
              {isCover && (
                <div
                  className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md z-10"
                  style={{ background: "rgba(80,160,250,0.92)", color: "#0d1117" }}
                >
                  {t("coverBadge")}
                </div>
              )}

              {/* drag grip */}
              <div
                className="absolute bottom-1.5 right-1.5 opacity-30 hover:opacity-70 transition-opacity z-10"
                style={{ color: "#50A0FA", fontSize: 14, lineHeight: 1, userSelect: "none" }}
              >
                ⠿
              </div>
            </div>

            {/* ── url input ── */}
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(idx, e.target.value)}
              placeholder={isCover ? t("coverPhotoUrl") : t("photoNUrl", { n: idx + 1 })}
              className="w-full rounded-lg px-2.5 py-1.5 text-[11px] outline-none transition-colors"
              style={{
                background:   "rgba(80,160,250,0.04)",
                border:       isCover && !url.trim()
                                ? "1px solid rgba(80,160,250,0.3)"
                                : "1px solid rgba(80,160,250,0.12)",
                color:        "#a0adbb",
                fontFamily:   "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(80,160,250,0.45)")}
              onBlur={(e)  => (e.target.style.borderColor = isCover && !url.trim()
                ? "rgba(80,160,250,0.3)" : "rgba(80,160,250,0.12)")}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── sub-components ─────────────────────────────────────────────────────────

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label className="text-[11px] uppercase tracking-wider font-medium text-[#6b7785]">{label}</label>
        {hint && <span className="text-[10px] text-[#4a5568]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function EInput({ value, onChange, type = "text", step, min, readOnly, placeholder }) {
  return (
    <input
      type={type} step={step} min={min} readOnly={readOnly}
      placeholder={placeholder} value={value} onChange={onChange}
      className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
      style={{
        background: readOnly ? "rgba(80,160,250,0.02)" : "rgba(80,160,250,0.06)",
        border: "1px solid rgba(80,160,250,0.15)",
        color: readOnly ? "#6b7785" : "#e8ecf2",
        cursor: readOnly ? "default" : "text",
      }}
    />
  );
}

function ETextarea({ value, onChange, rows = 4 }) {
  return (
    <textarea
      rows={rows} value={value} onChange={onChange}
      className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
      style={{ background: "rgba(80,160,250,0.06)", border: "1px solid rgba(80,160,250,0.15)", color: "#e8ecf2" }}
    />
  );
}

function ESelect({ value, onChange, children, disabled, placeholder }) {
  return (
    <select
      value={value} onChange={onChange} disabled={disabled}
      className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors appearance-none"
      style={{
        background: disabled ? "rgba(80,160,250,0.02)" : "rgba(80,160,250,0.06)",
        border: "1px solid rgba(80,160,250,0.15)",
        color: value ? "#e8ecf2" : "#4a5568",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <option value="" disabled style={{ background: "#0f1623", color: "#4a5568" }}>
        {placeholder || "—"}
      </option>
      {children}
    </select>
  );
}

// ── blacklist helpers ──────────────────────────────────────────────────────

function wordBoundaryPattern(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`;
}

function findMatchedTerms(title, description, allTerms) {
  if (!allTerms.length) return [];
  const matched = [];
  for (const { value } of allTerms) {
    const re = new RegExp(wordBoundaryPattern(value), "i");
    if (re.test(title || "") || re.test(description || "")) {
      matched.push(value);
    }
  }
  return matched;
}

// Splits text and wraps matched terms in <mark>. overlay=true → mark text is
// transparent so only the background colour shows through an overlaid input.
function HighlightAllTerms({ text, terms, overlay = false }) {
  if (!text || !terms.length) return <>{text}</>;
  const pattern = terms.map(t => `(${wordBoundaryPattern(t)})`).join("|");
  const parts = text.split(new RegExp(pattern, "gi"));
  const lcTerms = new Set(terms.map(t => t.toLowerCase()));
  return (
    <>
      {parts.map((part, i) =>
        part && lcTerms.has(part.toLowerCase()) ? (
          <mark key={i} style={overlay ? {
            background: "rgba(239,68,68,0.45)",
            color: "transparent",
            borderRadius: "3px",
          } : {
            background: "rgba(239,68,68,0.3)", color: "#ff6b6b",
            borderRadius: "3px", padding: "1px 4px", fontWeight: 700,
          }}>{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// Shared text metrics — must match the input/textarea exactly so highlights align
const MIRROR_FONT = {
  fontFamily: "inherit",
  fontSize: "0.875rem",
  lineHeight: "1.5",
  letterSpacing: "normal",
  padding: "8px 12px",
};

function HighlightedInput({ value, onChange, placeholder, terms = [] }) {
  const [focused, setFocused] = useState(false);
  const [scrollLeft, setScrollLeft] = useState(0);
  const active = terms.length > 0;
  const borderColor = focused ? "rgba(80,160,250,0.45)" : "rgba(80,160,250,0.15)";
  return (
    <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(80,160,250,0.06)",
        border: `1px solid ${borderColor}`,
        borderRadius: "8px",
        pointerEvents: "none",
        transition: "border-color 0.15s",
      }} />
      {active && (
        <div aria-hidden="true" style={{
          ...MIRROR_FONT,
          position: "absolute",
          top: "1px", bottom: "1px", left: "1px",
          whiteSpace: "pre",
          color: "transparent",
          transform: `translateX(-${scrollLeft}px)`,
          pointerEvents: "none",
        }}>
          <HighlightAllTerms text={value} terms={terms} overlay />
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onScroll={(e) => setScrollLeft(e.target.scrollLeft)}
        style={{
          ...MIRROR_FONT,
          position: "relative",
          width: "100%",
          background: "transparent",
          border: "1px solid transparent",
          borderRadius: "8px",
          color: "#e8ecf2",
          outline: "none",
          zIndex: 1,
        }}
      />
    </div>
  );
}

function HighlightedTextarea({ value, onChange, rows = 4, terms = [] }) {
  const [focused, setFocused] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const active = terms.length > 0;
  const borderColor = focused ? "rgba(80,160,250,0.45)" : "rgba(80,160,250,0.15)";
  return (
    <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(80,160,250,0.06)",
        border: `1px solid ${borderColor}`,
        borderRadius: "8px",
        pointerEvents: "none",
        transition: "border-color 0.15s",
      }} />
      {active && (
        <div aria-hidden="true" style={{
          ...MIRROR_FONT,
          position: "absolute",
          top: `${1 - scrollTop}px`,
          left: "1px", right: "1px",
          color: "transparent",
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
          wordBreak: "break-word",
          pointerEvents: "none",
        }}>
          <HighlightAllTerms text={value} terms={terms} overlay />
        </div>
      )}
      <textarea
        rows={rows}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onScroll={(e) => setScrollTop(e.target.scrollTop)}
        style={{
          ...MIRROR_FONT,
          position: "relative",
          width: "100%",
          background: "transparent",
          border: "1px solid transparent",
          borderRadius: "8px",
          color: "#e8ecf2",
          outline: "none",
          resize: "none",
          zIndex: 1,
          display: "block",
        }}
      />
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "#0f1623", border: "1px solid rgba(80,160,250,0.1)" }}>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-[#50A0FA] mb-4">{title}</h3>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const { t } = useTranslation();
  const styles = {
    published: { bg: "rgba(34,197,94,0.15)",  fg: "#22c55e", border: "rgba(34,197,94,0.3)",  label: t("publishedLabel") },
    blocked:   { bg: "rgba(239,68,68,0.15)",  fg: "#ef4444", border: "rgba(239,68,68,0.3)",  label: t("blocked") },
    failed:    { bg: "rgba(245,158,11,0.15)", fg: "#f59e0b", border: "rgba(245,158,11,0.3)", label: t("failedStatusLabel") },
    pending:   { bg: "rgba(80,160,250,0.15)", fg: "#50A0FA", border: "rgba(80,160,250,0.3)", label: t("pending") },
  };
  const s = styles[status] || styles.pending;
  return (
    <span className="px-2.5 py-1 rounded-md text-xs font-medium border"
      style={{ background: s.bg, color: s.fg, borderColor: s.border }}>
      {s.label}
    </span>
  );
}

// ── main page ──────────────────────────────────────────────────────────────

export default function ProductEdit() {
  const { t }      = useTranslation();
  const { id }     = useParams();
  const location   = useLocation();
  const navigate   = useNavigate();

  const [product, setProduct] = useState(location.state?.product || null);
  const [loading, setLoading] = useState(!location.state?.product);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [saved, setSaved]     = useState(false);

  const [title, setTitle]               = useState("");
  const [description, setDescription]   = useState("");
  const [whatsInBox, setWhatsInBox]     = useState("");
  const [amazonPrice, setAmazonPrice]   = useState("");
  const [stock, setStock]               = useState("");
  const [initialStock, setInitialStock] = useState("");
  const [timesOrdered, setTimesOrdered] = useState("");
  const [slots, setSlots]               = useState(Array(SLOTS).fill(""));

  const [categories, setCategories]       = useState([]);
  const [selectedMainId, setSelectedMainId] = useState("");
  const [selectedSubId, setSelectedSubId]   = useState("");
  const [allTerms, setAllTerms]             = useState([]);

  const matchedTerms = useMemo(
    () => findMatchedTerms(title, description, allTerms),
    [title, description, allTerms]
  );

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
    getBlacklist().then(data => {
      const list = Array.isArray(data) ? data : (data.rules || data.terms || data.items || []);
      setAllTerms(list);
    }).catch(() => {});

    if (product) { initForm(product); return; }
    setLoading(true);
    getProducts()
      .then((data) => {
        const list  = Array.isArray(data) ? data : (data.products || []);
        const found = list.find((p) => String(p.id) === String(id));
        if (!found) { setError(t("productNotFound")); return; }
        setProduct(found);
        initForm(found);
      })
      .catch(() => setError(t("failedToLoadProduct")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, []);

  function initForm(p) {
    setTitle(p.title || "");
    setDescription(p.description || "");
    setWhatsInBox(p.whats_in_the_box || "");
    setAmazonPrice(p.amazon_price_usd ?? "");
    setStock(p.stock ?? "");
    setInitialStock(p.initial_stock ?? "");
    setTimesOrdered(p.times_ordered ?? 0);
    setSlots(toSlots(parseImages(p)));
    if (p.category_id) {
      // resolved once categories load — see effect below
      setSelectedSubId(String(p.category_id));
    }
  }

  // Once categories load, figure out the matching main category
  useEffect(() => {
    if (!categories.length || !selectedSubId) return;
    const sub = categories.find((c) => String(c.id) === String(selectedSubId));
    if (sub?.parent_id) {
      setSelectedMainId(String(sub.parent_id));
    } else if (sub && !sub.parent_id) {
      // category_id points to a main category directly
      setSelectedMainId(String(sub.id));
      setSelectedSubId("");
    }
  // eslint-disable-next-line
  }, [categories]);

  async function handleSave() {
    if (!title.trim()) { setError(t("titleRequired")); return; }
    const filledImages = slots.filter(Boolean);
    setSaving(true); setError("");
    try {
      const resolvedCategoryId = selectedSubId
        ? parseInt(selectedSubId, 10)
        : selectedMainId
          ? parseInt(selectedMainId, 10)
          : undefined;
      await updateProduct(product.id, {
        title:            title.trim(),
        description:      description.trim(),
        whats_in_the_box: whatsInBox.trim() || null,
        images:           filledImages,
        amazon_price_usd: amazonPrice !== "" ? parseFloat(amazonPrice) : undefined,
        stock:            stock !== "" ? parseInt(stock, 10) : undefined,
        initial_stock:    initialStock !== "" ? parseInt(initialStock, 10) : undefined,
        times_ordered:    timesOrdered !== "" ? parseInt(timesOrdered, 10) : undefined,
        category_id:      resolvedCategoryId,
      });
      setSaved(true);
      setTimeout(() => navigate("/products"), 900);
    } catch (e) {
      const detail = e?.response?.data?.detail;
      if (detail && typeof detail === "object" && detail.code === "blacklisted") {
        setError(t("blacklistedWordError", { term: detail.term }));
      } else {
        setError((typeof detail === "string" && detail) || t("saveFailed"));
      }
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-[#6b7785] text-sm">{t("loadingProduct")}</div>
  );
  if (error && !product) return <div className="text-red-400 text-sm p-6">{error}</div>;

  const cop = product?.converted_price_cop;

  return (
    <div className="max-w-4xl mx-auto pb-12">

      {/* header */}
      <div className="mb-6 fade-up">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate("/products")}
            className="text-[#6b7785] hover:text-white transition-colors text-sm">
            {t("back")}
          </button>
          <span className="text-[#2a3240]">/</span>
          <button onClick={() => navigate("/products")}
            className="text-[#6b7785] hover:text-white transition-colors text-sm">
            {t("products")}
          </button>
          <span className="text-[#2a3240]">/</span>
          <span className="text-white text-sm">{t("editLabel")}</span>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <h1 className="text-2xl font-medium text-white">{t("editProductPageTitle")}</h1>
          <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium"
            style={{ background: "rgba(80,160,250,0.12)", color: "#50A0FA", border: "1px solid rgba(80,160,250,0.25)" }}>
            {product?.asin}
          </span>
          <span className="text-[11px] text-[#4a5568]">{t("asinCannotChange")}</span>
        </div>
      </div>

      {/* ── full-width image grid ── */}
      <SectionCard title={t("productImagesTitle", { filled: slots.filter(Boolean).length, total: SLOTS })}>
        <ImageGrid slots={slots} onChange={setSlots} />
      </SectionCard>

      <div className="h-4" />

      {/* ── blocked banner ── */}
      {product?.status === "blocked" && (
        <div className="rounded-xl p-4 mb-4 flex items-start gap-3"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: "rgba(239,68,68,0.15)" }}>
            <svg width="16" height="16" fill="none" stroke="#ef4444" viewBox="0 0 24 24" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>{t("productBlockedTitle")}</p>
            <p className="text-sm mt-0.5" style={{ color: "#a0adbb" }}>
              {matchedTerms.length > 0
                ? t("productBlockedDesc", { n: matchedTerms.length, s: matchedTerms.length !== 1 ? "s" : "" })
                : t("productBlockedGeneric")}
            </p>
          </div>
        </div>
      )}

      {/* ── two-column section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* left: pricing + status */}
        <div className="space-y-4">
          <SectionCard title={t("pricingSummary")}>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#6b7785]">{t("colAmazonPrice")}</span>
                <span className="text-sm font-medium text-white">${Number(amazonPrice || 0).toFixed(2)} USD</span>
              </div>
              <div className="h-px" style={{ background: "rgba(80,160,250,0.08)" }} />
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#6b7785]">{t("mlPriceCop")}</span>
                <span className="text-sm font-semibold" style={{ color: "#50A0FA" }}>
                  {cop && cop > 0 ? Number(cop).toLocaleString() + " COP" : "— COP"}
                </span>
              </div>
              <p className="text-[10px] text-[#4a5568]">{t("copPriceHint")}</p>
            </div>
          </SectionCard>

          <SectionCard title={t("statusSection")}>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[11px] text-[#6b7785] uppercase tracking-wider mb-1">{t("currentStatus")}</p>
                <StatusBadge status={product?.status} />
              </div>
              {product?.status === "blocked" && (
                <div className="rounded-lg overflow-hidden"
                  style={{ border: "1px solid rgba(239,68,68,0.25)" }}>
                  <div className="px-2.5 py-1.5 flex items-center gap-1.5"
                    style={{ background: "rgba(239,68,68,0.12)" }}>
                    <svg width="11" height="11" fill="none" stroke="#ef4444" viewBox="0 0 24 24" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                    </svg>
                    <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "#ef4444" }}>
                      {t("blacklistedWordsTitle", { n: matchedTerms.length })}
                    </p>
                  </div>
                  {matchedTerms.length > 0 ? (
                    <div className="p-2 flex flex-wrap gap-1.5">
                      {matchedTerms.map((term, i) => (
                        <span key={i} className="font-mono text-[11px] font-bold px-2 py-0.5 rounded"
                          style={{ background: "rgba(239,68,68,0.15)", color: "#ff6b6b", border: "1px solid rgba(239,68,68,0.3)" }}>
                          {term}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="px-2.5 py-2 text-[11px]" style={{ color: "#6b7785" }}>
                      {t("loadingTerms")}
                    </p>
                  )}
                </div>
              )}
              <div>
                <p className="text-[11px] text-[#6b7785] uppercase tracking-wider mb-1">{t("mercadoLibreId")}</p>
                <p className="text-[#a0adbb] font-mono text-xs">{product?.meli_item_id || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#6b7785] uppercase tracking-wider mb-1">{t("addedLabel")}</p>
                <p className="text-[#a0adbb] text-xs">
                  {product?.created_at ? new Date(product.created_at).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t("amazonInfoSection")}>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[11px] text-[#6b7785] uppercase tracking-wider mb-1">{t("brandLabel")}</p>
                <p className="text-[#a0adbb] text-xs">{product?.amazon_category || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] text-[#6b7785] uppercase tracking-wider mb-1">{t("ratingLabel")}</p>
                <p className="text-xs text-white">
                  {product?.rating > 0
                    ? <>★ {Number(product.rating).toFixed(1)} <span className="text-[#6b7785]">/ 5</span></>
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#6b7785] uppercase tracking-wider mb-1">{t("totalRatings")}</p>
                <p className="text-xs text-[#a0adbb]">
                  {product?.total_ratings > 0 ? Number(product.total_ratings).toLocaleString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#6b7785] uppercase tracking-wider mb-1">{t("primeLabel")}</p>
                <p className="text-xs" style={{ color: product?.is_prime ? "#22c55e" : "#6b7785" }}>
                  {product?.is_prime ? t("yes") : t("no")}
                </p>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* right: form fields */}
        <div className="lg:col-span-2 space-y-4">
          <SectionCard title={t("basicInformation")}>
            <div className="space-y-4">
              <Field label="ASIN" hint={t("readOnly")}>
                <EInput value={product?.asin || ""} readOnly />
              </Field>
              <Field label={t("productTitleField")}>
                <HighlightedInput
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("productTitleField")}
                  terms={matchedTerms}
                />
              </Field>
              <Field label={t("description")}>
                <HighlightedTextarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  terms={matchedTerms}
                />
              </Field>
              <Field label={t("whatsInBoxField")}>
                <ETextarea rows={3} value={whatsInBox} onChange={(e) => setWhatsInBox(e.target.value)} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title={t("pricingSection")}>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("amazonPriceUsdField")}>
                <EInput type="number" step="0.01" min="0" value={amazonPrice}
                  onChange={(e) => setAmazonPrice(e.target.value)} placeholder="0.00" />
              </Field>
              <Field label={t("mlPriceCopField")} hint={t("autoCalculated")}>
                <EInput value={cop && cop > 0 ? Number(cop).toLocaleString() + " COP" : "—"} readOnly />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title={t("categoryHeader")}>
            {(() => {
              const mainCats = categories.filter((c) => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name));
              const subCats  = selectedMainId
                ? categories.filter((c) => String(c.parent_id) === String(selectedMainId)).sort((a, b) => a.name.localeCompare(b.name))
                : [];
              return (
                <div className="grid grid-cols-2 gap-4">
                  <Field label={t("mainCategory")}>
                    <ESelect
                      value={selectedMainId}
                      placeholder={t("selectMainCat")}
                      onChange={(e) => { setSelectedMainId(e.target.value); setSelectedSubId(""); }}
                    >
                      {mainCats.map((c) => (
                        <option key={c.id} value={c.id} style={{ background: "#0f1623", color: "#e8ecf2" }}>{c.name}</option>
                      ))}
                    </ESelect>
                  </Field>
                  <Field label={t("subcategory")}>
                    <ESelect
                      value={selectedSubId}
                      placeholder={t("selectSubcat")}
                      onChange={(e) => setSelectedSubId(e.target.value)}
                      disabled={!selectedMainId}
                    >
                      {subCats.map((c) => (
                        <option key={c.id} value={c.id} style={{ background: "#0f1623", color: "#e8ecf2" }}>{c.name}</option>
                      ))}
                    </ESelect>
                  </Field>
                </div>
              );
            })()}
          </SectionCard>

          <SectionCard title={t("inventorySection")}>
            <div className="grid grid-cols-3 gap-4">
              <Field label={t("initialStockLabel")} hint={t("originalQty")}>
                <EInput type="number" min="0" value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)} placeholder="0" />
              </Field>
              <Field label={t("stockLeft")} hint={t("available")}>
                <EInput type="number" min="0" value={stock}
                  onChange={(e) => setStock(e.target.value)} placeholder="0" />
              </Field>
              <Field label={t("timesOrderedLabel")}>
                <EInput type="number" min="0" value={timesOrdered}
                  onChange={(e) => setTimesOrdered(e.target.value)} placeholder="0" />
              </Field>
            </div>

            {initialStock !== "" && stock !== "" && Number(initialStock) > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-[11px] text-[#6b7785] mb-1.5">
                  <span>{t("stockRemaining")}</span>
                  <span>{stock} / {initialStock} ({Math.round((Number(stock) / Number(initialStock)) * 100)}%)</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(80,160,250,0.1)" }}>
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.min(100, Math.round((Number(stock) / Number(initialStock)) * 100))}%`,
                    background: Number(stock) / Number(initialStock) > 0.3 ? "#22c55e" : "#ef4444",
                  }} />
                </div>
              </div>
            )}
          </SectionCard>

          {error && (
            <div className="rounded-lg px-4 py-3 text-sm"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => navigate("/products")} disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: "rgba(80,160,250,0.06)", border: "1px solid rgba(80,160,250,0.18)", color: "#a0adbb" }}>
              {t("cancel")}
            </button>
            <button onClick={handleSave} disabled={saving || saved}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
              style={{
                background:  saved ? "rgba(34,197,94,0.2)" : "#50A0FA",
                color:       saved ? "#22c55e" : "#0d1117",
                border:      saved ? "1px solid rgba(34,197,94,0.4)" : "none",
                boxShadow:   saving || saved ? "none" : "0 0 18px rgba(80,160,250,0.45)",
              }}>
              {saved ? t("saved") : saving ? t("savingLabel") : t("saveChanges")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
