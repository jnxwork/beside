import { create } from "zustand";

const useBulletinStore = create((set) => ({
  announcements: [],
  notes: [],
  myLikes: new Set(),

  // Actions
  setAnnouncements: (announcements) => set({ announcements }),
  setNotes: (notes) => set({ notes }),
  addNote: (note) => set((s) => ({ notes: [note, ...s.notes] })),
  removeNote: (id) =>
    set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
  updateNoteLikes: (id, likeCount) =>
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, like_count: likeCount } : n,
      ),
    })),
  toggleMyLike: (noteId) =>
    set((s) => {
      const next = new Set(s.myLikes);
      const wasLiked = next.has(noteId);
      if (wasLiked) next.delete(noteId);
      else next.add(noteId);
      return {
        myLikes: next,
        notes: s.notes.map((n) =>
          n.id === noteId
            ? { ...n, like_count: Math.max(0, (n.like_count || 0) + (wasLiked ? -1 : 1)) }
            : n,
        ),
      };
    }),
  setMyLikes: (likes) => set({ myLikes: new Set(likes) }),
}));

export default useBulletinStore;
