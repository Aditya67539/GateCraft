export function init_wire(renderNodes, wire) {
  let waypoints = computeWayPoints(renderNodes, wire);
  return { wire: wire, waypoints: waypoints };
}

export function getWirePorts(renderNodes, wire) {
  const fromNode = renderNodes.find(n => n.gate.id === wire.from.id);
  const toNode = renderNodes.find(n => n.gate.id === wire.to.id);

  const start = fromNode.getOutputPort();
  const end = toNode.getInputPort(wire);

  return { start: start, end: end };
}

export function computeWayPoints(renderNodes, wire) {
  let ports = getWirePorts(renderNodes, wire);
  let spacing = (wire.to.inputs.length + 1) * 5;
  let waypoints = [];
  if (ports.start.x <= ports.end.x) {
    // 2 Waypoints
    waypoints.push({ x: ports.end.x - spacing, y: ports.start.y });
    waypoints.push({ x: ports.end.x - spacing, y: ports.end.y });
  } else {
    // 4 Waypoints
    let direction = 1;
    if (ports.start.y > ports.end.y) direction = -1;
    waypoints.push({ x: ports.start.x + spacing, y: ports.start.y });
    waypoints.push({ x: ports.start.x + spacing, y: ports.start.y + 3 * spacing * direction });
    waypoints.push({ x: ports.end.x - spacing, y: ports.end.y - 3 * spacing * direction });
    waypoints.push({ x: ports.end.x - spacing, y: ports.end.y });
  }
  return waypoints;
}

export function reComputeWayPoint(renderNodes, wire_info) {
  let newWayPoints = computeWayPoints(renderNodes, wire_info.wire);
  const waypointCount = newWayPoints.length;
  wire_info.waypoints[waypointCount - 1].y = newWayPoints[waypointCount - 1].y;
}