import { useNavigate } from "react-router-dom";

function OptionCard({ icon, title, description, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1"
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
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: "linear-gradient(90deg, transparent, #50A0FA, transparent)" }} />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-5">
          {/* Icon */}
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
            style={{ background: "rgba(80,160,250,0.1)", border: "1px solid rgba(80,160,250,0.2)" }}>
            {icon}
          </div>

          {/* Text */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="text-lg font-bold text-white">{title}</h3>
              {badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(80,160,250,0.15)", color: "#50A0FA", border: "1px solid rgba(80,160,250,0.25)" }}>
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

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8 fade-up">
        <h1 className="text-2xl font-medium text-white mb-1">Add Products</h1>
        <p className="text-sm text-[#6b7785]">Choose how you want to add a product to your catalog.</p>
      </div>

      {/* Option cards */}
      <div className="space-y-4">
        <OptionCard
          onClick={() => navigate("/add/manual")}
          icon={
            <svg width="22" height="22" fill="none" stroke="#50A0FA" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          }
          title="Add Manually"
          description="Fill in the product title, price, description, images, and stock yourself. Best for custom or local products not on Amazon."
        />

        <OptionCard
          onClick={() => navigate("/add/asin")}
          icon={
            <svg width="22" height="22" fill="none" stroke="#50A0FA" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          }
          title="Import from Amazon"
          badge="ASIN only"
          description="Paste one or more Amazon ASINs to automatically pull the title, images, price, and description from Amazon."
        />

        <OptionCard
          onClick={() => navigate("/add/search")}
          icon={
            <svg width="22" height="22" fill="none" stroke="#50A0FA" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          }
          title="Import from Amazon"
          badge="Names only"
          description="Type a product name like &quot;5kg dumbbell&quot; and browse Amazon results. Pick the ones you want and add them in one click."
        />
      </div>

      {/* Footer hint */}
      <p className="text-[11px] text-[#4a5568] mt-6">
        More import options coming soon — bulk CSV upload, MercadoLibre search, and more.
      </p>
    </div>
  );
}
