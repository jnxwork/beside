/**
 * Socket.IO event router — bridges socket events to zustand stores.
 * Canvas code still emits directly via the socket instance.
 */
import { io } from "socket.io-client";
import useGameStore from "../stores/gameStore.js";
import useChatStore from "../stores/chatStore.js";
import useBulletinStore from "../stores/bulletinStore.js";
import useUiStore from "../stores/uiStore.js";
import useAuthStore from "../stores/authStore.js";

// Session persistence
function getSessionToken() {
  let token = localStorage.getItem("sessionToken");
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem("sessionToken", token);
  }
  return token;
}

export function buildSocketAuth() {
  const auth = { sessionToken: getSessionToken() };
  const authToken = localStorage.getItem("authToken");
  if (authToken) auth.authToken = authToken;
  return auth;
}

// Singleton socket — created on first import
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io({ auth: buildSocketAuth() });
    bindEvents(socket);
  }
  return socket;
}

export function reconnectSocket() {
  if (socket) {
    socket.auth = buildSocketAuth();
    socket.disconnect().connect();
  }
}

// Dedup: track recent message IDs to avoid double-adding from game.js + socket.js
const _recentMsgIds = new Set();
const DEDUP_MAX = 300;

function dedupAdd(msg) {
  const key = msg.id || `${msg.time}_${msg.name}_${msg.text}`;
  if (_recentMsgIds.has(key)) return false;
  _recentMsgIds.add(key);
  if (_recentMsgIds.size > DEDUP_MAX) {
    const first = _recentMsgIds.values().next().value;
    _recentMsgIds.delete(first);
  }
  return true;
}

function bindEvents(sock) {
  const game = useGameStore.getState;
  const chat = useChatStore.getState;
  const bulletin = useBulletinStore.getState;
  const ui = useUiStore.getState;

  // Online counts
  sock.on("onlineCount", (data) => {
    useGameStore.setState({ onlineCount: data });
  });

  // Room state
  sock.on("roomState", (data) => {
    if (data.room) useGameStore.setState({ room: data.room });
    if (data.players) useGameStore.setState({ players: data.players });
  });

  // Player join/leave
  sock.on("playerJoin", (player) => {
    game().updatePlayer(player.id, player);
  });

  sock.on("playerLeave", ({ id }) => {
    game().removePlayer(id);
  });

  // Chat
  sock.on("chatMessage", (msg) => {
    if (dedupAdd(msg)) chat().addMessage(msg);
  });

  // Chat history
  sock.on("chatHistory", (history) => {
    for (const msg of history) {
      if (dedupAdd(msg)) chat().addMessage(msg);
    }
  });

  // Bulletin — event names match server emissions
  sock.on("bulletinNotes", ({ announcements, notes, myLikedIds }) => {
    if (announcements) bulletin().setAnnouncements(announcements);
    if (notes) bulletin().setNotes(notes);
    if (myLikedIds) bulletin().setMyLikes(myLikedIds);
  });

  sock.on("bulletinNoteAdded", (note) => {
    const userId = useAuthStore.getState().userId;
    if (userId && note.author_id === userId) {
      note._isMine = true;
    }
    bulletin().addNote(note);
  });

  sock.on("bulletinNoteDeleted", ({ id }) => {
    bulletin().removeNote(id);
  });

  sock.on("bulletinNoteLikeUpdated", ({ noteId, likeCount }) => {
    bulletin().updateNoteLikes(noteId, likeCount);
  });

  // Session restored — handle guest authToken and auth state
  sock.on("sessionRestored", (data) => {
    if (data.authToken) {
      localStorage.setItem("authToken", data.authToken);
    }
    if (data.userId) {
      useAuthStore.getState().setSessionReady(!!data.isRegistered, data.userId);
    }
  });

  // Connection state
  sock.on("connect", () => {
    ui().setLoading(false);
  });

  sock.on("disconnect", () => {
    // Keep UI active, game.js handles reconnect visuals
  });
}
