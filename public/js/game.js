// ============================================================
// Study Together - A cozy multiplayer co-studying space
// ============================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const socket = io();

// --- Constants ---
const TILE = 32;
const COLS = canvas.width / TILE;  // 25
const ROWS = canvas.height / TILE; // ~18
const PLAYER_SIZE = 24;
const SPEED = 3;

// --- Colors ---
const COLORS = {
  floor: "#e8dcc8",
  wall: "#8b7355",
  wallTop: "#a0896c",
  desk: "#c4956a",
  deskTop: "#d4a574",
  chair: "#6b8e6b",
  bookshelf: "#7a5c3a",
  bookColors: ["#e94560", "#533483", "#0f3460", "#53d769", "#f5a623"],
  plant: "#4a7c59",
  plantPot: "#c4956a",
  rug: "#d4c5a9",
  window: "#87ceeb",
  windowFrame: "#a0896c",
  lamp: "#f5d77a",
};

// --- Room Layout (tile map) ---
// 0=floor, 1=wall, 2=desk, 3=bookshelf, 4=plant, 5=rug, 6=window, 7=chair
const roomMap = buildRoomMap();

function buildRoomMap() {
  const map = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      // Walls around the edges
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
        row.push(1);
      }
      // Windows on top wall
      else if (r === 0) {
        row.push(6);
      }
      // Bookshelves along top wall (inside)
      else if (r === 1 && c >= 2 && c <= 6) {
        row.push(3);
      }
      else if (r === 1 && c >= 18 && c <= 22) {
        row.push(3);
      }
      // Desks - study area (left cluster)
      else if (r >= 4 && r <= 5 && c >= 3 && c <= 5) {
        row.push(2);
      }
      // Chairs next to left desks
      else if (r >= 4 && r <= 5 && c === 6) {
        row.push(7);
      }
      // Desks - study area (right cluster)
      else if (r >= 4 && r <= 5 && c >= 13 && c <= 15) {
        row.push(2);
      }
      // Chairs next to right desks
      else if (r >= 4 && r <= 5 && c === 16) {
        row.push(7);
      }
      // Center rug / lounge area
      else if (r >= 9 && r <= 13 && c >= 9 && c <= 15) {
        row.push(5);
      }
      // Desks - bottom area
      else if (r >= 14 && r <= 15 && c >= 3 && c <= 5) {
        row.push(2);
      }
      else if (r >= 14 && r <= 15 && c === 6) {
        row.push(7);
      }
      else if (r >= 14 && r <= 15 && c >= 18 && c <= 20) {
        row.push(2);
      }
      else if (r >= 14 && r <= 15 && c === 21) {
        row.push(7);
      }
      // Plants in corners
      else if ((r === 1 && c === 1) || (r === 1 && c === COLS - 2) ||
               (r === ROWS - 2 && c === 1) || (r === ROWS - 2 && c === COLS - 2)) {
        row.push(4);
      }
      else {
        row.push(0);
      }
    }
    map.push(row);
  }
  return map;
}

// --- Is tile walkable? ---
function isWalkable(tileType) {
  // Can walk on: floor, rug, chair area
  return tileType === 0 || tileType === 5 || tileType === 7;
}

function canMoveTo(x, y) {
  // Check all 4 corners of the player
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
    if (!isWalkable(roomMap[row][col])) return false;
  }
  return true;
}

// --- Drawing functions ---

