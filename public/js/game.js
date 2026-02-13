// ============================================================
// Stay Together - Multiplayer co-studying space
// Two rooms: Focus Zone (quiet) & Lounge (chat + music)
// ============================================================

const canvas = document.getElementById("game");
let ctx = canvas.getContext("2d");
const mainCtx = ctx;
const socket = io();

// ============================================================
// TOUCH / RESPONSIVE + CAMERA
// ============================================================
const isTouchDevice = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
const TILE = 32;

// Per-room dimensions (defaults, overwritten by server/Tiled data)
const ROOM_DIMS = {
  focus: { cols: 32, rows: 18 },
  rest:  { cols: 32, rows: 18 },
};
function _roomDims() { try { return ROOM_DIMS[currentRoom] || ROOM_DIMS.focus; } catch(e) { return ROOM_DIMS.focus; } }
function getCols() { return _roomDims().cols; }
function getRows() { return _roomDims().rows; }
function getGameW() { return _roomDims().cols * TILE; }
function getGameH() { return _roomDims().rows * TILE; }

// Camera state
let gameScale = 1;
let dpr = window.devicePixelRatio || 1;
let cameraX = 0;
let cameraY = 0;

function resizeCanvas() {
  dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  // Scale so the game world always covers the viewport (fill, not fit)
  gameScale = Math.max(w / getGameW(), h / getGameH());
}

function updateCamera() {
  if (!localPlayer) return;
  const gw = getGameW();
  const gh = getGameH();
  // Recalculate scale for current room dimensions
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;
  gameScale = Math.max(w / gw, h / gh);
  const viewW = w / gameScale;
  const viewH = h / gameScale;
  if (viewW >= gw) {
    cameraX = (gw - viewW) / 2; // center
  } else {
    const tx = localPlayer.x - viewW / 2;
    cameraX = Math.max(0, Math.min(gw - viewW, tx));
  }
  if (viewH >= gh) {
    cameraY = (gh - viewH) / 2; // center
  } else {
    const ty = localPlayer.y - viewH / 2;
    cameraY = Math.max(0, Math.min(gh - viewH, ty));
  }
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", () => setTimeout(resizeCanvas, 100));
resizeCanvas();

// Convert screen coords to game coords (accounts for camera + scale)
function screenToGame(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = (clientX - rect.left) * (canvas.width / rect.width);
  const sy = (clientY - rect.top) * (canvas.height / rect.height);
  return {
    x: sx / (gameScale * dpr) + cameraX,
    y: sy / (gameScale * dpr) + cameraY,
  };
}

// ============================================================
// I18N
// ============================================================
const TRANSLATIONS = {
  en: {
    focusZone: "Focus Zone",
    lounge: "Lounge",
    portalToLounge: "Lounge \u2192",
    portalToFocus: "\u2190 Focus Zone",
    startFocus: "Start Focus",
    endFocus: "End Focus",
    focusPopupTitle: "What are you focusing on?",
    catStudying: "\u{1F4D6} Study",
    catWorking: "\u{1F4BC} Work",
    catCreating: "\u{1F4DD} Create",
    catReading: "\u{1F4DA} Read",
    taskPlaceholder: "Task name (optional)...",
    start: "Start",
    cancel: "Cancel",
    portalConfirmTitle: "End focus and go to Lounge?",
    portalConfirmYes: "Yes, take a break",
    portalConfirmNo: "Keep focusing",
    goingToRest: "Going to rest...",
    namePlaceholder: "Your name...",
    chatTitle: "Lounge Chat",
    chatPlaceholder: "Say something...",
    send: "Send",
    hide: "Hide",
    chat: "Chat",
    soundOff: "Sound: OFF",
    soundOn: "Sound: ON",
    hint: "Arrow keys / WASD to move | Walk to the portal to switch rooms",
    hintMobile: "Use joystick to move | Walk to the portal to switch rooms",
    online: "Online",
    total: "Total",
    // Status labels
    studying: "Studying",
    working: "Working",
    reading: "Reading",
    coding: "Coding",
    resting: "Resting",
    chatting: "Chatting",
    listening: "Listening",
    watching: "Watching",
    napping: "Napping",
    snacking: "Snacking",
    browsing: "Browsing",
    wandering: "Wandering",
    daydreaming: "Daydreaming",
    grabCoffee: "Going to grab some coffee...",
    checkingIn: "Checking in...",
    joinedLounge: "joined the Lounge",
    leftLounge: "left",
    welcomeTitle: "What would you like to be called?",
    welcomeHint: "You can change it anytime in \u2699\uFE0F",
    welcomeEnter: "Enter",
    lang: "\u{4E2D}\u6587",
    historyTitle: "Focus History",
    historyToday: "Today",
    historySessions: "sessions",
    historyLast7Days: "Last 7 Days",
    historyRecentSessions: "Recent Sessions",
    historyNoData: "No focus sessions yet",
    historyClose: "Close",
    historyMin: "min",
    historyH: "h",
    reacted: "sent you",
    reactedTo: "You sent",
    reactedToSuffix: "",
    chooseCharacter: "Choose your look",
  },
  zh: {
    focusZone: "\u4E13\u6CE8\u533A",
    lounge: "\u4F11\u95F2\u533A",
    portalToLounge: "\u4F11\u95F2\u533A \u2192",
    portalToFocus: "\u2190 \u4E13\u6CE8\u533A",
    startFocus: "\u5F00\u59CB\u4E13\u6CE8",
    endFocus: "\u7ED3\u675F\u4E13\u6CE8",
    focusPopupTitle: "\u4F60\u8981\u4E13\u6CE8\u505A\u4EC0\u4E48\uFF1F",
    catStudying: "\u{1F4D6} \u5B66\u4E60",
    catWorking: "\u{1F4BC} \u5DE5\u4F5C",
    catCreating: "\u{1F4DD} \u521B\u4F5C",
    catReading: "\u{1F4DA} \u9605\u8BFB",
    taskPlaceholder: "\u4EFB\u52A1\u540D\u79F0\uFF08\u53EF\u9009\uFF09...",
    start: "\u5F00\u59CB",
    cancel: "\u53D6\u6D88",
    portalConfirmTitle: "\u7ED3\u675F\u4E13\u6CE8\u5E76\u53BB\u4F11\u95F2\u533A\uFF1F",
    portalConfirmYes: "\u53BB\u4F11\u606F\u4E00\u4E0B",
    portalConfirmNo: "\u7EE7\u7EED\u4E13\u6CE8",
    goingToRest: "\u53BB\u4F11\u606F\u4E00\u4E0B...",
    namePlaceholder: "\u4F60\u7684\u540D\u5B57...",
    chatTitle: "\u4F11\u95F2\u533A\u804A\u5929",
    chatPlaceholder: "\u8BF4\u70B9\u4EC0\u4E48...",
    send: "\u53D1\u9001",
    hide: "\u6536\u8D77",
    chat: "\u804A\u5929",
    soundOff: "\u58F0\u97F3: \u5173",
    soundOn: "\u58F0\u97F3: \u5F00",
    hint: "\u65B9\u5411\u952E / WASD \u79FB\u52A8 | \u8D70\u5230\u4F20\u9001\u95E8\u5207\u6362\u623F\u95F4",
    hintMobile: "\u6447\u6746\u79FB\u52A8 | \u8D70\u5230\u4F20\u9001\u95E8\u5207\u6362\u623F\u95F4",
    online: "\u5728\u7EBF",
    total: "\u603B\u8BA1",
    studying: "\u5B66\u4E60\u4E2D",
    working: "\u5DE5\u4F5C\u4E2D",
    reading: "\u9605\u8BFB\u4E2D",
    coding: "\u7F16\u7A0B\u4E2D",
    resting: "\u4F11\u606F\u4E2D",
    chatting: "\u804A\u5929\u4E2D",
    listening: "\u542C\u6B4C\u4E2D",
    watching: "\u8FFD\u5267\u4E2D",
    napping: "\u5C0F\u61A9\u4E2D",
    snacking: "\u5403\u4E1C\u897F",
    browsing: "\u5237\u624B\u673A",
    wandering: "\u95F2\u901B\u4E2D",
    daydreaming: "\u53D1\u5446\u4E2D",
    grabCoffee: "\u53BB\u559D\u676F\u5496\u5561...",
    checkingIn: "\u7B7E\u5230\u4E2D...",
    joinedLounge: "\u52A0\u5165\u4E86\u4F11\u95F2\u533A",
    leftLounge: "\u79BB\u5F00\u4E86",
    welcomeTitle: "\u4F60\u60F3\u88AB\u600E\u4E48\u79F0\u547C\uFF1F",
    welcomeHint: "\u53EF\u4EE5\u968F\u65F6\u5728\u53F3\u4E0A\u89D2 \u2699\uFE0F \u4E2D\u4FEE\u6539",
    welcomeEnter: "\u8FDB\u5165",
    lang: "EN",
    historyTitle: "\u4E13\u6CE8\u8BB0\u5F55",
    historyToday: "\u4ECA\u5929",
    historySessions: "\u6B21",
    historyLast7Days: "\u8FD1 7 \u5929",
    historyRecentSessions: "\u6700\u8FD1\u8BB0\u5F55",
    historyNoData: "\u8FD8\u6CA1\u6709\u4E13\u6CE8\u8BB0\u5F55",
    historyClose: "\u5173\u95ED",
    historyMin: "\u5206\u949F",
    historyH: "\u5C0F\u65F6",
    reacted: "\u5BF9\u4F60\u53D1\u9001\u4E86",
    reactedTo: "\u4F60\u5BF9",
    reactedToSuffix: "\u53D1\u9001\u4E86",
    chooseCharacter: "\u9009\u62E9\u89D2\u8272",
  },
};

let currentLang = localStorage.getItem("lang") ||
  (navigator.language.startsWith("zh") ? "zh" : "en");

function t(key) {
  return TRANSLATIONS[currentLang][key] || TRANSLATIONS.en[key] || key;
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  applyLanguage();
}

function toggleLanguage() {
  setLanguage(currentLang === "en" ? "zh" : "en");
}

function applyLanguage() {
  // Static HTML elements
  document.getElementById("lang-toggle").textContent = t("lang");
  document.getElementById("name-input").placeholder = t("namePlaceholder");
  document.getElementById("chat-input").placeholder = t("chatPlaceholder");
  document.getElementById("chat-send").textContent = t("send");
  document.getElementById("chat-title").textContent = t("chatTitle");
  document.getElementById("music-toggle").textContent = t("soundOff");
  document.getElementById("hint").textContent = t(isTouchDevice ? "hintMobile" : "hint");

  // Focus popup
  document.querySelector(".focus-popup-title").textContent = t("focusPopupTitle");
  const catBtns = document.querySelectorAll(".focus-cat-btn");
  const catKeys = ["catStudying", "catWorking", "catCreating", "catReading"];
  catBtns.forEach((btn, i) => { btn.textContent = t(catKeys[i]); });
  document.getElementById("focus-task-input").placeholder = t("taskPlaceholder");
  document.getElementById("focus-confirm").textContent = t("start");
  document.getElementById("focus-cancel").textContent = t("cancel");

  // Portal confirm
  const portalTitle = document.querySelector("#focus-portal-confirm .focus-popup-title");
  if (portalTitle) portalTitle.textContent = t("portalConfirmTitle");
  document.getElementById("focus-portal-yes").textContent = t("portalConfirmYes");
  document.getElementById("focus-portal-no").textContent = t("portalConfirmNo");

  // Auto-walk hint
  document.getElementById("autowalk-hint").textContent = t("grabCoffee");

  // Welcome popup
  const wt = document.querySelector(".welcome-title");
  if (wt) wt.textContent = t("welcomeTitle");
  const wh = document.querySelector(".welcome-hint");
  if (wh) wh.textContent = t("welcomeHint");
  const we = document.getElementById("welcome-enter");
  if (we) we.textContent = t("welcomeEnter");
  const wn = document.getElementById("welcome-name");
  if (wn) wn.placeholder = t("namePlaceholder");
  const cpl = document.getElementById("char-picker-label");
  if (cpl) cpl.textContent = t("chooseCharacter");

  // Chat toggle
  const chatPanel = document.getElementById("chat-panel");
  const chatToggle = document.getElementById("chat-toggle");
  if (chatToggle && chatPanel) {
    chatToggle.textContent = chatPanel.classList.contains("collapsed") ? t("chat") : t("hide");
  }

  // History popup
  const hpt = document.querySelector(".history-popup-title");
  if (hpt) hpt.textContent = t("historyTitle");
  const htl = document.querySelector(".history-today-label");
  if (htl) htl.textContent = t("historyToday");
  const hsl = document.querySelectorAll(".history-section-label");
  if (hsl[0]) hsl[0].textContent = t("historyLast7Days");
  if (hsl[1]) hsl[1].textContent = t("historyRecentSessions");
  const hc = document.getElementById("history-close");
  if (hc) hc.textContent = t("historyClose");

  // Re-apply dynamic UI
  if (typeof updateRoomUI === "function") updateRoomUI();
}

// --- Constants ---
const PLAYER_SIZE = 24;
const SPEED = 2;
const PORTAL_TILE = 8; // New tile type for portals

// --- Sprite images & tileset registry ---
const spriteImages = {};
function loadSpriteImage(name, src) {
  const img = new Image();
  img.onload = () => { img._loaded = true; };
  img.src = src;
  spriteImages[name] = img;
  return img;
}
loadSpriteImage("room_builder_office", "/assets/modern_office/1_Room_Builder_Office/Room_Builder_Office_32x32.png");
loadSpriteImage("modern_office", "/assets/modern_office/Modern_Office_32x32.png");
loadSpriteImage("mi_room_builder", "/assets/moderninteriors-win/1_Interiors/32x32/Room_Builder_32x32.png");
loadSpriteImage("mi_interiors", "/assets/moderninteriors-win/1_Interiors/32x32/Interiors_32x32.png");
const doorSlidingImg = loadSpriteImage("door_sliding", "/assets/moderninteriors-win/3_Animated_objects/32x32/spritesheets/animated_door_glass_sliding_32x32.png");
loadSpriteImage("animated_cat", "/assets/moderninteriors-win/3_Animated_objects/16x16/spritesheets/animated_cat.png");
loadSpriteImage("animated_coffee", "/assets/moderninteriors-win/3_Animated_objects/32x32/spritesheets/animated_coffee_32x32.png");

// Animated object tileset metadata (keyed by .tsj filename without extension)
const OBJECT_TILESETS = {
  banli:  { imgKey: "animated_cat",    tileW: 48, tileH: 16, columns: 12, frameCount: 12 },
  coffee: { imgKey: "animated_coffee", tileW: 32, tileH: 32, columns: 6,  frameCount: 12 },
};

// --- Character sprite sheets ---
const CHARACTER_NAMES = ["Adam", "Alex", "Amelia", "Ash", "Bob", "Bruce", "Dan", "Edward"];
const CHAR_SPRITE_BASE = "/assets/moderninteriors-win/2_Characters/Old/Single_Characters_Legacy/32x32/";
for (const cname of CHARACTER_NAMES) {
  loadSpriteImage(`char_${cname}_idle`, CHAR_SPRITE_BASE + `${cname}_idle_anim_32x32.png`);
  loadSpriteImage(`char_${cname}_run`,  CHAR_SPRITE_BASE + `${cname}_run_32x32.png`);
}

// --- Character picker ---
let selectedCharacter = localStorage.getItem("playerCharacter") || CHARACTER_NAMES[0];

function drawCharPreview(canvas, charName) {
  canvas.width = 32;
  canvas.height = 64;
  const c = canvas.getContext("2d");
  c.imageSmoothingEnabled = false;
  const sheet = spriteImages[`char_${charName}_idle`];
  if (sheet && sheet._loaded) {
    // idle-down frame 0: col 18 (SPRITE_DIR_OFFSET.down=18), row 0, 32×64
    c.drawImage(sheet, 18 * 32, 0, 32, 64, 0, 0, 32, 64);
  } else {
    // Retry once sprite loads
    const img = spriteImages[`char_${charName}_idle`];
    if (img) img.onload = () => {
      img._loaded = true;
      c.drawImage(img, 18 * 32, 0, 32, 64, 0, 0, 32, 64);
    };
  }
}

function buildCharPicker(containerId, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  CHARACTER_NAMES.forEach(name => {
    const cell = document.createElement("div");
    cell.className = "char-pick" + (name === selectedCharacter ? " selected" : "");
    cell.dataset.char = name;
    const cvs = document.createElement("canvas");
    cvs.style.width = "32px";
    cvs.style.height = "48px";
    cvs.style.objectFit = "contain";
    cell.appendChild(cvs);
    container.appendChild(cell);
    drawCharPreview(cvs, name);
    cell.addEventListener("click", () => {
      container.querySelectorAll(".char-pick").forEach(c => c.classList.remove("selected"));
      cell.classList.add("selected");
      onSelect(name);
    });
  });
}

function updateSettingsCharBtn() {
  const btn = document.getElementById("settings-char-btn");
  if (!btn) return;
  let cvs = btn.querySelector("canvas");
  if (!cvs) {
    cvs = document.createElement("canvas");
    cvs.style.width = "24px";
    cvs.style.height = "28px";
    cvs.style.objectFit = "contain";
    btn.appendChild(cvs);
  }
  drawCharPreview(cvs, selectedCharacter);
}

// Init pickers once sprites are likely loaded
setTimeout(() => {
  function onCharSelect(name) {
    selectedCharacter = name;
    localStorage.setItem("playerCharacter", name);
    if (localPlayer) {
      localPlayer.character = name;
      socket.emit("setCharacter", name);
    }
    // Sync both pickers
    document.querySelectorAll(".char-picker-grid").forEach(grid => {
      grid.querySelectorAll(".char-pick").forEach(c => {
        c.classList.toggle("selected", c.dataset.char === name);
      });
    });
    updateSettingsCharBtn();
  }
  buildCharPicker("welcome-char-grid", onCharSelect);
  buildCharPicker("settings-char-grid", (name) => {
    onCharSelect(name);
    // Close settings picker after selection
    const picker = document.getElementById("settings-char-picker");
    if (picker) picker.classList.remove("visible");
  });
  updateSettingsCharBtn();
}, 500);

// Settings character button toggle
document.getElementById("settings-char-btn")?.addEventListener("click", (e) => {
  e.stopPropagation();
  const picker = document.getElementById("settings-char-picker");
  if (picker) picker.classList.toggle("visible");
});
// Close settings char picker when clicking outside
document.addEventListener("click", (e) => {
  const picker = document.getElementById("settings-char-picker");
  const wrap = document.getElementById("settings-char-wrap");
  if (picker && wrap && !wrap.contains(e.target)) {
    picker.classList.remove("visible");
  }
});

// Known tileset metadata (columns needed to compute source rect from GID)
const TILESET_INFO = {
  tileset_game:          { columns: 13, imgKey: null },
  room_builder_office:   { columns: 16, imgKey: "room_builder_office" },
  modern_office:         { columns: 16, imgKey: "modern_office" },
  mi_room_builder:       { columns: 76, imgKey: "mi_room_builder" },
  mi_interiors:          { columns: 16, imgKey: "mi_interiors" },
};

// Populated from Tiled JSON tilesets array
let tilesetRegistry = []; // [{firstgid, img, columns}, ...]

function drawTileByGID(gid, x, y) {
  if (gid === 0) return false;
  for (let i = tilesetRegistry.length - 1; i >= 0; i--) {
    const ts = tilesetRegistry[i];
    if (gid >= ts.firstgid) {
      if (!ts.img || !ts.img._loaded) return false;
      const localId = gid - ts.firstgid;
      const sx = (localId % ts.columns) * 32;
      const sy = Math.floor(localId / ts.columns) * 32;
      ctx.drawImage(ts.img, sx, sy, 32, 32, x, y, TILE + 1, TILE + 1);
      return true;
    }
  }
  return false;
}

// --- Current room ---
let currentRoom = "focus";

// ============================================================
// ANIMATED DOOR SYSTEM
// ============================================================
const DOOR_FRAME_W = 64;   // sprite frame width (2 tiles)
const DOOR_FRAME_H = 64;   // sprite frame height (2 tiles)
const DOOR_OPEN_FRAMES = 7; // frames 0-6 = opening sequence
const DOOR_FRAME_MS = 80;   // ms per animation frame
const DOOR_TRIGGER_DIST = 3 * TILE; // proximity trigger distance

// Door objects per room: { room: [{ x, y, tileX, tileY, state, frame, lastTime }, ...] }
const roomDoors = { focus: [], rest: [] };

function findDoorsInCollision(collision, cols, rows) {
  const doors = [];
  const visited = new Set();
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      if (collision[r][c] === 12 && !visited.has(r + "," + c)) {
        // Each door occupies 2×2 tiles - group from top-left
        for (let dr = 0; dr < 2; dr++)
          for (let dc = 0; dc < 2; dc++)
            visited.add((r + dr) + "," + (c + dc));
        doors.push({
          tileX: c, tileY: r,
          x: c * TILE, y: r * TILE,
          state: "closed", // closed | opening | open | closing
          frame: 0,
          lastTime: 0,
        });
        c++; // skip next col (already part of this door)
      }
    }
  }
  return doors;
}

