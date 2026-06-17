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

export function drawGate(renderNode, p) {
  if (renderNode.gate.type === "seven-seg") {
    drawDisplay(renderNode, p);
    return;
  }
  const theme = getActiveTheme();
  const gate = renderNode.gate;
  const isOn = Array.isArray(gate.output) ? gate.output.some(Boolean) : gate.output;
  let color;
  if (gate.type === "input" || gate.type === "clock") {
    color = isOn ? theme.gates.input.high.hex : theme.gates.input.low.hex;
  } else if (gate.type === "output") {
    color = isOn ? theme.gates.output.high.hex : theme.gates.output.low.hex;
  } else {
    color = theme.gates.logic.hex;
  }
  p.fill(color);
  p.rect(renderNode.x, renderNode.y, renderNode.width, renderNode.height);

  // Compute label color with good contrast against the gate fill
  const labelColor = contrastText(color);
  p.fill(labelColor);
  p.noStroke();
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(FONT_SIZE);
  const label = gate.label || gate.type;
  p.text(label, renderNode.x + renderNode.width / 2, renderNode.y + renderNode.height / 2);

  p.fill(0);
  p.stroke(0);
  p.strokeWeight(1);
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
    return segment ? theme.gates.output.low.hex : "#2a1a1a";
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

export function drawOutputPorts(renderNodes, p) {
  const theme = getActiveTheme();
  for (let i = 0; i < renderNodes.length; i++) {
    const gate = renderNodes[i].gate;
    if (gate.type === "output") continue;
    const totalOutputs = gate.outputCount;

    for (let j = 0; j < totalOutputs; j++) {
      const port = renderNodes[i].getOutputPortByIndex(j, totalOutputs);
      p.fill(theme.accent.hex);
      p.stroke(theme.text.primary.hex);
      p.strokeWeight(1.5);
      p.circle(port.x, port.y, PORT_RADIUS);
    }
  }
  p.fill(0);
  p.stroke(0);
  p.strokeWeight(1);
}

export function drawInputPorts(renderNodes, p) {
  const theme = getActiveTheme();
  for (let i = 0; i < renderNodes.length; i++) {
    const gate = renderNodes[i].gate;
    if (gate.type === "input" || gate.type === "clock") continue;
    const totalInputs = gate.inputCount;

    for (let j = 0; j < totalInputs; j++) {
      const port = renderNodes[i].getInputPortByIndex(j, totalInputs);
      p.fill(theme.accent.hex);
      p.stroke(theme.text.primary.hex);
      p.strokeWeight(1.5);
      p.circle(port.x, port.y, PORT_RADIUS);
    }
  }
  p.fill(0);
  p.stroke(0);
  p.strokeWeight(1);
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