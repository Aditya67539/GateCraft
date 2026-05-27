import { state } from "../state.js";
import { Input } from "../logic/gates.js";
import { CLOCK_TIMER, FREQUENCY } from "../constants.js";
import { reComputeWayPoint, initWire, getWirePorts, setCustomWaypoints } from "../render/wireGeometry.js";

function cleanupGhostWire() {
  if (state.ghostWireCleanup) {
    state.ghostWireCleanup();
    state.ghostWireCleanup = null;
  }
  state.ghostWire = null;
}

import { reBuildNodeMap, setNodeSize } from "../render/RenderPoint.js";

export const nodeMap = new Map();

export function registerMouseHandlers(p, circuit, renderNodes, wires) {
  p.mousePressed = function () {
    if (state.labelEditing) return;
    if (state.justPlacedFromToolbar) {
      state.justPlacedFromToolbar = false;
      return;
    }
    state.dragging = renderNodes.find(n => n.containsPoint(p.mouseX, p.mouseY));

    if (state.mode === "edit") {
      // Check input ports
      if (state.drawingWire) {
        let wireConnection = findNearInputPort(p.mouseX, p.mouseY, p, renderNodes);
        if (wireConnection) {
          const outputIndex = state.drawingWire.fromOutputIndex;
          const inputIndex = wireConnection.index;
          if (inputIndex < 0 || inputIndex >= wireConnection.toNode.internalInputs) {
            console.error("Invalid index!");
            return;
          }
          const fromGate = state.drawingWire.fromNode.gate;
          const toGate = wireConnection.toNode.gate;
          let wire = circuit.connectGates(fromGate, toGate, outputIndex, inputIndex);
          if (wire === null) return;
          setNodeSize(wireConnection.toNode);
          let wireInfo = initWire(renderNodes, wire, state.ghostWire, nodeMap);
          wires.push(wireInfo);
          adjustWaypoints(renderNodes, wires, state.drawingWire.fromNode.gate.id);
          state.drawingWire = null;
          cleanupGhostWire();
        } else {
          state.drawingWire = null;
          cleanupGhostWire();
        }
      } else {
        state.drawingWire = findNearOutputPort(p.mouseX, p.mouseY, p, renderNodes);
        state.changingWayPoint = findNearWaypoint(p.mouseX, p.mouseY, p, wires);

        if (!state.drawingWire && !state.changingWayPoint && state.dragging) {
          state.offsetX = p.mouseX - state.dragging.x;
          state.offsetY = p.mouseY - state.dragging.y;

          let connectedInputWires = wires.filter(n => n.wire.to.id === state.dragging.gate.id);
          let connectedOutputWires = wires.filter(n => n.wire.from.id === state.dragging.gate.id);

          if (connectedInputWires || connectedOutputWires) {
            state.connectedWires = [];
            for (let i = 0; i < connectedInputWires.length; i++) {
              const lastWaypoint = connectedInputWires[i].waypoints.length - 1;
              state.connectedWires.push({
                wire: connectedInputWires[i],
                offsetX: p.mouseX - connectedInputWires[i].waypoints[lastWaypoint].x,
                offsetY: p.mouseY - connectedInputWires[i].waypoints[lastWaypoint].y,
                type: "input",
              });
            }

            for (let i = 0; i < connectedOutputWires.length; i++) {
              state.connectedWires.push({
                wire: connectedOutputWires[i],
                offsetX: p.mouseX - connectedOutputWires[i].waypoints[0].x,
                offsetY: p.mouseY - connectedOutputWires[i].waypoints[0].y,
                type: "output",
              });
            }
          }
        } else if (state.drawingWire && !state.changingWayPoint && !state.dragging) {
          const { waypoints, cleanup } = setCustomWaypoints(p);
          state.ghostWire = waypoints;
          state.ghostWireCleanup = cleanup;
        }
      }
    } else if (state.mode === "run") {
      if (state.dragging && state.dragging.gate.type === "input") {
        state.dragging.gate.setValue(!state.dragging.gate.output);
        circuit.evaluate();
      } else if (state.dragging && state.dragging.gate.type === "clock") {
        if (state.dragging.intervalId != null) {
          clearInterval(state.dragging.intervalId);
          state.dragging.intervalId = null;
          return;
        }
        const clockNode = state.dragging;
        const timeInterval = 1000 / (2 * FREQUENCY);
        state.dragging.intervalId = setInterval(() => {
          clockNode.gate.tick();
          circuit.evaluate();
        }, timeInterval);

        setTimeout(() => {
          clearInterval(state.dragging.intervalId);
          state.dragging.intervalId = null;
        }, CLOCK_TIMER);
      }
    } else if (state.mode === "placing") {
      state.mode = "edit";
      circuit.registerGate(state.ghostNode.gate);
      renderNodes.push(state.ghostNode);
      reBuildNodeMap(renderNodes, nodeMap);
      state.ghostNode = null;

      document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
      document.getElementById("btn-edit").classList.add("active");
    } else if (state.mode === "delete") {
      if (state.dragging) {
        const nodeId = renderNodes.indexOf(state.dragging);
        const gateId = state.dragging.gate.id;

        circuit.removeGate(gateId);
        renderNodes.splice(nodeId, 1);

        const toRemove = wires.filter(n => n.wire.from.id === state.dragging.gate.id || n.wire.to.id === state.dragging.gate.id);
        toRemove.forEach(w => wires.splice(wires.indexOf(w), 1));

        for (let i = 0; i < renderNodes.length; i++) setNodeSize(renderNodes[i]);
        adjustWaypoints(renderNodes, wires, state.dragging.gate.id);
        // Mutate arrays in-place so sketch.js references stay valid
        state.dragging = null;

        reBuildNodeMap(renderNodes, nodeMap);
      } else {
        const wireInfo = getWireAtPoint(p.mouseX, p.mouseY, renderNodes, wires, nodeMap);
        if (wireInfo) {
          circuit.removeWire(wireInfo.wire);
          const toGate = wireInfo.wire.to;

          // Resize the destination node to reflect the reduced input count
          const toRenderNode = renderNodes.find(n => n.gate.id === toGate.id);
          if (toRenderNode) setNodeSize(toRenderNode);

          // Re-compute waypoints for all remaining wires going into this gate
          for (const w of wires) {
            if (w.wire.to.id === toGate.id) {
              reComputeWayPoint(renderNodes, w, nodeMap);
            }
          }

          wires.splice(wires.indexOf(wireInfo), 1);
        }
      }
    }
  }

  p.mouseDragged = function () {
    if (state.mode === "edit") {
      if (state.dragging) {
        state.dragging.x = p.mouseX - state.offsetX;
        state.dragging.y = p.mouseY - state.offsetY;

        if (state.connectedWires) {
          for (let i = 0; i < state.connectedWires.length; i++) {
            const lastWaypoint = state.connectedWires[i].wire.waypoints.length - 1;
            const firstWaypoint = 0;
            if (state.connectedWires[i].type === "input") {
              state.connectedWires[i].wire.waypoints[lastWaypoint].y = p.mouseY - state.connectedWires[i].offsetY;
            } else if (state.connectedWires[i].type === "output") {
              state.connectedWires[i].wire.waypoints[firstWaypoint].y = p.mouseY - state.connectedWires[i].offsetY;
            }
          }
        }
      }
      if (state.changingWayPoint) {
        state.changingWayPoint.waypoint.x = p.mouseX;
        state.changingWayPoint.waypoint.y = p.mouseY;
        if (state.changingWayPoint.otherWaypoint) {
          state.changingWayPoint.otherWaypoint.x = state.changingWayPoint.waypoint.x;
        }
      }
    }
  }

  p.mouseReleased = function () {
    state.dragging = null;
    state.offsetX = 0;
    state.offsetY = 0;
    state.connectedWires = null;
  }

  // Right-click on an input/output gate to edit its label
  const canvasHost = document.querySelector(".canvas-host");
  canvasHost.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    if (state.mode !== "edit" || state.labelEditing) return;
    // Convert page coords to p5 canvas coords
    const canvas = canvasHost.querySelector("canvas");
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (p.width / rect.width);
    const my = (e.clientY - rect.top) * (p.height / rect.height);
    const target = renderNodes.find(n => n.containsPoint(mx, my));
    if (!target) return;
    const gateType = target.gate.type;
    if (gateType !== "input" && gateType !== "output") return;
    openLabelEditor(target, p);
  });
}