function isAnyPlayerNearDoor(door) {
  const cx = door.x + DOOR_FRAME_W / 2;
  const cy = door.y + DOOR_FRAME_H / 2;
  // Check local player
  if (localPlayer) {
    const dx = localPlayer.x - cx, dy = localPlayer.y - cy;
    if (Math.sqrt(dx * dx + dy * dy) < DOOR_TRIGGER_DIST) return true;
  }
  // Check remote players
  for (const id in players) {
    const p = players[id];
    if (p.room !== currentRoom) continue;
    const dx = p.x - cx, dy = p.y - cy;
    if (Math.sqrt(dx * dx + dy * dy) < DOOR_TRIGGER_DIST) return true;
  }
  return false;
}

function updateDoors() {
  const doors = roomDoors[currentRoom];
  if (!doors || !doors.length) return;
  const now = Date.now();

  // All doors in the room share the same open/close state (linked doors)
  const anyNear = doors.some(d => isAnyPlayerNearDoor(d));

  for (const door of doors) {
    if (anyNear && (door.state === "closed" || door.state === "closing")) {
      door.state = "opening";
      if (door.frame >= DOOR_OPEN_FRAMES - 1) door.frame = 0;
      door.lastTime = now;
    } else if (!anyNear && (door.state === "open" || door.state === "opening")) {
      door.state = "closing";
      if (door.frame <= 0) door.frame = DOOR_OPEN_FRAMES - 1;
      door.lastTime = now;
    }

    if (door.state === "opening") {
      if (now - door.lastTime >= DOOR_FRAME_MS) {
        door.frame++;
        door.lastTime = now;
        if (door.frame >= DOOR_OPEN_FRAMES - 1) {
          door.frame = DOOR_OPEN_FRAMES - 1;
          door.state = "open";
        }
      }
    } else if (door.state === "closing") {
      if (now - door.lastTime >= DOOR_FRAME_MS) {
        door.frame--;
        door.lastTime = now;
        if (door.frame <= 0) {
          door.frame = 0;
          door.state = "closed";
        }
      }
    }
  }
}

function isDoorOpenAt(col, row) {
  const doors = roomDoors[currentRoom];
  if (!doors) return false;
  for (const d of doors) {
    if (col >= d.tileX && col < d.tileX + 2 && row >= d.tileY && row < d.tileY + 2) {
      return d.state === "open" || (d.state === "opening" && d.frame >= 3);
    }
  }
  return false;
}

function isDoorTile(col, row) {
  const doors = roomDoors[currentRoom];
  if (!doors) return false;
  for (const d of doors) {
    if (col >= d.tileX && col < d.tileX + 2 && row >= d.tileY && row < d.tileY + 2) return true;
  }
  return false;
}

// ============================================================
// ROOM MAPS
// ============================================================
// 0=floor, 1=wall, 2=desk, 3=bookshelf, 4=plant, 5=rug,
// 6=(unused), 7=chair, 8=portal, 9=sofa, 10=coffee_machine, 12=door

// --- Focus Room Colors ---
const FOCUS_COLORS = {
  floor: "#b8c4d0",
  floorDark: "#a8b6c4",
  wall: "#8a96a6",
  wallTop: "#98a4b4",
  wallDark: "#7a8898",
  desk: "#6a7a8a",
  deskTop: "#7a8a9a",
  chair: "#5a7a8a",
  bookshelf: "#5c6a78",
  bookColors: ["#c07060", "#4a8ab8", "#5a9a6a", "#d4a040", "#8a70a8"],
  plant: "#5a9a68",
  plantPot: "#8a9aa8",
  rug: "#8a9cb0",
  rugAlt: "#7e90a4",
  portal: "#e07080",
  portalGlow: "#f0909a",
};

// --- Rest Room Colors ---
const REST_COLORS = {
  floor: "#8b6f55",
  floorDark: "#7d6349",
  wall: "#c0a0b8",
  wallTop: "#d0b0c8",
  wallDark: "#b090a8",
  desk: "#a07848",
  deskTop: "#b88858",
  sofa: "#c07898",
  sofaTop: "#d088a8",
  bookshelf: "#8a6838",
  bookColors: ["#e07060", "#e0a040", "#60b070", "#e08040", "#d06090"],
  plant: "#5a9a68",
  plantPot: "#c09060",
  rug: "#a08070",
  rugAlt: "#947464",
  coffeeMachine: "#787878",
  coffeeTop: "#909090",
  portal: "#60a0d0",
  portalGlow: "#80b8e0",
};

// --- Time-of-Day Visual Config ---
let cachedTimeKey = "daytime";
const TIME_VISUALS = {
  morning: {
    windowGlass: "#ffe8a0",
    windowGlow: "rgba(255,230,160,0.12)",
    overlayColor: "rgba(255,200,100,0.04)",
    vignetteAlpha: 0.08,
    skyColors: ["#ffd080", "#87ceeb"],
    starCount: 0,
  },
  daytime: {
    windowGlass: "#a8e0ff",
    windowGlow: "rgba(180,220,255,0.08)",
    overlayColor: null,
    vignetteAlpha: 0.1,
    skyColors: ["#87ceeb", "#b0d8f0"],
    starCount: 0,
  },
  dusk: {
    windowGlass: "#f0a050",
    windowGlow: "rgba(240,160,80,0.15)",
    overlayColor: "rgba(180,100,50,0.06)",
    vignetteAlpha: 0.15,
    skyColors: ["#e87040", "#d4a060", "#6080b0"],
    starCount: 0,
  },
  night: {
    windowGlass: "#304870",
    windowGlow: "rgba(80,120,180,0.06)",
    overlayColor: "rgba(20,30,60,0.12)",
    vignetteAlpha: 0.25,
    skyColors: ["#1a1a3a", "#252550"],
    starCount: 5,
  },
};

// (ROOM_TILES removed - sprite coords now come from Tiled GIDs)

function buildFocusMap() {
  const COLS = 32, ROWS = 18; // fallback hardcoded defaults
  const map = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        row.push(1);
      }
      // Bookshelves along top wall (4 groups)
      else if (r === 1 && c >= 2 && c <= 5) row.push(3);
      else if (r === 1 && c >= 10 && c <= 13) row.push(3);
      else if (r === 1 && c >= 18 && c <= 21) row.push(3);
      else if (r === 1 && c >= 26 && c <= 29) row.push(3);
      // Plants in corners and bottom
      else if (r === 1 && (c === 1 || c === 30)) row.push(4);
      else if (r === 14 && (c === 1 || c === 30)) row.push(4);
      else if (r === 16 && (c === 1 || c === 30)) row.push(4);
      // --- Top desk row (r=3,4) ---
      // 1-person desk (left): desk at c=3, chair at c=4
      else if ((r === 3 || r === 4) && c === 3) row.push(2);
      else if ((r === 3 || r === 4) && c === 4) row.push(7);
      // 2-person desk (mid-left): desk at c=8-9, chair at c=10
      else if ((r === 3 || r === 4) && (c === 8 || c === 9)) row.push(2);
      else if ((r === 3 || r === 4) && c === 10) row.push(7);
      // 4-person desk (center): desk at c=14-17 (r=3), chair at c=14-17 (r=4)
      else if (r === 3 && c >= 14 && c <= 17) row.push(2);
      else if (r === 4 && c >= 14 && c <= 17) row.push(7);
      // 2-person desk (mid-right): desk at c=21-22, chair at c=23
      else if ((r === 3 || r === 4) && (c === 21 || c === 22)) row.push(2);
      else if ((r === 3 || r === 4) && c === 23) row.push(7);
      // 1-person desk (right): desk at c=27, chair at c=28
      else if ((r === 3 || r === 4) && c === 27) row.push(2);
      else if ((r === 3 || r === 4) && c === 28) row.push(7);
      // --- Bottom desk row (r=11,12) ---
      // 1-person desk (left): desk at c=3, chair at c=4
      else if ((r === 11 || r === 12) && c === 3) row.push(2);
      else if ((r === 11 || r === 12) && c === 4) row.push(7);
      // 2-person desk (mid-left): desk at c=8-9, chair at c=10
      else if ((r === 11 || r === 12) && (c === 8 || c === 9)) row.push(2);
      else if ((r === 11 || r === 12) && c === 10) row.push(7);
      // 4-person desk (center): desk at c=14-17 (r=11), chair at c=14-17 (r=12)
      else if (r === 11 && c >= 14 && c <= 17) row.push(2);
      else if (r === 12 && c >= 14 && c <= 17) row.push(7);
      // 2-person desk (mid-right): desk at c=21-22, chair at c=23
      else if ((r === 11 || r === 12) && (c === 21 || c === 22)) row.push(2);
      else if ((r === 11 || r === 12) && c === 23) row.push(7);
      // 1-person desk (right): desk at c=27, chair at c=28
      else if ((r === 11 || r === 12) && c === 27) row.push(2);
      else if ((r === 11 || r === 12) && c === 28) row.push(7);
      // Center rug
      else if (r >= 7 && r <= 8 && c >= 11 && c <= 20) row.push(5);
      // Portal to rest zone (top center)
      else if (r <= 1 && c >= 15 && c <= 16) row.push(8);
      else row.push(0);
    }
    map.push(row);
  }
  return map;
}

function buildRestMap() {
  const COLS = 32, ROWS = 18; // fallback hardcoded defaults
  const map = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        row.push(1);
      }
      // Coffee machine along top wall
      else if (r === 1 && c >= 2 && c <= 4) row.push(10);
      // Small bookshelf
      else if (r === 1 && c >= 27 && c <= 29) row.push(3);
      // Sofas - left lounge
      else if (r >= 4 && r <= 5 && c >= 2 && c <= 4) row.push(9);
      // Sofas - right lounge
      else if (r >= 4 && r <= 5 && c >= 27 && c <= 29) row.push(9);
      // Center rug (big lounge area)
      else if (r >= 6 && r <= 13 && c >= 8 && c <= 23) row.push(5);
      // Sofas around rug
      else if (r >= 7 && r <= 8 && c >= 4 && c <= 5) row.push(9);
      else if (r >= 11 && r <= 12 && c >= 4 && c <= 5) row.push(9);
      else if (r >= 7 && r <= 8 && c >= 26 && c <= 27) row.push(9);
      else if (r >= 11 && r <= 12 && c >= 26 && c <= 27) row.push(9);
      // Small tables on rug
      else if (r === 9 && c === 12) row.push(2);
      else if (r === 9 && c === 19) row.push(2);
      // Plants
      else if ((r === 1 && c === 1) || (r === 1 && c === COLS - 2)) row.push(4);
      else if ((r === ROWS - 2 && c === 1) || (r === ROWS - 2 && c === COLS - 2)) row.push(4);
      else if (r === 1 && c === 16) row.push(4);
      // Portal back to focus zone (bottom center)
      else if (r === ROWS - 2 && c >= 14 && c <= 17) row.push(8);
      else row.push(0);
    }
    map.push(row);
  }
  return map;
}

// Room data: collision (2D array of types), floorGIDs (flat array), objectLayers (array of flat arrays)
const ROOM_DATA = {
  focus: { collision: buildFocusMap(), floorGIDs: null, wallGIDs: null, objectLayers: [], aboveLayers: [], mapObjects: [] },
  rest:  { collision: buildRestMap(),  floorGIDs: null, wallGIDs: null, objectLayers: [], aboveLayers: [], mapObjects: [] },
};

