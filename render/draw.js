import {
  FONT_SIZE,
  GRID_SIZE,
  PORT_RADIUS,
  DEFAULT_STROKE_WEIGHT,
  WIRE_THICKNESS,
  BUS_THICKNESS,
  GATE_STROKE_WEIGHT,
  PORT_STROKE_WEIGHT,
  DISPLAY_BORDER_STROKE_WEIGHT,
  TOOLTIP_STROKE_WEIGHT,
  GATE_CORNER_RADIUS,
  DISPLAY_CORNER_RADIUS,
  WAYPOINT_RADIUS,
  BUS_POINT_RADIUS,
  BUS_BOUNDS_PADDING,
  SEVEN_SEG_GRID_HEIGHT,
  DISPLAY_SIGN_WIDTH_FACTOR,
  DISPLAY_SIGN_GAP_FACTOR,
  DISPLAY_BEVEL_FACTOR,
  DISPLAY_LED_GAP_FACTOR,
  PIN_THICK_AT_GATE,
  PIN_THICK_AT_PORT,
  PIN_TENSION_BASE_FACTOR,
  PIN_TENSION_PORT_FACTOR,
  GRID_MIN_SPACING,
  GRID_DOT_SIZE,
  TOOLTIP_FONT_SIZE,
  TOOLTIP_PADDING_X,
  TOOLTIP_PADDING_Y,
  TOOLTIP_HEIGHT,
  TOOLTIP_CORNER_RADIUS,
  TOOLTIP_ARROW_SIZE,
  TOOLTIP_GAP,
  TOOLTIP_SLIDE_OFFSET,
  TOOLTIP_PORT_CLEARANCE,
  HOVERED_WIRE_THICKNESS,
  HOVERED_BUS_THICKNESS,
  HOVERED_WAYPOINT_RADIUS,
  WAYPOINT_STROKE_WEIGHT,
  SIGNAL_MAP,
  GATE_CATEGORIES,
  LABEL_FONT_SIZE,
  LABEL_PADDING_X,
  LABEL_PADDING_Y,
  LABEL_CORNER_RADIUS,
  LABEL_BG_ALPHA,
  LABEL_OFFSET_Y,
} from "../constants.js";
import { getActiveTheme } from "./theme.js";
import { screenToWorld } from "../state.js";
import { getOctilinearSnap } from "./wireGeometry.js";

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

/**
 * Draws a square wave symbol inside a clock gate matching the 1-cycle waveform.
 * When the signal is low, the wave is drawn with high signal color.
 * When the signal is high, the wave is drawn with low signal color and flipped.
 *
 * @param {RenderNode} renderNode
 * @param {string} stateKey - "low", "high", "x", "z", "e"
 * @param {Object} theme - active theme
 * @param {Object} p - p5 instance
 */
function drawClockWave(renderNode, stateKey, theme, p) {
  const ctx = p.drawingContext;
  const w = renderNode.width;
  const h = renderNode.height;
  const cx = renderNode.x + w / 2;
  const cy = renderNode.y + h / 2;

  const isHigh = stateKey === "high";
  const waveColor = isHigh ? theme.gates.input.low.hex : theme.gates.input.high.hex;

  // Single-cycle square wave
  const waveW = Math.round(w * 0.55);
  const waveH = Math.round(h * 0.55);
  const halfW = waveW / 2;
  const halfH = waveH / 2;

  const x0 = cx - halfW;
  const x1 = cx + halfW;

  const topY = cy - halfH;
  const bottomY = cy + halfH;

  // When low (unflipped, matching sketch):
  // (x0, cy) -> (x0, topY) -> (cx, topY) -> (cx, bottomY) -> (x1, bottomY) -> (x1, cy)
  // When high (flipped):
  // (x0, cy) -> (x0, bottomY) -> (cx, bottomY) -> (cx, topY) -> (x1, topY) -> (x1, cy)
  const y1 = isHigh ? bottomY : topY;
  const y2 = isHigh ? topY : bottomY;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x0, cy);
  ctx.lineTo(x0, y1);
  ctx.lineTo(cx, y1);
  ctx.lineTo(cx, y2);
  ctx.lineTo(x1, y2);
  ctx.lineTo(x1, cy);

  ctx.strokeStyle = waveColor;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "miter";
  ctx.stroke();
  ctx.restore();
}