function drawRoom() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * TILE;
      const y = r * TILE;
      const tile = roomMap[r][c];

      // Always draw floor first
      ctx.fillStyle = COLORS.floor;
      ctx.fillRect(x, y, TILE, TILE);

      switch (tile) {
        case 1: // Wall
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = COLORS.wallTop;
          ctx.fillRect(x, y, TILE, 6);
          // Windows on top wall
          if (r === 0 && c > 1 && c < COLS - 2 && c % 3 === 0) {
            ctx.fillStyle = COLORS.window;
            ctx.fillRect(x + 4, y + 6, TILE - 8, TILE - 10);
            ctx.strokeStyle = COLORS.windowFrame;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 4, y + 6, TILE - 8, TILE - 10);
            // Cross in window
            ctx.beginPath();
            ctx.moveTo(x + TILE / 2, y + 6);
            ctx.lineTo(x + TILE / 2, y + TILE - 4);
            ctx.moveTo(x + 4, y + TILE / 2);
            ctx.lineTo(x + TILE - 4, y + TILE / 2);
            ctx.stroke();
          }
          break;

        case 2: // Desk
          ctx.fillStyle = COLORS.desk;
          ctx.fillRect(x + 2, y + 4, TILE - 4, TILE - 6);
          ctx.fillStyle = COLORS.deskTop;
          ctx.fillRect(x + 2, y + 4, TILE - 4, 6);
          // Laptop on desk
          ctx.fillStyle = "#333";
          ctx.fillRect(x + 8, y + 10, 16, 12);
          ctx.fillStyle = "#5bf";
          ctx.fillRect(x + 9, y + 11, 14, 10);
          break;

        case 3: // Bookshelf
          ctx.fillStyle = COLORS.bookshelf;
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          // Shelves
          for (let s = 0; s < 3; s++) {
            const sy = y + 6 + s * 9;
            ctx.fillStyle = "#5a4020";
            ctx.fillRect(x + 3, sy + 7, TILE - 6, 2);
            // Books
            for (let b = 0; b < 4; b++) {
              ctx.fillStyle = COLORS.bookColors[(c + s + b) % COLORS.bookColors.length];
              ctx.fillRect(x + 5 + b * 6, sy, 5, 7);
            }
          }
          break;

        case 4: // Plant
          ctx.fillStyle = COLORS.plantPot;
          ctx.fillRect(x + 10, y + 20, 12, 10);
          ctx.fillStyle = COLORS.plant;
          ctx.beginPath();
          ctx.arc(x + 16, y + 14, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#3a6b48";
          ctx.beginPath();
          ctx.arc(x + 12, y + 11, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + 20, y + 12, 5, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 5: // Rug
          ctx.fillStyle = COLORS.rug;
          ctx.fillRect(x, y, TILE, TILE);
          // Subtle pattern
          ctx.fillStyle = "#cbb898";
          if ((r + c) % 2 === 0) {
            ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
          }
          break;

        case 7: // Chair
          ctx.fillStyle = COLORS.chair;
          ctx.fillRect(x + 6, y + 6, 20, 20);
          ctx.fillStyle = "#5a7d5a";
          ctx.fillRect(x + 8, y + 8, 16, 16);
          break;
      }
    }
  }

  // Draw grid lines (subtle)
  ctx.strokeStyle = "rgba(0,0,0,0.05)";
  ctx.lineWidth = 0.5;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * TILE);
    ctx.lineTo(canvas.width, r * TILE);
    ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * TILE, 0);
    ctx.lineTo(c * TILE, canvas.height);
    ctx.stroke();
  }
}

// --- Player rendering ---

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

function drawPlayer(player, isLocal) {
  const { x, y, name, status } = player;
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

  // Highlight ring for local player
  if (isLocal) {
    ctx.strokeStyle = "#53d769";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Name tag
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(x - ctx.measureText(name || "???").width / 2 - 4, y - 30, ctx.measureText(name || "???").width + 8, 14);
  ctx.fillStyle = "#fff";
  ctx.fillText(name || "???", x, y - 20);

  // Status emoji
  ctx.font = "16px serif";
  ctx.fillText(STATUS_EMOJI[status] || "", x, y - 34);
}

// --- Game state ---

const otherPlayers = {};
let localPlayer = null;
let myId = null;

const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
};

// --- Input handling ---

document.addEventListener("keydown", (e) => {
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

// Prevent arrow keys from scrolling page
document.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
  }
});

// --- UI controls ---

const nameInput = document.getElementById("name-input");
const statusSelect = document.getElementById("status-select");
const onlineCount = document.getElementById("online-count");

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

// --- Socket events ---

socket.on("currentPlayers", (players) => {
  myId = socket.id;
  for (const id in players) {
    if (id === myId) {
      localPlayer = players[id];
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

function updateOnlineCount() {
  const count = 1 + Object.keys(otherPlayers).length;
  onlineCount.textContent = `Online: ${count}`;
}

// --- Game loop ---

let lastSentX = 0;
let lastSentY = 0;

function update() {
  if (!localPlayer) return;

  let dx = 0;
  let dy = 0;
  if (keys.up) dy -= SPEED;
  if (keys.down) dy += SPEED;
  if (keys.left) dx -= SPEED;
  if (keys.right) dx += SPEED;

  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    dx *= 0.707;
    dy *= 0.707;
  }

  // Try to move
  const newX = localPlayer.x + dx;
  const newY = localPlayer.y + dy;

  if (dx !== 0 && canMoveTo(newX, localPlayer.y)) {
    localPlayer.x = newX;
  }
  if (dy !== 0 && canMoveTo(localPlayer.x, newY)) {
    localPlayer.y = newY;
  }

  // Direction
  if (dy < 0) localPlayer.direction = "up";
  else if (dy > 0) localPlayer.direction = "down";
  if (dx < 0) localPlayer.direction = "left";
  else if (dx > 0) localPlayer.direction = "right";

  // Send position to server (throttled)
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw room
  drawRoom();

  // Draw other players
  for (const id in otherPlayers) {
    drawPlayer(otherPlayers[id], false);
  }

  // Draw local player (on top)
  if (localPlayer) {
    drawPlayer(localPlayer, true);
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start
gameLoop();