// Parse 3-layer Tiled JSON into room data
function parseTiledMapLayers(data) {
  const result = {};
  // Find collision firstgid (tileset_game is always first)
  const gameFirstgid = data.tilesets[0].firstgid;

  // Flatten layers (handle group layers that nest tilelayers)
  function visitLayers(layers) {
    for (const layer of layers) {
      if (layer.type === "group" && layer.layers) {
        visitLayers(layer.layers);
        continue;
      }
      if (layer.name === "collision" && layer.data) {
        const map = [];
        for (let r = 0; r < layer.height; r++) {
          const row = [];
          for (let c = 0; c < layer.width; c++) {
            const gid = layer.data[r * layer.width + c];
            row.push(gid === 0 ? 0 : gid - gameFirstgid);
          }
          map.push(row);
        }
        result.collision = map;
        result.cols = layer.width;
        result.rows = layer.height;
      } else if (layer.name === "floor" && layer.data) {
        result.floorGIDs = layer.data;
        result.floorCols = layer.width;
      } else if (layer.name === "wall" && layer.data) {
        result.wallGIDs = layer.data;
        result.wallCols = layer.width;
      } else if (layer.type === "tilelayer" && layer.data &&
                 layer.name !== "collision" && layer.name !== "floor" && layer.name !== "wall") {
        // "above*" layers render on top of players; everything else ("below*", "objects*") renders below
        const n = layer.name.toLowerCase();
        if (n === "above" || n.startsWith("above")) {
          if (!result.aboveLayers) result.aboveLayers = [];
          result.aboveLayers.push(layer.data);
        } else {
          if (!result.objectLayers) result.objectLayers = [];
          result.objectLayers.push(layer.data);
        }
      } else if (layer.type === "objectgroup" && layer.objects) {
        for (const obj of layer.objects) {
          if (!obj.gid) continue; // only tile objects
          const props = {};
          if (obj.properties) {
            for (const p of obj.properties) props[p.name] = p.value;
          }
          if (!result.mapObjects) result.mapObjects = [];
          result.mapObjects.push({
            x: obj.x,
            y: obj.y - obj.height, // Tiled tile objects have y at bottom
            width: obj.width,
            height: obj.height,
            gid: obj.gid,
            type: obj.type || "",
            name: props.name || obj.name || "",
            allowedPlayer: props.allowedPlayer || "",
          });
        }
      }
    }
  }
  visitLayers(data.layers);

  // Build tileset registry (once, from first loaded map)
  if (!tilesetRegistry.length && data.tilesets) {
    tilesetRegistry = data.tilesets.map(ts => {
      const name = ts.source ? ts.source.replace(".tsj", "").replace(/.tsx$/, "").replace(/^:\//, "") : "";
      const info = TILESET_INFO[name] || {};
      const objInfo = OBJECT_TILESETS[name];
      return {
        firstgid: ts.firstgid,
        name,
        img: (objInfo ? spriteImages[objInfo.imgKey] : null) || (info.imgKey ? spriteImages[info.imgKey] : null),
        columns: (objInfo ? objInfo.columns : null) || info.columns || 1,
        tileW: objInfo ? objInfo.tileW : 32,
        tileH: objInfo ? objInfo.tileH : 32,
        frameCount: objInfo ? objInfo.frameCount : 0,
      };
    }).sort((a, b) => a.firstgid - b.firstgid);
  }

  return result;
}

(async function loadTiledMaps() {
  try {
    const [focusRes, restRes] = await Promise.all([
      fetch("/maps/focus.json"),
      fetch("/maps/rest.json"),
    ]);
    if (focusRes.ok && restRes.ok) {
      const focusParsed = parseTiledMapLayers(await focusRes.json());
      const restParsed  = parseTiledMapLayers(await restRes.json());
      if (focusParsed.collision) ROOM_DATA.focus.collision = focusParsed.collision;
      ROOM_DATA.focus.floorGIDs    = focusParsed.floorGIDs;
      ROOM_DATA.focus.floorCols    = focusParsed.floorCols || focusParsed.cols;
      ROOM_DATA.focus.wallGIDs     = focusParsed.wallGIDs;
      ROOM_DATA.focus.wallCols     = focusParsed.wallCols || focusParsed.cols;
      ROOM_DATA.focus.objectLayers = focusParsed.objectLayers || [];
      ROOM_DATA.focus.aboveLayers  = focusParsed.aboveLayers || [];
      ROOM_DATA.focus.mapObjects   = focusParsed.mapObjects || [];
      if (focusParsed.cols) ROOM_DIMS.focus = { cols: focusParsed.cols, rows: focusParsed.rows };
      if (restParsed.collision)  ROOM_DATA.rest.collision = restParsed.collision;
      ROOM_DATA.rest.floorGIDs    = restParsed.floorGIDs;
      ROOM_DATA.rest.floorCols    = restParsed.floorCols || restParsed.cols;
      ROOM_DATA.rest.wallGIDs     = restParsed.wallGIDs;
      ROOM_DATA.rest.wallCols     = restParsed.wallCols || restParsed.cols;
      ROOM_DATA.rest.objectLayers = restParsed.objectLayers || [];
      ROOM_DATA.rest.aboveLayers  = restParsed.aboveLayers || [];
      ROOM_DATA.rest.mapObjects   = restParsed.mapObjects || [];
      if (restParsed.cols) ROOM_DIMS.rest = { cols: restParsed.cols, rows: restParsed.rows };
      // Detect door tiles from collision layers
      if (focusParsed.collision) roomDoors.focus = findDoorsInCollision(focusParsed.collision, focusParsed.cols, focusParsed.rows);
      if (restParsed.collision) roomDoors.rest = findDoorsInCollision(restParsed.collision, restParsed.cols, restParsed.rows);
      console.log("[Maps] Loaded Tiled maps. Focus:", ROOM_DIMS.focus, "Rest:", ROOM_DIMS.rest, "Doors:", roomDoors);
    }
  } catch (e) {
    console.warn("[Maps] Using fallback builders:", e);
  }
})();

function getCurrentMap() {
  return ROOM_DATA[currentRoom].collision;
}

// --- Tile walkability ---
function isWalkable(tileType, col, row) {
  if (tileType === 12) return isDoorOpenAt(col, row);
  return tileType === 0 || tileType === 5 || tileType === 7 || tileType === 8;
}

function canMoveTo(x, y) {
  const map = getCurrentMap();
  const half = PLAYER_SIZE / 2 - 2;
  const points = [
    { x: x - half, y: y - half },
    { x: x + half, y: y - half },
    { x: x - half, y: y + half },
    { x: x + half, y: y + half },
  ];
  for (const p of points) {
    const col = Math.floor(p.x / TILE);
    const row = Math.floor(p.y / TILE);
    if (row < 0 || row >= getRows() || col < 0 || col >= getCols()) return false;
    if (!isWalkable(map[row][col], col, row)) return false;
  }
  return true;
}

function isOnPortal(x, y) {
  const map = getCurrentMap();
  const col = Math.floor(x / TILE);
  const row = Math.floor(y / TILE);
  if (row < 0 || row >= getRows() || col < 0 || col >= getCols()) return false;
  return map[row][col] === 8;
}

// ============================================================
// DRAWING
// ============================================================

function drawRoom() {
  const rd = ROOM_DATA[currentRoom];
  const collision = rd.collision;
  const colors = currentRoom === "focus" ? FOCUS_COLORS : REST_COLORS;
  const hasSprites = tilesetRegistry.length > 0;

  const curCols = getCols();
  const curRows = getRows();
  for (let r = 0; r < curRows; r++) {
    for (let c = 0; c < curCols; c++) {
      const x = c * TILE;
      const y = r * TILE;
      const idx = r * curCols + c;
      const ct = collision[r][c]; // collision type

      // Skip all per-tile rendering for door positions (door sprite drawn in separate pass)
      const onDoor = isDoorTile(c, r);

      // --- 1. Floor layer ---
      let floorDrawn = false;
      if (!onDoor) {
        if (hasSprites && rd.floorGIDs) {
          floorDrawn = drawTileByGID(rd.floorGIDs[idx], x, y);
        }
        if (!floorDrawn && !hasSprites) {
          {
            ctx.fillStyle = colors.floor;
            ctx.fillRect(x, y, TILE, TILE);
            if (ct === 0 || ct === 7 || ct === 8) {
              const hash = (r * 31 + c * 17) % 8;
              if (hash < 3) {
                ctx.fillStyle = colors.floorDark;
                ctx.fillRect(x, y, TILE, TILE);
              }
              ctx.fillStyle = "rgba(0,0,0,0.07)";
              ctx.fillRect(x, y, TILE, 1);
              ctx.fillRect(x, y, 1, TILE);
            }
          }
        }
      }

      // --- 1b. Wall layer ---
      if (!onDoor && hasSprites && rd.wallGIDs) {
        drawTileByGID(rd.wallGIDs[idx], x, y);
      }

      // --- 2. Objects layers ---
      let objDrawn = false;
      if (!onDoor && hasSprites && rd.objectLayers.length) {
        for (const layerData of rd.objectLayers) {
          if (layerData[idx]) {
            if (drawTileByGID(layerData[idx], x, y)) objDrawn = true;
          }
        }
      }

      // --- 3. Animation overlays + programmatic fallback ---
      // When sprites are loaded, collision layer is pure logic (no colored blocks).
      // Only portal glow and window sky/stars animate as overlays.
      if (hasSprites) {
        if (ct === 11) {
          drawWindowTint(x, y);
        }
      } else {
        // No sprites: full programmatic rendering (fallback)
        switch (ct) {
          case 1: {
            ctx.fillStyle = colors.wall;
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = colors.wallDark;
            ctx.fillRect(x, y + 15, TILE, 1);
            if ((r + c) % 2 === 0) {
              ctx.fillRect(x + 14, y, 1, 15);
            } else {
              ctx.fillRect(x + 14, y + 16, 1, 16);
            }
            ctx.fillStyle = colors.wallTop;
            ctx.fillRect(x, y, TILE, 2);
            ctx.fillStyle = "rgba(0,0,0,0.12)";
            ctx.fillRect(x, y + TILE - 2, TILE, 2);
            if (r === 0 && c > 1 && c < curCols - 2 && c % 4 === 0) {
              drawWindow(x, y);
            }
            break;
          }
          case 2: {
            ctx.fillStyle = colors.desk;
            ctx.fillRect(x + 2, y + 4, TILE - 4, TILE - 6);
            ctx.fillStyle = colors.deskTop;
            ctx.fillRect(x + 2, y + 4, TILE - 4, 6);
            ctx.fillStyle = "#333";
            ctx.fillRect(x + 8, y + 10, 16, 12);
            const screenFlicker = 0.85 + 0.15 * Math.sin(Date.now() / 2000 + c * 3.7);
            const base = currentRoom === "focus" ? [136, 204, 255] : [136, 221, 136];
            ctx.fillStyle = `rgb(${Math.floor(base[0]*screenFlicker)},${Math.floor(base[1]*screenFlicker)},${Math.floor(base[2]*screenFlicker)})`;
            ctx.fillRect(x + 9, y + 11, 14, 10);
            break;
          }
          case 3:
            ctx.fillStyle = colors.bookshelf;
            ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
            for (let s = 0; s < 3; s++) {
              const sy = y + 6 + s * 9;
              ctx.fillStyle = "#5a4020";
              ctx.fillRect(x + 3, sy + 7, TILE - 6, 2);
              for (let b = 0; b < 4; b++) {
                ctx.fillStyle = colors.bookColors[(c + s + b) % colors.bookColors.length];
                ctx.fillRect(x + 5 + b * 6, sy, 5, 7);
              }
            }
            break;
          case 4:
            ctx.fillStyle = colors.plantPot;
            ctx.fillRect(x + 10, y + 20, 12, 10);
            ctx.fillStyle = colors.plant;
            ctx.beginPath();
            ctx.arc(x + 16, y + 14, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#4a8858";
            ctx.beginPath();
            ctx.arc(x + 12, y + 11, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 20, y + 12, 5, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 5:
            ctx.fillStyle = colors.rug;
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = colors.rugAlt || colors.rug;
            if ((r + c) % 2 === 0) {
              ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
            }
            break;
          case 7:
            ctx.fillStyle = colors.chair;
            ctx.fillRect(x + 6, y + 6, 20, 20);
            ctx.fillStyle = "#7ab87a";
            ctx.fillRect(x + 8, y + 8, 16, 16);
            break;
          case 8:
            drawPortal(x, y, colors);
            break;
          case 9:
            ctx.fillStyle = colors.sofa || "#7a3868";
            ctx.fillRect(x + 2, y + 4, TILE - 4, TILE - 6);
            ctx.fillStyle = colors.sofaTop || "#8a4878";
            ctx.fillRect(x + 4, y + 6, TILE - 8, TILE - 10);
            ctx.fillStyle = "#d8a0b8";
            ctx.fillRect(x + 8, y + 10, 16, 10);
            break;
          case 10: {
            ctx.fillStyle = colors.coffeeMachine || "#484848";
            ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 6);
            ctx.fillStyle = colors.coffeeTop || "#5a5a5a";
            ctx.fillRect(x + 4, y + 4, TILE - 8, 8);
            ctx.fillStyle = "#fff";
            ctx.fillRect(x + 12, y + 16, 8, 8);
            const st = Date.now() / 500;
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(255,255,255,0.4)";
            ctx.beginPath();
            ctx.moveTo(x + 15, y + 14);
            ctx.quadraticCurveTo(x + 13 + Math.sin(st) * 3, y + 8, x + 15 + Math.sin(st * 0.6) * 2, y + 2);
            ctx.stroke();
            ctx.strokeStyle = "rgba(255,255,255,0.2)";
            ctx.beginPath();
            ctx.moveTo(x + 17, y + 14);
            ctx.quadraticCurveTo(x + 19 + Math.sin(st + 2) * 2.5, y + 9, x + 17 + Math.sin(st * 0.8 + 1) * 1.5, y + 4);
            ctx.stroke();
            break;
          }
          case 12: {
            // Door fallback (no sprites): simple colored rectangle
            const doorOpen = isDoorOpenAt(c, r);
            ctx.fillStyle = doorOpen ? "rgba(180,220,240,0.3)" : "rgba(180,220,240,0.7)";
            ctx.fillRect(x + 2, y, TILE - 4, TILE);
            ctx.strokeStyle = "#8ab0c0";
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 2, y, TILE - 4, TILE);
            break;
          }
        }
      }
    }
  }

  // --- Draw animated doors on top of all tiles ---
  const doors = roomDoors[currentRoom];
  if (doors && doors.length && doorSlidingImg._loaded) {
    for (const d of doors) {
      ctx.drawImage(doorSlidingImg, d.frame * DOOR_FRAME_W, 0, DOOR_FRAME_W, DOOR_FRAME_H,
                    d.x, d.y, DOOR_FRAME_W, DOOR_FRAME_H);
    }
  }
}

// Draw "above*" layers on top of players
function drawAboveLayers() {
  const rd = ROOM_DATA[currentRoom];
  if (!rd.aboveLayers || !rd.aboveLayers.length) return;
  const hasSprites = tilesetRegistry.length > 0;
  if (!hasSprites) return;
  const curCols = getCols();
  const curRows = getRows();
  for (let r = 0; r < curRows; r++) {
    for (let c = 0; c < curCols; c++) {
      const idx = r * curCols + c;
      for (const layerData of rd.aboveLayers) {
        if (layerData[idx]) {
          drawTileByGID(layerData[idx], c * TILE, r * TILE);
        }
      }
    }
  }
}

// Window light spills on floor (called after drawRoom)
function drawWindowLightSpills() {
  const tv = TIME_VISUALS[cachedTimeKey];
  if (!tv.windowGlow) return;

  const map = getCurrentMap();
  for (let c = 4; c < getCols() - 2; c += 4) {
    if (map[0][c] !== 1 && map[0][c] !== 11) continue;
    const x = c * TILE;
    const spillW = TILE + 8;
    const spillH = TILE * 2.5;
    const spillX = x + TILE / 2 - spillW / 2;
    const spillY = TILE;

    const spillGrad = ctx.createLinearGradient(spillX, spillY, spillX, spillY + spillH);
    spillGrad.addColorStop(0, tv.windowGlow);
    spillGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = spillGrad;
    ctx.fillRect(spillX, spillY, spillW, spillH);
  }
}

// Dust motes floating in window light
const dustMotes = [];
const MAX_DUST = 15;

function updateAndDrawDustMotes() {
  if (cachedTimeKey === "night") return;

  if (dustMotes.length < MAX_DUST && Math.random() < 0.02) {
    const wp = WINDOW_POSITIONS[Math.floor(Math.random() * WINDOW_POSITIONS.length)];
    dustMotes.push({
      x: wp.x + (Math.random() - 0.5) * TILE * 1.5,
      y: TILE + Math.random() * TILE * 3,
      vx: (Math.random() - 0.5) * 0.08,
      vy: -0.05 - Math.random() * 0.05,
      life: 200 + Math.random() * 200,
      size: 1,
    });
  }

  for (let i = dustMotes.length - 1; i >= 0; i--) {
    const d = dustMotes[i];
    d.x += d.vx + Math.sin(Date.now() / 3000 + i) * 0.02;
    d.y += d.vy;
    d.life--;
    if (d.life <= 0) { dustMotes.splice(i, 1); continue; }
    const alpha = Math.min(d.life / 60, 1) * (cachedTimeKey === "morning" ? 0.4 : 0.2);
    ctx.fillStyle = `rgba(255,255,240,${alpha})`;
    ctx.fillRect(Math.round(d.x), Math.round(d.y), d.size, d.size);
  }
}

// Time-aware window tint overlay (applied on top of pixel-art window tiles)
function drawWindowTint(x, y) {
  const tv = TIME_VISUALS[cachedTimeKey];
  ctx.fillStyle = tv.windowGlass;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.globalAlpha = 1;

  // Stars at night
  if (tv.starCount > 0) {
    ctx.fillStyle = "#fff";
    const seed = x * 7 + y * 13;
    for (let s = 0; s < tv.starCount; s++) {
      const sx = x + 4 + ((seed * (s + 1) * 31) % (TILE - 8));
      const sy = y + 4 + ((seed * (s + 1) * 17) % (TILE - 8));
      const twinkle = 0.4 + 0.6 * Math.sin(Date.now() / 1000 + s * 2.1);
      ctx.globalAlpha = twinkle;
      ctx.fillRect(sx, sy, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

// Programmatic window (fallback when no sprites)
function drawWindow(x, y) {
  const tv = TIME_VISUALS[cachedTimeKey];
  ctx.fillStyle = "#8a7050";
  ctx.fillRect(x + 3, y + 5, TILE - 6, TILE - 8);
  const skyGrad = ctx.createLinearGradient(x + 5, y + 7, x + 5, y + 7 + TILE - 12);
  tv.skyColors.forEach((color, i) => {
    skyGrad.addColorStop(i / (tv.skyColors.length - 1), color);
  });
  ctx.fillStyle = skyGrad;
  ctx.fillRect(x + 5, y + 7, TILE - 10, TILE - 12);
  if (tv.starCount > 0) {
    ctx.fillStyle = "#fff";
    const seed = x * 7 + y * 13;
    for (let s = 0; s < tv.starCount; s++) {
      const sx = x + 6 + ((seed * (s + 1) * 31) % (TILE - 12));
      const sy = y + 8 + ((seed * (s + 1) * 17) % (TILE - 14));
      const twinkle = 0.4 + 0.6 * Math.sin(Date.now() / 1000 + s * 2.1);
      ctx.globalAlpha = twinkle;
      ctx.fillRect(sx, sy, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = tv.windowGlass;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(x + 5, y + 7, TILE - 10, TILE - 12);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#8a7050";
  ctx.fillRect(x + TILE / 2 - 1, y + 7, 2, TILE - 12);
  ctx.fillRect(x + 5, y + TILE / 2 - 1, TILE - 10, 2);
  ctx.fillStyle = "#a08860";
  ctx.fillRect(x + 3, y + 5, TILE - 6, 1);
}

// Portal label only (no color overlay, for sprite mode)
let portalLabelDrawnThisFrame = false;
function drawPortalLabel(x, y, colors) {
  if (portalLabelDrawnThisFrame) return;
  portalLabelDrawnThisFrame = true;

  const map = getCurrentMap();
  let minC = getCols(), maxC = 0, portalRow = 0;
  for (let r = 0; r < getRows(); r++) {
    for (let c = 0; c < getCols(); c++) {
      if (map[r][c] === 8) {
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
        portalRow = r;
      }
    }
  }
  const px = minC * TILE;
  const py = portalRow * TILE;
  const pw = (maxC - minC + 1) * TILE;

  const label = currentRoom === "focus" ? t("portalToLounge") : t("portalToFocus");
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ps = gameToScreen(px + pw / 2, py - 10);
  ctx.font = "bold 16px 'MiSans', sans-serif";
  ctx.letterSpacing = "0.32px";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const textWidth = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(ps.x - textWidth / 2 - 6, ps.y - 8, textWidth + 12, 16);
  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 0.8;
  ctx.fillText(label, ps.x, ps.y);
  ctx.restore();
}

// Animated portal - drawn once across all portal tiles (fallback, no sprites)
let portalAnim = 0;
let portalDrawnThisFrame = false;

function drawPortal(x, y, colors) {
  // Only draw the full portal effect once per frame (on first portal tile)
  if (portalDrawnThisFrame) return;
  portalDrawnThisFrame = true;

  portalAnim += 0.015;
  const breathe = Math.sin(portalAnim) * 0.5 + 0.5;

  // Find all portal tiles to get full bounds
  const map = getCurrentMap();
  let minC = getCols(), maxC = 0, portalRow = 0;
  for (let r = 0; r < getRows(); r++) {
    for (let c = 0; c < getCols(); c++) {
      if (map[r][c] === 8) {
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
        portalRow = r;
      }
    }
  }

  const px = minC * TILE;
  const py = portalRow * TILE;
  const pw = (maxC - minC + 1) * TILE;
  const ph = TILE;

  // Soft glow
  ctx.fillStyle = colors.portalGlow;
  ctx.globalAlpha = 0.08 + breathe * 0.06;
  ctx.fillRect(px - 6, py - 6, pw + 12, ph + 12);
  ctx.globalAlpha = 1;

  // Portal arch (subtle)
  ctx.fillStyle = colors.portal;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(px + 4, py + ph);
  ctx.lineTo(px + 4, py + 10);
  ctx.quadraticCurveTo(px + pw / 2, py - 8, px + pw - 4, py + 10);
  ctx.lineTo(px + pw - 4, py + ph);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Inner fill - gentle
  ctx.fillStyle = colors.portalGlow;
  ctx.globalAlpha = 0.2 + breathe * 0.15;
  ctx.beginPath();
  ctx.moveTo(px + 10, py + ph);
  ctx.lineTo(px + 10, py + 14);
  ctx.quadraticCurveTo(px + pw / 2, py - 2, px + pw - 10, py + 14);
  ctx.lineTo(px + pw - 10, py + ph);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Small static label (draw at native resolution)
  const label = currentRoom === "focus" ? t("portalToLounge") : t("portalToFocus");
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ps = gameToScreen(px + pw / 2, py - 10);
  ctx.font = "bold 16px 'MiSans', sans-serif";
  ctx.letterSpacing = "0.32px";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const textWidth = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(ps.x - textWidth / 2 - 6, ps.y - 8, textWidth + 12, 16);
  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 0.8;
  ctx.fillText(label, ps.x, ps.y);
  ctx.restore();
}

// ============================================================
// PLAYER RENDERING
// ============================================================

const STATUS_EMOJI = {
  studying: "\u{1F4D6}",
  working: "\u{1F4BB}",
  reading: "\u{1F4DA}",
  resting: "\u{2615}",
  coding: "\u{1F4BB}",
  chatting: "\u{1F4AC}",
  listening: "\u{1F3B5}",
  watching: "\u{1F3AC}",
  napping: "\u{1F634}",
  snacking: "\u{1F36A}",
  browsing: "\u{1F4F1}",
  focusing: "\u{1F525}",
  daydreaming: "\u{1F4AD}",
};

const BODY_COLORS = [
  "#e94560", "#533483", "#0f3460", "#53d769",
  "#f5a623", "#e91e8c", "#1ecbe1", "#ff6b35",
];

function hashColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return BODY_COLORS[Math.abs(hash) % BODY_COLORS.length];
}

function hashCharacter(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return CHARACTER_NAMES[Math.abs(hash) % CHARACTER_NAMES.length];
}

// Lighten a hex color for use on dark backgrounds
function lightenColor(hex, amount) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const lr = Math.min(255, r + (255 - r) * amount);
  const lg = Math.min(255, g + (255 - g) * amount);
  const lb = Math.min(255, b + (255 - b) * amount);
  return `rgb(${Math.round(lr)},${Math.round(lg)},${Math.round(lb)})`;
}

// Sprite animation direction offsets (each direction = 6 frames in a 24-col sheet)
const SPRITE_DIR_OFFSET = { right: 0, up: 6, left: 12, down: 18 };
const SPRITE_IDLE_MS = 200; // ms per idle frame
const SPRITE_RUN_MS  = 100; // ms per run frame

function getPlayerAnimState(player) {
  if (!player._animState) {
    player._animState = {
      prevX: player.x,
      prevY: player.y,
      moving: false,
      frame: 0,
      lastFrameTime: Date.now(),
    };
  }
  const st = player._animState;
  const now = Date.now();
  const dx = player.x - st.prevX;
  const dy = player.y - st.prevY;
  st.moving = (dx !== 0 || dy !== 0);
  st.prevX = player.x;
  st.prevY = player.y;

  const interval = st.moving ? SPRITE_RUN_MS : SPRITE_IDLE_MS;
  if (now - st.lastFrameTime >= interval) {
    st.frame = (st.frame + 1) % 6;
    st.lastFrameTime = now;
  }
  return st;
}

function drawPlayerBody(player, isLocal) {
  const { x, y } = player;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 10, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Determine sprite
  const charName = player.character || hashCharacter(player.id);
  const animState = getPlayerAnimState(player);
  const sheetKey = animState.moving ? `char_${charName}_run` : `char_${charName}_idle`;
  const sheet = spriteImages[sheetKey];
  if (!sheet || !sheet._loaded) return;

  const dir = player.direction || "down";
  const col = (SPRITE_DIR_OFFSET[dir] || 0) + animState.frame;
  const sx = col * 32;

  // Sprite frames are 32x64 (full sheet height). Feet at ~row 58, aligned with shadow at y+12.
  ctx.drawImage(sheet, sx, 0, 32, 64, x - 16, y - 46, 32, 64);
}

// Convert game coords to screen coords (bypassing canvas transform)
function gameToScreen(gx, gy) {
  return {
    x: Math.round((gx - cameraX) * gameScale),
    y: Math.round((gy - cameraY) * gameScale),
  };
}

function drawPlayerLabel(player) {
  const { x, y, name, status } = player;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const isLocal = player.id === myId;
  const nameText = name || "???";
  const px = 4, py = 4;
  const fade = 12;

  // Name label
  ctx.font = "bold 16px 'MiSans', sans-serif";
  ctx.letterSpacing = "0.32px";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const nameWidth = Math.ceil(ctx.measureText(nameText).width);
  const s = gameToScreen(x, y);
  const lw = nameWidth + px * 2 + fade * 2;
  const lh = 16 + py * 2;
  const lx = Math.round(s.x - lw / 2);
  const ly = Math.round(s.y - 50 * gameScale - py);
  const grad = ctx.createLinearGradient(lx, 0, lx + lw, 0);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(fade * 0.4 / lw, "rgba(0,0,0,0.15)");
  grad.addColorStop(fade / lw, "rgba(0,0,0,0.5)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.55)");
  grad.addColorStop(1 - fade / lw, "rgba(0,0,0,0.5)");
  grad.addColorStop(1 - fade * 0.4 / lw, "rgba(0,0,0,0.15)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(lx, ly, lw, lh);
  ctx.fillStyle = isLocal ? "#fff" : "#4DA6FF";
  ctx.fillText(nameText, lx + fade + px, ly + lh / 2);

  // Status emoji above name label
  const emojiY = ly - 4;
  if (player.isFocusing) {
    ctx.font = "16px 'MiSans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(STATUS_EMOJI[player.focusCategory] || STATUS_EMOJI[status] || "", s.x, emojiY);
  } else if (player.id === myId && autoWalking) {
    ctx.font = "16px 'MiSans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#fff";
    ctx.fillText(entranceWalking ? t("checkingIn") : t("grabCoffee"), s.x, emojiY);
  } else if (player.id === myId && emojiSuppressUntil && Date.now() < emojiSuppressUntil) {
    // suppressed
  } else {
    ctx.font = "16px 'MiSans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(STATUS_EMOJI[status] || "", s.x, emojiY);
  }
  ctx.restore();
}

function drawChatBubble(player) {
  const bubble = chatBubbles[player.id];
  if (!bubble) return;
  const elapsed = Date.now() - bubble.time;
  if (elapsed > BUBBLE_DURATION) {
    delete chatBubbles[player.id];
    return;
  }

  const alpha = elapsed > BUBBLE_DURATION - 1000 ? (BUBBLE_DURATION - elapsed) / 1000 : 1;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.font = "16px 'MiSans', sans-serif";
  ctx.letterSpacing = "0.32px";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const s = gameToScreen(player.x, player.y);
  const by = Math.round(s.y - 72 * gameScale);
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillText(bubble.text, s.x + 1, by + 1);
  ctx.fillStyle = "#fff";
  ctx.fillText(bubble.text, s.x, by);
  ctx.restore();
}

// ============================================================
// TILED MAP OBJECTS (animated sprites from object layer)
// ============================================================

const OBJ_FRAME_MS = 200; // ms per animation frame
let petInteractTimer = 0; // cooldown to prevent spam

function findTilesetForGID(gid) {
  for (let i = tilesetRegistry.length - 1; i >= 0; i--) {
    if (gid >= tilesetRegistry[i].firstgid) return tilesetRegistry[i];
  }
  return null;
}

function drawMapObjects() {
  const objs = ROOM_DATA[currentRoom].mapObjects;
  if (!objs || !objs.length) return;

  const now = Date.now();

  for (const obj of objs) {
    const ts = findTilesetForGID(obj.gid);
    if (!ts || !ts.img || !ts.img._loaded || !ts.frameCount) continue;

    const frame = Math.floor(now / OBJ_FRAME_MS) % ts.frameCount;
    const localId = frame; // animate from first frame of tileset
    const sx = (localId % ts.columns) * ts.tileW;
    const sy = Math.floor(localId / ts.columns) * ts.tileH;

    ctx.drawImage(ts.img, sx, sy, ts.tileW, ts.tileH, obj.x, obj.y, ts.tileW, ts.tileH);

    // Draw name label for pets
    if (obj.name && obj.type === "pet") {
      ctx.save();
      ctx.font = "bold 7px MiSans, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      const labelX = obj.x + ts.tileW / 2;
      const labelY = obj.y - 4;
      const tw = ctx.measureText(obj.name).width;
      ctx.fillRect(labelX - tw / 2 - 2, labelY - 6, tw + 4, 8);
      ctx.fillStyle = "#fff";
      ctx.fillText(obj.name, labelX, labelY);
      ctx.restore();
    }
  }
}

// ============================================================
// CAT RENDERING
// ============================================================

let catData = { x: 0, y: 0, room: "focus", state: "idle" };
let catAnimFrame = 0;
let catMiuTimer = 0;
let catMiuX = 0;
let catMiuY = 0;
let catSleepPetTimer = 0;

function drawCatBody() {
  if (catData.room !== currentRoom) return;

  const { x, y, state } = catData;
  catAnimFrame += 0.05;

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  if (state === "sleep") {
    // Sleeping cat: curled up ball
    // Body (round)
    ctx.fillStyle = "#f4a460";
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Darker stripes
    ctx.fillStyle = "#d48840";
    ctx.fillRect(x - 4, y - 3, 2, 6);
    ctx.fillRect(x + 1, y - 4, 2, 7);
    // Tail curled around (wags when petted)
    if (catSleepPetTimer > 0) {
      catSleepPetTimer--;
      const wag = Math.sin(catAnimFrame * 8) * 4;
      ctx.strokeStyle = "#f4a460";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 4);
      ctx.quadraticCurveTo(x + 14, y + wag, x + 10, y - 4);
      ctx.stroke();
      ctx.lineCap = "butt";
    } else {
      ctx.strokeStyle = "#f4a460";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + 5, y + 2, 6, -0.5, Math.PI * 0.8);
      ctx.stroke();
      ctx.strokeStyle = "#d48840";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x + 5, y + 2, 6, 0, Math.PI * 0.5);
      ctx.stroke();
    }
    // Zzz
    const zFloat = Math.sin(catAnimFrame) * 2;
    ctx.font = "16px 'MiSans', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "center";
    ctx.fillText("z", x + 10, y - 8 + zFloat);
    ctx.fillText("z", x + 14, y - 13 + zFloat * 0.7);
  } else if (state === "sit") {
    // Sitting cat
    const lookingUp = catData.onFurniture === "window";
    // Body
    ctx.fillStyle = "#f4a460";
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head (tilted up if at window)
    ctx.beginPath();
    ctx.arc(x, lookingUp ? y - 10 : y - 8, 6, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    const headY = lookingUp ? y - 10 : y - 8;
    ctx.beginPath();
    ctx.moveTo(x - 6, headY - 3);
    ctx.lineTo(x - 3, headY - 9);
    ctx.lineTo(x, headY - 3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, headY - 3);
    ctx.lineTo(x + 3, headY - 9);
    ctx.lineTo(x + 6, headY - 3);
    ctx.fill();
    // Inner ears
    ctx.fillStyle = "#ffb6c1";
    ctx.beginPath();
    ctx.moveTo(x - 5, headY - 4);
    ctx.lineTo(x - 3, headY - 8);
    ctx.lineTo(x - 1, headY - 4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 1, headY - 4);
    ctx.lineTo(x + 3, headY - 8);
    ctx.lineTo(x + 5, headY - 4);
    ctx.fill();
    // Eyes
    ctx.fillStyle = "#333";
    if (lookingUp) {
      // Eyes looking upward (higher on head)
      ctx.beginPath();
      ctx.arc(x - 2.5, headY - 2.5, 1.2, 0, Math.PI * 2);
      ctx.arc(x + 2.5, headY - 2.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x - 2.5, headY - 1, 1.2, 0, Math.PI * 2);
      ctx.arc(x + 2.5, headY - 1, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Nose
    ctx.fillStyle = "#ffb6c1";
    ctx.beginPath();
    ctx.moveTo(x, headY + 1);
    ctx.lineTo(x - 1.5, headY + 2.5);
    ctx.lineTo(x + 1.5, headY + 2.5);
    ctx.fill();
    // Tail
    ctx.strokeStyle = "#f4a460";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    const tailWag = Math.sin(catAnimFrame * 1.5) * 4;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 6);
    ctx.quadraticCurveTo(x + 14, y + tailWag, x + 12, y - 2);
    ctx.stroke();
    ctx.lineCap = "butt";
    // Stripes on body
    ctx.fillStyle = "#d48840";
    ctx.fillRect(x - 3, y - 2, 2, 5);
    ctx.fillRect(x + 1, y - 3, 2, 6);
  } else if (state === "groom") {
    // Grooming: sitting and licking paw
    // Body
    ctx.fillStyle = "#f4a460";
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head tilted down
    ctx.beginPath();
    ctx.arc(x + 3, y - 6, 6, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.beginPath();
    ctx.moveTo(x - 1, y - 9); ctx.lineTo(x + 1, y - 15); ctx.lineTo(x + 4, y - 9);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 4, y - 9); ctx.lineTo(x + 7, y - 15); ctx.lineTo(x + 9, y - 9);
    ctx.fill();
    // Inner ears
    ctx.fillStyle = "#ffb6c1";
    ctx.beginPath();
    ctx.moveTo(x, y - 10); ctx.lineTo(x + 1.5, y - 14); ctx.lineTo(x + 3.5, y - 10);
    ctx.fill();
    // Paw raised (licking animation)
    const lickY = Math.sin(catAnimFrame * 4) * 2;
    ctx.fillStyle = "#f4a460";
    ctx.beginPath();
    ctx.arc(x + 6, y - 2 + lickY, 3, 0, Math.PI * 2);
    ctx.fill();
    // Eyes half-closed
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 1, y - 7); ctx.lineTo(x + 3, y - 7);
    ctx.moveTo(x + 5, y - 7); ctx.lineTo(x + 7, y - 7);
    ctx.stroke();
    // Stripes
    ctx.fillStyle = "#d48840";
    ctx.fillRect(x - 3, y - 2, 2, 5);
    ctx.fillRect(x + 1, y - 3, 2, 6);
  } else if (state === "stretch") {
    // Stretching: front low, butt up
    const stretchAnim = Math.sin(catAnimFrame * 1.5) * 0.5 + 0.5;
    // Back body (butt up)
    ctx.fillStyle = "#f4a460";
    ctx.beginPath();
    ctx.ellipse(x - 4, y - 2 - stretchAnim * 4, 7, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Front body (low)
    ctx.beginPath();
    ctx.ellipse(x + 6, y + 3, 6, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Head (low)
    ctx.beginPath();
    ctx.arc(x + 12, y + 2, 5, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.beginPath();
    ctx.moveTo(x + 9, y - 1); ctx.lineTo(x + 9, y - 6); ctx.lineTo(x + 12, y - 1);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 12, y - 1); ctx.lineTo(x + 15, y - 6); ctx.lineTo(x + 15, y - 1);
    ctx.fill();
    // Front paws stretched out
    ctx.strokeStyle = "#f4a460";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 6); ctx.lineTo(x + 16, y + 8);
    ctx.moveTo(x + 8, y + 6); ctx.lineTo(x + 14, y + 8);
    ctx.stroke();
    // Eyes squeezed shut (happy stretch)
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + 10, y + 1, 1.5, 0, Math.PI);
    ctx.arc(x + 14, y + 1, 1.5, 0, Math.PI);
    ctx.stroke();
    // Tail up
    ctx.strokeStyle = "#f4a460";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 4 - stretchAnim * 4);
    ctx.quadraticCurveTo(x - 14, y - 14, x - 8, y - 16);
    ctx.stroke();
    ctx.lineCap = "butt";
    // Stripes
    ctx.fillStyle = "#d48840";
    ctx.fillRect(x - 6, y - 5 - stretchAnim * 3, 2, 4);
    ctx.fillRect(x - 2, y - 4 - stretchAnim * 2, 2, 4);
  } else if (state === "yawn") {
    // Yawning cat - sitting with mouth open
    ctx.fillStyle = "#f4a460";
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.beginPath();
    ctx.arc(x, y - 8, 6, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 11); ctx.lineTo(x - 3, y - 17); ctx.lineTo(x, y - 11);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - 11); ctx.lineTo(x + 3, y - 17); ctx.lineTo(x + 6, y - 11);
    ctx.fill();
    // Inner ears
    ctx.fillStyle = "#ffb6c1";
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 12); ctx.lineTo(x - 3, y - 16); ctx.lineTo(x - 1, y - 12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 1, y - 12); ctx.lineTo(x + 3, y - 16); ctx.lineTo(x + 5, y - 12);
    ctx.fill();
    // Eyes squeezed shut
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x - 2.5, y - 10, 1.5, 0, Math.PI);
    ctx.moveTo(x + 4, y - 10);
    ctx.arc(x + 2.5, y - 10, 1.5, 0, Math.PI);
    ctx.stroke();
    // Mouth wide open (yawn)
    const yawnOpen = Math.sin(catAnimFrame * 2) * 0.5 + 0.5;
    ctx.fillStyle = "#ff9999";
    ctx.beginPath();
    ctx.ellipse(x, y - 5, 3, 1.5 + yawnOpen * 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tongue
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.ellipse(x, y - 4 + yawnOpen, 1.5, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tail
    ctx.strokeStyle = "#f4a460";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 6);
    ctx.quadraticCurveTo(x + 14, y, x + 12, y - 2);
    ctx.stroke();
    ctx.lineCap = "butt";
    // Stripes
    ctx.fillStyle = "#d48840";
    ctx.fillRect(x - 3, y - 2, 2, 5);
    ctx.fillRect(x + 1, y - 3, 2, 6);
  } else {
    // Walking / wander / curious cat
    const bobY = Math.sin(catAnimFrame * 3) * 1.5;
    const isMoving = state === "wander" || state === "curious";
    const legAnim = isMoving ? Math.sin(catAnimFrame * 6) * 3 : 0;
    // Body
    ctx.fillStyle = "#f4a460";
    ctx.beginPath();
    ctx.ellipse(x, y + bobY, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs
    ctx.strokeStyle = "#f4a460";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 5 + bobY);
    ctx.lineTo(x - 5 - legAnim * 0.3, y + 10);
    ctx.moveTo(x - 2, y + 5 + bobY);
    ctx.lineTo(x - 2 + legAnim * 0.3, y + 10);
    ctx.moveTo(x + 2, y + 5 + bobY);
    ctx.lineTo(x + 2 - legAnim * 0.3, y + 10);
    ctx.moveTo(x + 5, y + 5 + bobY);
    ctx.lineTo(x + 5 + legAnim * 0.3, y + 10);
    ctx.stroke();
    // Head
    ctx.fillStyle = "#f4a460";
    ctx.beginPath();
    ctx.arc(x + 8, y - 3 + bobY, 5.5, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.beginPath();
    ctx.moveTo(x + 4, y - 6 + bobY);
    ctx.lineTo(x + 5, y - 12 + bobY);
    ctx.lineTo(x + 8, y - 6 + bobY);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 6 + bobY);
    ctx.lineTo(x + 11, y - 12 + bobY);
    ctx.lineTo(x + 12, y - 6 + bobY);
    ctx.fill();
    // Inner ears
    ctx.fillStyle = "#ffb6c1";
    ctx.beginPath();
    ctx.moveTo(x + 5, y - 7 + bobY);
    ctx.lineTo(x + 5.5, y - 11 + bobY);
    ctx.lineTo(x + 7.5, y - 7 + bobY);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 8.5, y - 7 + bobY);
    ctx.lineTo(x + 10.5, y - 11 + bobY);
    ctx.lineTo(x + 11.5, y - 7 + bobY);
    ctx.fill();
    // Eyes
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(x + 6, y - 4 + bobY, 1, 0, Math.PI * 2);
    ctx.arc(x + 10, y - 4 + bobY, 1, 0, Math.PI * 2);
    ctx.fill();
    // Nose
    ctx.fillStyle = "#ffb6c1";
    ctx.beginPath();
    ctx.moveTo(x + 8, y - 2 + bobY);
    ctx.lineTo(x + 7, y - 0.5 + bobY);
    ctx.lineTo(x + 9, y - 0.5 + bobY);
    ctx.fill();
    // Tail
    ctx.strokeStyle = "#f4a460";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    const tw = Math.sin(catAnimFrame * 2) * 5;
    ctx.beginPath();
    ctx.moveTo(x - 8, y + bobY);
    ctx.quadraticCurveTo(x - 14, y - 6 + tw + bobY, x - 11, y - 10 + bobY);
    ctx.stroke();
    ctx.lineCap = "butt";
    // Stripes
    ctx.fillStyle = "#d48840";
    ctx.fillRect(x - 4, y - 2 + bobY, 2, 4);
    ctx.fillRect(x + 0, y - 3 + bobY, 2, 5);
  }

  // Gift rendering (pixel layer)
  if (catData.gift) {
    const gx = (state === "wander" || state === "gift_deliver" || state === "curious")
      ? x + 12 : x + 8;
    const gy = (state === "wander" || state === "gift_deliver" || state === "curious")
      ? y - 1 : y + 10;
    drawGift(catData.gift, gx, gy);
  }
}

// Cat UI elements (drawn at full resolution)
function drawCatUI() {
  if (catData.room !== currentRoom) return;
  const { x, y, state } = catData;

  // Ear perk overlay
  if (catData.earPerk && (state === "sit" || state === "sleep")) {
    ctx.font = "bold 16px 'MiSans', sans-serif";
    ctx.fillStyle = "#f5a623";
    ctx.textAlign = "center";
    ctx.fillText("!", x + 8, y - 22);
  }

  // Floating "Miu~" when petted (3s = 180 frames, last 30 frames fade out)
  if (catMiuTimer > 0) {
    catMiuTimer--;
    const miuAlpha = catMiuTimer < 30 ? catMiuTimer / 30 : 1;
    catMiuY -= 0.15;
    ctx.font = "12px 'MiSans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(255,255,255,${miuAlpha * 0.9})`;
    ctx.fillText(currentLang === "zh" ? "喵~" : "Meow~", catMiuX, catMiuY);
  }
}

function drawGift(type, gx, gy) {
  if (type === "fish") {
    ctx.fillStyle = "#6bc5d9";
    ctx.beginPath();
    ctx.ellipse(gx, gy, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tail
    ctx.beginPath();
    ctx.moveTo(gx - 5, gy);
    ctx.lineTo(gx - 9, gy - 3);
    ctx.lineTo(gx - 9, gy + 3);
    ctx.closePath();
    ctx.fill();
    // Eye
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(gx + 2, gy - 1, 0.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "leaf") {
    ctx.fillStyle = "#6ab04c";
    ctx.beginPath();
    ctx.ellipse(gx, gy, 5, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4a8830";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(gx - 4, gy);
    ctx.lineTo(gx + 4, gy);
    ctx.stroke();
  } else if (type === "yarn") {
    ctx.fillStyle = "#e94560";
    ctx.beginPath();
    ctx.arc(gx, gy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c0392b";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(gx - 1, gy - 1, 2, 0, Math.PI * 1.5);
    ctx.stroke();
  }
}

// ============================================================
// REACTION EMOJI PARTICLES
// ============================================================

const reactionEmojis = [];

function spawnReactionEmoji(senderId, targetId, emoji) {
  // Get sender's current position
  let sx, sy;
  if (senderId === myId && localPlayer) {
    sx = localPlayer.x; sy = localPlayer.y;
  } else if (otherPlayers[senderId]) {
    sx = otherPlayers[senderId].x; sy = otherPlayers[senderId].y;
  } else {
    return; // sender not visible
  }
  reactionEmojis.push({
    x: sx,
    y: sy,
    senderId: senderId,
    targetId: targetId,
    emoji: emoji,
    phase: "rise",   // rise -> pause -> fly -> hover
    timer: 0,
  });
}

function updateAndDrawReactionEmojis() {
  for (let i = reactionEmojis.length - 1; i >= 0; i--) {
    const r = reactionEmojis[i];
    r.timer++;

    // Look up target's current position (they might move)
    let target = null;
    if (r.targetId === myId && localPlayer) {
      target = localPlayer;
    } else if (otherPlayers[r.targetId]) {
      target = otherPlayers[r.targetId];
    }

    // Track sender for pause phase
    let sender = null;
    if (r.senderId === myId && localPlayer) {
      sender = localPlayer;
    } else if (otherPlayers[r.senderId]) {
      sender = otherPlayers[r.senderId];
    }

    const HEAD_OFFSET = 50; // above status emoji

    if (r.phase === "rise") {
      // Phase 1: Rise from sender body to above head (1s = 60 frames)
      r.y -= HEAD_OFFSET / 60;
      if (sender) r.x = sender.x; // follow sender if they move
      if (r.timer >= 60) {
        r.phase = "pause";
        r.timer = 0;
      }
    } else if (r.phase === "pause") {
      // Phase 2: Hover at sender's head for 1s (60 frames)
      if (sender) {
        r.x = sender.x;
        r.y = sender.y - HEAD_OFFSET + Math.sin(r.timer * 0.06) * 1.5;
      }
      if (r.timer >= 60) {
        r.phase = "fly";
        r.timer = 0;
      }
    } else if (r.phase === "fly") {
      // Phase 3: Fly toward target's head
      if (target) {
        const tx = target.x;
        const ty = target.y - HEAD_OFFSET;
        const dx = tx - r.x;
        const dy = ty - r.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 3) {
          const speed = Math.max(1.0, dist * 0.035);
          r.x += (dx / dist) * speed;
          r.y += (dy / dist) * speed;
        } else {
          r.phase = "hover";
          r.timer = 0;
        }
      } else {
        reactionEmojis.splice(i, 1);
        continue;
      }
      if (r.timer > 240) {
        r.phase = "hover";
        r.timer = 0;
      }
    } else if (r.phase === "hover") {
      // Phase 4: Stay above target's head for 5s (300 frames)
      if (target) {
        r.x = target.x;
        r.y = target.y - HEAD_OFFSET + Math.sin(r.timer * 0.04) * 1.5;
      }
      if (r.timer >= 300) {
        reactionEmojis.splice(i, 1);
        continue;
      }
    }

    // Draw in screen space (like status emoji) to avoid scaling artifacts
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.font = "16px 'MiSans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const sp = gameToScreen(r.x, r.y);
    ctx.fillText(r.emoji, sp.x, sp.y);
    ctx.restore();
  }
}

// ============================================================
// HEART PARTICLES (for petting)
// ============================================================

const hearts = [];

function spawnOneHeart(x, y) {
  hearts.push({
    x: x + (Math.random() - 0.5) * 6,
    y: y - 14,
    vx: (Math.random() - 0.5) * 0.5,
    vy: -0.8 - Math.random() * 0.5,
    life: 50,
    size: 7,
  });
}

function updateAndDrawHearts() {
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.x += h.vx;
    h.y += h.vy;
    h.vy += 0.02; // slight gravity
    h.life--;
    if (h.life <= 0) {
      hearts.splice(i, 1);
      continue;
    }
    const alpha = Math.min(1, h.life / 20);
    drawHeart(h.x, h.y, h.size, alpha);
  }
}

function drawHeart(hx, hy, size, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  const s = size / 10;
  ctx.moveTo(hx, hy + 3 * s);
  ctx.bezierCurveTo(hx, hy, hx - 5 * s, hy, hx - 5 * s, hy + 3 * s);
  ctx.bezierCurveTo(hx - 5 * s, hy + 7 * s, hx, hy + 9 * s, hx, hy + 11 * s);
  ctx.bezierCurveTo(hx, hy + 9 * s, hx + 5 * s, hy + 7 * s, hx + 5 * s, hy + 3 * s);
  ctx.bezierCurveTo(hx + 5 * s, hy, hx, hy, hx, hy + 3 * s);
  ctx.fill();
  ctx.restore();
}

// ============================================================
// GIFT PILE (idle Lounge players get buried in gifts)
// ============================================================

const PILE_POSITIONS = [
  // Row 0 (bottom): 4 slots — around feet
  { dx: -10, dy: 8 }, { dx: -2, dy: 10 }, { dx: 6, dy: 9 }, { dx: 14, dy: 8 },
  // Row 1: 3 slots — on the body
  { dx: -7, dy: 2 }, { dx: 2, dy: 3 }, { dx: 11, dy: 1 },
  // Row 2: 2 slots — chest level
  { dx: -4, dy: -5 }, { dx: 6, dy: -4 },
  // Row 3 (top): 1 slot — on the head
  { dx: 1, dy: -12 },
];

const scatterGifts = [];

function drawGiftPile(player) {
  if (!player.giftPile || player.giftPile.length === 0) return;
  for (let i = 0; i < player.giftPile.length; i++) {
    const pos = PILE_POSITIONS[i];
    if (!pos) break;
    drawGift(player.giftPile[i], player.x + pos.dx, player.y + pos.dy);
  }
}

function spawnScatterGifts(x, y, gifts) {
  for (let i = 0; i < gifts.length; i++) {
    const pos = PILE_POSITIONS[i] || { dx: 0, dy: 0 };
    const angle = Math.atan2(pos.dy - 2, pos.dx) + (Math.random() - 0.5) * 0.8;
    const speed = 2 + Math.random() * 2.5;
    scatterGifts.push({
      x: x + pos.dx,
      y: y + pos.dy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      type: gifts[i],
      life: 350,   // ~5.8s at 60fps
      maxLife: 350,
      settled: false,
    });
  }
}

function updateAndDrawScatterGifts() {
  for (let i = scatterGifts.length - 1; i >= 0; i--) {
    const g = scatterGifts[i];
    if (!g.settled) {
      g.x += g.vx;
      g.y += g.vy;
      g.vy += 0.12; // gravity
      g.vx *= 0.95; // friction
      // Settle on ground after falling enough
      if (g.vy > 0 && g.life < g.maxLife - 15) {
        g.settled = true;
      }
    }
    g.life--;
    if (g.life <= 0) {
      scatterGifts.splice(i, 1);
      continue;
    }
    // Fade out in last 60 frames (~1s)
    const alpha = Math.min(1, g.life / 60);
    ctx.save();
    ctx.globalAlpha = alpha;
    drawGift(g.type, g.x, g.y);
    ctx.restore();
  }
}

// ============================================================
// FIRE PARTICLES (for focus flame)
// ============================================================

const fireParticles = [];

// DEBUG: 10s per stage (0-10s small, 10-20s medium, 20-30s strong, 30-40s blue, 40s+ fatigue)
// PRODUCTION: change 10000 → 1800000 (30min per stage), 40000 → 7200000 (120min full)
const FLAME_STAGE_MS = 1800000;  // 30min per flame stage
const FLAME_FULL_MS = 7200000;   // 120min to max

function getFlameIntensity(elapsedMs) {
  return Math.min(elapsedMs / FLAME_FULL_MS, 1.0);
}

function spawnFireParticle(x, y, intensity) {
  fireParticles.push({
    x: x + (Math.random() - 0.5) * (2 + intensity * 2),
    y: y,
    vx: (Math.random() - 0.5) * 0.2,
    vy: -0.3 - Math.random() * 0.5 * (0.5 + intensity),
    life: 12 + Math.random() * 12,
    maxLife: 24,
    size: 1 + intensity * 1.5 + Math.random(),
    intensity: intensity,
  });
}

function getFlameColor(intensity, lifeRatio) {
  if (intensity > 0.75) {
    const blueAmount = (intensity - 0.75) * 4;
    if (lifeRatio > 0.5) {
      const r = Math.floor(170 + 60 * blueAmount);
      const g = Math.floor(190 + 50 * blueAmount);
      const b = Math.floor(210 + 40 * blueAmount);
      return `rgb(${r},${g},${b})`;
    }
  }
  if (lifeRatio > 0.6) return "#fff0d0";
  if (lifeRatio > 0.3) return "#f0a040";
  return "#e86030";
}

function updateAndDrawFire() {
  for (let i = fireParticles.length - 1; i >= 0; i--) {
    const p = fireParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx += (Math.random() - 0.5) * 0.1;
    p.life--;
    if (p.life <= 0) {
      fireParticles.splice(i, 1);
      continue;
    }
    const lifeRatio = p.life / p.maxLife;
    const alpha = Math.min(1, lifeRatio * 1.5) * (0.15 + p.intensity * 0.3);
    const color = getFlameColor(p.intensity, lifeRatio);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPlayerFire(player) {
  if (!player.isFocusing || !player.focusStartTime) return;

  const elapsed = Date.now() - player.focusStartTime;
  const intensity = getFlameIntensity(elapsed);

  const fireX = player.x + 8;
  const fireY = player.y - 54;

  const flameHeight = 5 + intensity * 9;
  const flameWidth = 2.5 + intensity * 4;

  const time = Date.now() / 150;
  const flicker = Math.sin(time * 1.8) * 0.08 + Math.sin(time * 2.9) * 0.04;

  const fatigueMs = elapsed - FLAME_FULL_MS;
  let fatigueFlicker = 0;
  if (fatigueMs > 0) {
    fatigueFlicker = Math.sin(time * 5) * 0.2 + Math.cos(time * 8) * 0.15;
  }

  const totalFlicker = flicker + fatigueFlicker;

  // Glow
  const glowRadius = 6 + intensity * 10;
  const glowAlpha = 0.02 + intensity * 0.05;
  ctx.save();
  ctx.globalAlpha = glowAlpha;
  ctx.fillStyle = intensity > 0.75 ? "#aaccff" : "#ffaa33";
  ctx.beginPath();
  ctx.arc(fireX, fireY - flameHeight / 2, glowRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Base flame shape
  ctx.save();
  const grad = ctx.createLinearGradient(fireX, fireY, fireX, fireY - flameHeight);
  if (intensity > 0.75) {
    grad.addColorStop(0, "rgba(240,130,50,0.25)");
    grad.addColorStop(0.4, "rgba(240,200,130,0.35)");
    grad.addColorStop(1, `rgba(190,210,245,${Math.min(0.5, 0.4 + totalFlicker)})`);
  } else {
    grad.addColorStop(0, `rgba(240,110,50,${0.15 + intensity * 0.2})`);
    grad.addColorStop(0.5, `rgba(245,180,70,${0.25 + intensity * 0.2})`);
    grad.addColorStop(1, `rgba(255,240,210,${0.35 + intensity * 0.2})`);
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(fireX - flameWidth / 2, fireY);
  ctx.quadraticCurveTo(
    fireX - flameWidth / 2 + totalFlicker * 3, fireY - flameHeight * 0.5,
    fireX + totalFlicker * 2, fireY - flameHeight
  );
  ctx.quadraticCurveTo(
    fireX + flameWidth / 2 - totalFlicker * 3, fireY - flameHeight * 0.5,
    fireX + flameWidth / 2, fireY
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Spawn fire particles
  if (Math.random() < 0.1 + intensity * 0.15) {
    spawnFireParticle(fireX, fireY - flameHeight * 0.3, intensity);
  }

  // Spark particles (stage 3+)
  if (intensity > 0.5 && Math.random() < (intensity - 0.5) * 0.08) {
    fireParticles.push({
      x: fireX + (Math.random() - 0.5) * 6,
      y: fireY - flameHeight * 0.5,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -1.2 - Math.random() * 1.2,
      life: 8 + Math.random() * 12,
      maxLife: 20,
      size: 0.8 + Math.random() * 0.8,
      intensity: intensity,
    });
  }

  // Fatigue sweat drop (past max stage) — show 8s, hide 52s, 60s cycle
  if (fatigueMs > 0) {
    const cycle = (Date.now() % 60000);  // 60s cycle
    if (cycle < 8000) {
      const sweatBob = Math.sin(Date.now() / 400) * 2;
      const fadeIn = Math.min(1, cycle / 500);
      const fadeOut = cycle > 7000 ? (8000 - cycle) / 1000 : 1;
      ctx.save();
      ctx.globalAlpha = fadeIn * fadeOut;
      ctx.font = "14px 'MiSans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("\u{1F4A7}", player.x + 12, player.y - 32 + sweatBob);
      ctx.restore();
    }
  }
}

// ============================================================
// PURR SOUND (Web Audio)
// ============================================================

function playPurr() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (!musicGain) {
      musicGain = audioCtx.createGain();
      musicGain.gain.value = volumeSlider.value / 100 * 0.3;
      musicGain.connect(audioCtx.destination);
    }
  }
  // Soft purring: low frequency rumble
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();

  osc.type = "sine";
  osc.frequency.value = 28; // Cat purr frequency ~25-30Hz
  lfo.frequency.value = 5;
  lfoGain.gain.value = 10;

  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
  gain.gain.linearRampToValueAtTime(0.06, now + 0.5);
  gain.gain.linearRampToValueAtTime(0, now + 1.2);

  osc.start(now);
  lfo.start(now);
  osc.stop(now + 1.3);
  lfo.stop(now + 1.3);
}

// ============================================================
// CAT CLICK HANDLER (pet the cat)
// ============================================================

// ============================================================
// EMOJI PICKER & REACTION NOTIFICATIONS
// ============================================================

let emojiPickerTarget = null;
let reactionNotifications = [];
let reactionNotifIdCounter = 0;

function showEmojiPicker(targetId, screenX, screenY) {
  emojiPickerTarget = targetId;
  const picker = document.getElementById("emoji-picker");
  // Show target player's name
  const targetPlayer = otherPlayers[targetId];
  const nameEl = document.getElementById("emoji-picker-name");
  nameEl.textContent = targetPlayer ? (targetPlayer.name || "???") : "???";
  picker.style.display = "flex";
  // Position near the click, clamped within viewport
  const pw = 210, ph = 76;
  let left = screenX + 10;
  let top = screenY - ph / 2;
  if (left + pw > window.innerWidth) left = screenX - pw - 10;
  if (left < 4) left = 4;
  if (top < 4) top = 4;
  if (top + ph > window.innerHeight - 4) top = window.innerHeight - ph - 4;
  picker.style.left = left + "px";
  picker.style.top = top + "px";
  console.log("[REACT] Picker opened for:", targetPlayer?.name, "id:", targetId);
}

function hideEmojiPicker() {
  document.getElementById("emoji-picker").style.display = "none";
  emojiPickerTarget = null;
}

function sendReaction(emoji) {
  if (!emojiPickerTarget) return;
  console.log("[REACT] Sending reaction:", emoji, "to:", emojiPickerTarget);
  socket.emit("sendReaction", { targetId: emojiPickerTarget, emoji });
  hideEmojiPicker();
}

function coloredName(name, id) {
  return `<span style="color:${lightenColor(hashColor(id), 0.35)};font-weight:bold">[${escapeHtml(name)}]</span>`;
}

function buildReactionText(data) {
  if (data.targetId === myId) {
    return `${coloredName(data.senderName, data.senderId)} ${t("reacted")} ${data.emoji}`;
  } else {
    if (currentLang === "zh") {
      return `${t("reactedTo")} ${coloredName(data.targetName, data.targetId)} ${t("reactedToSuffix")} ${data.emoji}`;
    }
    return `${t("reactedTo")} ${coloredName(data.targetName, data.targetId)} ${data.emoji}`;
  }
}

function showReactionNotification(data) {
  if (currentRoom === "rest") {
    // In Lounge: show as system message in chat panel
    addReactionChatMessage(data);
  } else {
    // In Focus Zone: show in bottom-left notification panel
    addReactionToPanel(data);
  }
}

function addReactionChatMessage(data) {
  const chatMsgs = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = "chat-msg";
  const d = new Date(data.timestamp);
  const timeStr = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  const text = buildReactionText(data);
  div.innerHTML = `<span class="chat-time">${timeStr}</span> <span class="chat-text">${text}</span>`;
  chatMsgs.appendChild(div);
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

function addReactionToPanel(data) {
  const id = ++reactionNotifIdCounter;
  const text = buildReactionText(data);
  reactionNotifications.push({ id, text, timestamp: data.timestamp });
  if (reactionNotifications.length > 10) reactionNotifications.shift();
  updateNotificationPanel();
}

function removeNotification(id) {
  reactionNotifications = reactionNotifications.filter(n => n.id !== id);
  updateNotificationPanel();
}

function updateNotificationPanel() {
  const panel = document.getElementById("reaction-notifications");
  const list = document.getElementById("reaction-list");
  list.innerHTML = "";
  if (reactionNotifications.length === 0) {
    panel.style.display = "none";
    return;
  }
  panel.style.display = "flex";
  reactionNotifications.forEach(n => {
    const d = new Date(n.timestamp);
    const timeStr = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    const item = document.createElement("div");
    item.className = "reaction-item";
    item.innerHTML =
      `<span class="reaction-time">${timeStr}</span>` +
      `<span class="reaction-content">${n.text}</span>` +
      `<button class="reaction-close">&times;</button>`;
    item.querySelector(".reaction-close").addEventListener("click", () => removeNotification(n.id));
    list.appendChild(item);
  });
}

// Bind emoji button clicks
document.querySelectorAll(".emoji-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    sendReaction(btn.dataset.emoji);
  });
});

canvas.addEventListener("click", (e) => {
  const { x: clickX, y: clickY } = screenToGame(e.clientX, e.clientY);

  // If picker is open, close it (unless we clicked another player)
  const pickerOpen = document.getElementById("emoji-picker").style.display === "flex";

  // Check for player click first (box covers name label + body + shadow)
  let clickedPlayerId = null;
  let clickedDist = Infinity;
  const playersInRoom = [];
  for (const id in otherPlayers) {
    const p = otherPlayers[id];
    if (p.room !== currentRoom) continue;
    const dx = clickX - p.x;
    const dy = clickY - p.y;
    playersInRoom.push({ name: p.name, dx: Math.round(dx), dy: Math.round(dy) });
    // Rectangular hit area: ±25 horizontal, -40 to +15 vertical (covers name label above head down to feet)
    if (Math.abs(dx) < 25 && dy > -40 && dy < 15) {
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < clickedDist) {
        clickedDist = dist;
        clickedPlayerId = id;
      }
    }
  }
  console.log("[REACT] Canvas click at game:", Math.round(clickX), Math.round(clickY),
    "players:", playersInRoom.length, playersInRoom);

  if (clickedPlayerId) {
    showEmojiPicker(clickedPlayerId, e.clientX, e.clientY);
    return;
  }

  // Close picker if open and clicked elsewhere
  if (pickerOpen) {
    hideEmojiPicker();
    return;
  }

  // Map object click (Tiled object layer - pets etc.)
  const mapObjs = ROOM_DATA[currentRoom].mapObjects;
  if (mapObjs && mapObjs.length && Date.now() > petInteractTimer) {
    for (const obj of mapObjs) {
      if (obj.type !== "pet") continue;
      const ts = findTilesetForGID(obj.gid);
      if (!ts) continue;
      const cx = obj.x + ts.tileW / 2;
      const cy = obj.y + ts.tileH / 2;
      if (Math.abs(clickX - cx) < ts.tileW / 2 + 4 && Math.abs(clickY - cy) < ts.tileH / 2 + 4) {
        if (localPlayer && localPlayer.name === obj.allowedPlayer) {
          spawnOneHeart(cx, obj.y);
          playPurr();
        }
        petInteractTimer = Date.now() + 1000;
        return;
      }
    }
  }

  // Cat click (original behavior)
  if (catData.room !== currentRoom) return;
  const dx = clickX - catData.x;
  const dy = clickY - catData.y;
  if (Math.sqrt(dx * dx + dy * dy) < 25) {
    socket.emit("petCat");
  }
});

socket.on("catPetted", (data) => {
  if (data.wasSleeping) {
    // Sleeping cat: just tail wag, no heart
    catSleepPetTimer = 40;
  } else {
    // Awake cat: one gentle heart + meow sound + floating text
    spawnOneHeart(data.x, data.y);
    playPurr();
    if (soundEnabled && Date.now() > catMeowCooldown) {
      catMeowAudio.currentTime = 0;
      catMeowAudio.volume = SOUND_MAX_VOL * (volumeSlider.value / 100);
      catMeowAudio.play().catch(() => {});
      catMeowCooldown = Date.now() + 5000;
      catMiuTimer = 180;
      catMiuX = data.x;
      catMiuY = data.y - 24;
    }
  }
});

// ============================================================
// GAME STATE
// ============================================================

const otherPlayers = {};
let localPlayer = null;
let myId = null;
let portalCooldown = 0; // Prevent rapid room switching

const keys = { up: false, down: false, left: false, right: false };

// --- Focus timer state ---
let isFocusing = false;
let focusStartTime = null;
let focusCategory = null;
let focusTaskName = "";
let lastKeyPressTime = Date.now();
let autoWalking = false;
let autoWalkPath = [];    // waypoint queue [{x,y}, ...]
let awStuckFrames = 0;
let entranceWalking = false;
const IDLE_MS = 30000;          // post-focus auto-walk delay
const DAYDREAM_MS = 5 * 60 * 1000;    // 5min
const IDLE_LEAVE_MS = 10 * 60 * 1000; // 10min

// Find portal center from current room collision data
function findPortalInCurrentRoom() {
  const map = getCurrentMap();
  const rows = getRows(), cols = getCols();
  let sumX = 0, sumY = 0, count = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (map[r][c] === 8) {
        sumX += c * TILE + TILE / 2;
        sumY += r * TILE + TILE / 2;
        count++;
      }
    }
  }
  return count > 0 ? { x: sumX / count, y: sumY / count } : { x: 15 * TILE + 16, y: TILE / 2 };
}

function startAutoWalk() {
  autoWalking = true;
  awStuckFrames = 0;
  const safeCols = [2,3,8,9,10,11,12,13,18,19,20,21,22,23,28,29];
  const playerCol = Math.floor(localPlayer.x / TILE);
  let bestCol = 10;
  let bestDist = 999;
  for (const sc of safeCols) {
    const d = Math.abs(sc - playerCol);
    if (d < bestDist) { bestDist = d; bestCol = sc; }
  }
  const safeX = bestCol * TILE + TILE / 2;
  const portal = findPortalInCurrentRoom();
  // Walk to a safe row first, then align with portal, then walk to portal
  const aboveDesksY = 2 * TILE + TILE / 2;
  autoWalkPath = [
    { x: safeX, y: localPlayer.y },
    { x: safeX, y: aboveDesksY },
    { x: portal.x, y: aboveDesksY },
    { x: portal.x, y: portal.y },
  ];
}

function startEntranceWalk() {
  if (!localPlayer || currentRoom !== "focus") return;
  entranceWalking = true;
  autoWalking = true;
  awStuckFrames = 0;
  // Walk from entrance (bottom) upward into the main Focus Zone area
  const dims = ROOM_DIMS.focus;
  const targetRow = Math.min(dims.rows - 5, 14);
  const targetX = Math.floor(dims.cols / 2) * TILE;
  const targetY = targetRow * TILE + TILE / 2;
  autoWalkPath = [
    { x: targetX, y: localPlayer.y },
    { x: targetX, y: targetY },
  ];
  document.getElementById("autowalk-hint").textContent = t("checkingIn");
  document.getElementById("autowalk-hint").style.display = "block";
}
let focusPortalPending = false;
let postFocusTime = 0; // timestamp when focus ended, 0 = not in post-focus state
let emojiSuppressUntil = 0; // hide status emoji until this timestamp

// ============================================================
// INPUT
// ============================================================

document.addEventListener("keydown", (e) => {
  // Don't capture keys when typing in inputs
  if (e.target.id === "chat-input" || e.target.id === "name-input" || e.target.id === "focus-task-input" || e.target.id === "welcome-name") return;

  // Reset idle timer and cancel auto-walk / post-focus / daydreaming state
  lastKeyPressTime = Date.now();
  if (autoWalking) {
    autoWalking = false;
    autoWalkPath = [];
    entranceWalking = false;
    postFocusTime = 0;
    document.getElementById("autowalk-hint").style.display = "none";
  }
  if (localPlayer && localPlayer.status === "daydreaming") {
    localPlayer.status = "wandering";
    socket.emit("setStatus", "wandering");
  }

  switch (e.key) {
    case "ArrowUp": case "w": case "W": keys.up = true; break;
    case "ArrowDown": case "s": case "S": keys.down = true; break;
    case "ArrowLeft": case "a": case "A": keys.left = true; break;
    case "ArrowRight": case "d": case "D": keys.right = true; break;
  }
});

document.addEventListener("keyup", (e) => {
  switch (e.key) {
    case "ArrowUp": case "w": case "W": keys.up = false; break;
    case "ArrowDown": case "s": case "S": keys.down = false; break;
    case "ArrowLeft": case "a": case "A": keys.left = false; break;
    case "ArrowRight": case "d": case "D": keys.right = false; break;
  }
});

document.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) &&
      e.target.id !== "chat-input" && e.target.id !== "name-input" && e.target.id !== "focus-task-input" && e.target.id !== "welcome-name") {
    e.preventDefault();
  }
});