export function drawGate(renderNode, p, status = null) {
  const theme = getActiveTheme();
  if (
    renderNode.gate.category === GATE_CATEGORIES.PRIMITIVE &&
    renderNode.gate.type === "seven-seg"
  ) {
    drawDisplay(renderNode, p);
    drawInputPort(renderNode, theme, p);
    drawOutputPort(renderNode, theme, p);
    drawLabel(renderNode, p);
    if (status) drawOverlay(renderNode.getBounds(), status, p);

    p.fill(0);
    p.stroke(0);
    p.strokeWeight(DEFAULT_STROKE_WEIGHT);
    return;
  }

  const gate = renderNode.gate;
  const stateVal = Array.isArray(gate.output) ? gate.output[0] : gate.output;
  const signalInfo = SIGNAL_MAP[stateVal];
  const stateKey = signalInfo?.key || "x";

  let color;
  let useGradient = false;
  if (
    gate.category === GATE_CATEGORIES.PRIMITIVE &&
    (
      gate.type === "input" ||
      gate.type === "clock"
    )
  ) {
    color = theme.gates.input[stateKey].hex;
  } else if (
    gate.category === GATE_CATEGORIES.PRIMITIVE &&
    gate.type === "output"
  ) {
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
    const r = GATE_CORNER_RADIUS;
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
      ctx.lineWidth = GATE_STROKE_WEIGHT;
      ctx.stroke();
    }
    ctx.restore();
  } else {
    if (theme.gates.logic.stroke) {
      p.stroke(theme.gates.logic.stroke);
      p.strokeWeight(GATE_STROKE_WEIGHT);
    } else {
      p.noStroke();
    }
    p.fill(color);
    p.rect(renderNode.x, renderNode.y, renderNode.width, renderNode.height, GATE_CORNER_RADIUS);
  }

  // Compute label color with good contrast against the gate fill
  const labelColor = contrastText(color);
  p.fill(labelColor);
  p.noStroke();
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(FONT_SIZE);
  const isIOnode = (
    gate.category === GATE_CATEGORIES.PRIMITIVE &&
    (
      gate.type === "input" ||
      gate.type === "output"
    )
  );
  const gateDisplayText = isIOnode ? signalInfo.label : gate.type;

  if (
    gate.category === GATE_CATEGORIES.COMPOSITE &&
    gate.embeddedDisplays &&
    gate.embeddedDisplays.length > 0 &&
    gate._displayArea
  ) {
    // --- Label at the top ---
    const { displayW, displayH, labelRowH, displayPad, displayCount, displayGap } = gate._displayArea;
    p.text(gateDisplayText, renderNode.x + renderNode.width / 2, renderNode.y + labelRowH / 1.5);

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
  } else if (
    gate.category === GATE_CATEGORIES.PRIMITIVE &&
    gate.type === "clock"
  ) {
    drawClockWave(renderNode, stateKey, theme, p);
  } else {
    p.text(gateDisplayText, renderNode.x + renderNode.width / 2, renderNode.y + renderNode.height / 2);
  }

  drawOutputPort(renderNode, theme, p);
  drawInputPort(renderNode, theme, p);
  drawLabel(renderNode, p);

  if (status) drawOverlay(renderNode.getBounds(), status, p);

  p.fill(0);
  p.stroke(0);
  p.strokeWeight(DEFAULT_STROKE_WEIGHT);
}

export function drawLabel(renderNode, p) {
  const labelText = renderNode.gate.label;
  if (!labelText) return;

  const theme = getActiveTheme();
  const x = renderNode.x + renderNode.width / 2;
  const y = renderNode.y + renderNode.height + LABEL_OFFSET_Y;

  // Measure text to size the background pill
  p.textSize(LABEL_FONT_SIZE);
  p.textAlign(p.CENTER, p.CENTER);
  const textW = p.textWidth(labelText);
  const bgW = textW + LABEL_PADDING_X * 2;
  const bgH = LABEL_FONT_SIZE + LABEL_PADDING_Y * 2;

  // Subtle semi-transparent background
  const bgColor = theme.text.primary.hex;
  const bgC = p.color(bgColor);
  bgC.setAlpha(LABEL_BG_ALPHA * 255);
  p.noStroke();
  p.fill(bgC);
  p.rect(x - bgW / 2, y - bgH / 2, bgW, bgH, LABEL_CORNER_RADIUS);

  const labelColor = theme.text.primary.hex;
  p.fill(labelColor);
  p.noStroke();
  p.textStyle(p.BOLD);
  p.text(labelText, x, y);

  // Restore defaults
  p.textStyle(p.NORMAL);
  p.textSize(FONT_SIZE);
}

