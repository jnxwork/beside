import { create } from "zustand";

const useGameStore = create((set) => ({
  room: "focus",
  players: {}, // { [id]: playerData }
  localPlayerId: null,
  catState: null,
  onlineCount: { total: 0, focus: 0, lounge: 0 },

  // Actions
  setRoom: (room) => set({ room }),
  setPlayers: (players) => set({ players }),
  updatePlayer: (id, data) =>
    set((s) => ({
      players: { ...s.players, [id]: { ...s.players[id], ...data } },
    })),
  removePlayer: (id) =>
    set((s) => {
      const next = { ...s.players };
      delete next[id];
      return { players: next };
    }),
  setLocalPlayerId: (id) => set({ localPlayerId: id }),
  setCatState: (catState) => set({ catState }),
  setOnlineCount: (onlineCount) => set({ onlineCount }),
}));

export default useGameStore;
