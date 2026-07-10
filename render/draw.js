import { FONT_SIZE, GRID_SIZE, PORT_LABEL_SIZE, PORT_RADIUS } from "../constants.js";
import { getActiveTheme } from "./theme.js";
import { getWirePorts } from "./wireGeometry.js";
import { state } from "../state.js";

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
  const isOn = Array.isArray(gate.output) ? gate.output.some(Boolean) : gate.output;
  let color;
  let useGradient = false;
  if (gate.type === "input" || gate.type === "clock") {
    color = isOn ? theme.gates.input.high.hex : theme.gates.input.low.hex;
  } else if (gate.type === "output") {
    color = isOn ? theme.gates.output.high.hex : theme.gates.output.low.hex;
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
    p.text(label, renderNode.x + renderNode.width / 2, renderNode.y + labelRowH / 2);

    // --- Embedded displays (centered strip) ---
    const displayStripW = displayCount * displayW + (displayCount - 1) * displayGap;
    const stripStartX = renderNode.x + (renderNode.width - displayStripW) / 2;
    const dispY = renderNode.y + labelRowH + displayPad;

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

  // Background
  p.fill("#262220");
  p.rect(x, y, width, height);

  let colors = gate.output.map(segment => {
    return segment ? theme.gates.output.e.hex : "#2a1a1a";
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
  p.rect(x, y, width, height);

  let colors = displayGate.output.map(segment => {
    return segment ? theme.gates.output.e.hex : "#2a1a1a";
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
export function drawWire(renderNodes, wireInfo, nodeMap, p) {
  const theme = getActiveTheme();
  const ports = getWirePorts(renderNodes, wireInfo.wire, nodeMap);
  p.strokeWeight(3);

  let color = wireInfo.wire.signal ? theme.wires.high.hex : theme.wires.low.hex;
  p.stroke(color);

  const waypointCount = wireInfo.waypoints.length;
  p.line(ports.start.x, ports.start.y, wireInfo.waypoints[0].x, wireInfo.waypoints[0].y);
  for (let i = 0; i < waypointCount - 1; i++) {
    p.line(wireInfo.waypoints[i].x, wireInfo.waypoints[i].y, wireInfo.waypoints[i + 1].x, wireInfo.waypoints[i + 1].y);
  }
  p.line(wireInfo.waypoints[waypointCount - 1].x, wireInfo.waypoints[waypointCount - 1].y, ports.end.x, ports.end.y);

  p.stroke(0);
  p.strokeWeight(1);
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

export function drawGhostWire(wire, p) {
  const theme = getActiveTheme();
  const node = wire.fromNode;
  let start;
  if (node.gate.type === "composite") {
    const index = wire.fromOutputIndex;
    const outputCount = node.gate.outputCount;
    start = node.getOutputPortByIndex(index, outputCount);
  } else {
    start = node.getOutputPort();
  }
  p.stroke(theme.wires.ghost.hex);
  p.strokeWeight(3);
  if (state.ghostWire && state.ghostWire.length !== 0) {
    p.line(start.x, start.y, state.ghostWire[0].x, state.ghostWire[0].y);
    const waypoint_count = state.ghostWire.length;
    for (let i = 0; i < waypoint_count - 1; i++) {
      p.line(state.ghostWire[i].x, state.ghostWire[i].y, state.ghostWire[i + 1].x, state.ghostWire[i + 1].y);
    }
    p.line(state.ghostWire[waypoint_count - 1].x, state.ghostWire[waypoint_count - 1].y, p.mouseX, p.mouseY);
  } else {
    p.line(start.x, start.y, p.mouseX, p.mouseY);
  }
  p.stroke(0);
  p.strokeWeight(1);
}  

export function drawWaypoint(wireInfo, waypoint, p) {
  const theme = getActiveTheme();
  let color = wireInfo.wire.signal ? theme.wires.high.hex : theme.wires.low.hex;
  p.fill(color);
  p.circle(waypoint.x, waypoint.y, 12);
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


/**
 * Creates and returns a grid texture using a p5.Graphics buffer. 
 * 
 * @param {number} width - Width of the grid buffer in pixels. 
 * @param {number} height - Height of the grid buffer in pixels. 
 * @param {Object} theme - Theme configuration object. 
 * @param {number} offset - Starting offset for the grid buffer.
 * @param {number} size - Distance between grid points. 
 * @param {Object} p - The p5 instance used to create the graphics buffer. 
 * @returns A p5.Graphics buffer containing the rendered grid. 
 */
export function createGrid(width, height, theme, offset, size, p) {
  const buffer = p.createGraphics(width, height);

  buffer.background(theme.canvas.bg.hex);
  buffer.stroke(theme.canvas.grid.hex);
  buffer.strokeWeight(3);

  for (let i = offset; i < width; i += size) {
    for (let j = offset; j < height; j += size) {
      buffer.point(i, j);
    }
  }

  return buffer;
} 