export function drawBus(busNode, p, hovered = false) {
  const theme = getActiveTheme();
  p.strokeWeight(hovered ? HOVERED_BUS_THICKNESS : BUS_THICKNESS);

  const stateKey = SIGNAL_MAP[busNode.bus.output]?.key || "x";
  const color = theme.wires[stateKey].hex;
  p.stroke(color);

  drawPoint(busNode.startPoint.x, busNode.startPoint.y, color, p);
  drawPoint(busNode.endPoint.x, busNode.endPoint.y, color, p);

  drawPolylineSegments(busNode.startPoint, busNode.waypoints, busNode.endPoint, p);

  p.stroke(0);
  p.strokeWeight(DEFAULT_STROKE_WEIGHT);
}

export function drawGhostBus(busNode, p, status = null) {
  const theme = getActiveTheme();
  p.strokeWeight(BUS_THICKNESS);

  const stateKey = SIGNAL_MAP[busNode.bus.output]?.key || "x";
  const color = theme.wires[stateKey].hex;
  p.stroke(color);

  const mouseWorld = screenToWorld(p.mouseX, p.mouseY);
  const useSnap = p.keyIsDown(p.SHIFT);

  const x1 = busNode.waypoints && busNode.waypoints.length !== 0
    ? busNode.waypoints[busNode.waypoints.length - 1].x
    : busNode.startPoint.x;
  
  const y1 = busNode.waypoints && busNode.waypoints.length !== 0
    ? busNode.waypoints[busNode.waypoints.length - 1].y
    : busNode.startPoint.y;

  const endPointX = useSnap && busNode.startPointPlaced
    ? getOctilinearSnap(x1, y1, busNode.endPoint.x, busNode.endPoint.y).x
    : busNode.endPoint.x;
  
  const endPointY = useSnap && busNode.startPointPlaced
    ? getOctilinearSnap(x1, y1, busNode.endPoint.x, busNode.endPoint.y).y
    : busNode.endPoint.y;

  drawPoint(busNode.startPoint.x, busNode.startPoint.y, color, p);
  drawPoint(endPointX, endPointY, color, p);

  if (busNode.waypoints && busNode.waypoints.length !== 0) {
    const waypointCount = busNode.waypoints.length;
    p.line(busNode.startPoint.x, busNode.startPoint.y, busNode.waypoints[0].x, busNode.waypoints[0].y);
    for (let i = 0; i < waypointCount - 1; i++) {
      p.line(busNode.waypoints[i].x, busNode.waypoints[i].y, busNode.waypoints[i + 1].x, busNode.waypoints[i + 1].y);
    }
    const x1 = busNode.waypoints[waypointCount - 1].x;
    const y1 = busNode.waypoints[waypointCount - 1].y;

    const endX = useSnap
      ? getOctilinearSnap(x1, y1, mouseWorld.x, mouseWorld.y).x
      : mouseWorld.x;

    const endY = useSnap
      ? getOctilinearSnap(x1, y1, mouseWorld.x, mouseWorld.y).y
      : mouseWorld.y;

    p.line(x1, y1, endX, endY);
  } else {
    const x1 = busNode.startPoint.x;
    const y1 = busNode.startPoint.y;

    const endX = useSnap && busNode.startPointPlaced
      ? getOctilinearSnap(x1, y1, mouseWorld.x, mouseWorld.y).x
      : mouseWorld.x;

    const endY = useSnap && busNode.startPointPlaced
      ? getOctilinearSnap(x1, y1, mouseWorld.x, mouseWorld.y).y
      : mouseWorld.y;

    p.line(x1, y1, endX, endY);
  }

  if (status) {
    let bounds = busNode.startPointPlaced ? busNode.getEndPointBounds(BUS_BOUNDS_PADDING) : busNode.getStartPointBounds(BUS_BOUNDS_PADDING);
    drawOverlay(bounds, status, p);
  };
}

function drawPoint(x, y, color, p) {
  p.fill(color);
  p.circle(x, y, BUS_POINT_RADIUS);
}

function drawOverlay(bounds, status, p) {
  const bw = bounds.right - bounds.left;
  const bh = bounds.bottom - bounds.top;

  p.noStroke();
  if (status === "valid") p.fill(255, 255, 255, 50);
  else if (status === "invalid") p.fill(180, 45, 45, 55);
  else if (status === "selected") p.fill(255, 255, 255, 30);
  p.rect(bounds.left, bounds.top, bw, bh);
}

