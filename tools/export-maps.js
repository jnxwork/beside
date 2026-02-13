#!/usr/bin/env node
// Generate 3-layer Tiled JSON maps + tileset PNG.
// Layers: floor (sprites), objects (wall sprites), collision (abstract types 0-11)
// Run: node tools/export-maps.js
// Output: public/maps/focus.json, rest.json, tileset_game.png

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const COLS = 32;
const ROWS = 18;

// --- Tileset GID offsets (must match Tiled firstgid) ---
const FIRSTGID_GAME = 1;      // tileset_game:          GID 1–12        (12 tiles)
const FIRSTGID_RBO = 13;      // room_builder_office:   GID 13–236      (224 tiles)
const FIRSTGID_MO = 237;      // modern_office:         GID 237–1084    (848 tiles)
const FIRSTGID_MIRB = 1085;   // mi_room_builder:       GID 1085–9672   (8588 tiles)
const FIRSTGID_MIINT = 9673;  // mi_interiors:          GID 9673–26696  (17024 tiles)

const MIRB_COLS = 76; // MI Room Builder sprite sheet has 76 columns

// Helper: MI Room Builder GID from sprite-sheet row/col
function mirbGID(row, col) {
  return FIRSTGID_MIRB + row * MIRB_COLS + col;
}

// --- Room visual configurations (MI Room Builder coordinates) ---
// Walls area: cols 0-31 (4 groups × 8 cols), starts ~row 4
// Floors area: cols 32-46, starts ~row 4
// Teal wall: group 3, wall-row 10, col 17 → sheet row ~14
// Yellow wall: group 1, wall-row 12, col 1 → sheet row ~16
// Grey stone floor: floor-row ~26, cols 41-42
// Herringbone floor: floor-row ~12, cols 38-39
const ROOMS = {
  focus: {
    wall: mirbGID(14, 17),  // Teal/turquoise wall
    floor: [                // Grey stone 2×2 pattern
      [mirbGID(30, 41), mirbGID(30, 42)],
      [mirbGID(31, 41), mirbGID(31, 42)],
    ],
  },
  rest: {
    wall: mirbGID(16, 1),   // Yellow wall
    floor: [                // Herringbone 2×2 pattern
      [mirbGID(16, 38), mirbGID(16, 39)],
      [mirbGID(17, 38), mirbGID(17, 39)],
    ],
  },
};

// ═══════════════════════════════════════════════════════
// Collision maps (identical logic to original builders)
// Types: 0=floor 1=wall 2=desk 3=bookshelf 4=plant
//        5=rug 7=chair 8=portal 9=sofa 10=coffee 11=window
// ═══════════════════════════════════════════════════════

function buildFocusCollision() {
  const map = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) row.push(1);
      else if (r === 1 && c >= 2 && c <= 5) row.push(3);
      else if (r === 1 && c >= 10 && c <= 13) row.push(3);
      else if (r === 1 && c >= 18 && c <= 21) row.push(3);
      else if (r === 1 && c >= 26 && c <= 29) row.push(3);
      else if (r === 1 && (c === 1 || c === 30)) row.push(4);
      else if (r === 14 && (c === 1 || c === 30)) row.push(4);
      else if (r === 16 && (c === 1 || c === 30)) row.push(4);
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
      else if (r >= 7 && r <= 8 && c >= 11 && c <= 20) row.push(5);
      else if (r === ROWS - 2 && c >= 14 && c <= 17) row.push(8);
      else row.push(0);
    }
    map.push(row);
  }
  return map;
}

function buildRestCollision() {
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

// ═══════════════════════════════════════════════════════
// Layer builders
// ═══════════════════════════════════════════════════════

// Floor layer: 2×2 repeating sprite pattern everywhere
function buildFloorData(roomKey) {
  const cfg = ROOMS[roomKey];
  const data = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      data.push(cfg.floor[r % 2][c % 2]);
    }
  }
  return data;
}

// Objects layer: wall sprites where collision=1, empty elsewhere
// (user places furniture sprites in Tiled)
function buildObjectsData(collision, roomKey) {
  const cfg = ROOMS[roomKey];
  const data = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ct = collision[r][c];
      if (ct === 1 || ct === 11) {
        data.push(cfg.wall);
      } else {
        data.push(0);
      }
    }
  }
  return data;
}

