import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Package, FolderOpen, Plus,
  TrendingUp, ShieldOff, Trash2, RefreshCw, LogOut, Zap,
} from "lucide-react";
import LangToggle from "./LangToggle.jsx";

/* ── Nav item ──────────────────────────────────────────── */
function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className="block"
      style={({ isActive }) => isActive ? {} : {}}
    >
      {({ isActive }) => (
        <div
          className="flex items-center gap-3 px-3 py-2.5 my-0.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer select-none"
          style={
            isActive ? {
              background: 'linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(99,102,241,0.1) 100%)',
              color: '#93C5FD',
              boxShadow: '0 0 0 1px rgba(59,130,246,0.2) inset, 0 4px 12px rgba(59,130,246,0.08)',
            } : {
              color: '#475569',
            }
          }
          onMouseEnter={e => {
            if (!e.currentTarget.closest('a').classList.contains('active')) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.color = '#94A3B8';
            }
          }}
          onMouseLeave={e => {
            const link = e.currentTarget.closest('a');
            const href = link?.getAttribute('href');
            if (href && !window.location.pathname.startsWith(href)) {
              e.currentTarget.style.background = '';
              e.currentTarget.style.color = '#475569';
            }
          }}
        >
          <span
            className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg"
            style={
              isActive ? {
                background: 'rgba(59,130,246,0.2)',
                color: '#60A5FA',
              } : {
                background: 'rgba(255,255,255,0.04)',
                color: '#475569',
              }
            }
          >
            <Icon size={15} strokeWidth={isActive ? 2 : 1.75} />
          </span>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{label}</span>
          {isActive && (
            <span className="ml-auto w-1 h-4 rounded-full flex-shrink-0"
              style={{ background: 'linear-gradient(180deg, #60A5FA, #818CF8)' }} />
          )}
        </div>
      )}
    </NavLink>
  );
}

function Layout() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex h-screen bg-app text-ds-text">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className="w-[232px] flex flex-col flex-shrink-0 relative"
        style={{
          background: 'linear-gradient(180deg, #071628 0%, #060f1e 60%, #050c18 100%)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Sidebar ambient glow */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Brand */}
        <div
          className="relative px-4 h-[60px] flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-2.5">
            {/* Logo */}
            <div
              className="relative w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
                boxShadow: '0 0 20px rgba(59,130,246,0.4), 0 0 40px rgba(99,102,241,0.15)',
              }}
            >
              <Zap size={15} strokeWidth={2.5} className="text-white" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.5))' }} />
              <span
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full pulse-dot"
                style={{ background: '#22C55E', border: '2px solid #040a18' }}
              />
            </div>
            <div>
              <span
                className="font-bold text-[15px] tracking-tight"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  background: 'linear-gradient(135deg, #F8FAFC 0%, #93C5FD 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                MeliSync
              </span>
            </div>
          </div>
          <LangToggle />
        </div>

        {/* Nav */}
        <nav className="relative flex-1 px-2.5 pt-4 pb-3 overflow-y-auto">

          <div className="mb-1.5 px-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#2D3D55', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Overview
            </span>
          </div>
          <NavItem to="/dashboard"     icon={LayoutDashboard} label={t("dashboard")} />
          <NavItem to="/products"      icon={Package}         label={t("products")} />

          <div className="mt-4 mb-1.5 px-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#2D3D55', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Catalog
            </span>
          </div>
          <NavItem to="/categories"    icon={FolderOpen}      label={t("nav_categories")} />
          <NavItem to="/add"           icon={Plus}            label={t("nav_addProducts")} />
          <NavItem to="/margin-config" icon={TrendingUp}      label={t("nav_marginConfig")} />
          <NavItem to="/blacklist"     icon={ShieldOff}       label={t("blacklist")} />
          <NavItem to="/recycle-bin"   icon={Trash2}          label={t("nav_recycleBin")} />

          <div className="mt-4 mb-1.5 px-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#2D3D55', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Automation
            </span>
          </div>
          <NavItem to="/sync" icon={RefreshCw} label={t("nav_sync")} />
        </nav>

        {/* Logout */}
        <div className="px-2.5 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12 }}>
          <button
            onClick={() => navigate("/login")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer"
            style={{ color: '#2D3D55', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
              e.currentTarget.style.color = '#FCA5A5';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '';
              e.currentTarget.style.color = '#2D3D55';
            }}
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.08)' }}>
              <LogOut size={14} strokeWidth={1.75} />
            </span>
            {t("logout")}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="flex-1 overflow-auto relative">
        <div className="live-bar" aria-hidden="true" />
        <div className="relative p-8 max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