function drawDisplayBorder(x, y, w, h, p) {
  p.strokeWeight(DISPLAY_BORDER_STROKE_WEIGHT);
  p.stroke(62, 63, 73);
  p.rect(x, y, w, h, DISPLAY_CORNER_RADIUS);
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

  const signWidth = thickness * DISPLAY_SIGN_WIDTH_FACTOR;
  const signGap = padding * DISPLAY_SIGN_GAP_FACTOR;

  // 1. Define the core bounding box for the '8' figure
  const digitX = x + padding + signWidth + signGap;
  const digitY = y + padding;
  const digitW = width - padding * 2 - signWidth - signGap;
  const digitH = height - padding * 2;

  // 2. Setup interlocking geometry variables
  const T = thickness;
  const bevel = T * DISPLAY_BEVEL_FACTOR;
  const gap = T * DISPLAY_LED_GAP_FACTOR; // Creates the tiny separation between LEDs

  const midY = digitY + digitH / 2;
  const hSegW = digitW - T;            // Width of horizontal segments
  const vSegH = digitH / 2 - T / 2;    // Height of vertical segments

  p.strokeWeight(DISPLAY_BORDER_STROKE_WEIGHT);
  p.stroke(62, 63, 73);
  p.fill("#090808");
  p.rect(x, y, width, height, DISPLAY_CORNER_RADIUS);
  p.noStroke();

  let colors = gate.output.map(segment => {
    if (segment === 0 || segment === 3) return "#2a1a1a";
    const stateKey = SIGNAL_MAP[segment]?.key || "x";
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
  const scale = height / (SEVEN_SEG_GRID_HEIGHT * GRID_SIZE); // ratio vs standalone display
  const padding = GRID_SIZE * scale;
  const thickness = GRID_SIZE * scale;

  const signWidth = thickness * DISPLAY_SIGN_WIDTH_FACTOR;
  const signGap = padding * DISPLAY_SIGN_GAP_FACTOR;

  const digitX = x + padding + signWidth + signGap;
  const digitY = y + padding;
  const digitW = width - padding * 2 - signWidth - signGap;
  const digitH = height - padding * 2;

  const T = thickness;
  const bevel = T * DISPLAY_BEVEL_FACTOR;
  const gap = T * DISPLAY_LED_GAP_FACTOR;

  const midY = digitY + digitH / 2;
  const hSegW = digitW - T;
  const vSegH = digitH / 2 - T / 2;

  // Background
  p.fill("#090808");
  p.rect(x, y, width, height, DISPLAY_CORNER_RADIUS);

  let colors = displayGate.output.map(segment => {
    if (segment === 0 || segment === 3) return "#2a1a1a";
    const stateKey = SIGNAL_MAP[segment]?.key || "x";
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
  const tensionBase = len * PIN_TENSION_BASE_FACTOR;
  const tensionPort = len * PIN_TENSION_PORT_FACTOR;

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
  if (
    gate.category === GATE_CATEGORIES.PRIMITIVE &&
    gate.type === "output"
  ) return;
  const totalOutputs = gate.outputCount;
  const pinColor = theme.wires.ghost.hex;
  const gateEdgeX = renderNode.x + renderNode.width;

  for (let i = 0; i < totalOutputs; i++) {
    const port = renderNode.getOutputPortByIndex(i, totalOutputs);
    drawPin(p, gateEdgeX, port.y, port.x, port.y, pinColor);
    p.fill(theme.accent.hex);
    p.stroke(theme.text.primary.hex);
    p.strokeWeight(PORT_STROKE_WEIGHT);
    p.circle(port.x, port.y, PORT_RADIUS);
  }
}

function drawInputPort(renderNode, theme, p) {
  const gate = renderNode.gate;
  if (
    gate.category === GATE_CATEGORIES.PRIMITIVE &&
    (
      gate.type === "input" ||
      gate.type === "clock"
    )
  ) return;
  const totalInputs = gate.inputCount;
  const pinColor = theme.wires.ghost.hex;
  const gateEdgeX = renderNode.x;

  for (let i = 0; i < totalInputs; i++) {
    const port = renderNode.getInputPortByIndex(i, totalInputs);
    drawPin(p, gateEdgeX, port.y, port.x, port.y, pinColor);
    p.fill(theme.accent.hex);
    p.stroke(theme.text.primary.hex);
    p.strokeWeight(PORT_STROKE_WEIGHT);
    p.circle(port.x, port.y, PORT_RADIUS);
  }
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
  p.strokeWeight(WIRE_THICKNESS);

  const applySnap = p.keyIsDown(p.SHIFT);

  const from = waypoints?.length ? waypoints[waypoints.length - 1] : start;
  const target = applySnap ? getOctilinearSnap(from.x, from.y, end.x, end.y) : end;

  drawPolylineSegments(start, waypoints, target, p);

  p.stroke(0);
  p.strokeWeight(DEFAULT_STROKE_WEIGHT);
}

export function drawWire(connection, nodeMap, busMap, p, hovered = false) {
  const theme = getActiveTheme();
  const stateKey = SIGNAL_MAP[connection.wire.signal]?.key || "x";

  const { start, waypoints, end } = connection.getPoints(nodeMap, busMap);

  p.strokeWeight(hovered ? HOVERED_WIRE_THICKNESS : WIRE_THICKNESS);
  p.stroke(theme.wires[stateKey].hex);
  drawPolylineSegments(start, waypoints, end, p);
  p.stroke(0);
  p.strokeWeight(DEFAULT_STROKE_WEIGHT);
}

export function drawWaypoint(signal, waypoint, p, hovered = false) {
  const theme = getActiveTheme();
  const stateKey = SIGNAL_MAP[signal]?.key || "x";
  let color = theme.wires[stateKey].hex;
  p.fill(color);
  p.strokeWeight(WAYPOINT_STROKE_WEIGHT);
  p.stroke(theme.text.primary.hex);
  p.circle(waypoint.x, waypoint.y, hovered ? HOVERED_WAYPOINT_RADIUS : WAYPOINT_RADIUS);
  p.stroke(0);
  p.strokeWeight(DEFAULT_STROKE_WEIGHT);
}

export function drawDynamicGrid(p, theme, cameraX, cameraY, zoom) {
  // 1. Calculate the scaled visual spacing of the grid
  let currentGridSize = GRID_SIZE;
  let scaledSpacing = currentGridSize * zoom;

  // 2. LEVEL OF DETAIL
  // If the user zooms out and the dots get closer than min spacing on screen, we double the grid size
  while (scaledSpacing < GRID_MIN_SPACING) {
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

  // By drawing this BEFORE p.scale(), the dots stay exactly fixed stroke weight
  // regardless of how far in or out the user zooms
  p.strokeWeight(GRID_DOT_SIZE);

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
  p.textSize(TOOLTIP_FONT_SIZE);
  p.textAlign(p.CENTER, p.CENTER);
  const textW = p.textWidth(label);

  // Tooltip geometry
  const padX = TOOLTIP_PADDING_X;
  const padY = TOOLTIP_PADDING_Y;
  const tooltipW = textW + padX * 2;
  const tooltipH = TOOLTIP_HEIGHT;
  const cornerR = TOOLTIP_CORNER_RADIUS;
  const arrowSize = TOOLTIP_ARROW_SIZE;
  const gap = TOOLTIP_GAP; // distance above the port

  // Animate: slide horizontally from the port (closer) + fade in
  const slideOffset = (1 - opacity) * TOOLTIP_SLIDE_OFFSET;
  const portGap = PORT_RADIUS / 2 + arrowSize + TOOLTIP_PORT_CLEARANCE; // clearance from port circle edge
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
  p.strokeWeight(TOOLTIP_STROKE_WEIGHT);

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
    p.strokeWeight(TOOLTIP_STROKE_WEIGHT);
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
    p.strokeWeight(TOOLTIP_STROKE_WEIGHT);
    p.line(baseX, arrowY - arrowSize, baseX + arrowSize, arrowY);
    p.line(baseX, arrowY + arrowSize, baseX + arrowSize, arrowY);
  }

  // Label text
  const textColor = p.color(theme.text.primary.hex);
  textColor.setAlpha(easedAlpha * 255);
  p.noStroke();
  p.fill(textColor);
  p.textSize(TOOLTIP_FONT_SIZE);
  p.textStyle(p.BOLD);
  p.textAlign(p.CENTER, p.CENTER);
  p.text(label, tooltipX + tooltipW / 2, tooltipY + tooltipH / 2);

  p.pop();

  // Restore defaults for subsequent draws
  p.textStyle(p.NORMAL);
  p.textSize(FONT_SIZE);
  p.fill(0);
  p.stroke(0);
  p.strokeWeight(DEFAULT_STROKE_WEIGHT);
}

export function setFont(theme, p) {
  if (theme.font && theme.font.family) {
    // Strip quotes for p5 textFont
    const fontName = theme.font.family.split(",")[0].replace(/'/g, "").trim();
    p.textFont(fontName);
  }
}