import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LangToggle from "./LangToggle.jsx";

// One nav row in the sidebar. Active items get the blue gradient pill.
function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        "flex items-center gap-3 px-3 py-2.5 my-0.5 rounded-lg text-sm font-medium transition-all " +
        (isActive
          ? "text-white shadow-lg"
          : "text-[#a0adbb] hover:bg-[#50A0FA]/8 hover:text-white")
      }
      style={({ isActive }) =>
        isActive
          ? {
              background: "linear-gradient(90deg, #50A0FA 0%, #3d7fd1 100%)",
              boxShadow: "0 0 18px rgba(80,160,250,0.35)",
            }
          : {}
      }
    >
      <span className="text-base w-4 text-center">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

function Layout() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex h-screen bg-app text-[#e8ecf2]">
      {/* Sidebar */}
      <aside
        className="w-60 flex flex-col"
        style={{
          background: "#10151f",
          borderRight: "1px solid rgba(80,160,250,0.1)",
        }}
      >
        {/* Brand + lang toggle */}
        <div
          className="px-4 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(80,160,250,0.1)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm"
              style={{
                background: "#50A0FA",
                color: "#0d1117",
                boxShadow: "0 0 14px rgba(80,160,250,0.5)",
              }}
            >M</div>
            <div className="font-medium text-sm text-white">[Marca]</div>
          </div>
          <LangToggle />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          <NavItem to="/dashboard"  icon="◈" label={t("dashboard")} />
          <NavItem to="/products"   icon="▣" label={t("products")} />
          <NavItem to="/add"        icon="+" label={t("addProduct")} />
          <NavItem to="/blacklist"  icon="⊘" label={t("blacklist")} />
          <NavItem to="/settings"   icon="⚙" label={t("settings")} />
        </nav>

        {/* Logout */}
        <div
          className="p-3"
          style={{ borderTop: "1px solid rgba(80,160,250,0.1)" }}
        >
          <button
            onClick={() => navigate("/login")}
            className="w-full px-3 py-2 rounded-lg text-sm text-[#a0adbb] hover:bg-[#50A0FA]/8 hover:text-white transition-colors text-left flex items-center gap-3"
          >
            <span className="w-4 text-center">←</span>
            <span>{t("logout")}</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto relative">
        {/* Floating background glow */}
        <div
          className="glow-float-a pointer-events-none absolute"
          style={{
            top: "-200px", right: "10%", width: "600px", height: "500px",
            background:
              "radial-gradient(circle, rgba(80,160,250,0.15) 0%, transparent 60%)",
          }}
        />
        <div className="relative p-8 max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;