// ============================================================
// UI CONTROLS
// ============================================================

const nameInput = document.getElementById("name-input");
const statusSelect = document.getElementById("status-select");
const onlineTotal = document.getElementById("online-total");
const onlineFocus = document.getElementById("online-focus");
const onlineLounge = document.getElementById("online-lounge");
const roomLabel = document.getElementById("room-label");
const chatWrap = document.getElementById("chat-wrap");
const chatPanel = document.getElementById("chat-panel");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const musicToggle = document.getElementById("music-toggle");
const volumeSlider = document.getElementById("volume-slider");

nameInput.addEventListener("change", () => {
  const name = nameInput.value.trim();
  if (name && localPlayer) {
    localPlayer.name = name;
    socket.emit("setName", name);
    localStorage.setItem("playerName", name);
  }
});

// Welcome popup for first-time users
const welcomePopup = document.getElementById("welcome-popup");
const welcomeNameInput = document.getElementById("welcome-name");
const welcomeEnter = document.getElementById("welcome-enter");
const savedName = localStorage.getItem("playerName");

if (savedName) {
  nameInput.value = savedName;
  welcomePopup.classList.add("hidden");
} else {
  welcomeNameInput.focus();
}

function submitWelcome() {
  const name = welcomeNameInput.value.trim();
  if (!name) return;
  nameInput.value = name;
  localStorage.setItem("playerName", name);
  localStorage.setItem("playerCharacter", selectedCharacter);
  if (localPlayer) {
    localPlayer.name = name;
    localPlayer.character = selectedCharacter;
    socket.emit("setName", name);
    socket.emit("setCharacter", selectedCharacter);
  }
  welcomePopup.classList.add("hidden");
  setTimeout(() => startEntranceWalk(), 300);
}

