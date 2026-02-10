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
const GAME_W = 1024;
const GAME_H = 576;

// Camera state
let gameScale = 1;
let cameraX = 0;
let cameraY = 0;

function resizeCanvas() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  // Scale so the game world always covers the viewport (fill, not fit)
  gameScale = Math.max(w / GAME_W, h / GAME_H);
}

function updateCamera() {
  if (!localPlayer) return;
  const viewW = canvas.width / gameScale;
  const viewH = canvas.height / gameScale;
  if (viewW >= GAME_W) {
    cameraX = (GAME_W - viewW) / 2; // center
  } else {
    const tx = localPlayer.x - viewW / 2;
    cameraX = Math.max(0, Math.min(GAME_W - viewW, tx));
  }
  if (viewH >= GAME_H) {
    cameraY = (GAME_H - viewH) / 2; // center
  } else {
    const ty = localPlayer.y - viewH / 2;
    cameraY = Math.max(0, Math.min(GAME_H - viewH, ty));
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
    x: sx / gameScale + cameraX,
    y: sy / gameScale + cameraY,
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
    welcomeTitle: "What would you like to be called?",
    welcomeHint: "You can change it anytime in \u2699\uFE0F",
    welcomeEnter: "Enter",
    lang: "\u{4E2D}\u6587",
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
    welcomeTitle: "\u4F60\u60F3\u88AB\u600E\u4E48\u79F0\u547C\uFF1F",
    welcomeHint: "\u53EF\u4EE5\u968F\u65F6\u5728\u53F3\u4E0A\u89D2 \u2699\uFE0F \u4E2D\u4FEE\u6539",
    welcomeEnter: "\u8FDB\u5165",
    lang: "EN",
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

  // Chat toggle
  const chatPanel = document.getElementById("chat-panel");
  const chatToggle = document.getElementById("chat-toggle");
  if (chatToggle && chatPanel) {
    chatToggle.textContent = chatPanel.classList.contains("collapsed") ? t("chat") : t("hide");
  }

  // Re-apply dynamic UI
  if (typeof updateRoomUI === "function") updateRoomUI();
}

// --- Constants ---
const TILE = 32;
const COLS = 32;
const ROWS = 18;
const PLAYER_SIZE = 24;
const SPEED = 3;
const PORTAL_TILE = 8; // New tile type for portals

// --- Current room ---
let currentRoom = "focus";

// ============================================================
// ROOM MAPS
// ============================================================
// 0=floor, 1=wall, 2=desk, 3=bookshelf, 4=plant, 5=rug,
// 6=(unused), 7=chair, 8=portal, 9=sofa, 10=coffee_machine

// --- Focus Room Colors ---
const FOCUS_COLORS = {
  floor: "#e8d8b8",
  floorDark: "#ddd0aa",
  wall: "#c8b898",
  wallTop: "#d4c8a8",
  wallDark: "#b8a888",
  desk: "#a07848",
  deskTop: "#b88858",
  chair: "#6b9e6b",
  bookshelf: "#8a6838",
  bookColors: ["#e06050", "#4a8ac0", "#50a060", "#e0a030", "#8060b0"],
  plant: "#5a9a68",
  plantPot: "#c09060",
  rug: "#a8c0d8",
  rugAlt: "#98b4cc",
  portal: "#e07080",
  portalGlow: "#f0909a",
};

// --- Rest Room Colors ---
const REST_COLORS = {
  floor: "#e8d0b0",
  floorDark: "#dcc4a4",
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
  rug: "#e0c0b8",
  rugAlt: "#d4b4ac",
  coffeeMachine: "#787878",
  coffeeTop: "#909090",
  portal: "#60a0d0",
  portalGlow: "#80b8e0",
};

function buildFocusMap() {
  const map = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        row.push(1);
      }
      // Bookshelves along top wall (3 groups, spread across 32 cols)
      else if (r === 1 && c >= 2 && c <= 7) row.push(3);
      else if (r === 1 && c >= 13 && c <= 18) row.push(3);
      else if (r === 1 && c >= 24 && c <= 29) row.push(3);
      // Desk clusters (top row) — 3 groups evenly spaced
      else if (r >= 4 && r <= 5 && c >= 4 && c <= 6) row.push(2);
      else if (r >= 4 && r <= 5 && c === 7) row.push(7);
      else if (r >= 4 && r <= 5 && c >= 14 && c <= 16) row.push(2);
      else if (r >= 4 && r <= 5 && c === 17) row.push(7);
      else if (r >= 4 && r <= 5 && c >= 24 && c <= 26) row.push(2);
      else if (r >= 4 && r <= 5 && c === 27) row.push(7);
      // Desk clusters (bottom row)
      else if (r >= 10 && r <= 11 && c >= 4 && c <= 6) row.push(2);
      else if (r >= 10 && r <= 11 && c === 7) row.push(7);
      else if (r >= 10 && r <= 11 && c >= 14 && c <= 16) row.push(2);
      else if (r >= 10 && r <= 11 && c === 17) row.push(7);
      else if (r >= 10 && r <= 11 && c >= 24 && c <= 26) row.push(2);
      else if (r >= 10 && r <= 11 && c === 27) row.push(7);
      // Plants in corners
      else if ((r === 1 && c === 1) || (r === 1 && c === COLS - 2)) row.push(4);
      else if ((r === ROWS - 2 && c === 1) || (r === ROWS - 2 && c === COLS - 2)) row.push(4);
      // Center quiet zone rug
      else if (r >= 7 && r <= 8 && c >= 12 && c <= 19) row.push(5);
      // Portal to rest zone (bottom center)
      else if (r === ROWS - 2 && c >= 14 && c <= 17) row.push(8);
      else row.push(0);
    }
    map.push(row);
  }
  return map;
}

