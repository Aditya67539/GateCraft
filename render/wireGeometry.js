import { GRID_SIZE } from "../constants.js";
import { isNearWaypoint } from "../input/mouseHandlers.js";
import { screenToWorld } from "../state.js";
import { getOctilinearSnap } from "./draw.js";

export function initWire(renderNodes, wire, custom_waypoints, nodeMap) {
  let waypoints;
  let isCustomRouted = false;
  if (custom_waypoints && custom_waypoints.length !== 0) {
    waypoints = custom_waypoints;
    isCustomRouted = true;
  } else {
    waypoints = computeWayPoints(renderNodes, wire, nodeMap);
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

export function computeWayPoints(renderNodes, wire, nodeMap) {
  let ports = getWirePorts(renderNodes, wire, nodeMap);
  let spacing = (wire.toInputIndex + 1) * GRID_SIZE;
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