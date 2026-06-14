import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getBlacklist, addBlacklistTerm, deleteBlacklistTerm, rescanBlacklist } from "../api.js";

const PAGE_SIZE = 50;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DIGITS    = "0123456789".split("");
const ALL_CHARS = [...ALPHABET, ...DIGITS];

function Blacklist() {
  const { t } = useTranslation();
  const [terms, setTerms]               = useState([]);
  const [search, setSearch]             = useState("");
  const [letterFilter, setLetter]       = useState("");
  const [newTerm, setNewTerm]           = useState("");
  const [type, setType]                 = useState("brand");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [page, setPage]                 = useState(1);
  const [selected, setSelected]         = useState(new Set());
  const [confirmBulk, setConfirmBulk]   = useState(false);
  const [sortBy, setSortBy]             = useState("latest");
  const [scanning, setScanning]         = useState(false);
  const [scanResult, setScanResult]     = useState(null);

  const headerCheckRef = useRef(null);

  function reload() {
    getBlacklist()
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : (data.rules || data.terms || data.items || []);
        setTerms(list);
        setLoading(false);
      })
      .catch(() => setError(t("errorLoading")))
      .finally(() => setLoading(false));
  }

  useEffect(() => { reload(); }, []);

  async function handleRescan() {
    setScanning(true);
    setScanResult(null);
    try {
      const stats = await rescanBlacklist();
      setScanResult(stats);
    } catch {
      setScanResult({ error: true });
    } finally {
      setScanning(false);
    }
  }

  async function add() {
    const lines = newTerm.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setError("");
    const results = await Promise.allSettled(
      lines.map((val) => addBlacklistTerm({ rule_type: type, value: val }))
    );
    const added = results.filter((r) => r.status === "fulfilled").length;
    if (added > 0) {
      setNewTerm("");
      reload();
    } else {
      const firstErr = results[0]?.reason;
      const status = firstErr?.response?.status;
      setError(status === 400 ? t("termExists") : t("errorLoading"));
    }
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const pageIds = pageTerms.map((r) => r.id);
    const allSel = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSel) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function removeSelected() {
    await Promise.allSettled([...selected].map((id) => deleteBlacklistTerm(id)));
    setSelected(new Set());
    setConfirmBulk(false);
    reload();
  }

  // Set of first characters that actually have entries (uppercased)
  const charSet = useMemo(() => {
    const s = new Set();
    terms.forEach((row) => {
      const first = (row.value || "").trim()[0];
      if (first) s.add(first.toUpperCase());
    });
    return s;
  }, [terms]);

  if (loading) return <div className="text-[#a0adbb]">{t("loadingBlacklist")}</div>;

  // Filter — letter index and search are mutually exclusive
  const q = search.toLowerCase().trim();
  let display = terms.filter((row) => {
    const val = (row.value || "").toLowerCase();
    if (letterFilter) return val.startsWith(letterFilter.toLowerCase());
    if (q)            return val.includes(q);
    return true;
  });

  // Type filter (brand / keyword options)
  if (sortBy === "brand")   display = display.filter((r) => r.rule_type === "brand");
  if (sortBy === "keyword") display = display.filter((r) => r.rule_type === "keyword");

  // Ordering
  if (sortBy === "alpha_asc") {
    display = [...display].sort((a, b) => (a.value || "").localeCompare(b.value || ""));
  } else if (sortBy === "alpha_desc") {
    display = [...display].sort((a, b) => (b.value || "").localeCompare(a.value || ""));
  } else {
    display = [...display].sort((a, b) => b.id - a.id);
  }

  const filtered = display;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(display.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageTerms  = display.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageNums   = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((n) => n >= safePage - 2 && n <= safePage + 2);

  // Header checkbox state
  const allPageSelected  = pageTerms.length > 0 && pageTerms.every((r) => selected.has(r.id));
  const somePageSelected = pageTerms.some((r) => selected.has(r.id));
  if (headerCheckRef.current) {
    headerCheckRef.current.indeterminate = somePageSelected && !allPageSelected;
  }

  function selectLetter(ch) {
    setLetter((prev) => prev === ch ? "" : ch);
    setSearch("");
    setPage(1);
  }

  function handleSearchChange(e) {
    setSearch(e.target.value);
    setLetter("");
    setPage(1);
  }

  const activeFilter = letterFilter || q;

  return (
    <div>
      {/* Bulk delete confirmation modal */}
      {confirmBulk && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={() => setConfirmBulk(false)}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full mx-4"
            style={{
              background: "#0f1623",
              border: "1px solid rgba(239,68,68,0.3)",
              boxShadow: "0 0 40px rgba(239,68,68,0.12)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white font-semibold text-sm mb-1">{t("rbPermDeleteTitle")}</p>
            <p className="text-[#a0adbb] text-sm mb-1 leading-relaxed">{t("cannotBeUndone")}</p>
            <div
              className="my-3 rounded-lg px-3 py-2 text-xs font-mono max-h-36 overflow-y-auto"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
            >
              {[...selected].slice(0, 8).map((id) => {
                const term = terms.find((r) => r.id === id);
                return term ? <div key={id}>{term.value}</div> : null;
              })}
              {selected.size > 8 && (
                <div className="mt-1" style={{ color: "#a0adbb" }}>…and {selected.size - 8} more</div>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setConfirmBulk(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(80,160,250,0.06)", border: "1px solid rgba(80,160,250,0.18)", color: "#a0adbb" }}
              >
                {t("cancel")}
              </button>
              <button
                onClick={removeSelected}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(239,68,68,0.85)", color: "#fff" }}
              >
                {t("yesDelete")} ({selected.size})
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fade-up mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium text-white mb-1">{t("blacklistTitle")}</h1>
          <p className="text-sm text-[#6b7785]">{t("blacklistSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {scanResult && !scanResult.error && (
            <div className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-2"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>
              <span>⊘ {scanResult.blocked} blocked</span>
              {scanResult.unblocked > 0 && (
                <span style={{ color: "#22c55e" }}>· ✓ {scanResult.unblocked} unblocked</span>
              )}
            </div>
          )}
          {scanResult?.error && (
            <div className="px-3 py-1.5 rounded-lg text-sm"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>
              Scan failed
            </div>
          )}
          <button
            onClick={handleRescan}
            disabled={scanning}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}
          >
            {scanning ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Scanning…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
                Scan All Products
              </>
            )}
          </button>
          <div
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ background: "rgba(80,160,250,0.08)", border: "1px solid rgba(80,160,250,0.2)", color: "#50A0FA" }}
          >
            {terms.length.toLocaleString()} {t("termsCount")}
          </div>
        </div>
      </div>

      {error && <div className="text-red-400 text-sm mb-3">{error}</div>}

      {/* Add term row */}
      <div
        className="card rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end"
        style={{ animation: "fadeUp 0.5s ease-out 0.1s backwards" }}
      >
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <textarea
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            placeholder={t("newTerm")}
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-sm text-[#e8ecf2] resize-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(80,160,250,0.18)",
              lineHeight: "1.5",
            }}
          />
          <span className="text-[10px] text-[#4a5568]">{t("multiTermHint")}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "#6b7785" }}>
            {t("sort")}
          </span>
          <div className="relative">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-lg pl-3 pr-8 py-2 text-sm font-semibold focus:outline-none appearance-none"
              style={{
                background: type === "brand"
                  ? "rgba(80,160,250,0.12)"
                  : "rgba(245,158,11,0.12)",
                border: `1px solid ${type === "brand" ? "rgba(80,160,250,0.4)" : "rgba(245,158,11,0.4)"}`,
                color: type === "brand" ? "#50A0FA" : "#f59e0b",
                cursor: "pointer",
                minWidth: "130px",
              }}
            >
              <option value="brand"   style={{ background: "#0f1623", color: "#50A0FA" }}>{t("brandType")}</option>
              <option value="keyword" style={{ background: "#0f1623", color: "#f59e0b" }}>{t("keywordType")}</option>
            </select>
            <svg
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              fill="none" stroke={type === "brand" ? "#50A0FA" : "#f59e0b"}
              viewBox="0 0 24 24" strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
        <button
          onClick={add}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:-translate-y-0.5"
          style={{
            background: "#50A0FA",
            color: "#0d1117",
            boxShadow: "0 0 14px rgba(80,160,250,0.4)",
          }}
        >
          + {t("addTerm")}
        </button>
      </div>

      {/* Search */}
      <div
        className="card rounded-xl px-4 py-2.5 mb-3 flex items-center gap-2"
        style={{ animation: "fadeUp 0.5s ease-out 0.2s backwards" }}
      >
        <svg className="w-4 h-4 flex-shrink-0" style={{ color: "#6b7785" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          value={search}
          onChange={handleSearchChange}
          placeholder={t("blacklistSearch")}
          className="flex-1 bg-transparent text-sm text-[#e8ecf2] focus:outline-none"
          style={{ border: 0, padding: 0 }}
        />
        {activeFilter && (
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0"
            style={{
              background: filtered.length > 0 ? "rgba(80,160,250,0.15)" : "rgba(239,68,68,0.12)",
              color: filtered.length > 0 ? "#50A0FA" : "#ef4444",
              border: `1px solid ${filtered.length > 0 ? "rgba(80,160,250,0.3)" : "rgba(239,68,68,0.3)"}`,
            }}
          >
            {filtered.length.toLocaleString()} {t("termsCount")}
          </span>
        )}
        {(search || letterFilter) && (
          <button
            onClick={() => { setSearch(""); setLetter(""); setPage(1); }}
            className="flex-shrink-0 text-[#6b7785] hover:text-[#a0adbb] transition-colors"
            title="Clear filter"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* A–Z  0–9 quick-filter bar */}
      <div
        className="card rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center gap-1"
        style={{ animation: "fadeUp 0.5s ease-out 0.25s backwards" }}
      >
        <button
          onClick={() => { setLetter(""); setSearch(""); setPage(1); }}
          className="h-7 px-2.5 rounded-lg text-[11px] font-bold transition-all duration-150"
          style={!letterFilter && !q ? {
            background: "#50A0FA",
            color: "#0d1117",
            border: "1px solid #50A0FA",
            boxShadow: "0 0 8px rgba(80,160,250,0.4)",
          } : {
            background: "rgba(80,160,250,0.06)",
            color: "#6b7785",
            border: "1px solid rgba(80,160,250,0.12)",
          }}
        >
          All
        </button>

        <div className="w-px mx-1 self-stretch" style={{ background: "rgba(80,160,250,0.15)" }} />

        {ALPHABET.map((ch) => {
          const active   = letterFilter === ch;
          const hasTerms = charSet.has(ch);
          return (
            <button
              key={ch}
              onClick={() => hasTerms && selectLetter(ch)}
              className="w-7 h-7 rounded-lg text-[11px] font-bold transition-all duration-150"
              style={active ? {
                background: "#50A0FA", color: "#0d1117",
                border: "1px solid #50A0FA", boxShadow: "0 0 8px rgba(80,160,250,0.4)", cursor: "pointer",
              } : hasTerms ? {
                background: "rgba(80,160,250,0.06)", color: "#a0adbb",
                border: "1px solid rgba(80,160,250,0.12)", cursor: "pointer",
              } : {
                background: "transparent", color: "#2a3240",
                border: "1px solid rgba(80,160,250,0.05)", cursor: "not-allowed",
              }}
            >
              {ch}
            </button>
          );
        })}

        <div className="w-px mx-1 self-stretch" style={{ background: "rgba(80,160,250,0.15)" }} />

        {DIGITS.map((ch) => {
          const active   = letterFilter === ch;
          const hasTerms = charSet.has(ch);
          return (
            <button
              key={ch}
              onClick={() => hasTerms && selectLetter(ch)}
              className="w-7 h-7 rounded-lg text-[11px] font-bold transition-all duration-150"
              style={active ? {
                background: "#50A0FA", color: "#0d1117",
                border: "1px solid #50A0FA", boxShadow: "0 0 8px rgba(80,160,250,0.4)", cursor: "pointer",
              } : hasTerms ? {
                background: "rgba(80,160,250,0.06)", color: "#a0adbb",
                border: "1px solid rgba(80,160,250,0.12)", cursor: "pointer",
              } : {
                background: "transparent", color: "#2a3240",
                border: "1px solid rgba(80,160,250,0.05)", cursor: "not-allowed",
              }}
            >
              {ch}
            </button>
          );
        })}
      </div>

      {/* Sort dropdown — below alphabet bar, right-aligned */}
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#6b7785] uppercase tracking-wider font-medium">
            {t("sort")}
          </span>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="rounded-lg px-3 py-1.5 text-sm text-[#e8ecf2] focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(80,160,250,0.2)",
              cursor: "pointer",
              appearance: "none",
              paddingRight: "2rem",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7785' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.6rem center",
            }}
          >
            <option value="latest"     style={{ background: "#0f1623" }}>{t("sortLatest")}</option>
            <option value="brand"      style={{ background: "#0f1623" }}>{t("sortBrandOnly")}</option>
            <option value="keyword"    style={{ background: "#0f1623" }}>{t("sortKeywordOnly")}</option>
            <option value="alpha_asc"  style={{ background: "#0f1623" }}>{t("sortAlphaAsc")}</option>
            <option value="alpha_desc" style={{ background: "#0f1623" }}>{t("sortAlphaDesc")}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div
        className="card rounded-xl overflow-hidden"
        style={{ animation: "fadeUp 0.5s ease-out 0.3s backwards" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-[11px] uppercase tracking-wider text-[#6b7785]"
              style={{ background: "rgba(80,160,250,0.04)" }}
            >
              <th className="p-3 w-10">
                <input
                  ref={headerCheckRef}
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleSelectAll}
                  style={{ accentColor: "#50A0FA", cursor: "pointer", width: "15px", height: "15px" }}
                />
              </th>
              <th className="text-left p-3 font-medium">{t("title")}</th>
              <th className="text-left p-3 font-medium w-32">{t("status")}</th>
            </tr>
          </thead>
          <tbody>
            {pageTerms.map((row) => (
              <tr
                key={row.id}
                onClick={() => toggleSelect(row.id)}
                className="transition-colors cursor-pointer"
                style={{
                  borderTop: "1px solid rgba(80,160,250,0.08)",
                  background: selected.has(row.id) ? "rgba(80,160,250,0.07)" : undefined,
                }}
                onMouseEnter={(e) => { if (!selected.has(row.id)) e.currentTarget.style.background = "rgba(80,160,250,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = selected.has(row.id) ? "rgba(80,160,250,0.07)" : ""; }}
              >
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleSelect(row.id)}
                    style={{ accentColor: "#50A0FA", cursor: "pointer", width: "15px", height: "15px" }}
                  />
                </td>
                <td className="p-3 text-[#e8ecf2]">{row.value}</td>
                <td className="p-3">
                  <span
                    className="px-2 py-0.5 rounded-md text-[11px]"
                    style={{
                      background: row.rule_type === "brand"
                        ? "rgba(80,160,250,0.15)"
                        : "rgba(245,158,11,0.15)",
                      color: row.rule_type === "brand" ? "#50A0FA" : "#f59e0b",
                    }}
                  >
                    {row.rule_type === "brand" ? t("brandType") : t("keywordType")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-[#6b7785] text-sm">{t("noTerms")}</div>
        )}
      </div>

      {/* Pagination footer + bulk delete */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between mt-3 flex-wrap gap-3">
          <span className="text-[11px] text-[#4a5568]">
            {t("showing")}{" "}
            <span className="text-[#6b7785] font-bold">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)}
            </span>{" "}
            {t("of")} <span className="text-[#6b7785] font-bold">{filtered.length.toLocaleString()}</span>
          </span>

          <div className="flex items-center gap-2">
            {/* Bulk delete button */}
            {selected.size > 0 && (
              <button
                onClick={() => setConfirmBulk(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  color: "#ef4444",
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t("delete")} ({selected.size})
              </button>
            )}

            {/* Pagination controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={safePage === 1}
                className="h-7 px-2 rounded-lg text-[11px] font-bold transition-all duration-150"
                style={{
                  background: safePage === 1 ? "rgba(255,255,255,0.02)" : "rgba(80,160,250,0.08)",
                  color: safePage === 1 ? "#3a4350" : "#50A0FA",
                  border: "1px solid " + (safePage === 1 ? "rgba(255,255,255,0.04)" : "rgba(80,160,250,0.2)"),
                  cursor: safePage === 1 ? "not-allowed" : "pointer",
                }}
              >
                {t("first")}
              </button>

              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                style={{
                  background: safePage === 1 ? "rgba(255,255,255,0.02)" : "rgba(80,160,250,0.08)",
                  color: safePage === 1 ? "#3a4350" : "#50A0FA",
                  border: "1px solid " + (safePage === 1 ? "rgba(255,255,255,0.04)" : "rgba(80,160,250,0.2)"),
                  cursor: safePage === 1 ? "not-allowed" : "pointer",
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {pageNums.map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className="w-7 h-7 rounded-lg text-[11px] font-bold transition-all duration-150"
                  style={n === safePage ? {
                    background: "#50A0FA", color: "#0d1117",
                    border: "1px solid #50A0FA", boxShadow: "0 0 10px rgba(80,160,250,0.4)",
                  } : {
                    background: "rgba(80,160,250,0.06)", color: "#6b7785",
                    border: "1px solid rgba(80,160,250,0.12)", cursor: "pointer",
                  }}
                >
                  {n}
                </button>
              ))}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                style={{
                  background: safePage === totalPages ? "rgba(255,255,255,0.02)" : "rgba(80,160,250,0.08)",
                  color: safePage === totalPages ? "#3a4350" : "#50A0FA",
                  border: "1px solid " + (safePage === totalPages ? "rgba(255,255,255,0.04)" : "rgba(80,160,250,0.2)"),
                  cursor: safePage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={() => setPage(totalPages)}
                disabled={safePage === totalPages}
                className="h-7 px-2 rounded-lg text-[11px] font-bold transition-all duration-150"
                style={{
                  background: safePage === totalPages ? "rgba(255,255,255,0.02)" : "rgba(80,160,250,0.08)",
                  color: safePage === totalPages ? "#3a4350" : "#50A0FA",
                  border: "1px solid " + (safePage === totalPages ? "rgba(255,255,255,0.04)" : "rgba(80,160,250,0.2)"),
                  cursor: safePage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                {t("last")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Blacklist;
