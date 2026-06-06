import i18n from "../i18n/index.js";
import { useState } from "react";

function LangToggle() {
  // local state forces a re-render when language changes
  const [lang, setLang] = useState(i18n.language);

  function switchTo(newLang) {
    i18n.changeLanguage(newLang);
    localStorage.setItem("lang", newLang);
    setLang(newLang);
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      <button
        onClick={() => switchTo("es")}
        className={
          "px-2.5 py-1 rounded-md font-medium transition-colors " +
          (lang === "es"
            ? "bg-[#50A0FA] text-[#0d1117]"
            : "text-[#6b7785] hover:text-white")
        }
      >ES</button>
      <button
        onClick={() => switchTo("en")}
        className={
          "px-2.5 py-1 rounded-md font-medium transition-colors " +
          (lang === "en"
            ? "bg-[#50A0FA] text-[#0d1117]"
            : "text-[#6b7785] hover:text-white")
        }
      >EN</button>
    </div>
  );
}

export default LangToggle;