function isNearPort(mouseX, mouseY, port, p) {
  const d = p.dist(mouseX, mouseY, port.x, port.y);
  return d < 15;
}

export function isNearWaypoint(mx, my, waypoint, p) {
  const d = p.dist(mx, my, waypoint.x, waypoint.y);
  return d < 10;
}

function findNearOutputPort(mx, my, p, renderNodes) {
  for (let i = 0; i < renderNodes.length; i++) {
    const gate = renderNodes[i].gate;
    if (gate.type === "output") continue;
    if (gate.type === "composite") {
      for (let j = 0; j < gate.outputCount; j++) {
        const port = renderNodes[i].getOutputPortByIndex(j, gate.outputCount);
        if (isNearPort(mx, my, port, p)) {
          return { fromNode: renderNodes[i], fromOutputIndex: j };
        }
      }
    }
    const port = renderNodes[i].getOutputPort();
    if (isNearPort(mx, my, port, p)) {
      return { fromNode: renderNodes[i], fromOutputIndex: null };
    }
  }
  return null;
}

function findNearInputPort(mx, my, p, renderNodes) {
  for (let i = 0; i < renderNodes.length; i++) {
    if (renderNodes[i].gate instanceof Input) continue;
    const totalInputs = renderNodes[i].gate.type === "composite" ?
      renderNodes[i].gate.inputCount :
      renderNodes[i].gate.inputs.length + 1;

    for (let j = 0; j < totalInputs; j++) {
      const port = renderNodes[i].getInputPortByIndex(j, totalInputs);
      if (isNearPort(mx, my, port, p)) {
        return { toNode: renderNodes[i], index: j };
      }
    }
  }
  return null;
}


