import { createRoot } from "react-dom/client";
import "./pxlkit.css";
import "./theme.css";
import App from "./App.jsx";

// Mount React UI layer
const root = createRoot(document.getElementById("ui-root"));
root.render(<App />);

// Expose zustand stores globally for canvas (game.js) interop
import useUiStore from "./stores/uiStore.js";
import useGameStore from "./stores/gameStore.js";
import useFocusStore from "./stores/focusStore.js";
import useChatStore from "./stores/chatStore.js";
import useAuthStore from "./stores/authStore.js";
import useSettingsStore from "./stores/settingsStore.js";
import useBulletinStore from "./stores/bulletinStore.js";

window.__stores = {
  ui: useUiStore,
  game: useGameStore,
  focus: useFocusStore,
  chat: useChatStore,
  auth: useAuthStore,
  settings: useSettingsStore,
  bulletin: useBulletinStore,
};

// i18n bridge for canvas code
import { t, getLang, setLang } from "./i18n/index.js";
window.__i18n = { t, getLang, setLang };

// Notify game.js that React UI is mounted and stores are available
requestAnimationFrame(() => window.__onReactReady?.());
