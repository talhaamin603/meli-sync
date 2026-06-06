import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LangToggle from "../components/LangToggle.jsx";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { t } = useTranslation();

  // For Module 1, login just goes to the dashboard (real auth comes later)
  function handleLogin(e) {
    e.preventDefault();
    navigate("/dashboard");
  }

  return (
    <div className="relative min-h-screen bg-app flex items-center justify-center p-6 overflow-hidden">
      {/* Floating background glows */}
      <div
        className="glow-float-a pointer-events-none absolute"
        style={{
          top: "-150px", left: "20%", width: "500px", height: "500px",
          background:
            "radial-gradient(circle, rgba(80,160,250,0.25) 0%, transparent 60%)",
        }}
      />
      <div
        className="glow-float-b pointer-events-none absolute"
        style={{
          bottom: "-150px", right: "20%", width: "400px", height: "400px",
          background:
            "radial-gradient(circle, rgba(80,160,250,0.18) 0%, transparent 60%)",
        }}
      />

      {/* Language toggle (top right) */}
      <div className="absolute top-6 right-8">
        <LangToggle />
      </div>

      {/* Login card */}
      <form
        onSubmit={handleLogin}
        className="fade-up card relative w-[340px] rounded-2xl p-9"
        style={{ boxShadow: "0 0 60px rgba(80,160,250,0.1)" }}
      >
        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="logo-pulse w-14 h-14 rounded-2xl flex items-center justify-center mb-4 font-semibold text-2xl"
            style={{ background: "#50A0FA", color: "#0d1117" }}
          >M</div>
          <h1 className="text-xl font-medium text-white mb-1">
            {t("loginTitle")}
          </h1>
          <p className="text-xs text-[#a0adbb]">
            {t("loginSubtitle")}
          </p>
        </div>

        {/* Username */}
        <div className="mb-4">
          <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider mb-1.5">
            {t("username")}
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            className="w-full rounded-lg px-3 py-2.5 text-sm text-[#e8ecf2]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(80,160,250,0.18)",
            }}
          />
        </div>

        {/* Password */}
        <div className="mb-5">
          <label className="block text-[11px] text-[#6b7785] uppercase tracking-wider mb-1.5">
            {t("password")}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg px-3 py-2.5 text-sm text-[#e8ecf2]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(80,160,250,0.18)",
            }}
          />
        </div>

        {/* Login button */}
        <button
          type="submit"
          className="w-full py-2.5 rounded-lg font-medium text-sm transition-all hover:-translate-y-0.5"
          style={{
            background: "#50A0FA",
            color: "#0d1117",
            boxShadow: "0 0 18px rgba(80,160,250,0.45)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.boxShadow = "0 0 28px rgba(80,160,250,0.7)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.boxShadow = "0 0 18px rgba(80,160,250,0.45)")
          }
        >
          {t("login")} →
        </button>

        <div className="text-center mt-5 text-[11px] text-[#6b7785]">
          {t("internalSystem")} · [Marca] · v2.0
        </div>
      </form>
    </div>
  );
}

export default Login;