// Collision layer: abstract type → GID (type + FIRSTGID_GAME)
function buildCollisionData(collision) {
  const data = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      data.push(collision[r][c] + FIRSTGID_GAME);
    }
  }
  return data;
}

// ═══════════════════════════════════════════════════════
// Tileset list (shared between generate and --tilesets mode)
// ═══════════════════════════════════════════════════════

const TILESETS = [
  { firstgid: FIRSTGID_GAME, source: "tileset_game.tsj" },
  { firstgid: FIRSTGID_RBO, source: "room_builder_office.tsj" },
  { firstgid: FIRSTGID_MO, source: "modern_office.tsj" },
  { firstgid: FIRSTGID_MIRB, source: "mi_room_builder.tsj" },
  { firstgid: FIRSTGID_MIINT, source: "mi_interiors.tsj" },
];

// ═══════════════════════════════════════════════════════
// Assemble 3-layer Tiled JSON
// ═══════════════════════════════════════════════════════

function buildTiledJson(roomKey, collision) {
  return {
    compressionlevel: -1,
    height: ROWS,
    width: COLS,
    infinite: false,
    orientation: "orthogonal",
    renderorder: "right-down",
    tiledversion: "1.11.2",
    tileheight: 32,
    tilewidth: 32,
    type: "map",
    version: "1.10",
    nextlayerid: 4,
    nextobjectid: 1,
    layers: [
      {
        id: 1,
        name: "floor",
        type: "tilelayer",
        visible: true,
        opacity: 1,
        x: 0, y: 0,
        width: COLS, height: ROWS,
        data: buildFloorData(roomKey),
      },
      {
        id: 2,
        name: "objects",
        type: "tilelayer",
        visible: true,
        opacity: 1,
        x: 0, y: 0,
        width: COLS, height: ROWS,
        data: buildObjectsData(collision, roomKey),
      },
      {
        id: 3,
        name: "collision",
        type: "tilelayer",
        visible: true,
        opacity: 0.3,
        x: 0, y: 0,
        width: COLS, height: ROWS,
        data: buildCollisionData(collision),
      },
    ],
    tilesets: TILESETS,
  };
}

// ═══════════════════════════════════════════════════════
// Generate / update map files
// ═══════════════════════════════════════════════════════
//   node tools/export-maps.js              → full regenerate (WARNING: overwrites layers!)
//   node tools/export-maps.js --tilesets   → only update tilesets list (preserves layers)
//   node tools/export-maps.js --png        → only regenerate tileset_game.png from .tsj

const outDir = path.join(__dirname, "..", "public", "maps");
fs.mkdirSync(outDir, { recursive: true });

if (!process.argv.includes("--png")) {
  // Map generation (skip entirely in --png mode)
  if (process.argv.includes("--tilesets")) {
    // Safe mode: only update tilesets array, preserve all layer data
    for (const name of ["focus.json", "rest.json"]) {
      const filePath = path.join(outDir, name);
      if (!fs.existsSync(filePath)) {
        console.warn(`Skipping ${name} (not found)`);
        continue;
      }
      const map = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      map.tilesets = TILESETS;
      fs.writeFileSync(filePath, JSON.stringify(map, null, 2));
      console.log(`Updated tilesets in ${name} (layers preserved)`);
    }
  } else {
    const focusCollision = buildFocusCollision();
    const restCollision = buildRestCollision();

    fs.writeFileSync(
      path.join(outDir, "focus.json"),
      JSON.stringify(buildTiledJson("focus", focusCollision), null, 2)
    );
    fs.writeFileSync(
      path.join(outDir, "rest.json"),
      JSON.stringify(buildTiledJson("rest", restCollision), null, 2)
    );

    console.log("Exported: public/maps/focus.json, rest.json (3 layers each)");
    console.log("WARNING: Layer data was regenerated from scratch!");
  }
}

