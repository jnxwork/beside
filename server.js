const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const players = {};
const chatHistory = [];
const MAX_CHAT_HISTORY = 50;
const TILE = 32;

const PORTAL_SPAWN = {
  focus: { x: 15 * TILE + TILE / 2, y: 14 * TILE + TILE / 2 },
  rest:  { x: 12 * TILE + TILE / 2, y: 3 * TILE + TILE / 2 },
};

// Portal positions in each room (where cat walks TO before switching)
const PORTAL_POS = {
  focus: { x: 15 * TILE + TILE / 2, y: 16 * TILE + TILE / 2 },  // bottom center
  rest:  { x: 12 * TILE + TILE / 2, y: 1 * TILE + TILE / 2 },   // top center
};

// Furniture positions where cat can sit/sleep (in pixel coords)
const FURNITURE = {
  focus: [
    // 1-person desks
    { x: 3 * TILE, y: 3.5 * TILE, type: "desk" },
    { x: 27 * TILE, y: 3.5 * TILE, type: "desk" },
    { x: 3 * TILE, y: 11.5 * TILE, type: "desk" },
    { x: 27 * TILE, y: 11.5 * TILE, type: "desk" },
    // 2-person desks
    { x: 9 * TILE, y: 3.5 * TILE, type: "desk" },
    { x: 22 * TILE, y: 3.5 * TILE, type: "desk" },
    { x: 9 * TILE, y: 11.5 * TILE, type: "desk" },
    { x: 22 * TILE, y: 11.5 * TILE, type: "desk" },
    // 4-person desks
    { x: 15.5 * TILE, y: 3.5 * TILE, type: "desk" },
    { x: 15.5 * TILE, y: 11.5 * TILE, type: "desk" },
    // Rug
    { x: 15.5 * TILE, y: 7.5 * TILE, type: "rug" },
    // Bookshelves
    { x: 4 * TILE, y: 1.5 * TILE, type: "bookshelf" },
    { x: 12 * TILE, y: 1.5 * TILE, type: "bookshelf" },
    { x: 20 * TILE, y: 1.5 * TILE, type: "bookshelf" },
    { x: 28 * TILE, y: 1.5 * TILE, type: "bookshelf" },
    // Windows (between bookshelf groups)
    { x: 8 * TILE, y: 2 * TILE, type: "window" },
    { x: 16 * TILE, y: 2 * TILE, type: "window" },
    { x: 24 * TILE, y: 2 * TILE, type: "window" },
  ],
  rest: [
    { x: 3 * TILE, y: 4.5 * TILE, type: "sofa" },
    { x: 28 * TILE, y: 4.5 * TILE, type: "sofa" },
    { x: 4.5 * TILE, y: 7.5 * TILE, type: "sofa" },
    { x: 26.5 * TILE, y: 11.5 * TILE, type: "sofa" },
    { x: 15.5 * TILE, y: 9.5 * TILE, type: "rug" },
    { x: 3 * TILE, y: 1.5 * TILE, type: "coffee" },
    { x: 16 * TILE, y: 2 * TILE, type: "window" },
    { x: 25 * TILE, y: 2 * TILE, type: "window" },
  ],
};

const GIFT_TYPES = ["fish", "leaf", "yarn"];

const REACTION_COOLDOWN = 3000;
const reactionCooldowns = {};
const VALID_REACTIONS = ["👋", "💪", "❤️", "⭐"];

// Gift pile for idle Lounge players
const PILE_GIFT_INTERVAL = 30 * 60 * 1000; // 30min
const MAX_GIFT_PILE = 10;

// Walkable tile types (must match client)
// 0=floor, 5=rug, 7=chair, 8=portal
const COLS = 32;
const ROWS = 18;

