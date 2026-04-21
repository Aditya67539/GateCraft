import { FONT_SIZE, PORT_LABEL_SIZE } from "../constants.js";
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
  if (theme.font && theme.font.family) {
    // Strip quotes for p5 textFont
    const fontName = theme.font.family.split(",")[0].replace(/'/g, "").trim();
    p.textFont(fontName);
  }
  const label = gate.label || gate.type;
  p.text(label, renderNode.x + renderNode.width / 2, renderNode.y + renderNode.height / 2);

  p.fill(0);
  p.stroke(0);
  p.strokeWeight(1);
}

export function drawWire(renderNodes, wire_info, p) {
  const theme = getActiveTheme();
  const ports = getWirePorts(renderNodes, wire_info.wire);
  p.strokeWeight(3);

  let color = wire_info.wire.signal ? theme.wires.high.hex : theme.wires.low.hex;
  p.stroke(color);

  const waypointCount = wire_info.waypoints.length;
  p.line(ports.start.x, ports.start.y, wire_info.waypoints[0].x, wire_info.waypoints[0].y);
  for (let i = 0; i < waypointCount - 1; i++) {
    p.line(wire_info.waypoints[i].x, wire_info.waypoints[i].y, wire_info.waypoints[i + 1].x, wire_info.waypoints[i + 1].y);
  }
  p.line(wire_info.waypoints[waypointCount - 1].x, wire_info.waypoints[waypointCount - 1].y, ports.end.x, ports.end.y);

  p.stroke(0);
  p.strokeWeight(1);
}

export function drawOutputPorts(renderNodes, p) {
  const theme = getActiveTheme();
  for (let i = 0; i < renderNodes.length; i++) {
    const gate = renderNodes[i].gate;
    if (gate.type === "output") continue;
    const totalOutputs = gate.type === "composite" ? gate.outputCount : 1;

    for (let j = 0; j < totalOutputs; j++) {
      const port = renderNodes[i].getOutputPortByIndex(j, totalOutputs);
      p.fill(theme.accent.hex);
      p.stroke(theme.text.primary.hex);
      p.strokeWeight(1.5);
      p.circle(port.x, port.y, 12);

      // Draw port label for composite gates
      if (gate.type === "composite" && gate.internalOutputs && gate.internalOutputs[j]) {
        const portLabel = gate.internalOutputs[j].label || gate.internalOutputs[j].type;
        p.noStroke();
        p.fill(theme.text.muted ? theme.text.muted.hex : "#94a3b8");
        p.textSize(PORT_LABEL_SIZE);
        p.textAlign(p.RIGHT, p.CENTER);
        p.text(portLabel, port.x - 10, port.y);
      }
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
    const totalInputs = gate.type === "composite"
      ? gate.inputCount
      : gate.type !== "output" && gate.type !== "not"
        ? gate.inputs.length + 1
        : 1;

    for (let j = 0; j < totalInputs; j++) {
      const port = renderNodes[i].getInputPortByIndex(j, totalInputs);
      p.fill(theme.accent.hex);
      p.stroke(theme.text.primary.hex);
      p.strokeWeight(1.5);
      p.circle(port.x, port.y, 12);

      // Draw port label for composite gates
      if (gate.type === "composite" && gate.internalInputs && gate.internalInputs[j]) {
        const portLabel = gate.internalInputs[j].label || gate.internalInputs[j].type;
        p.noStroke();
        p.fill(theme.text.muted ? theme.text.muted.hex : "#94a3b8");
        p.textSize(PORT_LABEL_SIZE);
        p.textAlign(p.LEFT, p.CENTER);
        p.text(portLabel, port.x + 10, port.y);
      }
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