// ═══════════════════════════════════════════════════════
// Generate tileset_game.png from tileset_game.tsj
// Reads tile definitions (color, label) from the .tsj file.
// Usage:
//   node tools/export-maps.js --png    → only regenerate PNG + update tsj metadata
//   (also runs automatically during full/tilesets export)
// ═══════════════════════════════════════════════════════

// Simple 5×7 pixel font for labels (A-Z + 0-9)
const FONT = {
  A: [0b01110,0b10001,0b10001,0b11111,0b10001,0b10001,0b00000],
  B: [0b11110,0b10001,0b11110,0b10001,0b10001,0b11110,0b00000],
  C: [0b01111,0b10000,0b10000,0b10000,0b10000,0b01111,0b00000],
  D: [0b11110,0b10001,0b10001,0b10001,0b10001,0b11110,0b00000],
  E: [0b11111,0b10000,0b11110,0b10000,0b10000,0b11111,0b00000],
  F: [0b11111,0b10000,0b11110,0b10000,0b10000,0b10000,0b00000],
  G: [0b01111,0b10000,0b10000,0b10011,0b10001,0b01111,0b00000],
  H: [0b10001,0b10001,0b11111,0b10001,0b10001,0b10001,0b00000],
  I: [0b11111,0b00100,0b00100,0b00100,0b00100,0b11111,0b00000],
  J: [0b00111,0b00001,0b00001,0b00001,0b10001,0b01110,0b00000],
  K: [0b10001,0b10010,0b11100,0b10010,0b10001,0b10001,0b00000],
  L: [0b10000,0b10000,0b10000,0b10000,0b10000,0b11111,0b00000],
  M: [0b10001,0b11011,0b10101,0b10001,0b10001,0b10001,0b00000],
  N: [0b10001,0b11001,0b10101,0b10011,0b10001,0b10001,0b00000],
  O: [0b01110,0b10001,0b10001,0b10001,0b10001,0b01110,0b00000],
  P: [0b11110,0b10001,0b11110,0b10000,0b10000,0b10000,0b00000],
  Q: [0b01110,0b10001,0b10001,0b10101,0b10010,0b01101,0b00000],
  R: [0b11110,0b10001,0b11110,0b10010,0b10001,0b10001,0b00000],
  S: [0b01111,0b10000,0b01110,0b00001,0b00001,0b11110,0b00000],
  T: [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b00000],
  U: [0b10001,0b10001,0b10001,0b10001,0b10001,0b01110,0b00000],
  V: [0b10001,0b10001,0b10001,0b01010,0b01010,0b00100,0b00000],
  W: [0b10001,0b10001,0b10001,0b10101,0b11011,0b10001,0b00000],
  X: [0b10001,0b01010,0b00100,0b01010,0b10001,0b10001,0b00000],
  Y: [0b10001,0b01010,0b00100,0b00100,0b00100,0b00100,0b00000],
  Z: [0b11111,0b00010,0b00100,0b01000,0b10000,0b11111,0b00000],
  0: [0b01110,0b10011,0b10101,0b11001,0b10001,0b01110,0b00000],
  1: [0b00100,0b01100,0b00100,0b00100,0b00100,0b11111,0b00000],
  2: [0b01110,0b10001,0b00010,0b00100,0b01000,0b11111,0b00000],
  3: [0b11110,0b00001,0b01110,0b00001,0b00001,0b11110,0b00000],
  4: [0b10001,0b10001,0b11111,0b00001,0b00001,0b00001,0b00000],
  5: [0b11111,0b10000,0b11110,0b00001,0b00001,0b11110,0b00000],
  6: [0b01111,0b10000,0b11110,0b10001,0b10001,0b01110,0b00000],
  7: [0b11111,0b00001,0b00010,0b00100,0b01000,0b01000,0b00000],
  8: [0b01110,0b10001,0b01110,0b10001,0b10001,0b01110,0b00000],
  9: [0b01110,0b10001,0b10001,0b01111,0b00001,0b11110,0b00000],
};

