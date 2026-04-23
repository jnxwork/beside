import { create } from "zustand";
import { getLang } from "../i18n/index.js";

// Auto-detect: pixel font on PC/iPad, general font on phone
function getDefaultFontPixel() {
  const stored = localStorage.getItem("fontPixel");
  if (stored !== null) return stored !== "false";
  const isMobile = /iPhone|Android.*Mobile/.test(navigator.userAgent);
  return !isMobile; // PC/iPad → pixel, phone → general
}

function loadShowNames() {
  try {
    const v = JSON.parse(localStorage.getItem("showNames"));
    if (v && typeof v === "object") return { self: !!v.self, followed: !!v.followed, others: !!v.others };
  } catch {}
  return { self: true, followed: true, others: true };
}

const initialFontPixel = getDefaultFontPixel();
// Apply body class immediately so welcome popup renders with correct font
if (!initialFontPixel) document.body.classList.add("font-misans");

const useSettingsStore = create((set) => ({
  volume: parseInt(localStorage.getItem("volume") || "30", 10),
  soundEnabled: localStorage.getItem("soundEnabled") === "true",
  lang: getLang(),
  fontPixel: initialFontPixel,

  // Actions
  setVolume: (v) => {
    localStorage.setItem("volume", String(v));
    set({ volume: v });
  },
  setSoundEnabled: (v) => {
    localStorage.setItem("soundEnabled", String(v));
    set({ soundEnabled: v });
  },
  setLang: (lang) => set({ lang }),
  setFontPixel: (v) => {
    localStorage.setItem("fontPixel", String(v));
    set({ fontPixel: v });
    if (v) {
      document.body.classList.remove("font-misans");
    } else {
      document.body.classList.add("font-misans");
    }
  },

  showNames: loadShowNames(),
  setShowNames: (v) => {
    localStorage.setItem("showNames", JSON.stringify(v));
    set({ showNames: v });
    window.__onShowNamesChange?.(v);
  },
}));

export default useSettingsStore;
