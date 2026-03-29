import { getWirePorts } from "./wireGeometry.js";

export function drawGate(renderNode, p) {
  let color = renderNode.gate.output ? "green" : "red";
  p.fill(color);
  p.rect(renderNode.x, renderNode.y, renderNode.width, renderNode.height);

  p.fill(255);
  p.textAlign(p.CENTER, p.CENTER);
  p.textSize(20);
  p.text(`${renderNode.gate.type}`, renderNode.x + renderNode.width / 2, renderNode.y + renderNode.height / 2);
}

export function drawWire(renderNodes, wire_info, p) {
  const ports = getWirePorts(renderNodes, wire_info.wire);
  p.strokeWeight(3);

  if (wire_info.wire.from.output) p.stroke(0, 200, 0);
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
