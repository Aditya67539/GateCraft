import { FONT_SIZE } from "../constants.js";
import { getWirePorts } from "./wireGeometry.js";

export function drawGate(renderNode, p) {
  const gate = renderNode.gate;
  const isOn = Array.isArray(gate.output) ? gate.output.some(Boolean) : gate.output;
  let color = gate.type !== "input" && gate.type !== "clock" && gate.type !== "output" ? "blue" : isOn ? "green" : "red";
  p.fill(color);
  p.rect(renderNode.x, renderNode.y, renderNode.width, renderNode.height);

  p.fill(255);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(FONT_SIZE);
  const label = gate.label || gate.type;
  p.text(label, renderNode.x + renderNode.width / 2, renderNode.y + renderNode.height / 2);
}

export function drawWire(renderNodes, wire_info, p) {
  const ports = getWirePorts(renderNodes, wire_info.wire);
  p.strokeWeight(3);

  if (wire_info.wire.signal) p.stroke(0, 200, 0);
  else p.stroke(255, 0, 0);

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
  for (let i = 0; i < renderNodes.length; i++) {
    const gate = renderNodes[i].gate;
    if (gate.type === "output") continue;
    const totalOutputs = gate.type === "composite" ? gate.outputCount : 1;

    for (let j = 0; j < totalOutputs; j++) {
      const port = renderNodes[i].getOutputPortByIndex(j, totalOutputs);
      p.circle(port.x, port.y, 12);
    }
  }
}

export function drawInputPorts(renderNodes, p) {
  for (let i = 0; i < renderNodes.length; i++) {
    const gate = renderNodes[i].gate;
    if (gate.type === "input" || gate.type === "clock") continue;
    const totalInputs = gate.type === "composite" 
          ? gate.inputCount 
          : gate.type !== "output"
          ? gate.inputs.length + 1
          : 1;
    
    for (let j = 0; j < totalInputs; j++) {
      const port = renderNodes[i].getInputPortByIndex(j, totalInputs);
      p.circle(port.x, port.y, 12);
    }
  }
}