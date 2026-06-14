import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  getRecycleBin, restoreProduct, permanentDeleteProduct,
  emptyRecycleBin, restoreAllProducts,
} from "../api.js";

const BIN_DAYS = 7;

function daysLeft(deletedAt) {
  const ms = new Date(deletedAt).getTime() + BIN_DAYS * 86400000 - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ConfirmModal({ title, message, confirmLabel, danger, onConfirm, onCancel, busy }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={() => !busy && onCancel()}
    >
      <div className="rounded-2xl p-6 max-w-sm w-full mx-4"
        style={{
          background: "#0f1623",
          border: `1px solid ${danger ? "rgba(239,68,68,0.3)" : "rgba(80,160,250,0.25)"}`,
          boxShadow: `0 0 40px ${danger ? "rgba(239,68,68,0.12)" : "rgba(80,160,250,0.12)"}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-white font-semibold text-sm mb-1">{title}</p>
        <p className="text-[#a0adbb] text-sm mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: "rgba(80,160,250,0.06)", border: "1px solid rgba(80,160,250,0.18)", color: "#a0adbb" }}>
            {t("cancel")}
          </button>
          <button onClick={onConfirm} disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            style={{
              background: danger ? "rgba(239,68,68,0.85)" : "#50A0FA",
              color: danger ? "#fff" : "#0d1117",
            }}>
            {busy ? t("pleaseWait") : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecycleBin() {
  const { t } = useTranslation();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState(null);
  const [modal, setModal]       = useState(null); // { type, id? }
  const [busy, setBusy]         = useState(false);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function load() {
    setLoading(true);
    getRecycleBin()
      .then(data => setItems(Array.isArray(data) ? data : (data.products || [])))
      .catch(() => showToast(t("recycleBinLoadFailed"), false))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleRestore(id) {
    setBusy(true);
    try {
      await restoreProduct(id);
      setItems(prev => prev.filter(p => p.id !== id));
      showToast(t("productRestored"));
    } catch {
      showToast(t("restoreFailed"), false);
    } finally {
      setBusy(false);
      setModal(null);
    }
  }

  async function handlePermanentDelete(id) {
    setBusy(true);
    try {
      await permanentDeleteProduct(id);
      setItems(prev => prev.filter(p => p.id !== id));
      showToast(t("productDeleted"));
    } catch {
      showToast(t("deleteFailed"), false);
    } finally {
      setBusy(false);
      setModal(null);
    }
  }

  async function handleEmptyBin() {
    setBusy(true);
    try {
      const res = await emptyRecycleBin();
      setItems([]);
      showToast(t("nProductsPermanentlyDeleted", { n: res.deleted }));
    } catch {
      showToast(t("emptyBinFailed"), false);
    } finally {
      setBusy(false);
      setModal(null);
    }
  }

  async function handleRestoreAll() {
    setBusy(true);
    try {
      const res = await restoreAllProducts();
      setItems([]);
      showToast(t("nProductsRestored", { n: res.restored }));
    } catch {
      showToast(t("restoreAllFailed"), false);
    } finally {
      setBusy(false);
      setModal(null);
    }
  }

  const modalConfig = {
    delete_one: {
      title: t("permanentlyDeleteTitle"),
      message: t("permanentDeleteWarning"),
      confirmLabel: t("deleteForeverBtn"),
      danger: true,
      onConfirm: () => handlePermanentDelete(modal?.id),
    },
    empty_bin: {
      title: t("emptyBinTitle"),
      message: t("emptyBinWarning", { n: items.length }),
      confirmLabel: t("emptyBin"),
      danger: true,
      onConfirm: handleEmptyBin,
    },
    restore_all: {
      title: t("restoreAllTitle"),
      message: t("restoreAllMsg", { n: items.length }),
      confirmLabel: t("restoreAll"),
      danger: false,
      onConfirm: handleRestoreAll,
    },
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl"
          style={{
            background: toast.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            border: `1px solid ${toast.ok ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
            color: toast.ok ? "#22c55e" : "#ef4444",
          }}>
          {toast.msg}
        </div>
      )}

      {/* Confirm modal */}
      {modal && modalConfig[modal.type] && (
        <ConfirmModal
          {...modalConfig[modal.type]}
          busy={busy}
          onCancel={() => !busy && setModal(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6 fade-up">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-medium text-white">{t("recycleBinTitle")}</h1>
            <p className="text-sm text-[#6b7785]">
              {t("recycleBinSubtitle", { days: BIN_DAYS })}
            </p>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {items.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[11px] text-[#6b7785]">{t("itemsInBin", { n: items.length, s: items.length !== 1 ? "s" : "" })}</span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setModal({ type: "restore_all" })}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}
            >
              {t("restoreAll")}
            </button>
            <button
              onClick={() => setModal({ type: "empty_bin" })}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}
            >
              {t("emptyBin")}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#6b7785] text-sm gap-3">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {t("loadingLabel")}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(80,160,250,0.06)", border: "1px solid rgba(80,160,250,0.12)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4a5568" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </div>
            <p className="text-[#6b7785] text-sm">{t("binIsEmpty")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-[#6b7785]"
                  style={{ background: "rgba(80,160,250,0.04)" }}>
                  <th className="p-3 w-12"></th>
                  <th className="text-left p-3 font-medium">{t("productCol")}</th>
                  <th className="text-left p-3 font-medium">ASIN</th>
                  <th className="text-right p-3 font-medium">{t("price")}</th>
                  <th className="text-center p-3 font-medium">{t("deletedCol")}</th>
                  <th className="text-center p-3 font-medium">{t("expiresInCol")}</th>
                  <th className="text-center p-3 font-medium">{t("actionsCol")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map(p => {
                  const days = daysLeft(p.deleted_at);
                  const urgent = days <= 1;
                  return (
                    <tr key={p.id}
                      className="transition-colors"
                      style={{ borderTop: "1px solid rgba(80,160,250,0.08)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(80,160,250,0.025)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {/* Thumbnail */}
                      <td className="p-3">
                        {p.image_url
                          ? <img src={p.image_url} alt="" className="w-9 h-9 rounded object-cover opacity-60" style={{ background: "#1f2937" }} />
                          : <div className="w-9 h-9 rounded opacity-40" style={{ background: "#1f2937" }} />}
                      </td>

                      {/* Title */}
                      <td className="p-3 text-[#a0adbb] max-w-xs truncate">{p.title}</td>

                      {/* ASIN */}
                      <td className="p-3">
                        <code className="text-[11px] px-2 py-0.5 rounded font-bold"
                          style={{ background: "rgba(80,160,250,0.08)", color: "#50A0FA" }}>
                          {p.asin}
                        </code>
                      </td>

                      {/* Price */}
                      <td className="p-3 text-right text-[#6b7785] text-[12px]">
                        ${Number(p.amazon_price_usd || 0).toFixed(2)}
                      </td>

                      {/* Deleted time */}
                      <td className="p-3 text-center text-[11px] text-[#6b7785]">
                        {timeAgo(p.deleted_at)}
                      </td>

                      {/* Days remaining */}
                      <td className="p-3 text-center">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded"
                          style={{
                            background: urgent ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.1)",
                            color: urgent ? "#ef4444" : "#f59e0b",
                            border: `1px solid ${urgent ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.2)"}`,
                          }}>
                          {days === 0 ? t("todayLabel") : `${days}d`}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          {/* Restore */}
                          <button
                            onClick={() => handleRestore(p.id)}
                            title={t("restore")}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                              <path d="M3 3v5h5"/>
                            </svg>
                            {t("restore")}
                          </button>

                          {/* Delete permanently */}
                          <button
                            onClick={() => setModal({ type: "delete_one", id: p.id })}
                            title={t("deleteForeverBtn")}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            </svg>
                            {t("deleteForeverBtn")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
