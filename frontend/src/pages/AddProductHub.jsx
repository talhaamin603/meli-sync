import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function OptionCard({ icon, title, description, badge, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full text-left rounded-2xl p-7 transition-all duration-200 ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(80,160,250,0.05) 0%, rgba(13,17,23,0.8) 100%)",
        border: "1px solid rgba(80,160,250,0.12)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(80,160,250,0.4)";
        e.currentTarget.style.boxShadow = "0 12px 40px rgba(80,160,250,0.12)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(80,160,250,0.12)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-5">
          {/* Icon */}
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
            style={{ background: "rgba(80,160,250,0.1)", border: "1px solid rgba(80,160,250,0.2)" }}>
            {icon}
          </div>

          {/* Text */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-lg font-bold text-white">{title}</h3>
              {badge && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                  style={{ background: "rgba(77,158,248,0.12)", color: "#4D9EF8", border: "1px solid rgba(77,158,248,0.22)" }}>
                  {badge}
                </span>
              )}
            </div>
            <p className="text-sm text-[#6b7785] leading-relaxed max-w-sm">{description}</p>
          </div>
        </div>

        {/* Arrow */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 transition-all duration-300 group-hover:translate-x-1"
          style={{ background: "rgba(80,160,250,0.08)", border: "1px solid rgba(80,160,250,0.15)", color: "#50A0FA" }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

export default function AddProductHub() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div>
      {/* Header */}
      <div className="mb-8 fade-up">
        <h1 className="text-2xl font-medium text-white mb-1">{t("addProductsTitle")}</h1>
        <p className="text-sm text-[#6b7785]">{t("addProductsSubtitle")}</p>
      </div>

      {/* Option cards — 2 per row */}
      <div className="grid grid-cols-2 gap-4">
        <OptionCard
          onClick={() => navigate("/add/manual")}
          icon={
            <svg width="22" height="22" fill="none" stroke="#50A0FA" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          }
          title={t("addManuallyTitle")}
          description={t("addManuallyDesc")}
        />

        <OptionCard
          onClick={() => navigate("/add/asin")}
          icon={
            <svg width="22" height="22" fill="none" stroke="#50A0FA" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          }
          title={t("importFromAmazon")}
          badge={t("asinOnlyBadge")}
          description={t("importAsinDesc")}
        />

        <OptionCard
          onClick={() => navigate("/add/search")}
          icon={
            <svg width="22" height="22" fill="none" stroke="#50A0FA" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          }
          title={t("importFromAmazon")}
          badge={t("namesOnlyBadge")}
          description={t("importSearchDesc")}
        />

        <OptionCard
          onClick={() => navigate("/add/category")}
          icon={
            <svg width="22" height="22" fill="none" stroke="#50A0FA" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
              <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          }
          title={t("importFromAmazon")}
          badge={t("byCategoryBadge")}
          description={t("importCatDesc")}
        />

        <OptionCard
          onClick={() => navigate("/add/url")}
          className="col-span-2"
          icon={
            <svg width="22" height="22" fill="none" stroke="#50A0FA" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          }
          title={t("importFromAmazon")}
          badge={t("byUrlBadge")}
          description={t("importUrlDesc")}
        />
      </div>

    </div>
  );
}