function buildFocusMap() {
  const map = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) row.push(1);
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
      else if ((r === 3 || r === 4) && c === 3) row.push(2);
      else if ((r === 3 || r === 4) && c === 4) row.push(7);
      else if ((r === 3 || r === 4) && (c === 8 || c === 9)) row.push(2);
      else if ((r === 3 || r === 4) && c === 10) row.push(7);
      else if (r === 3 && c >= 14 && c <= 17) row.push(2);
      else if (r === 4 && c >= 14 && c <= 17) row.push(7);
      else if ((r === 3 || r === 4) && (c === 21 || c === 22)) row.push(2);
      else if ((r === 3 || r === 4) && c === 23) row.push(7);
      else if ((r === 3 || r === 4) && c === 27) row.push(2);
      else if ((r === 3 || r === 4) && c === 28) row.push(7);
      // --- Bottom desk row (r=11,12) ---
      else if ((r === 11 || r === 12) && c === 3) row.push(2);
      else if ((r === 11 || r === 12) && c === 4) row.push(7);
      else if ((r === 11 || r === 12) && (c === 8 || c === 9)) row.push(2);
      else if ((r === 11 || r === 12) && c === 10) row.push(7);
      else if (r === 11 && c >= 14 && c <= 17) row.push(2);
      else if (r === 12 && c >= 14 && c <= 17) row.push(7);
      else if ((r === 11 || r === 12) && (c === 21 || c === 22)) row.push(2);
      else if ((r === 11 || r === 12) && c === 23) row.push(7);
      else if ((r === 11 || r === 12) && c === 27) row.push(2);
      else if ((r === 11 || r === 12) && c === 28) row.push(7);
      // Center rug
      else if (r >= 7 && r <= 8 && c >= 11 && c <= 20) row.push(5);
      // Portal (bottom center)
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
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) row.push(1);
      else if (r === 1 && c >= 2 && c <= 4) row.push(10);
      else if (r === 1 && c >= 27 && c <= 29) row.push(3);
      else if (r >= 4 && r <= 5 && c >= 2 && c <= 4) row.push(9);
      else if (r >= 4 && r <= 5 && c >= 27 && c <= 29) row.push(9);
      else if (r >= 6 && r <= 13 && c >= 8 && c <= 23) row.push(5);
      else if (r >= 7 && r <= 8 && c >= 4 && c <= 5) row.push(9);
      else if (r >= 11 && r <= 12 && c >= 4 && c <= 5) row.push(9);
      else if (r >= 7 && r <= 8 && c >= 26 && c <= 27) row.push(9);
      else if (r >= 11 && r <= 12 && c >= 26 && c <= 27) row.push(9);
      else if (r === 9 && c === 12) row.push(2);
      else if (r === 9 && c === 19) row.push(2);
      else if ((r === 1 && c === 1) || (r === 1 && c === COLS - 2)) row.push(4);
      else if ((r === ROWS - 2 && c === 1) || (r === ROWS - 2 && c === COLS - 2)) row.push(4);
      else if (r === 1 && c === 16) row.push(4);
      else if (r === 1 && c >= 11 && c <= 13) row.push(8);
      else row.push(0);
    }
    map.push(row);
  }
  return map;
}

const SERVER_MAPS = { focus: buildFocusMap(), rest: buildRestMap() };

function isWalkableTile(t) { return t === 0 || t === 5 || t === 7 || t === 8; }

function isSpawnSafe(x, y, room) {
  const map = SERVER_MAPS[room];
  const half = 10;
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
    if (!isWalkableTile(map[row][col])) return false;
  }
  return true;
}

function getInitialSpawn() {
  const cx = 16 * TILE; // center of 32-col map
  const cy = 9 * TILE;
  for (let i = 0; i < 50; i++) {
    const x = cx - 80 + Math.floor(Math.random() * 160);
    const y = cy - 40 + Math.floor(Math.random() * 80);
    if (isSpawnSafe(x, y, "focus")) return { x, y };
  }
  // Fallback: center of rug area (guaranteed safe)
  return { x: 15 * TILE + TILE / 2, y: 8 * TILE + TILE / 2 };
}

function getPortalSpawn(room) {
  const base = PORTAL_SPAWN[room];
  for (let i = 0; i < 20; i++) {
    const x = base.x - 16 + Math.floor(Math.random() * 32);
    const y = base.y;
    if (isSpawnSafe(x, y, room)) return { x, y };
  }
  return { x: base.x, y: base.y };
}

// ============================================================
// CAT
// ============================================================
const cat = {
  x: 480,
  y: 300,
  room: "focus",
  state: "sit",
  targetX: 480,
  targetY: 300,
  stateTimer: 100,
  portalDelay: 0,
  walkingToPortal: false,
  pendingRoom: null,
  visitTimer: 0,
  curioTarget: null,
  onFurniture: null,  // furniture type if sitting on one
  gift: null,         // current gift the cat is carrying
  giftTimer: 0,       // countdown to pick up a gift
  giftTarget: null,   // player to deliver gift to
  earPerk: 0,         // ticks of ear-perked state (chat reaction)
};

