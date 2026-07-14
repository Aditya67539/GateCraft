import { getActiveTheme } from "../render/theme.js";

// Minimap Configuration
const MAP_W = 200;
const MAP_H = 150;
const PAD = 20;

// This object stores the current layout so the rendering math 
// knows exactly where the minimap is on the screen at all times.
let mapData = {
  x: 0, y: 0, w: MAP_W, h: MAP_H,
  worldMinX: 0, worldMinY: 0, miniScale: 1,
  offsetX: 0, offsetY: 0
};

// Cached HTML elements
let backdropEl = null;
let minimapCanvas = null;
let minimapCtx = null;

/**
 * Lazily create the dedicated minimap canvas that sits ABOVE the
 * backdrop div so the frosted glass blur does not affect it.
 */
function ensureMinimapCanvas() {
  if (minimapCanvas) return;

  const dpr = window.devicePixelRatio || 1;

  minimapCanvas = document.createElement("canvas");
  minimapCanvas.id = "minimap-canvas";
  minimapCanvas.width = MAP_W * dpr;
  minimapCanvas.height = MAP_H * dpr;
  minimapCanvas.style.position = "fixed";
  minimapCanvas.style.zIndex = "51";        // above backdrop (50)
  minimapCanvas.style.right = PAD + "px";
  minimapCanvas.style.bottom = PAD + "px";
  minimapCanvas.style.width = MAP_W + "px";
  minimapCanvas.style.height = MAP_H + "px";
  minimapCanvas.style.pointerEvents = "none";
  minimapCanvas.style.borderRadius = "10px";
  document.body.appendChild(minimapCanvas);

  minimapCtx = minimapCanvas.getContext("2d");
  minimapCtx.scale(dpr, dpr);
}

/** Draw a rounded rectangle (fill or stroke). */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function drawMinimap(p, renderNodes, state) {
  const theme = getActiveTheme();
  const zoom = state.zoom || 1;

  // Position in bottom right corner (used only for mapData record)
  mapData.x = p.width - MAP_W - PAD;
  mapData.y = p.height - MAP_H - PAD;

  // 1. Dynamic Auto-Framing
  // Start the bounds with what the camera can currently see:
  let minX = -state.cameraX / zoom;
  let minY = -state.cameraY / zoom;
  let maxX = minX + p.width / zoom;
  let maxY = minY + p.height / zoom;

  // Expand bounds if gates are further out
  for (let node of renderNodes) {
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.x + node.width > maxX) maxX = node.x + node.width;
    if (node.y + node.height > maxY) maxY = node.y + node.height;
  }

  // Add 10% padding so things don't touch the edge of the minimap
  const worldW = maxX - minX;
  const worldH = maxY - minY;
  const paddingX = worldW * 0.1;
  const paddingY = worldH * 0.1;

  mapData.worldMinX = minX - paddingX;
  mapData.worldMinY = minY - paddingY;

  const paddedWorldW = worldW + paddingX * 2;
  const paddedWorldH = worldH + paddingY * 2;

  // 2. Calculate Scale & Centering
  // Pick the scale that fits both width and height
  mapData.miniScale = Math.min(MAP_W / paddedWorldW, MAP_H / paddedWorldH);

  // Center the content if the aspect ratio doesn't perfectly match
  mapData.offsetX = (MAP_W - (paddedWorldW * mapData.miniScale)) / 2;
  mapData.offsetY = (MAP_H - (paddedWorldH * mapData.miniScale)) / 2;

  // --- Position the HTML backdrop element (frosted glass) ---
  if (!backdropEl) {
    backdropEl = document.getElementById("minimap-backdrop");
  }
  if (backdropEl) {
    backdropEl.style.display = "block";
    backdropEl.style.width = MAP_W + "px";
    backdropEl.style.height = MAP_H + "px";
    backdropEl.style.right = PAD + "px";
    backdropEl.style.bottom = PAD + "px";
  }

  // --- Draw minimap content on the dedicated overlay canvas ---
  ensureMinimapCanvas();
  const ctx = minimapCtx;
  ctx.clearRect(0, 0, MAP_W, MAP_H);

  ctx.save();
  ctx.translate(mapData.offsetX, mapData.offsetY);

  // Draw Gates (Simple Rectangles)
  ctx.fillStyle = theme.accent?.hex || "#00a8ff";
  for (let node of renderNodes) {
    let mx = (node.x - mapData.worldMinX) * mapData.miniScale;
    let my = (node.y - mapData.worldMinY) * mapData.miniScale;
    let mw = node.width * mapData.miniScale;
    let mh = node.height * mapData.miniScale;
    roundRect(ctx, mx, my, mw, mh, 2);
    ctx.fill();
  }

  // Draw Red Viewport (What the user currently sees)
  let vx = ((-state.cameraX / zoom) - mapData.worldMinX) * mapData.miniScale;
  let vy = ((-state.cameraY / zoom) - mapData.worldMinY) * mapData.miniScale;
  let vw = (p.width / zoom) * mapData.miniScale;
  let vh = (p.height / zoom) * mapData.miniScale;

  ctx.strokeStyle = "rgb(255, 50, 50)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(vx, vy, vw, vh);
  ctx.stroke();

  ctx.restore();
}