function distancePointToSegment(A, B, O) {
  const AB = { x: B.x - A.x, y: B.y - A.y };
  const AO = { x: O.x - A.x, y: O.y - A.y };

  let projection = (AO.x * AB.x + AO.y * AB.y) / (Math.pow(AB.x, 2) + Math.pow(AB.y, 2));
  projection = Math.max(0, Math.min(1, projection));

  const closestPoint = { x: A.x + projection * AB.x, y: A.y + projection * AB.y };

  const d = Math.pow(O.x - closestPoint.x, 2) + Math.pow(O.y - closestPoint.y, 2);
  return d;
}

function isOnWireSegment(A, B, O, threshold) {
  const d = distancePointToSegment(A, B, O);
  return d <= Math.pow(threshold, 2);
}

function getWireAtPoint(mx, my, renderNodes, wires, nodeMap) {
  for (const wireInfo of wires) {
    const port = getWirePorts(renderNodes, wireInfo.wire, nodeMap);
    const points = [];
    points.push(port.start);
    for (const waypoint of wireInfo.waypoints) {
      points.push(waypoint);
    }
    points.push(port.end);

    for (let i = 0; i < points.length - 1; i++) {
      if (isOnWireSegment(points[i], points[i + 1], { x: mx, y: my }, 15)) {
        return wireInfo;
      }
    }
  }
  return null;
}


function findNearWaypoint(mx, my, p, wires) {
  for (let i = 0; i < wires.length; i++) {
    const waypointCount = wires[i].waypoints.length;
    for (let j = 0; j < waypointCount; j++) {
      if (isNearWaypoint(mx, my, wires[i].waypoints[j], p)) {
        if (wires[i].isCustomRouted) return { waypoint: wires[i].waypoints[j] };
        let otherWaypoint = null;
        if (waypointCount === 2) {
          otherWaypoint = wires[i].waypoints[j === 0 ? 1 : 0];
        } else if (waypointCount === 4) {
          let otherIndex = 0;
          if (j === 0) otherIndex = 1;
          else if (j === 1) otherIndex = 0;
          else if (j === 2) otherIndex = 3;
          else if (j === 3) otherIndex = 2;
          otherWaypoint = wires[i].waypoints[otherIndex];
        }
        return { waypoint: wires[i].waypoints[j], otherWaypoint: otherWaypoint };
      }
    }
  }
  return null;
}

function adjustWaypoints(renderNodes, wires, fromGateId) {
  for (let i = 0; i < wires.length; i++) {
    if (wires[i].wire.from.id === fromGateId) {
      const toGate = wires[i].wire.to.id;
      // Only re-compute waypoints for gates which are connected to toGate
      for (let j = 0; j < wires.length; j++) {
        if (wires[j].wire.to.id === toGate) {
          reComputeWayPoint(renderNodes, wires[j], nodeMap);
        }
      }
      break;
    }
  }
}

/**
 * Spawn a floating HTML <input> over the gate for label editing.
 * Commits on Enter or blur; cancels on Escape.
 */
function openLabelEditor(renderNode, p) {
  state.labelEditing = true;
  const canvasHost = document.querySelector(".canvas-host");
  const canvas = canvasHost.querySelector("canvas");
  // Map p5 canvas coords → CSS pixels on the canvas element
  const canvasRect = canvas.getBoundingClientRect();
  const scaleX = canvasRect.width / p.width;
  const scaleY = canvasRect.height / p.height;
  // Position the input centered over the gate
  const gateCenterX = renderNode.x + renderNode.width / 2;
  const gateCenterY = renderNode.y + renderNode.height / 2;
  const cssX = gateCenterX * scaleX;
  const cssY = gateCenterY * scaleY;
  const inputWidth = Math.max(renderNode.width * scaleX, 80);
  const input = document.createElement("input");
  input.type = "text";
  input.className = "gate-label-input";
  input.maxLength = 16;
  input.placeholder = renderNode.gate.type;
  input.value = renderNode.gate.label || "";
  input.style.left = `${cssX - inputWidth / 2}px`;
  input.style.top = `${cssY - 16}px`;
  input.style.width = `${inputWidth}px`;
  canvasHost.appendChild(input);
  // Select all text for easy replacement
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
  function commit() {
    const value = input.value.trim();
    if (value) {
      renderNode.gate.label = value;
    } else {
      // Clear custom label — drawGate falls back to gate.type
      delete renderNode.gate.label;
    }
    cleanup();
  }
  function cleanup() {
    if (!input.parentNode) return; // already removed
    input.removeEventListener("keydown", onKeyDown);
    input.removeEventListener("blur", onBlur);
    input.remove();
    state.labelEditing = false;
  }
  function onKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cleanup();
    }
  }
  function onBlur() {
    commit();
  }
  input.addEventListener("keydown", onKeyDown);
  input.addEventListener("blur", onBlur);
}
