import { FONT_SIZE, GRID_SIZE, PORT_LABEL_SIZE, PORT_RADIUS } from "../constants.js";
import { getActiveTheme } from "./theme.js";
import { getWirePorts } from "./wireGeometry.js";
import { state, screenToWorld } from "../state.js";

const SIGNAL_KEYS = ["low", "high", "x", "z", "e"];

/**
 * Return "#ffffff" or "#1a1a2e" depending on which has better contrast
 * against the given hex background color.
 */
function contrastText(hex) {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  // sRGB relative luminance
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.35 ? "#1a1a2e" : "#ffffff";
}

export function drawGate(renderNode, p, status = null) {
  const theme = getActiveTheme();
  if (renderNode.gate.type === "seven-seg") {
    drawDisplay(renderNode, p);
    drawInputPort(renderNode, theme, p);
    drawOutputPort(renderNode, theme, p);
    if (status) drawOverlay(renderNode, status, p);

    p.fill(0);
    p.stroke(0);
    p.strokeWeight(1);
    return;
  }

  const gate = renderNode.gate;
  const stateVal = Array.isArray(gate.output) ? gate.output[0] : gate.output;
  const stateKey = SIGNAL_KEYS[stateVal] || "x";

  let color;
  let useGradient = false;
  if (gate.type === "input" || gate.type === "clock") {
    color = theme.gates.input[stateKey].hex;
  } else if (gate.type === "output") {
    color = theme.gates.output[stateKey].hex;
  } else {
    color = theme.gates.logic.hex;
    useGradient = true;
  }

  if (useGradient && theme.gates.logic.gradientTop) {
    // Use Canvas 2D API for a vertical gradient fill + stroke
    const ctx = p.drawingContext;
    const grad = ctx.createLinearGradient(
      renderNode.x, renderNode.y,
      renderNode.x, renderNode.y + renderNode.height
    );
    grad.addColorStop(0, theme.gates.logic.gradientTop);
    grad.addColorStop(1, theme.gates.logic.gradientBottom);
    ctx.save();
    ctx.fillStyle = grad;
    // Draw rounded rect via Canvas API (matches p5's rect with corner radius)
    const r = 8;
    const x = renderNode.x, y = renderNode.y;
    const w = renderNode.width, h = renderNode.height;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
    // Border stroke
    if (theme.gates.logic.stroke) {
      ctx.strokeStyle = theme.gates.logic.stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  } else {
    if (theme.gates.logic.stroke) {
      p.stroke(theme.gates.logic.stroke);
      p.strokeWeight(1.5);
    } else {
      p.noStroke();
    }
    p.fill(color);
    p.rect(renderNode.x, renderNode.y, renderNode.width, renderNode.height, 8);
  }

  // Compute label color with good contrast against the gate fill
  const labelColor = contrastText(color);
  p.fill(labelColor);
  p.noStroke();
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(FONT_SIZE);
  const label = gate.label || gate.type;

  if (gate.type === "composite" && gate.embeddedDisplays && gate.embeddedDisplays.length > 0 && gate._displayArea) {
    // --- Label at the top ---
    const { displayW, displayH, labelRowH, displayPad, displayCount, displayGap } = gate._displayArea;
    p.text(label, renderNode.x + renderNode.width / 2, renderNode.y + labelRowH / 1.5);

    // --- Embedded displays (centered strip) ---
    const displayStripW = displayCount * displayW + (displayCount - 1) * displayGap;
    const stripStartX = renderNode.x + (renderNode.width - displayStripW) / 2;
    const dispY = renderNode.y + labelRowH + displayPad;

    const borderWidth = (displayCount * displayW) + (displayGap * (displayCount - 1));

    drawDisplayBorder(stripStartX, dispY, borderWidth, displayH, p);

    for (let i = 0; i < displayCount; i++) {
      const dispX = stripStartX + i * (displayW + displayGap);
      drawEmbeddedDisplay(gate.embeddedDisplays[i].gate, dispX, dispY, displayW, displayH, p);
    }
  } else {
    p.text(label, renderNode.x + renderNode.width / 2, renderNode.y + renderNode.height / 2);
  }

  drawOutputPort(renderNode, theme, p);
  drawInputPort(renderNode, theme, p);

  if (status) drawOverlay(renderNode, status, p);

  p.fill(0);
  p.stroke(0);
  p.strokeWeight(1);
}

function drawOverlay(node, status, p) {
  const bounds = node.getBounds();
  const bw = bounds.right - bounds.left;
  const bh = bounds.bottom - bounds.top;

  p.noStroke();
  if (status === "valid") p.fill(255, 255, 255, 50);
  else if (status === "invalid") p.fill(180, 45, 45, 55);
  else if (status === "selected") p.fill(255, 255, 255, 30);
  p.rect(bounds.left, bounds.top, bw, bh);
}

function drawDisplayBorder(x, y, w, h, p) {
  p.strokeWeight(4);
  p.stroke(62, 63, 73);
  p.rect(x, y, w, h, 8);
  p.noStroke();
}

function drawHorizontalSegment(x, y, width, thickness, bevel, color, p) {
  p.beginShape();
  p.vertex(x + bevel, y);
  p.vertex(x + width - bevel, y);
  p.vertex(x + width, y + thickness / 2);
  p.vertex(x + width - bevel, y + thickness);
  p.vertex(x + bevel, y + thickness);
  p.vertex(x, y + thickness / 2);
  p.endShape(p.CLOSE);
}

function drawVerticalSegment(x, y, height, thickness, bevel, color, p) {
  p.beginShape();
  p.vertex(x + thickness / 2, y);
  p.vertex(x + thickness, y + bevel);
  p.vertex(x + thickness, y + height - bevel);
  p.vertex(x + thickness / 2, y + height);
  p.vertex(x, y + height - bevel);
  p.vertex(x, y + bevel);
  p.endShape(p.CLOSE);
}

function drawDisplay(renderNode, p) {
  const theme = getActiveTheme();
  const gate = renderNode.gate;

  const x = renderNode.x;
  const y = renderNode.y;
  const width = renderNode.width;
  const height = renderNode.height;
  const padding = GRID_SIZE;
  const thickness = GRID_SIZE;

  const signWidth = thickness * 2;
  const signGap = padding * 0.5;

  // 1. Define the core bounding box for the '8' figure
  const digitX = x + padding + signWidth + signGap;
  const digitY = y + padding;
  const digitW = width - padding * 2 - signWidth - signGap;
  const digitH = height - padding * 2;

  // 2. Setup interlocking geometry variables
  const T = thickness;
  const bevel = T / 2;
  const gap = T * 0.125; // Creates the tiny separation between LEDs

  const midY = digitY + digitH / 2;
  const hSegW = digitW - T;            // Width of horizontal segments
  const vSegH = digitH / 2 - T / 2;    // Height of vertical segments

  p.strokeWeight(4);
  p.stroke(62, 63, 73);
  p.fill("#090808");
  p.rect(x, y, width, height, 8);
  p.noStroke();

  let colors = gate.output.map(segment => {
    if (segment === 0 || segment === 3) return "#2a1a1a";
    const stateKey = SIGNAL_KEYS[segment] || "x";
    return theme.gates.output[stateKey].hex;
  });

  // 0: Top
  p.fill(colors[0]);
  drawHorizontalSegment(digitX + T / 2 + gap, digitY, hSegW - 2 * gap, T, bevel, colors[0], p);

  // 1: Top Right
  p.fill(colors[1]);
  drawVerticalSegment(digitX + digitW - T, digitY + T / 2 + gap, vSegH - 2 * gap, T, bevel, colors[1], p);

  // 2: Bottom Right
  p.fill(colors[2]);
  drawVerticalSegment(digitX + digitW - T, midY + gap, vSegH - 2 * gap, T, bevel, colors[2], p);

  // 3: Bottom
  p.fill(colors[3]);
  drawHorizontalSegment(digitX + T / 2 + gap, digitY + digitH - T, hSegW - 2 * gap, T, bevel, colors[3], p);

  // 4: Bottom Left
  p.fill(colors[4]);
  drawVerticalSegment(digitX, midY + gap, vSegH - 2 * gap, T, bevel, colors[4], p);

  // 5: Top Left
  p.fill(colors[5]);
  drawVerticalSegment(digitX, digitY + T / 2 + gap, vSegH - 2 * gap, T, bevel, colors[5], p);

  // 6: Middle
  p.fill(colors[6]);
  drawHorizontalSegment(digitX + T / 2 + gap, midY - T / 2, hSegW - 2 * gap, T, bevel, colors[6], p);

  // 7: Sign / Minus Indicator
  p.fill(colors[7]);
  // Vertically centered relative to the middle segment
  drawHorizontalSegment(x + padding, midY - T / 2, signWidth, T, bevel, colors[7], p);
}

/**
 * Draws a seven-segment display at an arbitrary position and size.
 * Used to embed a display inside a composite gate body.
 *
 * @param {Object} displayGate - The seven-seg gate whose output drives the segments
 * @param {number} x - Top-left x of the display area
 * @param {number} y - Top-left y of the display area
 * @param {number} width - Width of the display area
 * @param {number} height - Height of the display area
 * @param {Object} p - The p5 instance
 */
function drawEmbeddedDisplay(displayGate, x, y, width, height, p) {
  const theme = getActiveTheme();

  // Scale padding and thickness proportionally to the display size
  const scale = height / (11 * GRID_SIZE); // ratio vs standalone display
  const padding = GRID_SIZE * scale;
  const thickness = GRID_SIZE * scale;

  const signWidth = thickness * 2;
  const signGap = padding * 0.5;

  const digitX = x + padding + signWidth + signGap;
  const digitY = y + padding;
  const digitW = width - padding * 2 - signWidth - signGap;
  const digitH = height - padding * 2;

  const T = thickness;
  const bevel = T / 2;
  const gap = T * 0.125;

  const midY = digitY + digitH / 2;
  const hSegW = digitW - T;
  const vSegH = digitH / 2 - T / 2;

  // Background
  p.fill("#090808");
  p.rect(x, y, width, height, 8);

  let colors = displayGate.output.map(segment => {
    if (segment === 0 || segment === 3) return "#2a1a1a";
    const stateKey = SIGNAL_KEYS[segment] || "x";
    return theme.gates.output[stateKey].hex;
  });

  // 0: Top
  p.fill(colors[0]);
  drawHorizontalSegment(digitX + T / 2 + gap, digitY, hSegW - 2 * gap, T, bevel, colors[0], p);

  // 1: Top Right
  p.fill(colors[1]);
  drawVerticalSegment(digitX + digitW - T, digitY + T / 2 + gap, vSegH - 2 * gap, T, bevel, colors[1], p);

  // 2: Bottom Right
  p.fill(colors[2]);
  drawVerticalSegment(digitX + digitW - T, midY + gap, vSegH - 2 * gap, T, bevel, colors[2], p);

  // 3: Bottom
  p.fill(colors[3]);
  drawHorizontalSegment(digitX + T / 2 + gap, digitY + digitH - T, hSegW - 2 * gap, T, bevel, colors[3], p);

  // 4: Bottom Left
  p.fill(colors[4]);
  drawVerticalSegment(digitX, midY + gap, vSegH - 2 * gap, T, bevel, colors[4], p);

  // 5: Top Left
  p.fill(colors[5]);
  drawVerticalSegment(digitX, digitY + T / 2 + gap, vSegH - 2 * gap, T, bevel, colors[5], p);

  // 6: Middle
  p.fill(colors[6]);
  drawHorizontalSegment(digitX + T / 2 + gap, midY - T / 2, hSegW - 2 * gap, T, bevel, colors[6], p);

  // 7: Sign / Minus Indicator
  p.fill(colors[7]);
  drawHorizontalSegment(x + padding, midY - T / 2, signWidth, T, bevel, colors[7], p);
}

// Pin thickness at the gate end vs. the port end, scaled relative to the
// port circle so it stays proportional across gate sizes / zoom levels.
const PIN_THICK_AT_GATE = PORT_RADIUS * 0.5;
const PIN_THICK_AT_PORT = PORT_RADIUS * 0.16;

// The pin is drawn as three segments along its length: a short thick
// stub at the gate, a tapered mid-section, then a thin stub at the port.
// Fractions must sum to 1.
const PIN_THICK_STUB_FRAC = 0.3;
const PIN_TAPER_FRAC = 0.4;
const PIN_THIN_STUB_FRAC = 0.3;

/**
 * Lightens (percent > 0) or darkens (percent < 0) a hex color by mixing
 * it toward white or black. Returns an rgb() string.
 */
function shadeColor(hex, percent) {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  let r = parseInt(hex.slice(0, 2), 16);
  let g = parseInt(hex.slice(2, 4), 16);
  let b = parseInt(hex.slice(4, 6), 16);

  if (percent >= 0) {
    r += (255 - r) * percent;
    g += (255 - g) * percent;
    b += (255 - b) * percent;
  } else {
    r *= 1 + percent;
    g *= 1 + percent;
    b *= 1 + percent;
  }

  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
}

/**
 * Draws a smoothly flared "pin" with a rigid body and a flanged base,
 * matching the 3D metallic look of the mockup.
 *
 * @param {Object} p - p5 instance
 * @param {number} x1,y1 - point at the gate edge (thick end)
 * @param {number} x2,y2 - point at the port (thin end)
 * @param {string} baseColor - hex color the pin is built around
 */
function drawPin(p, x1, y1, x2, y2, baseColor) {
  const ctx = p.drawingContext;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;

  // Unit direction along the pin, and unit normal perpendicular to it
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  const thickStart = PIN_THICK_AT_GATE;
  const thickEnd = PIN_THICK_AT_PORT;

  const offset = (ptX, ptY, thickness, side) => ({
    x: ptX + side * nx * (thickness / 2),
    y: ptY + side * ny * (thickness / 2),
  });

  // Gate edge (thick end)
  const top0 = offset(x1, y1, thickStart, 1);
  const bottom0 = offset(x1, y1, thickStart, -1);

  // Port edge (thin end)
  const top3 = offset(x2, y2, thickEnd, 1);
  const bottom3 = offset(x2, y2, thickEnd, -1);

  // ASYMMETRIC TENSION: The secret to the flanged shape.
  // A small base tension forces a quick flare at the gate.
  // A large port tension forces the curve to stay thin/straight for most of its length.
  const tensionBase = len * 0.15;
  const tensionPort = len * 0.85;

  const topCp1 = { x: top0.x + ux * tensionBase, y: top0.y + uy * tensionBase };
  const topCp2 = { x: top3.x - ux * tensionPort, y: top3.y - uy * tensionPort };

  const bottomCp2 = { x: bottom3.x - ux * tensionPort, y: bottom3.y - uy * tensionPort };
  const bottomCp1 = { x: bottom0.x + ux * tensionBase, y: bottom0.y + uy * tensionBase };

  // High-contrast gradient to simulate a shiny metallic cylinder
  const grad = ctx.createLinearGradient(top0.x, top0.y, bottom0.x, bottom0.y);
  grad.addColorStop(0.0, shadeColor(baseColor, -0.6)); // Dark top rim
  grad.addColorStop(0.25, shadeColor(baseColor, 0.6)); // Sharp, bright off-center highlight
  grad.addColorStop(0.55, baseColor);                  // Mid-tone body
  grad.addColorStop(1.0, shadeColor(baseColor, -0.7)); // Dark bottom shadow

  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();

  ctx.moveTo(top0.x, top0.y);

  // Draw top curve
  ctx.bezierCurveTo(topCp1.x, topCp1.y, topCp2.x, topCp2.y, top3.x, top3.y);

  // Cap at the port
  ctx.lineTo(bottom3.x, bottom3.y);

  // Draw bottom curve
  ctx.bezierCurveTo(bottomCp2.x, bottomCp2.y, bottomCp1.x, bottomCp1.y, bottom0.x, bottom0.y);

  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawOutputPort(renderNode, theme, p) {
  const gate = renderNode.gate;
  if (gate.type === "output") return;
  const totalOutputs = gate.outputCount;
  const pinColor = theme.wires.ghost.hex;
  const gateEdgeX = renderNode.x + renderNode.width;

  for (let i = 0; i < totalOutputs; i++) {
    const port = renderNode.getOutputPortByIndex(i, totalOutputs);
    drawPin(p, gateEdgeX, port.y, port.x, port.y, pinColor);
    p.fill(theme.accent.hex);
    p.stroke(theme.text.primary.hex);
    p.strokeWeight(1.5);
    p.circle(port.x, port.y, PORT_RADIUS);
  }
}

function drawInputPort(renderNode, theme, p) {
  const gate = renderNode.gate;
  if (gate.type === "input" || gate.type === "clock") return;
  const totalInputs = gate.inputCount;
  const pinColor = theme.wires.ghost.hex;
  const gateEdgeX = renderNode.x;

  for (let i = 0; i < totalInputs; i++) {
    const port = renderNode.getInputPortByIndex(i, totalInputs);
    drawPin(p, gateEdgeX, port.y, port.x, port.y, pinColor);
    p.fill(theme.accent.hex);
    p.stroke(theme.text.primary.hex);
    p.strokeWeight(1.5);
    p.circle(port.x, port.y, PORT_RADIUS);
  }
}

export function getOctilinearSnap(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  const ax = Math.abs(dx);
  const ay = Math.abs(dy);

  const TAN30 = Math.tan(30 * Math.PI / 180);
  const TAN60 = Math.tan(60 * Math.PI / 180);

  let x = x2;
  let y = y2;

  if (ay <= ax * TAN30) y = y1;
  else if (ay >= ax * TAN60) x = x1;
  else {
    const d = Math.min(ax, ay);
    x = x1 + Math.sign(dx) * d;
    y = y1 + Math.sign(dy) * d;
  }

  return { x, y };
}

function drawPolylineSegments(start, waypoints, end, p) {
  if (waypoints?.length) {
    const waypointCount = waypoints.length;
    p.line(start.x, start.y, waypoints[0].x, waypoints[0].y);
    for (let i = 0; i < waypointCount - 1; i++) {
      p.line(waypoints[i].x, waypoints[i].y, waypoints[i + 1].x, waypoints[i + 1].y);
    }
    p.line(waypoints[waypointCount - 1].x, waypoints[waypointCount - 1].y, end.x, end.y);
  } else {
    p.line(start.x, start.y, end.x, end.y);
  }
}

export function drawGhostPath(start, waypoints, end, p) {
  const theme = getActiveTheme();
  p.stroke(theme.wires.ghost.hex);
  p.strokeWeight(3);

  const applySnap = p.keyIsDown(p.SHIFT);

  const from = waypoints?.length ? waypoints[waypoints.length - 1] : start;
  const target = applySnap ? getOctilinearSnap(from.x, from.y, end.x, end.y) : end;

  drawPolylineSegments(start, waypoints, target, p);

  p.stroke(0);
  p.strokeWeight(1);
}

export function drawWire(wireInfo, nodeMap, p) {
  const theme = getActiveTheme();
  const ports = getWirePorts(wireInfo.wire, nodeMap);
  const stateKey = SIGNAL_KEYS[wireInfo.wire.signal] || "x";
  
  p.strokeWeight(3);
  p.stroke(theme.wires[stateKey].hex);
  drawPolylineSegments(ports.start, wireInfo.waypoints, ports.end, p);
  p.stroke(0);
  p.strokeWeight(1);
}

export function drawWaypoint(wireInfo, waypoint, p) {
  const theme = getActiveTheme();
  const stateKey = SIGNAL_KEYS[wireInfo.wire.signal] || "x";
  let color = theme.wires[stateKey].hex;
  p.fill(color);
  p.circle(waypoint.x, waypoint.y, 12);
}

export function drawDynamicGrid(p, theme, cameraX, cameraY, zoom) {
  // 1. Calculate the scaled visual spacing of the grid
  let currentGridSize = GRID_SIZE;
  let scaledSpacing = currentGridSize * zoom;

  // 2. LEVEL OF DETAIL
  // If the user zooms out and the dots get closer than 15 pixels on screen, we double the grid size
  while (scaledSpacing < 15) {
    currentGridSize *= 2;
    scaledSpacing = currentGridSize * zoom;
  }

  // 3. Modulo shift, using the new scaled spacing
  let shiftX = cameraX % scaledSpacing;
  let shiftY = cameraY % scaledSpacing;

  // Keep the shift negative so it always safely starts offscreen
  if (shiftX > 0) shiftX -= scaledSpacing;
  if (shiftY > 0) shiftY -= scaledSpacing;

  p.stroke(theme.canvas.grid.hex);

  // By drawing this BEFORE p.scale(), the dots stay exactly 3px wide
  // regardless of how far in or out the user zooms
  p.strokeWeight(3);

  for (let x = shiftX; x < p.width; x += scaledSpacing) {
    for (let y = shiftY; y < p.height; y += scaledSpacing) {
      p.point(x, y);
    }
  }
}

/**
 * Draws an animated tooltip above a port showing the parent gate's label or type.
 *
 * @param {string} label - The text to display (gate.label || gate.type)
 * @param {{x: number, y: number}} port - The port position
 * @param {number} opacity - Animation progress from 0 → 1 (controls fade + slide)
 * @param {Object} p - The p5 instance
 */
export function drawPortTooltip(label, port, opacity, portType, p) {
  if (opacity <= 0) return;

  const theme = getActiveTheme();

  // Measure text
  p.textSize(12);
  p.textAlign(p.CENTER, p.CENTER);
  const textW = p.textWidth(label);

  // Tooltip geometry
  const padX = 12;
  const padY = 7;
  const tooltipW = textW + padX * 2;
  const tooltipH = 26;
  const cornerR = 7;
  const arrowSize = 5;
  const gap = 10; // distance above the port

  // Animate: slide horizontally from the port (6px closer) + fade in
  const slideOffset = (1 - opacity) * 6;
  const portGap = PORT_RADIUS / 2 + arrowSize + 2; // clearance from port circle edge
  let tooltipX;
  if (portType === "input") {
    tooltipX = port.x - tooltipW - portGap - arrowSize + slideOffset;
  } else if (portType === "output") {
    tooltipX = port.x + portGap + arrowSize - slideOffset;
  }
  const tooltipY = port.y - tooltipH / 2;

  p.push();
  // Apply overall opacity via tint
  const easedAlpha = opacity * opacity * (3 - 2 * opacity); // smoothstep

  // Background pill
  const bgColor = p.color(theme.panel.bg.hex);
  bgColor.setAlpha(easedAlpha * 235);
  p.fill(bgColor);

  const borderColor = p.color(theme.accent.hex);
  borderColor.setAlpha(easedAlpha * 180);
  p.stroke(borderColor);
  p.strokeWeight(1.2);

  p.rect(tooltipX, tooltipY, tooltipW, tooltipH, cornerR);

  // Arrow / triangle pointer — base is inset from the tooltip edge
  // so it connects with the flat portion of the rounded rect, not the curve
  p.noStroke();
  p.fill(bgColor);
  const arrowY = port.y; // vertically centered on the port

  if (portType === "output") {
    // Arrow on the LEFT side of the tooltip, pointing toward the port
    const baseX = tooltipX;
    p.triangle(
      baseX, arrowY - arrowSize,
      baseX, arrowY + arrowSize,
      baseX - arrowSize, arrowY
    );

    p.stroke(borderColor);
    p.strokeWeight(1.2);
    p.line(baseX, arrowY - arrowSize, baseX - arrowSize, arrowY);
    p.line(baseX, arrowY + arrowSize, baseX - arrowSize, arrowY);

  } else if (portType === "input") {
    // Arrow on the RIGHT side of the tooltip, pointing toward the port
    const baseX = tooltipX + tooltipW;
    p.triangle(
      baseX, arrowY - arrowSize,
      baseX, arrowY + arrowSize,
      baseX + arrowSize, arrowY
    );

    p.stroke(borderColor);
    p.strokeWeight(1.2);
    p.line(baseX, arrowY - arrowSize, baseX + arrowSize, arrowY);
    p.line(baseX, arrowY + arrowSize, baseX + arrowSize, arrowY);
  }

  // Label text
  const textColor = p.color(theme.text.primary.hex);
  textColor.setAlpha(easedAlpha * 255);
  p.noStroke();
  p.fill(textColor);
  p.textSize(12);
  p.textStyle(p.BOLD);
  p.textAlign(p.CENTER, p.CENTER);
  p.text(label, tooltipX + tooltipW / 2, tooltipY + tooltipH / 2);

  p.pop();

  // Restore defaults for subsequent draws
  p.textStyle(p.NORMAL);
  p.textSize(FONT_SIZE);
  p.fill(0);
  p.stroke(0);
  p.strokeWeight(1);
}

export function setFont(theme, p) {
  if (theme.font && theme.font.family) {
    // Strip quotes for p5 textFont
    const fontName = theme.font.family.split(",")[0].replace(/'/g, "").trim();
    p.textFont(fontName);
  }
}