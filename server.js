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
  focus: { x: 12 * TILE + TILE / 2, y: 14 * TILE + TILE / 2 },
  rest:  { x: 9 * TILE + TILE / 2,  y: 3 * TILE + TILE / 2 },
};

// Furniture positions where cat can sit/sleep (in pixel coords)
const FURNITURE = {
  focus: [
    { x: 4 * TILE, y: 4 * TILE, type: "desk" },
    { x: 14 * TILE, y: 4 * TILE, type: "desk" },
    { x: 20 * TILE, y: 10 * TILE, type: "desk" },
    { x: 4 * TILE, y: 10 * TILE, type: "desk" },
    { x: 12 * TILE, y: 7.5 * TILE, type: "rug" },
    { x: 4 * TILE, y: 1.5 * TILE, type: "bookshelf" },
    { x: 20 * TILE, y: 1.5 * TILE, type: "bookshelf" },
    { x: 8 * TILE, y: 2 * TILE, type: "window" },
    { x: 16 * TILE, y: 2 * TILE, type: "window" },
  ],
  rest: [
    { x: 3 * TILE, y: 4.5 * TILE, type: "sofa" },
    { x: 21 * TILE, y: 4.5 * TILE, type: "sofa" },
    { x: 3.5 * TILE, y: 7.5 * TILE, type: "sofa" },
    { x: 20.5 * TILE, y: 11.5 * TILE, type: "sofa" },
    { x: 12 * TILE, y: 9.5 * TILE, type: "rug" },
    { x: 3 * TILE, y: 1.5 * TILE, type: "coffee" },
    { x: 12 * TILE, y: 2 * TILE, type: "window" },
    { x: 20 * TILE, y: 2 * TILE, type: "window" },
  ],
};

const GIFT_TYPES = ["fish", "leaf", "yarn"];

function getInitialSpawn() {
  return {
    x: 400 - 80 + Math.floor(Math.random() * 160),
    y: 300 - 40 + Math.floor(Math.random() * 80),
  };
}

function getPortalSpawn(room) {
  const base = PORTAL_SPAWN[room];
  return {
    x: base.x - 16 + Math.floor(Math.random() * 32),
    y: base.y,
  };
}

// ============================================================
// CAT
// ============================================================
const cat = {
  x: 300,
  y: 300,
  room: "focus",
  state: "sit",
  targetX: 300,
  targetY: 300,
  stateTimer: 100,
  portalTimer: 0,
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

  // Handle portal travel
  if (cat.pendingRoom && cat.portalTimer > 0) {
    cat.portalTimer--;
    if (cat.portalTimer <= 0) {
      const spawn = getPortalSpawn(cat.pendingRoom);
      cat.room = cat.pendingRoom;
      cat.x = spawn.x;
      cat.y = spawn.y;
      cat.pendingRoom = null;
      cat.onFurniture = null;
      cat.gift = null;

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
        cat.portalTimer = 40 + Math.floor(Math.random() * 40);
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
        // Drop gift and sit
        cat.state = "sit";
        cat.stateTimer = 100;
        // gift stays set so client can draw it on the ground
        setTimeout(() => { cat.gift = null; cat.giftTarget = null; }, 5000);
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

    if (r < 0.2 + lively) {
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
    status: "studying",
    direction: "down",
    room: "focus",
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
      }
    }
  });

  socket.on("playerMove", (data) => {
    if (!players[socket.id]) return;
    players[socket.id].x = data.x;
    players[socket.id].y = data.y;
    players[socket.id].direction = data.direction;
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

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit("playerLeft", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
