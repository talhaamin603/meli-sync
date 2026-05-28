import { NavLink, Outlet, useNavigate } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/products", label: "Products" },
  { to: "/add", label: "Add Product" },
  { to: "/blacklist", label: "Blacklist" },
  { to: "/settings", label: "Settings" },
];

function Layout() {
  const navigate = useNavigate();
  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-60 bg-slate-800 text-white flex flex-col">
        <div className="p-5 text-xl font-bold border-b
                        border-slate-700">Meli Sync</div>
        <nav className="flex-1 p-3 space-y-1">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) =>
                "block px-4 py-2 rounded " +
                (isActive ? "bg-blue-600 text-white"
                          : "text-slate-300 hover:bg-slate-700")}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => navigate("/login")}
          className="m-3 px-4 py-2 bg-slate-700 rounded
                     hover:bg-slate-600">Logout</button>
      </aside>
      <main className="flex-1 overflow-auto p-8"><Outlet /></main>
    </div>
  );
}

export default Layout;