import { create } from "zustand";

const useChatStore = create((set) => ({
  messages: [],
  activeTab: "all", // "all" | "room" | "nearby"
  chatScope: "room", // sending scope: "room" | "nearby"
  chatVisible: false,
  chatCollapsed: false,
  unreadCount: 0,

  // Actions
  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg].slice(-200) })),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setChatScope: (scope) => set({ chatScope: scope }),
  setChatVisible: (v) => set({ chatVisible: v }),
  setChatCollapsed: (v) => set({ chatCollapsed: v }),
  setUnreadCount: (n) => set({ unreadCount: n }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  clearMessages: () => set({ messages: [] }),
}));

export default useChatStore;
