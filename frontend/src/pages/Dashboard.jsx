import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getProducts } from "../api.js";

// A single stat card. Number animates from 0 -> target on mount.
function StatCard({ label, value, iconColor, iconBg, icon, delay }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const start = Date.now();
    const duration = 800;
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      // ease-out so the count slows near the end
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [value]);

  return (
    <div
      className="card rounded-xl p-5 hover:-translate-y-0.5"
      style={{ animation: `fadeUp 0.6s ease-out ${delay}s backwards` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] text-[#6b7785] uppercase tracking-wider">
          {label}
        </div>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: iconBg, color: iconColor }}
        >{icon}</div>
      </div>
      <div className="text-3xl font-medium text-white">
        {display.toLocaleString()}
      </div>
    </div>
  );
}

function Dashboard() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // load products on mount
  useEffect(() => {
    getProducts()
  .then((data) => {
    // Handles 3 backend response shapes:
    //   [...]                    -> plain list
    //   {"items": [...]}         -> wrapped in 'items'
    //   {"products": [...], ...} -> wrapped in 'products' (your backend)
    const list = Array.isArray(data)
      ? data
      : (data.products || data.items || []);
    setProducts(list);
  })
      .catch(() => setError(t("errorLoading")))
      .finally(() => setLoading(false));
    // we only want this on mount
    // eslint-disable-next-line
  }, []);

  if (loading) {
    return (
      <div className="text-[#a0adbb]">{t("loadingDashboard")}</div>
    );
  }
  if (error) {
    return <div className="text-red-400">{error}</div>;
  }

  // calculate counts
  const total = products.length;
  const published = products.filter((p) => p.status === "published").length;
  const blocked   = products.filter((p) => p.status === "blocked").length;
  const pending   = products.filter((p) => p.status === "pending").length;

  // distribution bar segments (in percent, never divide by zero)
  const safe = total || 1;
  const pctPublished = (published / safe) * 100;
  const pctPending   = (pending   / safe) * 100;
  const pctBlocked   = (blocked   / safe) * 100;

  return (
    <div>
      {/* Heading */}
      <div className="fade-up mb-7">
        <h1 className="text-2xl font-medium text-white mb-1">
          {t("dashboardTitle")}
        </h1>
        <p className="text-sm text-[#6b7785]">
          {t("dashboardSubtitle")}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label={t("totalProducts")}
          value={total}
          iconBg="rgba(80,160,250,0.15)"
          iconColor="#50A0FA"
          icon="▣"
          delay={0.1}
        />
        <StatCard
          label={t("published")}
          value={published}
          iconBg="rgba(34,197,94,0.15)"
          iconColor="#22c55e"
          icon="✓"
          delay={0.2}
        />
        <StatCard
          label={t("blocked")}
          value={blocked}
          iconBg="rgba(239,68,68,0.15)"
          iconColor="#ef4444"
          icon="⊘"
          delay={0.3}
        />
        <StatCard
          label={t("pending")}
          value={pending}
          iconBg="rgba(245,158,11,0.15)"
          iconColor="#f59e0b"
          icon="⏱"
          delay={0.4}
        />
      </div>

      {/* Distribution + exchange rate row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Distribution */}
        <div
          className="card rounded-xl p-5 lg:col-span-2"
          style={{ animation: "fadeUp 0.6s ease-out 0.5s backwards" }}
        >
          <div className="text-sm font-medium text-white mb-3">
            {t("distribution")}
          </div>
          <div
            className="h-2 rounded overflow-hidden flex mb-3"
            style={{ background: "rgba(80,160,250,0.08)" }}
          >
            <div style={{ width: `${pctPublished}%`, background: "#22c55e" }} />
            <div style={{ width: `${pctPending}%`,   background: "#f59e0b" }} />
            <div style={{ width: `${pctBlocked}%`,   background: "#ef4444" }} />
          </div>
          <div className="flex flex-wrap gap-5 text-xs text-[#a0adbb]">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "#22c55e" }} />
              {t("published")} ({published})
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "#f59e0b" }} />
              {t("pending")} ({pending})
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "#ef4444" }} />
              {t("blocked")} ({blocked})
            </div>
          </div>
        </div>

        {/* Exchange rate card */}
        <div
          className="card rounded-xl p-5"
          style={{ animation: "fadeUp 0.6s ease-out 0.6s backwards" }}
        >
          <div className="text-sm font-medium text-white mb-1">
            {t("exchangeRate")}
          </div>
          <div className="text-[11px] text-[#6b7785] mb-1.5">USD → COP</div>
          <div
            className="text-3xl font-medium"
            style={{
              color: "#50A0FA",
              textShadow: "0 0 22px rgba(80,160,250,0.45)",
            }}
          >4,100</div>
          <div className="text-[11px] text-green-400 mt-1">
            ↑ {t("updatedToday")}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;