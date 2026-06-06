import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getSettings, updateSettings } from "../api.js";

function SettingRow({ label, hint, value, onChange, suffix }) {
  return (
    <div>
      <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="number"
          step="0.01"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg px-3 py-2.5 text-sm text-[#e8ecf2]"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(80,160,250,0.18)",
          }}
        />
        {suffix && (
          <div className="text-sm text-[#6b7785] font-medium w-12">{suffix}</div>
        )}
      </div>
      {hint && <div className="text-[11px] text-[#6b7785] mt-1.5">{hint}</div>}
    </div>
  );
}

function Settings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSettings()
      .then((data) => setSettings(data || {}))
      .catch(() => setError(t("errorLoading")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, []);

  function update(key, value) { setSettings({ ...settings, [key]: value }); }

  async function save() {
    try {
      await updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { setError(t("errorLoading")); }
  }

  if (loading) return <div className="text-[#a0adbb]">{t("loadingSettings")}</div>;

  return (
    <div>
      <div className="fade-up mb-6">
        <h1 className="text-2xl font-medium text-white mb-1">{t("settingsTitle")}</h1>
        <p className="text-sm text-[#6b7785]">{t("settingsSubtitle")}</p>
      </div>

      {error && <div className="text-red-400 text-sm mb-3">{error}</div>}

      <div
        className="card rounded-xl p-6 max-w-xl space-y-5"
        style={{ animation: "fadeUp 0.6s ease-out 0.1s backwards" }}
      >
        <SettingRow
          label={t("shippingUsd")}
          value={settings.shipping_usd ?? settings.safety_margin}
          onChange={(v) => update("shipping_usd", v)}
          suffix="USD"
        />
        <SettingRow
          label={t("marginPct")}
          value={settings.profit_margin_pct ?? settings.profit_markup}
          onChange={(v) => update("profit_margin_pct", v)}
          suffix="%"
        />
        <SettingRow
          label={t("syncHours")}
          value={settings.sync_hours}
          onChange={(v) => update("sync_hours", v)}
          suffix="h"
        />

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={save}
            className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:-translate-y-0.5"
            style={{
              background: "#50A0FA",
              color: "#0d1117",
              boxShadow: "0 0 18px rgba(80,160,250,0.45)",
            }}
          >
            {t("save")}
          </button>
          {saved && (
            <div
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}
            >
              ✓ {t("saved")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;