function buildRestMap() {
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
      // Portal back to focus zone (top center)
      else if (r === 1 && c >= 11 && c <= 13) row.push(8);
      else row.push(0);
    }
    map.push(row);
  }
  return map;
}

const ROOM_MAPS = {
  focus: buildFocusMap(),
  rest: buildRestMap(),
};

function getCurrentMap() {
  return ROOM_MAPS[currentRoom];
}

// --- Tile walkability ---
function isWalkable(tileType) {
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
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
    if (!isWalkable(map[row][col])) return false;
  }
  return true;
}

function isOnPortal(x, y) {
  const map = getCurrentMap();
  const col = Math.floor(x / TILE);
  const row = Math.floor(y / TILE);
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
  return map[row][col] === 8;
}

// ============================================================
// DRAWING
// ============================================================

function drawRoom() {
  const map = getCurrentMap();
  const colors = currentRoom === "focus" ? FOCUS_COLORS : REST_COLORS;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * TILE;
      const y = r * TILE;
      const tile = map[r][c];

      // Floor base
      ctx.fillStyle = colors.floor;
      ctx.fillRect(x, y, TILE, TILE);

      // Floor stone texture (walkable tiles only)
      if (tile === 0 || tile === 7 || tile === 8) {
        const hash = (r * 31 + c * 17) % 8;
        if (hash < 3) {
          ctx.fillStyle = colors.floorDark;
          ctx.fillRect(x, y, TILE, TILE);
        }
        // Stone tile joints
        ctx.fillStyle = "rgba(0,0,0,0.07)";
        ctx.fillRect(x, y, TILE, 1);
        ctx.fillRect(x, y, 1, TILE);
      }

      switch (tile) {
        case 1: // Wall - stone brick pattern
          ctx.fillStyle = colors.wall;
          ctx.fillRect(x, y, TILE, TILE);
          // Brick mortar lines
          ctx.fillStyle = colors.wallDark;
          ctx.fillRect(x, y + 15, TILE, 1);
          if ((r + c) % 2 === 0) {
            ctx.fillRect(x + 14, y, 1, 15);
          } else {
            ctx.fillRect(x + 14, y + 16, 1, 16);
          }
          // Top highlight
          ctx.fillStyle = colors.wallTop;
          ctx.fillRect(x, y, TILE, 2);
          // Bottom shadow
          ctx.fillStyle = "rgba(0,0,0,0.12)";
          ctx.fillRect(x, y + TILE - 2, TILE, 2);
          // Windows on top wall
          if (r === 0 && c > 1 && c < COLS - 2 && c % 4 === 0) {
            // Window frame
            ctx.fillStyle = "#8a7050";
            ctx.fillRect(x + 3, y + 5, TILE - 6, TILE - 8);
            // Glass - bright and cheerful
            ctx.fillStyle = currentRoom === "focus" ? "#90d0f0" : "#d0a8e0";
            ctx.fillRect(x + 5, y + 7, TILE - 10, TILE - 12);
            // Cross frame
            ctx.fillStyle = "#8a7050";
            ctx.fillRect(x + TILE / 2 - 1, y + 7, 2, TILE - 12);
            ctx.fillRect(x + 5, y + TILE / 2 - 1, TILE - 10, 2);
          }
          break;

        case 2: // Desk
          ctx.fillStyle = colors.desk;
          ctx.fillRect(x + 2, y + 4, TILE - 4, TILE - 6);
          ctx.fillStyle = colors.deskTop;
          ctx.fillRect(x + 2, y + 4, TILE - 4, 6);
          // Laptop
          ctx.fillStyle = "#333";
          ctx.fillRect(x + 8, y + 10, 16, 12);
          ctx.fillStyle = currentRoom === "focus" ? "#88ccff" : "#88dd88";
          ctx.fillRect(x + 9, y + 11, 14, 10);
          break;

        case 3: // Bookshelf
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

        case 4: // Plant
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

        case 5: // Rug
          ctx.fillStyle = colors.rug;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = colors.rugAlt || colors.rug;
          if ((r + c) % 2 === 0) {
            ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
          }
          break;

        case 7: // Chair
          ctx.fillStyle = colors.chair;
          ctx.fillRect(x + 6, y + 6, 20, 20);
          ctx.fillStyle = "#7ab87a";
          ctx.fillRect(x + 8, y + 8, 16, 16);
          break;

        case 8: // Portal
          drawPortal(x, y, colors);
          break;

        case 9: // Sofa
          ctx.fillStyle = colors.sofa || "#7a3868";
          ctx.fillRect(x + 2, y + 4, TILE - 4, TILE - 6);
          ctx.fillStyle = colors.sofaTop || "#8a4878";
          ctx.fillRect(x + 4, y + 6, TILE - 8, TILE - 10);
          // Cushion
          ctx.fillStyle = "#d8a0b8";
          ctx.fillRect(x + 8, y + 10, 16, 10);
          break;

        case 10: // Coffee machine
          ctx.fillStyle = colors.coffeeMachine || "#484848";
          ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 6);
          ctx.fillStyle = colors.coffeeTop || "#5a5a5a";
          ctx.fillRect(x + 4, y + 4, TILE - 8, 8);
          // Cup
          ctx.fillStyle = "#fff";
          ctx.fillRect(x + 12, y + 16, 8, 8);
          // Steam
          ctx.strokeStyle = "rgba(255,255,255,0.5)";
          ctx.lineWidth = 1;
          const t = Date.now() / 500;
          ctx.beginPath();
          ctx.moveTo(x + 16, y + 14);
          ctx.quadraticCurveTo(x + 14 + Math.sin(t) * 3, y + 8, x + 16, y + 2);
          ctx.stroke();
          break;
      }
    }
  }

}