welcomeEnter.addEventListener("click", submitWelcome);
welcomeNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitWelcome();
});

statusSelect.addEventListener("change", () => {
  if (localPlayer) {
    localPlayer.status = statusSelect.value;
    socket.emit("setStatus", statusSelect.value);
    emojiSuppressUntil = 0; // User explicitly chose a status, show it
  }
});

// --- Chat ---
let isComposing = false; // Track IME composition state

function sendChat() {
  const text = chatInput.value.trim();
  if (!text || currentRoom !== "rest") return;
  socket.emit("chatMessage", text);
  chatInput.value = "";
}

chatSend.addEventListener("click", sendChat);
chatInput.addEventListener("compositionstart", () => { isComposing = true; });
chatInput.addEventListener("compositionend", () => { isComposing = false; });
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !isComposing) sendChat();
});

// --- Chat toggle + unread badge ---
const chatToggle = document.getElementById("chat-toggle");
let unreadCount = 0;

chatToggle.addEventListener("click", () => {
  chatPanel.classList.toggle("collapsed");
  const collapsed = chatPanel.classList.contains("collapsed");
  if (!collapsed) {
    unreadCount = 0;
    updateChatBadge();
  }
  chatToggle.textContent = collapsed ? t("chat") : t("hide");
});

function updateChatBadge() {
  const badge = chatToggle.querySelector(".chat-badge");
  if (unreadCount > 0 && chatPanel.classList.contains("collapsed")) {
    if (badge) {
      badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
    } else {
      const b = document.createElement("span");
      b.className = "chat-badge";
      b.textContent = unreadCount > 9 ? "9+" : unreadCount;
      chatToggle.appendChild(b);
    }
  } else if (badge) {
    badge.remove();
  }
}