function getPlayersInRoom(room) {
  return Object.values(players).filter((p) => p.room === room);
}

// Get user's approximate hour (server-side we use server time as proxy)
function getHour() {
  return new Date().getHours();
}

function isNightTime() {
  const h = getHour();
  return h >= 22 || h < 6;
}

function isMorning() {
  const h = getHour();
  return h >= 6 && h < 10;
}

function onPlayerEnterRoom(playerId, room) {
  if (cat.room !== room && !cat.pendingRoom) {
    const chance = (cat.state === "sleep" || cat.state === "sit") ? 0.6 : 0.3;
    if (Math.random() < chance) {
      cat.pendingRoom = room;
      cat.portalTimer = 60 + Math.floor(Math.random() * 40);
      cat.curioTarget = playerId;
    }
  } else if (cat.room === room && cat.state !== "wander" && cat.state !== "gift_deliver") {
    const p = players[playerId];
    if (p) {
      cat.state = "curious";
      cat.curioTarget = playerId;
      cat.onFurniture = null;
      cat.targetX = p.x + (Math.random() > 0.5 ? 35 : -35);
      cat.targetY = p.y + (Math.random() > 0.5 ? 25 : -25);
      cat.stateTimer = 120;
    }
  }
}

function onChatMessage() {
  // Cat reacts to chat with ear perk
  if (cat.room === "rest") {
    cat.earPerk = 40; // ~2 seconds
  }
}

function pickFurnitureTarget() {
  const spots = FURNITURE[cat.room] || [];
  if (spots.length === 0) return null;
  return spots[Math.floor(Math.random() * spots.length)];
}

