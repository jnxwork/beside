// ============================================================
// Stay Together - Multiplayer co-studying space
// Two rooms: Focus Zone (quiet) & Rest Zone (chat + music)
// ============================================================

const canvas = document.getElementById("game");
let ctx = canvas.getContext("2d");
const mainCtx = ctx;
const pixelScale = 2;
const pixelCanvas = document.createElement("canvas");
pixelCanvas.width = canvas.width / pixelScale;
pixelCanvas.height = canvas.height / pixelScale;
const pixelCtx = pixelCanvas.getContext("2d");
const socket = io();

// --- Constants ---
const TILE = 32;
const COLS = Math.floor(canvas.width / TILE);  // 25
const ROWS = Math.floor(canvas.height / TILE); // 18
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
      // Bookshelves along top wall
      else if (r === 1 && c >= 2 && c <= 6) row.push(3);
      else if (r === 1 && c >= 9 && c <= 15) row.push(3);
      else if (r === 1 && c >= 18 && c <= 22) row.push(3);
      // Desk clusters (top)
      else if (r >= 4 && r <= 5 && c >= 3 && c <= 5) row.push(2);
      else if (r >= 4 && r <= 5 && c === 6) row.push(7);
      else if (r >= 4 && r <= 5 && c >= 13 && c <= 15) row.push(2);
      else if (r >= 4 && r <= 5 && c === 16) row.push(7);
      else if (r >= 4 && r <= 5 && c >= 19 && c <= 21) row.push(2);
      else if (r >= 4 && r <= 5 && c === 22) row.push(7);
      // Desk clusters (bottom)
      else if (r >= 10 && r <= 11 && c >= 3 && c <= 5) row.push(2);
      else if (r >= 10 && r <= 11 && c === 6) row.push(7);
      else if (r >= 10 && r <= 11 && c >= 13 && c <= 15) row.push(2);
      else if (r >= 10 && r <= 11 && c === 16) row.push(7);
      else if (r >= 10 && r <= 11 && c >= 19 && c <= 21) row.push(2);
      else if (r >= 10 && r <= 11 && c === 22) row.push(7);
      // Plants
      else if ((r === 1 && c === 1) || (r === 1 && c === COLS - 2)) row.push(4);
      else if ((r === ROWS - 2 && c === 1) || (r === ROWS - 2 && c === COLS - 2)) row.push(4);
      // Center quiet zone rug
      else if (r >= 7 && r <= 8 && c >= 9 && c <= 15) row.push(5);
      // Portal to rest zone (bottom center)
      else if (r === ROWS - 2 && c >= 11 && c <= 13) row.push(8);
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
      else if (r === 1 && c >= 20 && c <= 22) row.push(3);
      // Sofas - left lounge
      else if (r >= 4 && r <= 5 && c >= 2 && c <= 4) row.push(9);
      // Sofas - right lounge
      else if (r >= 4 && r <= 5 && c >= 20 && c <= 22) row.push(9);
      // Center rug (big lounge area)
      else if (r >= 6 && r <= 13 && c >= 6 && c <= 18) row.push(5);
      // Sofas around rug
      else if (r >= 7 && r <= 8 && c >= 3 && c <= 4) row.push(9);
      else if (r >= 11 && r <= 12 && c >= 3 && c <= 4) row.push(9);
      else if (r >= 7 && r <= 8 && c >= 20 && c <= 21) row.push(9);
      else if (r >= 11 && r <= 12 && c >= 20 && c <= 21) row.push(9);
      // Small tables on rug
      else if (r === 9 && c === 9) row.push(2);
      else if (r === 9 && c === 15) row.push(2);
      // Plants
      else if ((r === 1 && c === 1) || (r === 1 && c === COLS - 2)) row.push(4);
      else if ((r === ROWS - 2 && c === 1) || (r === ROWS - 2 && c === COLS - 2)) row.push(4);
      else if (r === 1 && c === 12) row.push(4);
      // Portal back to focus zone (top center)
      else if (r === 1 && c >= 8 && c <= 10) row.push(8);
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
  const label = currentRoom === "focus" ? "Rest Zone \u2192" : "\u2190 Focus Zone";
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

  ctx.font = "16px serif";
  ctx.fillText(STATUS_EMOJI[status] || "", x, y - 34);
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
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
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

// ============================================================
// INPUT
// ============================================================

document.addEventListener("keydown", (e) => {
  // Don't capture keys when typing in chat or name input
  if (e.target.id === "chat-input" || e.target.id === "name-input") return;
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
      e.target.id !== "chat-input" && e.target.id !== "name-input") {
    e.preventDefault();
  }
});

// ============================================================
// UI CONTROLS
// ============================================================

const nameInput = document.getElementById("name-input");
const statusSelect = document.getElementById("status-select");
const onlineCount = document.getElementById("online-count");
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
  }
});

statusSelect.addEventListener("change", () => {
  if (localPlayer) {
    localPlayer.status = statusSelect.value;
    socket.emit("setStatus", statusSelect.value);
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
  chatToggle.textContent = chatPanel.classList.contains("collapsed") ? "Chat" : "Hide";
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

function updateRoomUI() {
  roomLabel.textContent = currentRoom === "focus" ? "Focus Zone" : "Rest Zone";
  roomLabel.className = currentRoom;

  if (currentRoom === "rest") {
    chatWrap.classList.add("visible");
  } else {
    chatWrap.classList.remove("visible");
  }
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
  } else if (otherPlayers[player.id]) {
    otherPlayers[player.id].name = player.name;
    otherPlayers[player.id].status = player.status;
  }
  updateOnlineCount();
});

socket.on("playerChangedRoom", (data) => {
  if (data.id === myId) {
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
  }
  updateOnlineCount();
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
  // Count players in same room
  let sameRoom = 1; // local player
  let total = 1;
  for (const id in otherPlayers) {
    total++;
    if (otherPlayers[id].room === currentRoom) sameRoom++;
  }
  onlineCount.textContent = `Room: ${sameRoom} | Total: ${total}`;
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

  // Check portal
  if (portalCooldown <= 0 && isOnPortal(localPlayer.x, localPlayer.y)) {
    const newRoom = currentRoom === "focus" ? "rest" : "focus";
    socket.emit("changeRoom", newRoom);
    portalCooldown = 60; // ~1 second cooldown
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

  portalDrawnThisFrame = false;
  drawRoom();
  drawCatBody();
  drawCatUI();

  for (const id in otherPlayers) {
    if (otherPlayers[id].room === currentRoom) {
      drawPlayerBody(otherPlayers[id], false);
      drawPlayerLabel(otherPlayers[id]);
    }
  }
  if (localPlayer) {
    drawPlayerBody(localPlayer, true);
    drawPlayerLabel(localPlayer);
  }

  updateAndDrawHearts();

  // Atmospheric vignette
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

// Start
updateRoomUI();
gameLoop();
