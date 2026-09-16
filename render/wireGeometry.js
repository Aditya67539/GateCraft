import { isNearWaypoint } from "../input/mouseHandlers.js";
import { screenToWorld } from "../state.js";
import { getOctilinearSnap } from "./draw.js";

class Connection {
  constructor({ wire, waypoints, isCustomRouted }) {
    this.wire = wire;
    this.waypoints = waypoints;
    this.isCustomRouted = isCustomRouted;
  }

  /** @returns {{ start: Point, waypoints: Array<Point>, end: Point }} */
  getPoints(nodeMap, busMap) {
    throw new Error("abstract");
  }
}

export class WireConnection extends Connection {
  constructor(data) {
    super(data);
  }

  getPoints(nodeMap, busMap) {
    const ports = getWirePorts(this.wire, nodeMap);
    return {
      start: ports.start,
      waypoints: this.waypoints,
      end: ports.end,
    }
  }
}

export class BusConnection extends Connection {
  constructor(data, busId, gateId, portIndex, direction) {
    super(data);
    this.tapRef = data.tapRef;
    this.busId = busId;
    this.gateId = gateId;
    this.portIndex = portIndex;
    this.direction = direction;
  }

  getPoints(nodeMap, busMap) {
    const bus = busMap.get(this.busId);
    const node = nodeMap.get(this.gateId);
    const tapPoint = bus.getTapPoint(this.tapRef);

    if (this.direction === "in") {
      // Gate output is the start, and tap on the bus is end
      const startPoint = node.getOutputPortByIndex(this.portIndex, node.gate.outputCount);
      return { start: startPoint, waypoints: this.waypoints, end: tapPoint };
    } else if (this.direction === "out") {
      // Tap on the bus is start, and gate input is the end
      const endPoint = node.getInputPortByIndex(this.portIndex, node.gate.inputCount);
      return { start: tapPoint, waypoints: this.waypoints, end: endPoint };
    }
  }
}

export function initWire(wire, customWaypoints) {
  let waypoints = [];
  let isCustomRouted = false;
  if (customWaypoints && customWaypoints.length !== 0) {
    waypoints = customWaypoints;
    isCustomRouted = true;
  }
  return { wire: wire, waypoints: waypoints, isCustomRouted: isCustomRouted };
}

export function getWirePorts(wire, nodeMap) {
  const fromNode = nodeMap.get(wire.from.id);
  const toNode = nodeMap.get(wire.to.id);
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

export function computeWaypoints(startPort, endPort, spacing) {
  let waypoints = [];
  if (startPort.x <= endPort.x) {
    // 2 Waypoints
    waypoints.push({ x: endPort.x - spacing, y: startPort.y });
    waypoints.push({ x: endPort.x - spacing, y: endPort.y });
  } else {
    // 4 Waypoints
    const corridorY = (startPort.y + endPort.y) / 2;

    waypoints.push({ x: startPort.x + spacing, y: startPort.y });
    waypoints.push({ x: startPort.x + spacing, y: corridorY });
    waypoints.push({ x: endPort.x - spacing,   y: corridorY });
    waypoints.push({ x: endPort.x - spacing,   y: endPort.y });
  }
  return waypoints;
}

// Uses document.addEventListener instead of p5's keyPressed because p5 only
// supports a single keyPressed callback per instance (already used by
// keyboardHandlers.js for tool shortcuts). addEventListener is stackable
// and can be cleanly removed on cleanup when wire drawing ends.
export function setCustomWaypoints(p, startPort) {
  let waypoints = [];
  function onKeyDown(e) {
    if (e.key === " ") {
      const { x: rawX, y: rawY } = screenToWorld(p.mouseX, p.mouseY);
      let wx = rawX;
      let wy = rawY;

      // Snap to octilinear angle when Shift is held.
      // Reference point: last waypoint, or the wire's start port for the first one.
      if (p.keyIsDown(p.SHIFT)) {
        const prev = waypoints.length > 0
          ? waypoints[waypoints.length - 1]
          : startPort;
        const snapped = getOctilinearSnap(prev.x, prev.y, rawX, rawY);
        wx = snapped.x;
        wy = snapped.y;
      }

      if (waypoints.length !== 0) {
        const waypoint_count = waypoints.length;
        if (!isNearWaypoint(wx, wy, waypoints[waypoint_count - 1], p)) {
          waypoints.push({ x: wx, y: wy });
        }
      } else {
        waypoints.push({ x: wx, y: wy });
      }
     }
  }

  function cleanup() {
    document.removeEventListener("keydown", onKeyDown);
  }

  document.addEventListener("keydown", onKeyDown);
  return { waypoints, cleanup };
}


export function projectPointOntoSegment(A, B, O) {
  const abx = B.x - A.x;
  const aby = B.y - A.y;
  const aox = O.x - A.x;
  const aoy = O.y - A.y;

  const abLenSq = abx * abx + aby * aby;

  if (abLenSq === 0) {
    const distSq = aox * aox + aoy * aoy;
    return { t: 0, point: { x: A.x, y: A.y }, distSq };
  }

  let t = (aox * abx + aoy * aby) / abLenSq;
  t = Math.max(0, Math.min(1, t));

  const point = { x: A.x + t * abx, y: A.y + t * aby };

  const dx = O.x - point.x;
  const dy = O.y - point.y;
  const distSq = dx * dx + dy * dy;

  return { t, point, distSq };
}


export function getPointRef(busNode, clickX, clickY) {
  const startPoint = busNode.startPoint;
  const endPoint = busNode.endPoint;

  const points = [startPoint];
  if (busNode.waypoints) {
    for (const waypoint of busNode.waypoints) {
      points.push(waypoint);
    }
  }
  points.push(endPoint);

  let best = { segmentIndex: null, t: null };
  let bestDist = Infinity;

  for (let i = 0; i < points.length - 1; i++) {
    const A = points[i];
    const B = points[i + 1];

    const result = projectPointOntoSegment(A, B, { x: clickX, y: clickY });
    if (result.distSq < bestDist) {
      best = { segmentIndex: i, t: result.t };
      bestDist = result.distSq;
    }
  }
  return best;
}