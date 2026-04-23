import en from "./en.js";
import zh from "./zh.js";

const TRANSLATIONS = { en, zh };

let currentLang =
  localStorage.getItem("lang") ||
  (navigator.language.startsWith("zh") ? "zh" : "en");

// Subscribers for language changes
const listeners = new Set();

export function t(key) {
  return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS.en[key] || key;
}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// React hook
import { useSyncExternalStore } from "react";

export function useLang() {
  return useSyncExternalStore(
    onLangChange,
    () => currentLang,
    () => currentLang,
  );
}

export function useT() {
  useLang(); // subscribe to changes
  return t;
}
