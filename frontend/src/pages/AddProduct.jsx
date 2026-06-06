import { useState } from "react";
import { useTranslation } from "react-i18next";
import { addManualProduct } from "../api.js";

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

const inputClass = "w-full rounded-lg px-3 py-2.5 text-sm text-[#e8ecf2]";
const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(80,160,250,0.18)",
};

function AddProduct() {
  const { t } = useTranslation();
  const empty = {
    asin: "", title: "", description: "",
    image_url: "", amazon_price_usd: "", stock: 10, is_prime: true,
  };
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  function update(field, value) { setForm({ ...form, [field]: value }); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.asin.trim() || !form.title.trim()) {
      setMessage({ type: "error", text: `ASIN, ${t("title")}: ${t("required")}` });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        ...form,
        amazon_price_usd: parseFloat(form.amazon_price_usd) || 0,
        stock: parseInt(form.stock) || 0,
      };
      const result = await addManualProduct(payload);
      setMessage({
        type: result.status === "added" ? "success" : "info",
        text: `${result.status}${result.reason ? " — " + result.reason : ""}`,
      });
      if (result.status === "added") setForm(empty);
    } catch (e) {
      setMessage({ type: "error", text: t("errorLoading") });
    } finally {
      setSaving(false);
    }
  }

  const messageColor =
    message?.type === "success" ? "rgba(34,197,94,0.12)" :
    message?.type === "error"   ? "rgba(239,68,68,0.12)" :
                                  "rgba(80,160,250,0.12)";
  const messageFg =
    message?.type === "success" ? "#22c55e" :
    message?.type === "error"   ? "#ef4444" :
                                  "#50A0FA";

  return (
    <div>
      <div className="fade-up mb-6">
        <h1 className="text-2xl font-medium text-white mb-1">{t("addProductTitle")}</h1>
        <p className="text-sm text-[#6b7785]">{t("addProductSubtitle")}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card rounded-xl p-6 max-w-2xl"
        style={{ animation: "fadeUp 0.6s ease-out 0.1s backwards" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="ASIN" required>
            <input
              value={form.asin}
              onChange={(e) => update("asin", e.target.value)}
              placeholder="B08T8L371P"
              className={inputClass + " font-mono"}
              style={inputStyle}
            />
          </Field>
          <Field label={t("priceUsd")} required>
            <input
              type="number" step="0.01"
              value={form.amazon_price_usd}
              onChange={(e) => update("amazon_price_usd", e.target.value)}
              placeholder="16.99"
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label={t("title")} required>
              <input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={t("description")}>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                className={inputClass + " resize-y"}
                style={inputStyle}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={t("imageUrl")}>
              <input
                value={form.image_url}
                onChange={(e) => update("image_url", e.target.value)}
                placeholder="https://..."
                className={inputClass}
                style={inputStyle}
              />
            </Field>
          </div>
          <Field label={t("stock")}>
            <input
              type="number"
              value={form.stock}
              onChange={(e) => update("stock", e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <div className="flex items-end pb-2">
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

        <div className="mt-6 flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{
              background: "#50A0FA",
              color: "#0d1117",
              boxShadow: "0 0 18px rgba(80,160,250,0.45)",
            }}
          >
            {saving ? t("saving") : t("add") + " →"}
          </button>
          {message && (
            <div
              className="px-3 py-2 rounded-lg text-xs"
              style={{ background: messageColor, color: messageFg }}
            >
              {message.text}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

export default AddProduct;