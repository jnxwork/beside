import { create } from "zustand";

const useFocusStore = create((set, get) => ({
  isFocusing: false,
  focusStartTime: null,
  focusCategory: "working",
  focusTaskName: "",
  elapsed: 0,
  history: JSON.parse(localStorage.getItem("focusHistory") || "[]"),

  // Timer interval ref (not part of state)
  _interval: null,

  // Actions
  startFocus: (category, taskName) => {
    const now = Date.now();
    set({
      isFocusing: true,
      focusStartTime: now,
      focusCategory: category,
      focusTaskName: taskName || "",
      elapsed: 0,
    });
    // Start timer
    const interval = setInterval(() => {
      const { focusStartTime } = get();
      if (focusStartTime) {
        set({ elapsed: Date.now() - focusStartTime });
      }
    }, 1000);
    set({ _interval: interval });
  },

  endFocus: () => {
    const { isFocusing, focusStartTime, focusCategory, focusTaskName, _interval, history } = get();
    if (!isFocusing) return; // guard: avoid double-write when game.js already ended focus
    if (_interval) clearInterval(_interval);
    if (isFocusing && focusStartTime) {
      const endTime = Date.now();
      const duration = endTime - focusStartTime;
      const record = {
        taskName: focusTaskName,
        category: focusCategory,
        duration,
        startTime: focusStartTime,
        endTime,
      };
      const newHistory = [record, ...history].slice(0, 100);
      localStorage.setItem("focusHistory", JSON.stringify(newHistory));
      set({ history: newHistory });
    }
    set({
      isFocusing: false,
      focusStartTime: null,
      focusCategory: "working",
      focusTaskName: "",
      elapsed: 0,
      _interval: null,
    });
  },

  setHistory: (history) => {
    localStorage.setItem("focusHistory", JSON.stringify(history));
    set({ history });
  },

  deleteRecord: (index) => {
    const { history } = get();
    const newHistory = history.filter((_, i) => i !== index);
    localStorage.setItem("focusHistory", JSON.stringify(newHistory));
    set({ history: newHistory });
  },
}));

export default useFocusStore;
