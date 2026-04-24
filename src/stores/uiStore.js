import { create } from "zustand";

const useUiStore = create((set) => ({
  // Popup open states
  welcomeOpen: true,
  welcomeInitialStep: 1, // 1 = edit, 2 = card view
  authOpen: false,
  authMode: "login", // "login" | "register"
  focusPopupOpen: false,
  portalConfirmOpen: false,
  historyOpen: false,
  bulletinOpen: false,
  recapOpen: false,
  customizerOpen: false,
  settingsOpen: false,

  // Player card
  playerCardTarget: null, // { id, x, y }
  overlapSelectorTarget: null, // { players, x, y }

  // Recording
  isRecording: false,
  recProcessing: false,
  recTimeStr: "00:00",

  // Update banner
  updateAvailable: false,

  // Loading
  loading: true,
  loadingText: "Loading...",
  loadingError: false,

  // Actions
  setWelcomeOpen: (v, initialStep) =>
    set({ welcomeOpen: v, ...(initialStep ? { welcomeInitialStep: initialStep } : { welcomeInitialStep: 1 }) }),
  setAuthOpen: (v, mode) =>
    set({ authOpen: v, ...(mode ? { authMode: mode } : {}) }),
  setFocusPopupOpen: (v) => set({ focusPopupOpen: v }),
  setPortalConfirmOpen: (v) => set({ portalConfirmOpen: v }),
  setHistoryOpen: (v) => set({ historyOpen: v }),
  setBulletinOpen: (v) => set({ bulletinOpen: v }),
  setRecapOpen: (v) => set({ recapOpen: v }),
  setCustomizerOpen: (v) => set({ customizerOpen: v }),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setPlayerCardTarget: (v) => set({ playerCardTarget: v }),
  setOverlapSelectorTarget: (v) => set({ overlapSelectorTarget: v }),
  setIsRecording: (v) => set({ isRecording: v, ...(v ? {} : { recTimeStr: "00:00" }) }),
  setRecProcessing: (v) => set({ recProcessing: v }),
  setRecTimeStr: (v) => set({ recTimeStr: v }),
  setUpdateAvailable: (v) => set({ updateAvailable: v }),
  setLoading: (loading, text, error) =>
    set({
      loading,
      ...(text != null ? { loadingText: text } : {}),
      ...(error != null ? { loadingError: error } : {}),
    }),
}));

export default useUiStore;