// --- Chat bubbles above characters ---
const chatBubbles = {};
const BUBBLE_DURATION = 5000;

function addChatMessage(msg, isHistory) {
  // System messages (join/leave)
  if (msg.type === "system") {
    const div = document.createElement("div");
    div.className = "chat-msg chat-system";
    const actionText = msg.action === "join" ? t("joinedLounge") : t("leftLounge");
    div.textContent = `${msg.name} ${actionText}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return;
  }

  // Timestamp
  const date = new Date(msg.time);
  const timeStr = `${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;

  // Name color from player ID, lightened for dark background
  const nameColor = msg.id ? lightenColor(hashColor(msg.id), 0.35) : "#f5a623";

  const div = document.createElement("div");
  div.className = "chat-msg";
  div.innerHTML = `<span class="chat-time">${timeStr}</span> <span class="chat-name" style="color:${nameColor}">${escapeHtml(msg.name)}</span> <span class="chat-text">${escapeHtml(msg.text)}</span>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Chat bubble + unread badge (skip for history)
  if (!isHistory) {
    if (msg.id) {
      chatBubbles[msg.id] = { text: msg.text.length > 30 ? msg.text.slice(0, 30) + "..." : msg.text, time: Date.now() };
    }
    if (chatPanel.classList.contains("collapsed")) {
      unreadCount++;
      updateChatBadge();
    }
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const FOCUS_STATUS_KEYS = ["studying", "working", "reading", "coding"];
const REST_STATUS_KEYS = ["resting", "chatting", "listening", "watching", "napping", "snacking", "browsing"];

let roomLabelTimer = null;

function showRoomLabel() {
  roomLabel.classList.add("visible");
  clearTimeout(roomLabelTimer);
  roomLabelTimer = setTimeout(() => {
    roomLabel.classList.remove("visible");
  }, 2500);
}

function updateRoomUI() {
  roomLabel.textContent = currentRoom === "focus" ? t("focusZone") : t("lounge");
  roomLabel.className = currentRoom; // sets "focus" or "rest"
  // showRoomLabel adds "visible" after className is set
  showRoomLabel();

  if (currentRoom === "rest") {
    chatWrap.classList.add("visible");
  } else {
    chatWrap.classList.remove("visible");
  }

  if (currentRoom === "focus") {
    // Focus Zone: hide status dropdown, set wandering by default
    statusSelect.style.display = "none";
    if (localPlayer && !isFocusing) {
      localPlayer.status = "wandering";
      socket.emit("setStatus", "wandering");
    }
  } else {
    // Lounge: show status dropdown with lounge statuses
    statusSelect.style.display = "";
    const statusKeys = REST_STATUS_KEYS;
    statusSelect.innerHTML = "";
    for (const key of statusKeys) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = t(key);
      statusSelect.appendChild(opt);
    }
    if (localPlayer) {
      statusSelect.value = "resting";
      localPlayer.status = "resting";
      socket.emit("setStatus", "resting");
      emojiSuppressUntil = 0;
    }
  }

  updateFocusUI();
}

// ============================================================
// FOCUS TIMER UI
// ============================================================

const focusBtn = document.getElementById("focus-btn");
const focusPopup = document.getElementById("focus-popup");
const focusConfirm = document.getElementById("focus-confirm");
const focusCancel = document.getElementById("focus-cancel");
const focusTaskInput = document.getElementById("focus-task-input");
const focusTimerDisplay = document.getElementById("focus-timer-display");
const focusTaskLabel = document.getElementById("focus-task-label");
const focusTimeValue = document.getElementById("focus-time-value");
const autowalkHint = document.getElementById("autowalk-hint");
const categoryBtns = document.querySelectorAll(".focus-cat-btn");

let selectedCategory = "studying";

categoryBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    categoryBtns.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedCategory = btn.dataset.category;
  });
});

focusBtn.addEventListener("click", () => {
  if (isFocusing) {
    endFocus();
  } else {
    if (currentRoom !== "focus") return;
    focusPopup.style.display = "flex";
    categoryBtns.forEach(b => b.classList.remove("selected"));
    categoryBtns[0].classList.add("selected");
    selectedCategory = "studying";
    focusTaskInput.value = "";
    focusTaskInput.focus();
  }
});

focusConfirm.addEventListener("click", () => {
  startFocus(selectedCategory, focusTaskInput.value.trim());
  focusPopup.style.display = "none";
});

focusCancel.addEventListener("click", () => {
  focusPopup.style.display = "none";
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (focusPopup.style.display !== "none") focusPopup.style.display = "none";
    if (focusPortalConfirm.style.display !== "none") {
      focusPortalConfirm.style.display = "none";
      focusPortalPending = false;
    }
  }
});

// --- Portal confirm when focusing ---
const focusPortalConfirm = document.getElementById("focus-portal-confirm");
const focusPortalYes = document.getElementById("focus-portal-yes");
const focusPortalNo = document.getElementById("focus-portal-no");

function showFocusPortalConfirm() {
  focusPortalConfirm.style.display = "flex";
}

focusPortalYes.addEventListener("click", () => {
  focusPortalConfirm.style.display = "none";
  focusPortalPending = false;
  endFocus();
  // Now trigger the room change
  const newRoom = currentRoom === "focus" ? "rest" : "focus";
  playDoorSound();
  socket.emit("changeRoom", newRoom);
  portalCooldown = 60;
});

focusPortalNo.addEventListener("click", () => {
  focusPortalConfirm.style.display = "none";
  focusPortalPending = false;
  portalCooldown = 60;
  // Push player to safe position away from portal
  if (currentRoom === "focus") {
    // Focus portal is at bottom (row 16), move to row 14
    localPlayer.y = 14 * TILE + TILE / 2;
  } else {
    // Rest portal is at top (row 1), move to row 3
    localPlayer.y = 3 * TILE + TILE / 2;
  }
});

function getCategoryLabel(category) {
  const map = { studying: "catStudying", working: "catWorking", creating: "catCreating", reading: "catReading" };
  return t(map[category] || category);
}

function startFocus(category, taskName) {
  isFocusing = true;
  focusStartTime = Date.now();
  focusCategory = category;
  focusTaskName = taskName || getCategoryLabel(category);
  lastKeyPressTime = Date.now();
  autoWalking = false;
  postFocusTime = 0;
  emojiSuppressUntil = 0;

  if (localPlayer) {
    localPlayer.isFocusing = true;
    localPlayer.focusStartTime = focusStartTime;
    localPlayer.focusCategory = category;
    localPlayer.status = category;
    socket.emit("setStatus", category);
  }

  socket.emit("startFocus", { category });
  updateFocusUI();
}

function endFocus() {
  if (!isFocusing) return;

  const elapsed = Date.now() - focusStartTime;
  saveFocusRecord(focusTaskName, focusCategory, elapsed, focusStartTime);

  isFocusing = false;
  focusStartTime = null;
  focusCategory = null;
  focusTaskName = "";
  autoWalking = false;
  autowalkHint.style.display = "none";
  lastKeyPressTime = Date.now();
  postFocusTime = Date.now(); // Start post-focus state
  emojiSuppressUntil = Date.now() + 30000; // Suppress emoji during post-focus

  if (localPlayer) {
    localPlayer.isFocusing = false;
    localPlayer.focusStartTime = null;
    localPlayer.focusCategory = null;
    localPlayer.status = "wandering";
    socket.emit("setStatus", "wandering");
  }

  socket.emit("endFocus");
  updateFocusUI();
}

function updateFocusUI() {
  if (currentRoom !== "focus") {
    focusBtn.style.display = "none";
    focusTimerDisplay.style.display = "none";
    return;
  }

  focusBtn.style.display = "";

  if (isFocusing) {
    focusBtn.textContent = t("endFocus");
    focusBtn.classList.add("active");
    focusTimerDisplay.style.display = "flex";
    focusTaskLabel.textContent = focusTaskName;
  } else {
    focusBtn.textContent = t("startFocus");
    focusBtn.classList.remove("active");
    focusTimerDisplay.style.display = "none";
  }
}

function formatFocusTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
  }
  return `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
}

// ============================================================
// FOCUS HISTORY (localStorage)
// ============================================================

function saveFocusRecord(taskName, category, durationMs, startTimestamp) {
  if (durationMs < 5000) return;
  const records = JSON.parse(localStorage.getItem("focusHistory") || "[]");
  records.push({
    taskName,
    category,
    duration: durationMs,
    startTime: startTimestamp,
    endTime: Date.now(),
  });
  if (records.length > 100) records.splice(0, records.length - 100);
  localStorage.setItem("focusHistory", JSON.stringify(records));
}

// ============================================================
// FOCUS HISTORY UI
// ============================================================

const historyBtn = document.getElementById("history-btn");
const historyPopup = document.getElementById("history-popup");

historyBtn.addEventListener("click", () => {
  renderHistoryPanel();
  historyPopup.style.display = "flex";
});

document.getElementById("history-close").addEventListener("click", () => {
  historyPopup.style.display = "none";
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && historyPopup.style.display !== "none") {
    historyPopup.style.display = "none";
  }
});

function getHistoryRecords() {
  try {
    return JSON.parse(localStorage.getItem("focusHistory") || "[]");
  } catch (e) {
    return [];
  }
}

function getDayKey(timestamp) {
  const d = new Date(timestamp);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function getDayLabel(dateStr) {
  const parts = dateStr.split("-");
  return parts[1] + "/" + parts[2];
}

function formatHistoryDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return totalMin + " " + t("historyMin");
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h + t("historyH") + " " + m + t("historyMin");
}

function deleteHistoryRecord(startTime) {
  const records = getHistoryRecords();
  const idx = records.findIndex(r => r.startTime === startTime);
  if (idx !== -1) {
    records.splice(idx, 1);
    localStorage.setItem("focusHistory", JSON.stringify(records));
  }
  renderHistoryPanel();
}

function getCategoryIcon(category) {
  const icons = { studying: "\u{1F4D6}", working: "\u{1F4BC}", creating: "\u{1F4DD}", reading: "\u{1F4DA}" };
  return icons[category] || "\u{1F4D6}";
}

function renderHistoryPanel() {
  const records = getHistoryRecords();
  const todayKey = getDayKey(Date.now());

  // Today summary
  let todayMs = 0;
  let todayCount = 0;
  for (const r of records) {
    if (getDayKey(r.startTime) === todayKey) {
      todayMs += r.duration;
      todayCount++;
    }
  }
  document.getElementById("history-today-time").textContent = formatHistoryDuration(todayMs);
  const sessionsSpan = document.querySelector(".history-today-sessions");
  sessionsSpan.innerHTML = "";
  const countSpan = document.createElement("span");
  countSpan.id = "history-today-count";
  countSpan.textContent = todayCount;
  sessionsSpan.appendChild(countSpan);
  sessionsSpan.appendChild(document.createTextNode(" " + t("historySessions")));

  // Last 7 days chart
  const dayTotals = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = getDayKey(d.getTime());
    let total = 0;
    for (const r of records) {
      if (getDayKey(r.startTime) === key) total += r.duration;
    }
    dayTotals.push({ key, total, label: getDayLabel(key) });
  }

  const maxMs = Math.max(...dayTotals.map(d => d.total), 1);
  const chartEl = document.getElementById("history-chart");
  chartEl.innerHTML = "";
  for (const day of dayTotals) {
    const col = document.createElement("div");
    col.className = "history-bar-col";

    const val = document.createElement("div");
    val.className = "history-bar-value";
    if (day.total > 0) {
      const mins = Math.floor(day.total / 60000);
      val.textContent = mins >= 60 ? Math.floor(mins / 60) + t("historyH") : mins + "m";
    }
    col.appendChild(val);

    const bar = document.createElement("div");
    bar.className = "history-bar" + (day.key === todayKey ? " today" : "");
    const pct = day.total > 0 ? Math.max(4, (day.total / maxMs) * 100) : 0;
    bar.style.height = pct + "%";
    if (day.total === 0) {
      bar.style.height = "2px";
      bar.style.opacity = "0.3";
    }
    col.appendChild(bar);

    const lbl = document.createElement("div");
    lbl.className = "history-bar-label";
    lbl.textContent = day.label;
    col.appendChild(lbl);

    chartEl.appendChild(col);
  }

  // Recent sessions list
  const listEl = document.getElementById("history-list");
  listEl.innerHTML = "";
  if (records.length === 0) {
    const noData = document.createElement("div");
    noData.className = "history-no-data";
    noData.textContent = t("historyNoData");
    listEl.appendChild(noData);
    return;
  }

  const recent = records.slice(-20).reverse();
  for (const r of recent) {
    const row = document.createElement("div");
    row.className = "history-row";

    const icon = document.createElement("span");
    icon.className = "history-row-icon";
    icon.textContent = getCategoryIcon(r.category);
    row.appendChild(icon);

    const info = document.createElement("div");
    info.className = "history-row-info";

    const task = document.createElement("div");
    task.className = "history-row-task";
    task.textContent = r.taskName || getCategoryLabel(r.category);
    info.appendChild(task);

    const date = document.createElement("div");
    date.className = "history-row-date";
    const d = new Date(r.startTime);
    date.textContent = getDayLabel(getDayKey(r.startTime)) + " " +
      String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    info.appendChild(date);

    row.appendChild(info);

    const dur = document.createElement("span");
    dur.className = "history-row-duration";
    dur.textContent = formatHistoryDuration(r.duration);
    row.appendChild(dur);

    const del = document.createElement("button");
    del.className = "history-row-delete";
    del.textContent = "\u00D7";
    del.addEventListener("click", () => deleteHistoryRecord(r.startTime));
    row.appendChild(del);

    listEl.appendChild(row);
  }
}

