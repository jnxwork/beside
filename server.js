const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Store all connected players
const players = {};

// Room config
const ROOM = {
  width: 800,
  height: 600,
};

// Spawn point (center of the room)
function getSpawnPosition() {
  return {
    x: 200 + Math.floor(Math.random() * 400),
    y: 200 + Math.floor(Math.random() * 200),
  };
}

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create new player
  const spawn = getSpawnPosition();
  players[socket.id] = {
    id: socket.id,
    x: spawn.x,
    y: spawn.y,
    name: "Anonymous",
    status: "studying",
    direction: "down",
  };

  // Send current players to the new player
  socket.emit("currentPlayers", players);

  // Notify others about the new player
  socket.broadcast.emit("playerJoined", players[socket.id]);

  // Handle player movement
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

  // Handle name change
  socket.on("setName", (name) => {
    if (!players[socket.id]) return;
    players[socket.id].name = name.slice(0, 12); // Max 12 chars
    io.emit("playerUpdated", players[socket.id]);
  });

  // Handle status change
  socket.on("setStatus", (status) => {
    if (!players[socket.id]) return;
    players[socket.id].status = status;
    io.emit("playerUpdated", players[socket.id]);
  });

  // Handle disconnect
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