function updateCat() {
  // Ear perk countdown
  if (cat.earPerk > 0) cat.earPerk--;

  // Handle portal travel: delay → walk to portal → switch rooms
  if (cat.pendingRoom) {
    if (cat.portalDelay > 0) {
      // Phase 1: short pause before walking to portal
      cat.portalDelay--;
      if (cat.portalDelay <= 0) {
        cat.walkingToPortal = true;
        cat.state = "wander";
        cat.onFurniture = null;
        cat.gift = null;
      }
      return;
    }
    if (!cat.walkingToPortal) {
      // Fallback: start walking immediately if stuck
      cat.walkingToPortal = true;
      cat.state = "wander";
      cat.onFurniture = null;
      cat.gift = null;
    }
    if (cat.walkingToPortal) {
      // Phase 2: walk toward portal in current room
      const portal = PORTAL_POS[cat.room];
      const dx = portal.x - cat.x;
      const dy = portal.y - cat.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 8) {
        cat.x += (dx / dist) * 1.0;
        cat.y += (dy / dist) * 1.0;
      } else {
        // Phase 3: arrived at portal, switch rooms
        const spawn = getPortalSpawn(cat.pendingRoom);
        cat.room = cat.pendingRoom;
        cat.x = spawn.x;
        cat.y = spawn.y;
        cat.pendingRoom = null;
        cat.walkingToPortal = false;
        cat.onFurniture = null;

        if (cat.curioTarget && players[cat.curioTarget] &&
            players[cat.curioTarget].room === cat.room) {
          const p = players[cat.curioTarget];
          cat.state = "curious";
          cat.targetX = p.x + (Math.random() > 0.5 ? 35 : -35);
          cat.targetY = p.y + (Math.random() > 0.5 ? 25 : -25);
          cat.stateTimer = 120;
        } else {
          cat.state = "wander";
          cat.targetX = 80 + Math.random() * 640;
          cat.targetY = 80 + Math.random() * 400;
          cat.stateTimer = 100;
        }
      }
      return;
    }
  }

  // Gift pile delivery for idle Lounge players (priority over random gifts)
  const pileNow = Date.now();
  const restPlayers = getPlayersInRoom("rest");
  if (!cat._pileLog) cat._pileLog = 0;
  cat._pileLog++;
  if (cat._pileLog % 100 === 0 && restPlayers.length > 0) {
    restPlayers.forEach(p => {
      const idle = Math.floor((pileNow - p.lastMoveTime) / 1000);
      const expected = Math.floor((pileNow - p.lastMoveTime) / PILE_GIFT_INTERVAL);
      console.log(`[PILE] player=${p.id.slice(0,6)} room=${p.room} idle=${idle}s expected=${expected} pileCount=${p.idlePileCount} pile=${p.giftPile.length}`);
    });
    console.log(`[PILE] cat: room=${cat.room} state=${cat.state} gift=${cat.gift} pending=${cat.pendingRoom}`);
  }
  const idleCandidates = restPlayers.filter(p => {
    const expected = Math.floor((pileNow - p.lastMoveTime) / PILE_GIFT_INTERVAL);
    return expected > p.idlePileCount && p.idlePileCount < MAX_GIFT_PILE;
  });
  if (!cat.gift && cat.state !== "gift_deliver" && !cat.pendingRoom) {
    const idleTarget = idleCandidates[0];

    if (idleTarget) {
      console.log(`[PILE] >>> Triggering delivery to ${idleTarget.id.slice(0,6)}`);
      if (cat.room === "rest") {
        cat.gift = GIFT_TYPES[Math.floor(Math.random() * GIFT_TYPES.length)];
        cat.giftTarget = idleTarget.id;
        cat.state = "gift_deliver";
        cat.onFurniture = null;
        cat._pileDelivery = true;
        cat.targetX = idleTarget.x + (Math.random() > 0.5 ? 20 : -20);
        cat.targetY = idleTarget.y + 10;
        cat.stateTimer = 200;
      } else if (!cat.pendingRoom) {
        // Cat is in focus room, encourage visit to Lounge
        cat.pendingRoom = "rest";
        cat.portalDelay = 20;
        cat.curioTarget = null;
      }
    }
  }

  // Gift logic: occasionally pick up a gift and deliver to a player
  if (!cat.gift && cat.state !== "gift_deliver") {
    cat.giftTimer--;
    if (cat.giftTimer <= 0) {
      cat.giftTimer = 600 + Math.floor(Math.random() * 1200); // 30-90 sec
      const nearby = getPlayersInRoom(cat.room);
      if (nearby.length > 0 && Math.random() < 0.4) {
        cat.gift = GIFT_TYPES[Math.floor(Math.random() * GIFT_TYPES.length)];
        cat.giftTarget = nearby[Math.floor(Math.random() * nearby.length)].id;
        cat.state = "gift_deliver";
        cat.onFurniture = null;
        cat._pileDelivery = false;
        const p = players[cat.giftTarget];
        if (p) {
          cat.targetX = p.x + (Math.random() > 0.5 ? 25 : -25);
          cat.targetY = p.y + 15;
          cat.stateTimer = 200;
        }
      }
    }
  }

  // Periodic room visits
  cat.visitTimer--;
  if (cat.visitTimer <= 0) {
    cat.visitTimer = 400 + Math.floor(Math.random() * 600);
    const otherRoom = cat.room === "focus" ? "rest" : "focus";
    const otherP = getPlayersInRoom(otherRoom);
    const thisP = getPlayersInRoom(cat.room);
    if (otherP.length > 0 && !cat.pendingRoom) {
      const chance = thisP.length === 0 ? 0.8 : 0.35;
      if (Math.random() < chance) {
        cat.pendingRoom = otherRoom;
        cat.portalDelay = 40 + Math.floor(Math.random() * 40);
        cat.curioTarget = null;
      }
    }
  }

  cat.stateTimer--;

  // Movement states
  if (cat.state === "wander" || cat.state === "curious" || cat.state === "gift_deliver") {
    const dx = cat.targetX - cat.x;
    const dy = cat.targetY - cat.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 5) {
      const speed = cat.state === "gift_deliver" ? 1.2 : (cat.state === "curious" ? 1.0 : 0.8);
      cat.x += (dx / dist) * speed;
      cat.y += (dy / dist) * speed;
    } else {
      if (cat.state === "gift_deliver") {
        if (cat._pileDelivery && players[cat.giftTarget]) {
          // Add gift to player's pile
          const target = players[cat.giftTarget];
          target.giftPile.push(cat.gift);
          target.idlePileCount++;
          io.emit("giftPileUpdated", { id: cat.giftTarget, giftPile: [...target.giftPile] });
          cat.state = "sit";
          cat.stateTimer = 150; // Sit and admire the pile
          cat._pileDelivery = false;
          cat.gift = null;
          cat.giftTarget = null;
        } else {
          // Normal gift drop
          cat.state = "sit";
          cat.stateTimer = 100;
          setTimeout(() => { cat.gift = null; cat.giftTarget = null; }, 5000);
        }
      } else if (cat.state === "curious") {
        cat.state = "sit";
        cat.stateTimer = 150 + Math.floor(Math.random() * 150);
        cat.curioTarget = null;
      } else {
        enterRestState();
      }
    }
  }
  else if (cat.stateTimer <= 0) {
    cat.onFurniture = null;
    const r = Math.random();
    const nearby = getPlayersInRoom(cat.room);
    const lively = Math.min(nearby.length * 0.06, 0.18);

    // Fatigue care: approach players focusing 120min+
    const now = Date.now();
    const fatigued = nearby.filter(p =>
      p.isFocusing && p.focusStartTime && (now - p.focusStartTime) > 120 * 60 * 1000 // 120min
    );
    if (fatigued.length > 0 && Math.random() < 0.4) {
      const target = fatigued[Math.floor(Math.random() * fatigued.length)];
      cat.state = "curious";
      cat.curioTarget = target.id;
      cat.onFurniture = null;
      cat.targetX = target.x + (Math.random() > 0.5 ? 30 : -30);
      cat.targetY = target.y + (Math.random() > 0.5 ? 20 : -20);
      cat.stateTimer = 180;
    } else if (r < 0.2 + lively) {
      // Wander to random spot
      cat.state = "wander";
      cat.targetX = 80 + Math.random() * 640;
      cat.targetY = 80 + Math.random() * 400;
      cat.stateTimer = 150 + Math.floor(Math.random() * 150);
    } else if (r < 0.35 + lively) {
      // Walk near a player
      if (nearby.length > 0) {
        const p = nearby[Math.floor(Math.random() * nearby.length)];
        cat.state = "wander";
        cat.targetX = p.x + (Math.random() - 0.5) * 80;
        cat.targetY = p.y + (Math.random() - 0.5) * 60;
        cat.stateTimer = 120;
      } else {
        enterRestState();
      }
    } else if (r < 0.55 + lively * 0.5) {
      // Go sit on furniture / window
      const spot = pickFurnitureTarget();
      if (spot) {
        cat.state = "wander";
        cat.targetX = spot.x + Math.random() * 16;
        cat.targetY = spot.y + Math.random() * 8;
        cat.onFurniture = spot.type;
        cat.stateTimer = 150;
      } else {
        enterRestState();
      }
    } else {
      enterRestState();
    }
  }
}