// ============================================================
// AUDIO
// ============================================================

let audioCtx = null;
let musicGain = null;
let soundEnabled = false;

// Focus sounds (proximity-based, per category)
const focusSounds = {
  working: new Audio("/sounds/typing.mp3"),
  studying: new Audio("/sounds/writing.mp3"),
  creating: new Audio("/sounds/writing.mp3"),
  reading: new Audio("/sounds/page-flip.mp3"),
};
for (const key in focusSounds) {
  if (key !== "reading") focusSounds[key].loop = true;
  focusSounds[key].volume = 0;
}

const SOUND_MAX_DIST = 150;  // max distance to hear sound (game units)
const SOUND_MIN_DIST = 20;   // distance for full volume
const SOUND_MAX_VOL = 0.6;
let nextPageFlipTime = 0;

function updateFocusSounds() {
  if (!soundEnabled || !localPlayer) {
    for (const key in focusSounds) {
      focusSounds[key].volume = 0;
      if (!focusSounds[key].paused) focusSounds[key].pause();
    }
    return;
  }

  // Track closest distance per sound category
  const closest = { working: Infinity, studying: Infinity, creating: Infinity, reading: Infinity };

  for (const id in otherPlayers) {
    const p = otherPlayers[id];
    if (p.room !== currentRoom || !p.isFocusing) continue;
    const cat = p.focusCategory || "working";
    const dx = localPlayer.x - p.x;
    const dy = localPlayer.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (closest[cat] !== undefined && dist < closest[cat]) closest[cat] = dist;
  }

  // Local player's own focus sound
  if (isFocusing) {
    const cat = focusCategory || "working";
    if (closest[cat] !== undefined) closest[cat] = Math.min(closest[cat], 0);
  }

  // Update each sound channel
  for (const cat in focusSounds) {
    const audio = focusSounds[cat];
    const dist = closest[cat];

    if (dist > SOUND_MAX_DIST) {
      audio.volume = 0;
      if (!audio.paused) audio.pause();
    } else {
      const t = Math.max(0, Math.min(1, (SOUND_MAX_DIST - dist) / (SOUND_MAX_DIST - SOUND_MIN_DIST)));
      const vol = t * t * SOUND_MAX_VOL * (volumeSlider.value / 100);

      if (cat === "reading") {
        // Play at random 20~40s intervals
        const now = Date.now();
        if (now >= nextPageFlipTime) {
          nextPageFlipTime = now + 20000 + Math.random() * 20000;
          audio.currentTime = 0;
          audio.volume = Math.min(1, Math.max(0, vol));
          audio.play().catch(() => {});
        }
      } else {
        audio.volume = Math.min(1, Math.max(0, vol));
        if (audio.paused) {
          audio.play().catch(() => {});
        }
      }
    }
  }
}

// Time-of-day ambient sounds (near window, proximity-based)
const ambientSounds = {
  morning: new Audio("/sounds/morning.mp3"),         // 6:00 - 11:00
  daytime: new Audio("/sounds/yuk1to-street-ambience-traffic-410714.mp3"), // 11:00 - 17:00
  night:   new Audio("/sounds/night.mp3"),            // 20:00 - 6:00
};
for (const key in ambientSounds) {
  ambientSounds[key].loop = true;
  ambientSounds[key].volume = 0;
}
let currentAmbientKey = null;

const AMBIENT_MAX_DIST = 120;
const AMBIENT_MIN_DIST = 20;
const AMBIENT_MAX_VOL = 0.4;
// Window positions: row 0, columns where c > 1 && c < 30 && c % 4 === 0
const WINDOW_POSITIONS = [];
for (let c = 4; c < 30; c += 4) {
  WINDOW_POSITIONS.push({ x: c * TILE + TILE / 2, y: TILE / 2 });
}

function getAmbientKey() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "daytime";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night"; // 20:00 - 6:00
}

function stopAllAmbient() {
  for (const key in ambientSounds) {
    ambientSounds[key].volume = 0;
    if (!ambientSounds[key].paused) ambientSounds[key].pause();
  }
  currentAmbientKey = null;
}

function updateAmbientSound() {
  if (!soundEnabled || !localPlayer) {
    stopAllAmbient();
    return;
  }

  const wantKey = getAmbientKey();

  // Stop old ambient if time period changed
  if (wantKey !== currentAmbientKey) {
    stopAllAmbient();
    currentAmbientKey = wantKey;
  }

  if (!wantKey) return;

  const audio = ambientSounds[wantKey] || ambientSounds["daytime"];

  // Find closest window
  let closestDist = Infinity;
  for (const wp of WINDOW_POSITIONS) {
    const dx = localPlayer.x - wp.x;
    const dy = localPlayer.y - wp.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < closestDist) closestDist = dist;
  }

  if (closestDist > AMBIENT_MAX_DIST) {
    audio.volume = 0;
    if (!audio.paused) audio.pause();
  } else {
    const t = Math.max(0, Math.min(1, (AMBIENT_MAX_DIST - closestDist) / (AMBIENT_MAX_DIST - AMBIENT_MIN_DIST)));
    const vol = t * t * AMBIENT_MAX_VOL * (volumeSlider.value / 100);
    audio.volume = Math.min(1, Math.max(0, vol));
    if (audio.paused) {
      audio.play().catch(() => {});
    }
  }
}

// Door sound (played once on portal transit)
const doorAudio = new Audio("/sounds/door.MP3");
function playDoorSound() {
  if (!soundEnabled) return;
  doorAudio.currentTime = 0;
  doorAudio.volume = SOUND_MAX_VOL * (volumeSlider.value / 100);
  doorAudio.play().catch(() => {});
}

// Cat meow (proximity-triggered)
const catMeowAudio = new Audio("/sounds/cat-meow.mp3");
const CAT_MEOW_DIST = 60;
let catWasNear = false;
let catMeowCooldown = 0;

function updateCatMeow() {
  if (!soundEnabled || !localPlayer || catData.room !== currentRoom) {
    catWasNear = false;
    return;
  }

  const dx = localPlayer.x - catData.x;
  const dy = localPlayer.y - catData.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const isNear = dist < CAT_MEOW_DIST;
  const now = Date.now();

  // Trigger on entering proximity (only when sit/wander/curious)
  const catState = catData.state;
  if (isNear && !catWasNear && now > catMeowCooldown && (catState === "sit" || catState === "wander" || catState === "curious")) {
    if (Math.random() < 0.2) {
      catMeowAudio.currentTime = 0;
      catMeowAudio.volume = SOUND_MAX_VOL * (volumeSlider.value / 100);
      catMeowAudio.play().catch(() => {});
      catMeowCooldown = now + 10000;
      // Floating text
      catMiuTimer = 180;
      catMiuX = catData.x;
      catMiuY = catData.y - 24;
    }
  }
  catWasNear = isNear;
}

