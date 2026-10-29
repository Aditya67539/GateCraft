import { GATE_CATEGORIES } from "../constants.js";
import { isNearWaypoint } from "../input/mouseHandlers.js";
import { screenToWorld } from "../state.js";
import { BusNode } from "./BusNode.js";

class Connection {
  constructor({ wire, waypoints, isWireBranch }) {
    this.wire = wire;
    this.waypoints = waypoints;
    this.isWireBranch = isWireBranch;
  }

  /** @returns {{ start: Point, waypoints: Array<Point>, end: Point }} */
  getPoints(nodeMap, busMap) {
    throw new Error("abstract");
  }
}

export class GateConnectionView extends Connection {
  constructor(data) {
    super(data);
    this.source = data.source;
  }

  getPoints(nodeMap, busMap) {
    const ports = getWirePorts(this.wire, nodeMap);
    let startPos = ports.start;

    if (this.isWireBranch && this.source) {
      const { start, waypoints, end } = this.source.conn.getPoints(nodeMap, busMap);
      const points = [ start, ...waypoints, end ];

      startPos = getTapPoint(points, this.source.tapRef);
    }
    return {
      start: startPos,
      waypoints: this.waypoints,
      end: ports.end,
    }
  }
}

export class BusConnectionView extends Connection {
  constructor(data, busId, gateId, portIndex, direction) {
    super(data);
    this.tapRef = data.tapRef;
    this.source = data.source;
    this.busId = busId;
    this.gateId = gateId;
    this.portIndex = portIndex;
    this.direction = direction;
  }

  getPoints(nodeMap, busMap) {
    const bus = busMap.get(this.busId);
    const node = nodeMap.get(this.gateId);
    const tapPoint = getTapPointFromElement(bus, this.tapRef, nodeMap, busMap);

    if (this.direction === "in") {
      // Gate output is the start, and tap on the bus is end
      let startPoint = node.getOutputPortByIndex(this.portIndex, node.gate.outputCount);
      if (this.isWireBranch && this.source) {
        const { start, waypoints, end } = this.source.conn.getPoints(nodeMap, busMap);
        const points = [ start, ...waypoints, end ];
        
        startPoint = getTapPoint(points, this.source.tapRef);
      }
      return { start: startPoint, waypoints: this.waypoints, end: tapPoint };
    } else if (this.direction === "out") {
      // Tap on the bus is start, and gate input is the end
      const endPoint = node.getInputPortPositionByIndex(this.portIndex, node.gate.inputCount);
      let startPoint = tapPoint;
      if (this.isWireBranch && this.source) {
        const { start, waypoints, end } = this.source.conn.getPoints(nodeMap, busMap);
        const points = [ start, ...waypoints, end ];

        startPoint = getTapPoint(points, this.source.tapRef);
      }
      return { start: startPoint, waypoints: this.waypoints, end: endPoint };
    }
  }
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

  if (wire.to.category === GATE_CATEGORIES.COMPOSITE) {
    const index = wire.toInputIndex;
    const inputCount = wire.to.inputCount;
    end = toNode.getInputPortPositionByIndex(index, inputCount);
  } else {
    end = toNode.getInputPortPosition(wire);
  }
  return { start: start, end: end };
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
        if (!isNearWaypoint(wx, wy, waypoints[waypoint_count - 1])) {
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


export function getPointRefFromElement(element, clickX, clickY, nodeMap, busMap) {
  const { start, waypoints, end } = element instanceof BusNode 
    ? element.getPoints()
    : element.getPoints(nodeMap, busMap);

  const points = [ start, ...waypoints, end ];
  return getPointRef(points, clickX, clickY);
}


function getPointRef(points, clickX, clickY) {
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


export function getTapPointFromElement(element, tapRef, nodeMap, busMap) {
  const { start, waypoints, end } = element instanceof BusNode
    ? element.getPoints()
    : element.getPoints(nodeMap, busMap);
  
  const points = [ start, ...waypoints, end ];
  return getTapPoint(points, tapRef);
}


function getTapPoint(points, tapRef) {
  const A = points[tapRef.segmentIndex];
  const B = points[tapRef.segmentIndex + 1];
  return {
    x: A.x + tapRef.t * (B.x - A.x),
    y: A.y + tapRef.t * (B.y - A.y),
  };
}


export function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}


export function getGhostWireStartPoint(originType, source, nodeMap, busMap) {
  let startPoint;
  if (originType === "gate") {
    const outputIndex = source.fromOutputIndex;
    const totalOutputs = source.fromNode.gate.outputCount;

    startPoint = outputIndex !== null
      ? source.fromNode.getOutputPortByIndex(outputIndex, totalOutputs)
      : source.fromNode.getOutputPort();
  } else if (originType === "bus") {
    startPoint = getTapPointFromElement(source.BusNode, source.tapRef, nodeMap, busMap);
  } else if (originType === "wire") {
    startPoint = getTapPointFromElement(source.conn, source.tapRef, nodeMap, busMap);
  }

  return startPoint;
}