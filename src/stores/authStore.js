import { create } from "zustand";

const useAuthStore = create((set) => ({
  isLoggedIn: false,
  isRegistered: false,
  authToken: localStorage.getItem("authToken") || null,
  authEmail: localStorage.getItem("authEmail") || null,
  userId: null,

  // Actions
  login: (token, email) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("authEmail", email);
    set({ isLoggedIn: true, isRegistered: true, authToken: token, authEmail: email });
  },
  logout: () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authEmail");
    set({ isLoggedIn: false, isRegistered: false, authToken: null, authEmail: null, userId: null });
  },
  setSessionReady: (isRegistered, userId) => set({ isLoggedIn: true, isRegistered, userId }),
  setUserId: (id) => set({ userId: id }),
}));

export default useAuthStore;
