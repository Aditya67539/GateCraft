import { GRID_SIZE } from "../constants.js";
import { isNearWaypoint } from "../input/mouseHandlers.js";
import { screenToWorld } from "../state.js";
import { getOctilinearSnap } from "./draw.js";

export function initWire(renderNodes, wire, customWaypoints, nodeMap) {
  let waypoints;
  let isCustomRouted = false;
  if (customWaypoints && customWaypoints.length !== 0) {
    waypoints = customWaypoints;
    isCustomRouted = true;
  } else {
    const ports = getWirePorts(renderNodes, wire, nodeMap);
    const spacing = (wire.toInputIndex + 1) * GRID_SIZE;
    const startPort = { x: ports.start.x, y: ports.start.y };
    const endPort = { x: ports.end.x, y: ports.end.y };
    waypoints = computeWaypoints(startPort, endPort, spacing);
  }
  return { wire: wire, waypoints: waypoints, isCustomRouted: isCustomRouted };
}

export function getWirePorts(renderNodes, wire, nodeMap) {
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