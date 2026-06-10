import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LangToggle from "./LangToggle.jsx";

// SVG icon components for sidebar
function IconDashboard() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
    </svg>
  );
}
function IconProducts() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}
function IconAdd() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
function IconImport() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}
function IconCategory() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}
function IconBlacklist() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  );
}
function IconMargin() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6M14 11v6"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

// One nav row in the sidebar. Active items get the blue gradient pill.
function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        "flex items-center gap-3 px-3 py-2.5 my-0.5 rounded-lg text-sm font-medium transition-all duration-200 group/nav " +
        (isActive
          ? "text-white shadow-lg"
          : "text-[#6b7785] hover:text-white")
      }
      style={({ isActive }) =>
        isActive
          ? {
              background: "linear-gradient(90deg, rgba(80,160,250,0.25) 0%, rgba(80,160,250,0.08) 100%)",
              borderLeft: "2px solid #50A0FA",
            }
          : {
              borderLeft: "2px solid transparent",
            }
      }
    >
      <span
        className="flex-shrink-0 transition-transform duration-200 group-hover/nav:scale-110"
      >
        {icon}
      </span>
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
        className="w-60 flex flex-col flex-shrink-0"
        style={{
          background: "linear-gradient(180deg, #0e1420 0%, #0d1117 100%)",
          borderRight: "1px solid rgba(80,160,250,0.1)",
        }}
      >
        {/* Brand + lang toggle */}
        <div
          className="px-4 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(80,160,250,0.08)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm relative"
              style={{
                background: "linear-gradient(135deg, #50A0FA 0%, #3d7fd1 100%)",
                color: "#0d1117",
                boxShadow: "0 0 16px rgba(80,160,250,0.45)",
              }}
            >
              M
              {/* Inner glow dot */}
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border-2 border-[#0e1420] animate-pulse" />
            </div>
            <div>
              <div className="font-semibold text-sm text-white leading-tight">Meli Sync</div>
              <div className="text-[10px] text-[#6b7785] leading-tight">v2.0 · Pro</div>
            </div>
          </div>
          <LangToggle />
        </div>

        {/* Nav section label */}
        <div className="px-4 pt-4 pb-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#4a5568]">Navigation</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 pb-3 overflow-y-auto">
          <NavItem to="/dashboard"  icon={<IconDashboard />}  label={t("dashboard")} />
          <NavItem to="/products"   icon={<IconProducts />}   label={t("products")} />
          <NavItem to="/categories" icon={<IconCategory />}  label="Categories" />
          <NavItem to="/add"        icon={<IconAdd />}        label="Add Products" />
          <NavItem to="/margin-config" icon={<IconMargin />}  label="Margin Config" />
          <NavItem to="/blacklist"   icon={<IconBlacklist />}  label={t("blacklist")} />
          <NavItem to="/recycle-bin" icon={<IconTrash />}      label="Recycle Bin" />
        </nav>

        {/* Logout */}
        <div
          className="p-3"
          style={{ borderTop: "1px solid rgba(80,160,250,0.08)" }}
        >
          <button
            onClick={() => navigate("/login")}
            className="w-full px-3 py-2.5 rounded-lg text-sm text-[#6b7785] hover:text-red-400 hover:bg-red-400/5 transition-all duration-200 text-left flex items-center gap-3 group/logout"
          >
            <span className="transition-transform duration-200 group-hover/logout:translate-x-0.5">
              <IconLogout />
            </span>
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
              "radial-gradient(circle, rgba(80,160,250,0.12) 0%, transparent 60%)",
          }}
        />
        <div
          className="glow-float-b pointer-events-none absolute"
          style={{
            bottom: "-100px", left: "5%", width: "400px", height: "400px",
            background:
              "radial-gradient(circle, rgba(80,160,250,0.05) 0%, transparent 60%)",
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