function hexToRGB(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function generateTilesetPNG() {
  const tsjPath = path.join(outDir, "tileset_game.tsj");
  const tsj = JSON.parse(fs.readFileSync(tsjPath, "utf-8"));
  const tiles = tsj.tiles || [];

  if (tiles.length === 0) {
    console.error("Error: No tiles defined in tileset_game.tsj");
    return;
  }

  // Sort by id to ensure correct order
  tiles.sort((a, b) => a.id - b.id);

  const TILE_SIZE = 32;
  const tileCount = tiles.length;
  const imgW = TILE_SIZE * tileCount;
  const imgH = TILE_SIZE;

  // Update tsj metadata if tile count changed
  if (tsj.tilecount !== tileCount || tsj.columns !== tileCount || tsj.imagewidth !== imgW) {
    tsj.tilecount = tileCount;
    tsj.columns = tileCount;
    tsj.imagewidth = imgW;
    tsj.imageheight = imgH;
    fs.writeFileSync(tsjPath, JSON.stringify(tsj, null, 2) + "\n");
    console.log(`Updated tileset_game.tsj: tilecount=${tileCount}, columns=${tileCount}, imagewidth=${imgW}`);
  }

  // Build raw RGBA pixel data
  const pixels = Buffer.alloc(imgW * imgH * 4);

  for (let i = 0; i < tileCount; i++) {
    const t = tiles[i];
    const color = hexToRGB(t.color || "#808080");
    const label = (t.label || "??").toUpperCase();
    const ox = i * TILE_SIZE;

    // Fill tile with color + dark border
    for (let py = 0; py < TILE_SIZE; py++) {
      for (let px = 0; px < TILE_SIZE; px++) {
        const idx = (py * imgW + (ox + px)) * 4;
        if (px === 0 || px === TILE_SIZE - 1 || py === 0 || py === TILE_SIZE - 1) {
          pixels[idx] = 40; pixels[idx + 1] = 40; pixels[idx + 2] = 40; pixels[idx + 3] = 255;
        } else {
          pixels[idx] = color[0]; pixels[idx + 1] = color[1]; pixels[idx + 2] = color[2]; pixels[idx + 3] = 255;
        }
      }
    }

    // Draw label centered (up to 2 chars)
    const drawLabel = label.slice(0, 2);
    const labelX = ox + Math.floor((TILE_SIZE - 11) / 2);
    const labelY = Math.floor((TILE_SIZE - 7) / 2);
    for (let ci = 0; ci < drawLabel.length; ci++) {
      const ch = drawLabel[ci];
      const glyph = FONT[ch];
      if (!glyph) continue;
      const cx = labelX + ci * 6;
      for (let gy = 0; gy < 7; gy++) {
        for (let gx = 0; gx < 5; gx++) {
          if (glyph[gy] & (1 << (4 - gx))) {
            const idx = ((labelY + gy) * imgW + (cx + gx)) * 4;
            pixels[idx] = 255; pixels[idx + 1] = 255; pixels[idx + 2] = 255; pixels[idx + 3] = 255;
          }
        }
      }
    }
  }

  // Encode as PNG (zero-dependency)
  const rawData = Buffer.alloc(imgH * (1 + imgW * 4));
  for (let y = 0; y < imgH; y++) {
    rawData[y * (1 + imgW * 4)] = 0;
    pixels.copy(rawData, y * (1 + imgW * 4) + 1, y * imgW * 4, (y + 1) * imgW * 4);
  }

  const compressed = zlib.deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const crcTable = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[n] = c;
  }
  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return crc ^ -1;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type);
    const crcData = Buffer.concat([typeB, data]);
    const crc = Buffer.alloc(4);
    crc.writeInt32BE(crc32(crcData));
    return Buffer.concat([len, typeB, data, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(imgW, 0);
  ihdr.writeUInt32BE(imgH, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const png = Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);

  fs.writeFileSync(path.join(outDir, "tileset_game.png"), png);
  console.log(`Generated: public/maps/tileset_game.png (${imgW}x${imgH}, ${tileCount} tiles)`);
}

// Run PNG generation (always, unless --tilesets only)
if (!process.argv.includes("--tilesets")) {
  generateTilesetPNG();
}

// If --png flag, we only wanted the PNG (already done above), exit early
if (process.argv.includes("--png")) {
  process.exit(0);
}