// Animated portal - drawn once across all portal tiles
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
  let minC = COLS, maxC = 0, portalRow = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
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

  // Small static label
  const label = currentRoom === "focus" ? t("portalToLounge") : t("portalToFocus");
  ctx.font = "bold 10px 'Courier New'";
  ctx.textAlign = "center";
  const labelY = py - 10;
  const textWidth = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(px + pw / 2 - textWidth / 2 - 6, labelY - 9, textWidth + 12, 16);
  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 0.8;
  ctx.fillText(label, px + pw / 2, labelY + 3);
  ctx.globalAlpha = 1;
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

function drawPlayerBody(player, isLocal) {
  const { x, y } = player;
  const color = hashColor(player.id);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = color;
  ctx.fillRect(x - 8, y - 6, 16, 18);

  // Head
  ctx.fillStyle = "#ffd5a0";
  ctx.beginPath();
  ctx.arc(x, y - 10, 8, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#333";
  ctx.fillRect(x - 4, y - 12, 2, 3);
  ctx.fillRect(x + 2, y - 12, 2, 3);

  // Local player indicator
  if (isLocal) {
    ctx.strokeStyle = "#53d769";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPlayerLabel(player) {
  const { x, y, name, status } = player;

  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.textAlign = "center";
  const nameText = name || "???";
  const nameWidth = ctx.measureText(nameText).width;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(x - nameWidth / 2 - 4, y - 30, nameWidth + 8, 14);
  ctx.fillStyle = "#fff";
  ctx.fillText(nameText, x, y - 20);

  if (player.isFocusing) {
    // Status emoji on left, fire drawn on right by drawPlayerFire
    ctx.font = "14px serif";
    ctx.textAlign = "center";
    ctx.fillText(STATUS_EMOJI[player.focusCategory] || STATUS_EMOJI[status] || "", x - 8, y - 36);
  } else if (player.id === myId && autoWalking) {
    // Auto-walking: white text with soft shadow
    ctx.save();
    ctx.font = "bold 9px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = "#fff";
    ctx.fillText(t("grabCoffee"), x, y - 36);
    ctx.restore();
  } else if (player.id === myId && emojiSuppressUntil && Date.now() < emojiSuppressUntil) {
    // Emoji suppressed (just entered Focus Zone or just ended focus)
  } else {
    ctx.font = "16px serif";
    ctx.fillText(STATUS_EMOJI[status] || "", x, y - 34);
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
    ctx.font = "9px 'Courier New'";
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
    ctx.font = "bold 10px 'Courier New'";
    ctx.fillStyle = "#f5a623";
    ctx.textAlign = "center";
    ctx.fillText("!", x + 8, y - 22);
  }

  // Floating "Miu~" when petted
  if (catMiuTimer > 0) {
    catMiuTimer--;
    const miuAlpha = Math.min(1, catMiuTimer / 20);
    catMiuY -= 0.3;
    ctx.font = "10px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(244,164,96,${miuAlpha * 0.8})`;
    ctx.fillText("Miu~", catMiuX, catMiuY);
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
  const fireY = player.y - 38;

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
      ctx.font = "10px serif";
      ctx.textAlign = "center";
      ctx.fillText("\u{1F4A7}", player.x + 12, player.y - 16 + sweatBob);
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

canvas.addEventListener("click", (e) => {
  if (catData.room !== currentRoom) return;
  const { x: clickX, y: clickY } = screenToGame(e.clientX, e.clientY);
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
    // Awake cat: one gentle heart + "Miu~"
    spawnOneHeart(data.x, data.y);
    catMiuTimer = 50;
    catMiuX = data.x;
    catMiuY = data.y - 24;
    playPurr();
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
const IDLE_MS = 30000;          // post-focus auto-walk delay
const DAYDREAM_MS = 5 * 60 * 1000;    // 5min
const IDLE_LEAVE_MS = 10 * 60 * 1000; // 10min

function startAutoWalk() {
  autoWalking = true;
  awStuckFrames = 0;
  // Desk columns: 4-7, 14-17, 24-27
  // Safe columns (clear vertical path): 2-3, 8-13, 18-23, 28-29
  const safeCols = [2,3,8,9,10,11,12,13,18,19,20,21,22,23,28,29];
  const playerCol = Math.floor(localPlayer.x / TILE);
  let bestCol = 10;
  let bestDist = 999;
  for (const sc of safeCols) {
    const d = Math.abs(sc - playerCol);
    if (d < bestDist) { bestDist = d; bestCol = sc; }
  }
  const safeX = bestCol * TILE + TILE / 2;
  const belowDesksY = 13 * TILE + TILE / 2;
  const portalX = 15 * TILE + TILE / 2;
  const portalY = 16 * TILE + TILE / 2;
  autoWalkPath = [
    { x: safeX, y: localPlayer.y },  // sidestep to safe column
    { x: safeX, y: belowDesksY },    // walk down through clear column
    { x: portalX, y: belowDesksY },  // align with portal
    { x: portalX, y: portalY },      // walk into portal
  ];
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
  if (localPlayer) {
    localPlayer.name = name;
    socket.emit("setName", name);
  }
  welcomePopup.classList.add("hidden");
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

// --- Chat toggle ---
const chatToggle = document.getElementById("chat-toggle");
chatToggle.addEventListener("click", () => {
  chatPanel.classList.toggle("collapsed");
  chatToggle.textContent = chatPanel.classList.contains("collapsed") ? t("chat") : t("hide");
});

function addChatMessage(msg) {
  const div = document.createElement("div");
  div.className = "chat-msg";
  div.innerHTML = `<span class="chat-name">${escapeHtml(msg.name)}:</span> <span class="chat-text">${escapeHtml(msg.text)}</span>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
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
// AUDIO (placeholder - add your own music/sounds here)
// ============================================================

let audioCtx = null;
let musicGain = null;

function startMusic() {}
function stopMusic() {}
function switchMusic() {}

musicToggle.addEventListener("click", () => {});
volumeSlider.addEventListener("input", () => {});

// ============================================================
// SOCKET EVENTS
// ============================================================

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
      currentRoom = localPlayer.room;
      updateRoomUI();
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
    localPlayer.isFocusing = player.isFocusing;
    localPlayer.focusStartTime = player.focusStartTime;
    localPlayer.focusCategory = player.focusCategory;
    updateFocusUI();
  } else if (otherPlayers[player.id]) {
    otherPlayers[player.id].name = player.name;
    otherPlayers[player.id].status = player.status;
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
    addChatMessage(msg);
  }
});

socket.on("catUpdate", (data) => {
  catData = data;
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
  onlineFocus.textContent = `📖 ${focusCount}`;
  onlineLounge.textContent = `☕ ${loungeCount}`;
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
      autoWalking = false; // done
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
  ctx.setTransform(gameScale, 0, 0, gameScale, -cameraX * gameScale, -cameraY * gameScale);

  portalDrawnThisFrame = false;
  drawRoom();
  drawCatBody();
  drawCatUI();

  for (const id in otherPlayers) {
    if (otherPlayers[id].room === currentRoom) {
      drawPlayerBody(otherPlayers[id], false);
      drawGiftPile(otherPlayers[id]);
      drawPlayerLabel(otherPlayers[id]);
      drawPlayerFire(otherPlayers[id]);
    }
  }
  if (localPlayer) {
    drawPlayerBody(localPlayer, true);
    drawGiftPile(localPlayer);
    drawPlayerLabel(localPlayer);
    drawPlayerFire(localPlayer);
  }

  updateAndDrawHearts();
  updateAndDrawFire();
  updateAndDrawScatterGifts();

  // Restore to screen space for vignette
  ctx.restore();
  drawVignette();
}

function drawVignette() {
  const grd = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.height * 0.35,
    canvas.width / 2, canvas.height / 2, canvas.height * 0.85
  );
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(1, "rgba(0,0,0,0.1)");
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