function startMusic() {}
function stopMusic() {}
function switchMusic() {}

musicToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  musicToggle.textContent = soundEnabled ? t("soundOn") : t("soundOff");
  if (!soundEnabled) {
    for (const key in focusSounds) {
      focusSounds[key].pause();
      focusSounds[key].volume = 0;
    }
    stopAllAmbient();
  }
});
volumeSlider.addEventListener("input", () => {});

// ============================================================
// SOCKET EVENTS
// ============================================================

socket.on("roomDimensions", (dims) => {
  if (dims.focus) ROOM_DIMS.focus = dims.focus;
  if (dims.rest) ROOM_DIMS.rest = dims.rest;
});

socket.on("currentPlayers", (players) => {
  myId = socket.id;
  for (const id in players) {
    if (id === myId) {
      localPlayer = players[id];
      // Apply saved name on connect
      const sn = localStorage.getItem("playerName");
      if (sn) {
        localPlayer.name = sn;
        socket.emit("setName", sn);
      }
      // Apply saved character on connect
      const sc = localStorage.getItem("playerCharacter");
      if (sc) {
        localPlayer.character = sc;
        selectedCharacter = sc;
        socket.emit("setCharacter", sc);
      }
      currentRoom = localPlayer.room;
      updateRoomUI();
      // Returning user with saved name: auto-walk from entrance
      if (sn && currentRoom === "focus") {
        setTimeout(() => startEntranceWalk(), 300);
      }
    } else {
      otherPlayers[id] = players[id];
    }
  }
  updateOnlineCount();
});

socket.on("playerJoined", (player) => {
  otherPlayers[player.id] = player;
  updateOnlineCount();
});

socket.on("playerLeft", (id) => {
  delete otherPlayers[id];
  updateOnlineCount();
});

socket.on("playerMoved", (data) => {
  if (otherPlayers[data.id]) {
    otherPlayers[data.id].x = data.x;
    otherPlayers[data.id].y = data.y;
    otherPlayers[data.id].direction = data.direction;
  }
});

socket.on("playerUpdated", (player) => {
  if (player.id === myId) {
    localPlayer.name = player.name;
    localPlayer.status = player.status;
    localPlayer.character = player.character;
    localPlayer.isFocusing = player.isFocusing;
    localPlayer.focusStartTime = player.focusStartTime;
    localPlayer.focusCategory = player.focusCategory;
    updateFocusUI();
  } else if (otherPlayers[player.id]) {
    otherPlayers[player.id].name = player.name;
    otherPlayers[player.id].status = player.status;
    otherPlayers[player.id].character = player.character;
    otherPlayers[player.id].isFocusing = player.isFocusing;
    otherPlayers[player.id].focusStartTime = player.focusStartTime;
    otherPlayers[player.id].focusCategory = player.focusCategory;
  }
  updateOnlineCount();
});

socket.on("playerChangedRoom", (data) => {
  if (data.id === myId) {
    // End focus on room change
    if (isFocusing) {
      const elapsed = Date.now() - focusStartTime;
      saveFocusRecord(focusTaskName, focusCategory, elapsed, focusStartTime);
      isFocusing = false;
      focusStartTime = null;
      focusCategory = null;
      focusTaskName = "";
    }
    // Sync localPlayer focus fields
    localPlayer.isFocusing = false;
    localPlayer.focusStartTime = null;
    localPlayer.focusCategory = null;
    localPlayer.status = "resting";

    autoWalking = false;
    autoWalkPath = [];
    autowalkHint.style.display = "none";
    focusPortalPending = false;
    focusPortalConfirm.style.display = "none";
    postFocusTime = 0; // Clear post-focus state on room change

    localPlayer.room = data.room;
    localPlayer.x = data.x;
    localPlayer.y = data.y;
    currentRoom = data.room;
    updateRoomUI();
    switchMusic();
  } else if (otherPlayers[data.id]) {
    otherPlayers[data.id].room = data.room;
    otherPlayers[data.id].x = data.x;
    otherPlayers[data.id].y = data.y;
    // Server resets focus on room change
    otherPlayers[data.id].isFocusing = false;
    otherPlayers[data.id].focusStartTime = null;
    otherPlayers[data.id].focusCategory = null;
  }
  updateOnlineCount();
});

// Gift pile events
socket.on("giftPileUpdated", (data) => {
  const target = data.id === myId ? localPlayer : otherPlayers[data.id];
  if (target) target.giftPile = data.giftPile;
});

socket.on("giftPileScatter", (data) => {
  spawnScatterGifts(data.x, data.y, data.gifts);
  const target = data.id === myId ? localPlayer : otherPlayers[data.id];
  if (target) target.giftPile = [];
});

socket.on("chatMessage", (msg) => {
  addChatMessage(msg);
});

socket.on("chatHistory", (history) => {
  for (const msg of history) {
    addChatMessage(msg, true);
  }
});

socket.on("catUpdate", (data) => {
  catData = data;
});

socket.on("emojiReaction", (data) => {
  console.log("[REACT] Received emojiReaction:", data.senderName, "->", data.targetName, data.emoji,
    "room:", data.room, "myRoom:", currentRoom, "myId:", myId,
    "iAmSender:", data.senderId === myId, "iAmTarget:", data.targetId === myId);
  // Only show floating emoji if we're in the same room
  if (data.room === currentRoom) {
    spawnReactionEmoji(data.senderId, data.targetId, data.emoji);
  }
  // Show notification to both sender and target
  if (data.targetId === myId || data.senderId === myId) {
    showReactionNotification(data);
  }
});

function updateOnlineCount() {
  let focusCount = 0;
  let loungeCount = 0;
  if (currentRoom === "focus") focusCount++; else loungeCount++;
  for (const id in otherPlayers) {
    if (otherPlayers[id].room === "focus") focusCount++; else loungeCount++;
  }
  const total = focusCount + loungeCount;
  onlineTotal.textContent = `🟢 ${total}`;
  onlineFocus.textContent = `📖 ${t("focusZone")}: ${focusCount}`;
  onlineLounge.textContent = `☕ ${t("lounge")}: ${loungeCount}`;
}

// ============================================================
// GAME LOOP
// ============================================================

let lastSentX = 0;
let lastSentY = 0;

function update() {
  if (!localPlayer) return;

  // Portal cooldown
  if (portalCooldown > 0) portalCooldown--;

  let dx = 0;
  let dy = 0;
  if (keys.up) dy -= SPEED;
  if (keys.down) dy += SPEED;
  if (keys.left) dx -= SPEED;
  if (keys.right) dx += SPEED;

  if (dx !== 0 && dy !== 0) {
    dx *= 0.707;
    dy *= 0.707;
  }

  const newX = localPlayer.x + dx;
  const newY = localPlayer.y + dy;

  if (dx !== 0 && canMoveTo(newX, localPlayer.y)) {
    localPlayer.x = newX;
  }
  if (dy !== 0 && canMoveTo(localPlayer.x, newY)) {
    localPlayer.y = newY;
  }

  if (dy < 0) localPlayer.direction = "up";
  else if (dy > 0) localPlayer.direction = "down";
  if (dx < 0) localPlayer.direction = "left";
  else if (dx > 0) localPlayer.direction = "right";

  // Update focus timer display
  if (isFocusing && focusStartTime) {
    focusTimeValue.textContent = formatFocusTime(Date.now() - focusStartTime);
  }

  // Proximity focus sounds
  updateFocusSounds();
  updateCatMeow();
  updateAmbientSound();

  // Wandering idle: 5min → daydreaming, 10min → auto-walk to Lounge
  if (!isFocusing && currentRoom === "focus" && !autoWalking) {
    const idleTime = Date.now() - lastKeyPressTime;
    if (idleTime > IDLE_LEAVE_MS) {
      startAutoWalk();
    } else if (idleTime > DAYDREAM_MS && localPlayer.status !== "daydreaming") {
      localPlayer.status = "daydreaming";
      socket.emit("setStatus", "daydreaming");
    }
  }
  // Post-focus auto-walk (30s idle after ending focus)
  if (!isFocusing && postFocusTime > 0 && currentRoom === "focus" && !autoWalking) {
    if (Date.now() - lastKeyPressTime > IDLE_MS) {
      startAutoWalk();
    }
  }

  // Auto-walk with waypoint queue + stuck detection
  if (autoWalking && autoWalkPath.length > 0) {
    const target = autoWalkPath[0];
    const awDx = target.x - localPlayer.x;
    const awDy = target.y - localPlayer.y;
    const awDist = Math.sqrt(awDx * awDx + awDy * awDy);
    if (awDist < 4) {
      autoWalkPath.shift(); // reached waypoint, go to next
    } else {
      const awSpeed = 1.5;
      const nx = localPlayer.x + (awDx / awDist) * awSpeed;
      const ny = localPlayer.y + (awDy / awDist) * awSpeed;
      const movedX = canMoveTo(nx, localPlayer.y);
      const movedY = canMoveTo(localPlayer.x, ny);
      if (movedX) localPlayer.x = nx;
      if (movedY) localPlayer.y = ny;

      // Stuck detection: if blocked on both axes, nudge perpendicular
      if (!movedX && !movedY) {
        awStuckFrames++;
        if (awStuckFrames > 8) {
          const nudge = (awStuckFrames % 30 < 15) ? 3 : -3;
          if (Math.abs(awDx) >= Math.abs(awDy)) {
            if (canMoveTo(localPlayer.x, localPlayer.y + nudge)) localPlayer.y += nudge;
            else if (canMoveTo(localPlayer.x, localPlayer.y - nudge)) localPlayer.y -= nudge;
          } else {
            if (canMoveTo(localPlayer.x + nudge, localPlayer.y)) localPlayer.x += nudge;
            else if (canMoveTo(localPlayer.x - nudge, localPlayer.y)) localPlayer.x -= nudge;
          }
        }
        // If truly stuck for too long, skip to next waypoint
        if (awStuckFrames > 120) {
          autoWalkPath.shift();
          awStuckFrames = 0;
        }
      } else {
        awStuckFrames = 0;
      }

      if (Math.abs(awDy) >= Math.abs(awDx)) {
        localPlayer.direction = awDy < 0 ? "up" : "down";
      } else {
        localPlayer.direction = awDx < 0 ? "left" : "right";
      }
    }
    if (autoWalkPath.length === 0) {
      autoWalking = false;
      if (entranceWalking) {
        entranceWalking = false;
        document.getElementById("autowalk-hint").style.display = "none";
      }
    }
  }

  // Check portal
  if (portalCooldown <= 0 && isOnPortal(localPlayer.x, localPlayer.y)) {
    if (isFocusing && !focusPortalPending) {
      // Show confirmation instead of switching
      focusPortalPending = true;
      showFocusPortalConfirm();
      portalCooldown = 30;
    } else if (!isFocusing) {
      const newRoom = currentRoom === "focus" ? "rest" : "focus";
      playDoorSound();
      socket.emit("changeRoom", newRoom);
      portalCooldown = 60;
    }
  }

  // Send position
  if (Math.abs(localPlayer.x - lastSentX) > 1 || Math.abs(localPlayer.y - lastSentY) > 1) {
    socket.emit("playerMove", {
      x: localPlayer.x,
      y: localPlayer.y,
      direction: localPlayer.direction,
    });
    lastSentX = localPlayer.x;
    lastSentY = localPlayer.y;
  }

}

function draw() {
  ctx = mainCtx;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Apply camera transform
  updateCamera();
  ctx.save();
  const gs = gameScale * dpr;
  ctx.setTransform(gs, 0, 0, gs, -cameraX * gs, -cameraY * gs);
  ctx.imageSmoothingEnabled = false;

  cachedTimeKey = getAmbientKey();
  portalDrawnThisFrame = false;
  portalLabelDrawnThisFrame = false;
  updateDoors();
  drawRoom();
  drawWindowLightSpills();
  updateAndDrawDustMotes();
  drawMapObjects();
  drawCatBody();
  drawCatUI();

  for (const id in otherPlayers) {
    if (otherPlayers[id].room === currentRoom) {
      drawPlayerBody(otherPlayers[id], false);
      drawGiftPile(otherPlayers[id]);
      drawPlayerLabel(otherPlayers[id]);
      drawPlayerFire(otherPlayers[id]);
      drawChatBubble(otherPlayers[id]);
    }
  }
  if (localPlayer) {
    drawPlayerBody(localPlayer, true);
    drawGiftPile(localPlayer);
    drawPlayerLabel(localPlayer);
    drawPlayerFire(localPlayer);
    drawChatBubble(localPlayer);
  }

  drawAboveLayers();

  updateAndDrawHearts();
  updateAndDrawFire();
  updateAndDrawScatterGifts();

  // Restore to screen space for vignette
  ctx.restore();
  drawVignette();

  // Draw reaction emojis AFTER vignette so they are not darkened
  updateAndDrawReactionEmojis();
}

function drawVignette() {
  const tv = TIME_VISUALS[cachedTimeKey];

  // Time-of-day color overlay
  if (tv.overlayColor) {
    ctx.fillStyle = tv.overlayColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Vignette with time-dependent darkness
  const grd = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.height * 0.35,
    canvas.width / 2, canvas.height / 2, canvas.height * 0.85
  );
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(1, `rgba(0,0,0,${tv.vignetteAlpha})`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Language toggle
document.getElementById("lang-toggle").addEventListener("click", toggleLanguage);

// ============================================================
// VIRTUAL JOYSTICK (touch devices only)
// ============================================================
if (isTouchDevice) {
  const joystickZone = document.getElementById("joystick-zone");
  const joystickCanvas = document.getElementById("joystick-canvas");
  const jCtx = joystickCanvas.getContext("2d");
  joystickZone.style.display = "block";

  const JOY_SIZE = 130;
  const JOY_RADIUS = 50;      // outer ring radius
  const THUMB_RADIUS = 22;    // thumb circle radius
  const DEADZONE = 0.15;      // 15% deadzone
  const JOY_CX = JOY_SIZE / 2;
  const JOY_CY = JOY_SIZE / 2;
  let joyActive = false;
  let joyThumbX = JOY_CX;
  let joyThumbY = JOY_CY;
  let joyTouchId = null;

  function drawJoystick() {
    jCtx.clearRect(0, 0, JOY_SIZE, JOY_SIZE);
    // Outer ring
    jCtx.beginPath();
    jCtx.arc(JOY_CX, JOY_CY, JOY_RADIUS, 0, Math.PI * 2);
    jCtx.fillStyle = "rgba(255,255,255,0.08)";
    jCtx.fill();
    jCtx.strokeStyle = "rgba(255,255,255,0.2)";
    jCtx.lineWidth = 2;
    jCtx.stroke();
    // Thumb
    jCtx.beginPath();
    jCtx.arc(joyThumbX, joyThumbY, THUMB_RADIUS, 0, Math.PI * 2);
    jCtx.fillStyle = joyActive ? "rgba(233,69,96,0.6)" : "rgba(255,255,255,0.2)";
    jCtx.fill();
    jCtx.strokeStyle = "rgba(255,255,255,0.35)";
    jCtx.lineWidth = 1.5;
    jCtx.stroke();
  }

  function updateJoystickInput(tx, ty) {
    const dx = tx - JOY_CX;
    const dy = ty - JOY_CY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = JOY_RADIUS;

    // Clamp to ring
    if (dist > maxDist) {
      joyThumbX = JOY_CX + (dx / dist) * maxDist;
      joyThumbY = JOY_CY + (dy / dist) * maxDist;
    } else {
      joyThumbX = tx;
      joyThumbY = ty;
    }

    const norm = Math.min(dist / maxDist, 1);
    if (norm < DEADZONE) {
      keys.up = keys.down = keys.left = keys.right = false;
      return;
    }

    const angle = Math.atan2(dy, dx);
    // Map to directional keys with overlapping zones for diagonals
    const t = Math.PI / 8;
    keys.right = angle > -(Math.PI / 4 + t) && angle < (Math.PI / 4 + t);
    keys.down  = angle > (Math.PI / 4 - t) && angle < (3 * Math.PI / 4 + t);
    keys.left  = angle > (3 * Math.PI / 4 - t) || angle < -(3 * Math.PI / 4 - t);
    keys.up    = angle > -(3 * Math.PI / 4 + t) && angle < -(Math.PI / 4 - t);
  }

  joystickZone.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (joyTouchId !== null) return;
    const touch = e.changedTouches[0];
    joyTouchId = touch.identifier;
    joyActive = true;
    const rect = joystickCanvas.getBoundingClientRect();
    const scaleX = JOY_SIZE / rect.width;
    const scaleY = JOY_SIZE / rect.height;
    const tx = (touch.clientX - rect.left) * scaleX;
    const ty = (touch.clientY - rect.top) * scaleY;
    updateJoystickInput(tx, ty);
    // Reset idle timer
    lastKeyPressTime = Date.now();
    if (autoWalking) {
      autoWalking = false;
      autoWalkPath = [];
      entranceWalking = false;
      postFocusTime = 0;
      document.getElementById("autowalk-hint").style.display = "none";
    }
    if (localPlayer && localPlayer.status === "daydreaming") {
      localPlayer.status = "wandering";
      socket.emit("setStatus", "wandering");
    }
  }, { passive: false });

  joystickZone.addEventListener("touchmove", (e) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier === joyTouchId) {
        const rect = joystickCanvas.getBoundingClientRect();
        const scaleX = JOY_SIZE / rect.width;
        const scaleY = JOY_SIZE / rect.height;
        const tx = (touch.clientX - rect.left) * scaleX;
        const ty = (touch.clientY - rect.top) * scaleY;
        updateJoystickInput(tx, ty);
        lastKeyPressTime = Date.now();
      }
    }
  }, { passive: false });

  function releaseJoystick() {
    joyActive = false;
    joyTouchId = null;
    joyThumbX = JOY_CX;
    joyThumbY = JOY_CY;
    keys.up = keys.down = keys.left = keys.right = false;
  }

  joystickZone.addEventListener("touchend", (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === joyTouchId) {
        releaseJoystick();
      }
    }
  });

  joystickZone.addEventListener("touchcancel", () => releaseJoystick());

  // Draw joystick every frame
  function joystickLoop() {
    drawJoystick();
    requestAnimationFrame(joystickLoop);
  }
  joystickLoop();
}

// Start
applyLanguage();
updateRoomUI();
gameLoop();
