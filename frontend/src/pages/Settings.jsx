import { useState, useEffect } from "react";
import { getSettings, updateSettings } from "../api.js";

function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSettings()
      .then((data) => setSettings(data || {}))
      .catch(() => setError("Could not load settings."))
      .finally(() => setLoading(false));
  }, []);

  function update(key, value) {
    setSettings({ ...settings, [key]: value });
  }

  async function save() {
    try {
      await updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { setError("Could not save settings."); }
  }

  if (loading) return <p>Loading settings...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      {error && <p className="text-red-600 mb-3">{error}</p>}
      <div className="bg-white rounded-lg shadow p-6 max-w-md space-y-4">
        <div>
          <label className="block text-sm mb-1">Safety Margin (%)</label>
          <input type="number"
            value={settings.safety_margin || ""}
            onChange={(e) => update("safety_margin", e.target.value)}
            className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Profit Markup (%)</label>
          <input type="number"
            value={settings.profit_markup || ""}
            onChange={(e) => update("profit_markup", e.target.value)}
            className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Sync Frequency (hours)</label>
          <input type="number"
            value={settings.sync_hours || ""}
            onChange={(e) => update("sync_hours", e.target.value)}
            className="w-full border rounded px-3 py-2" />
        </div>
        <button onClick={save}
          className="bg-blue-600 text-white px-5 py-2 rounded
                     hover:bg-blue-700">Save Settings</button>
        {saved && <div className="text-sm text-green-600">Saved!</div>}
      </div>
    </div>
  );
}

export default Settings;