function enterRestState() {
  cat.state = pickRestState();
  cat.stateTimer = cat.state === "yawn"
    ? 60 + Math.floor(Math.random() * 60)
    : 250 + Math.floor(Math.random() * 400);
}

function pickRestState() {
  const night = isNightTime();
  const morning = isMorning();
  const r = Math.random();

  if (night) {
    // Night: mostly sleep
    if (r < 0.12) return "sit";
    if (r < 0.78) return "sleep";
    if (r < 0.86) return "groom";
    if (r < 0.94) return "yawn";
    return "stretch";
  } else if (morning) {
    // Morning: more stretching, yawning
    if (r < 0.15) return "sit";
    if (r < 0.30) return "sleep";
    if (r < 0.50) return "stretch";
    if (r < 0.65) return "yawn";
    return "groom";
  } else {
    if (r < 0.30) return "sit";
    if (r < 0.52) return "sleep";
    if (r < 0.68) return "groom";
    if (r < 0.80) return "yawn";
    return "stretch";
  }
}

// Cat update loop
setInterval(() => {
  updateCat();
  io.emit("catUpdate", {
    x: Math.round(cat.x),
    y: Math.round(cat.y),
    room: cat.room,
    state: cat.state,
    gift: cat.gift,
    earPerk: cat.earPerk > 0,
    onFurniture: cat.onFurniture,
  });
}, 50);

