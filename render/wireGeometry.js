export function init_wire(renderNodes, wire) {
  let waypoints = computeWayPoints(renderNodes, wire);
  return { wire: wire, waypoints: waypoints };
}

export function getWirePorts(renderNodes, wire) {
  const fromNode = renderNodes.find(n => n.gate.id === wire.from.id);
  const toNode = renderNodes.find(n => n.gate.id === wire.to.id);

  let start, end;

  if (wire.fromOutputIndex !== null) {
    const index = wire.fromOutputIndex;
    const outputCount = wire.from.outputCount;
    start = fromNode.getOutputPortByIndex(index, outputCount);
  } else {
    start = fromNode.getOutputPort();
  }

  if (wire.to.type === "composite") {
    const index = wire.toInputIndex;
    const inputCount = wire.to.inputCount;
    end = toNode.getInputPortByIndex(index, inputCount);
  } else {
    end = toNode.getInputPort(wire);
  }
  return { start: start, end: end };
}

export function computeWayPoints(renderNodes, wire) {
  let ports = getWirePorts(renderNodes, wire);
  let spacing = wire.to.type === "composite" ? (wire.toInputIndex + 2) * 8 : (wire.to.inputs.length + 1) * 8;
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
  if (wire_info.wire.to.type === "composite") return;
  let newWayPoints = computeWayPoints(renderNodes, wire_info.wire);
  const waypointCount = newWayPoints.length;
  wire_info.waypoints[waypointCount - 1].y = newWayPoints[waypointCount - 1].y;
}

export function setCustomWaypoints(p) {
  let waypoints = [];
  function onKeyDown(e) {
    if (e.key === " ") {
      if (waypoints.length !== 0) {
        const waypoint_count = waypoints.length;
        if (!isNearWaypoint(p.mouseX, p.mouseY, waypoints[waypoint_count - 1], p)) {
          waypoints.push({ x: p.mouseX, y: p.mouseY });
        }
      } else {
        waypoints.push({ x: p.mouseX, y: p.mouseY });
      }
     }
  }

  function cleanup() {
    document.removeEventListener("keydown", onKeyDown);
  }

  document.addEventListener("keydown", onKeyDown);
  return { waypoints, cleanup };
}