// ============================================================
// SOCKET HANDLING
// ============================================================

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  const spawn = getInitialSpawn();
  players[socket.id] = {
    id: socket.id,
    x: spawn.x,
    y: spawn.y,
    name: "Anonymous",
    status: "wandering",
    direction: "down",
    room: "focus",
    isFocusing: false,
    focusStartTime: null,
    focusCategory: null,
    lastMoveTime: Date.now(),
    giftPile: [],
    idlePileCount: 0,
    connectedAt: Date.now(),
  };

  socket.join("focus");
  socket.emit("currentPlayers", players);
  socket.emit("chatHistory", chatHistory);
  socket.emit("catUpdate", {
    x: Math.round(cat.x),
    y: Math.round(cat.y),
    room: cat.room,
    state: cat.state,
    gift: cat.gift,
    earPerk: cat.earPerk > 0,
    onFurniture: cat.onFurniture,
  });

  socket.broadcast.emit("playerJoined", players[socket.id]);
  onPlayerEnterRoom(socket.id, "focus");

  // Pet the cat
  socket.on("petCat", () => {
    if (!players[socket.id]) return;
    if (players[socket.id].room !== cat.room) return;
    // Check distance
    const dx = players[socket.id].x - cat.x;
    const dy = players[socket.id].y - cat.y;
    if (Math.sqrt(dx * dx + dy * dy) < 60) {
      const wasSleeping = cat.state === "sleep";
      io.emit("catPetted", { x: Math.round(cat.x), y: Math.round(cat.y), wasSleeping });
      // Sleeping cat stays asleep; awake cat sits happily
      if (!wasSleeping && cat.state !== "gift_deliver") {
        cat.state = "sit";
        cat.stateTimer = 200;
        cat.targetX = cat.x;
        cat.targetY = cat.y;
        // Immediately broadcast so client sees the stop
        io.emit("catUpdate", {
          x: Math.round(cat.x), y: Math.round(cat.y),
          room: cat.room, state: cat.state,
          gift: cat.gift, earPerk: cat.earPerk > 0,
          onFurniture: cat.onFurniture,
        });
      }
    }
  });

  socket.on("sendReaction", (data) => {
    console.log(`[REACT] received sendReaction from ${socket.id}`, JSON.stringify(data));
    if (!players[socket.id]) { console.log("[REACT] FAIL: no sender player"); return; }
    if (!data || typeof data !== "object") { console.log("[REACT] FAIL: bad data"); return; }
    const sender = players[socket.id];
    const target = players[data.targetId];
    if (!target) { console.log("[REACT] FAIL: target not found, targetId:", data.targetId); return; }
    if (sender.room !== target.room) { console.log("[REACT] FAIL: room mismatch", sender.room, target.room); return; }
    if (!VALID_REACTIONS.includes(data.emoji)) { console.log("[REACT] FAIL: invalid emoji", JSON.stringify(data.emoji), "len:", data.emoji.length); return; }

    // Per sender-target pair cooldown
    const key = `${socket.id}->${data.targetId}`;
    const now = Date.now();
    if (reactionCooldowns[key] && now - reactionCooldowns[key] < REACTION_COOLDOWN) { console.log("[REACT] FAIL: cooldown"); return; }
    reactionCooldowns[key] = now;

    const payload = {
      senderId: socket.id,
      senderName: sender.name,
      targetId: data.targetId,
      targetName: target.name,
      emoji: data.emoji,
      room: sender.room,
      x: target.x,
      y: target.y,
      timestamp: now,
    };
    console.log(`[REACT] OK ${sender.name} -> ${target.name} ${data.emoji} (room: ${sender.room})`);
    io.emit("emojiReaction", payload);
  });

  socket.on("playerMove", (data) => {
    if (!players[socket.id]) return;
    const p = players[socket.id];
    p.x = data.x;
    p.y = data.y;
    p.direction = data.direction;
    p.lastMoveTime = Date.now();

    // Scatter gift pile on movement
    if (p.giftPile.length > 0) {
      io.emit("giftPileScatter", { id: socket.id, gifts: [...p.giftPile], x: p.x, y: p.y });
      p.giftPile = [];
      p.idlePileCount = 0;
    }

    socket.broadcast.emit("playerMoved", {
      id: socket.id,
      x: data.x,
      y: data.y,
      direction: data.direction,
    });
  });

  socket.on("changeRoom", (newRoom) => {
    if (!players[socket.id]) return;
    if (newRoom !== "focus" && newRoom !== "rest") return;
    const oldRoom = players[socket.id].room;
    if (oldRoom === newRoom) return;

    socket.leave(oldRoom);
    socket.join(newRoom);

    const spawn = getPortalSpawn(newRoom);
    players[socket.id].room = newRoom;
    players[socket.id].x = spawn.x;
    players[socket.id].y = spawn.y;

    // Clear gift pile on room change
    const pl = players[socket.id];
    if (pl.giftPile.length > 0) {
      io.emit("giftPileScatter", { id: socket.id, gifts: [...pl.giftPile], x: pl.x, y: pl.y });
      pl.giftPile = [];
    }
    pl.idlePileCount = 0;
    pl.lastMoveTime = Date.now();

    // End focus on room change
    if (players[socket.id].isFocusing) {
      players[socket.id].isFocusing = false;
      players[socket.id].focusStartTime = null;
      players[socket.id].focusCategory = null;
      players[socket.id].status = "resting";
    }

    io.emit("playerChangedRoom", {
      id: socket.id,
      room: newRoom,
      x: spawn.x,
      y: spawn.y,
    });


    const oldRoomPlayers = getPlayersInRoom(oldRoom);
    if (cat.room === oldRoom && oldRoomPlayers.length === 0 && !cat.pendingRoom) {
      cat.pendingRoom = newRoom;
      cat.portalTimer = 70;
      cat.curioTarget = null;
    }
    onPlayerEnterRoom(socket.id, newRoom);
  });

  socket.on("chatMessage", (text) => {
    if (!players[socket.id]) return;
    if (players[socket.id].room !== "rest") return;
    if (typeof text !== "string" || text.trim().length === 0) return;

    const msg = {
      id: socket.id,
      name: players[socket.id].name,
      text: text.trim().slice(0, 200),
      time: Date.now(),
    };
    chatHistory.push(msg);
    if (chatHistory.length > MAX_CHAT_HISTORY) chatHistory.shift();
    io.to("rest").emit("chatMessage", msg);

    // Cat reacts to chat
    onChatMessage();
  });

  socket.on("setName", (name) => {
    if (!players[socket.id]) return;
    players[socket.id].name = name.slice(0, 12);
    io.emit("playerUpdated", players[socket.id]);
  });

  socket.on("setStatus", (status) => {
    if (!players[socket.id]) return;
    players[socket.id].status = status;
    io.emit("playerUpdated", players[socket.id]);
  });

  socket.on("startFocus", (data) => {
    if (!players[socket.id]) return;
    if (players[socket.id].room !== "focus") return;
    if (typeof data !== "object" || !data) return;

    const validCategories = ["studying", "working", "creating", "reading"];
    const category = validCategories.includes(data.category) ? data.category : "studying";

    players[socket.id].isFocusing = true;
    players[socket.id].focusStartTime = Date.now();
    players[socket.id].focusCategory = category;
    players[socket.id].status = "focusing";

    io.emit("playerUpdated", players[socket.id]);
  });

  socket.on("endFocus", () => {
    if (!players[socket.id]) return;
    if (!players[socket.id].isFocusing) return;

    players[socket.id].isFocusing = false;
    players[socket.id].focusStartTime = null;
    players[socket.id].focusCategory = null;
    players[socket.id].status = "resting";

    io.emit("playerUpdated", players[socket.id]);
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    // Clean up reaction cooldowns for this player
    for (const key of Object.keys(reactionCooldowns)) {
      if (key.startsWith(socket.id + "->") || key.endsWith("->" + socket.id)) {
        delete reactionCooldowns[key];
      }
    }
    delete players[socket.id];
    io.emit("playerLeft", socket.id);
  });
});

const serverStartTime = Date.now();

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h${m % 60}m`;
  if (m > 0) return `${m}m${s % 60}s`;
  return `${s}s`;
}

app.get("/admin/stats", (req, res) => {
  const now = Date.now();
  const list = Object.values(players).map(p => ({
    name: p.name,
    room: p.room,
    status: p.status,
    isFocusing: p.isFocusing,
    focusCategory: p.focusCategory || null,
    focusDuration: p.focusStartTime ? formatDuration(now - p.focusStartTime) : null,
    giftPile: p.giftPile.length,
    online: formatDuration(now - p.connectedAt),
    idle: formatDuration(now - p.lastMoveTime),
  }));

  const focusCount = list.filter(p => p.room === "focus").length;
  const loungeCount = list.filter(p => p.room === "rest").length;

  res.json({
    uptime: formatDuration(now - serverStartTime),
    online: list.length,
    rooms: { focus: focusCount, lounge: loungeCount },
    cat: { room: cat.room === "rest" ? "lounge" : cat.room, state: cat.state },
    players: list,
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
