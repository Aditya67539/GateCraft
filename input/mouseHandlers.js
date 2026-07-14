import { state, screenToWorld, worldToScreen } from "../state.js";
import { Input } from "../logic/gates.js";
import { CLOCK_TIMER, FREQUENCY, SIGNAL } from "../constants.js";
import { initWire, getWirePorts, setCustomWaypoints } from "../render/wireGeometry.js";
import { createBasicNode, createCompositeNode, rebuildNodeMap, snapPointToGrid, spawnBasicNode, wouldOverlap } from "../render/RenderPoint.js";
import { showToast } from "../ui/toast.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

function cleanupGhostWire() {
  if (state.ghostWireCleanup) {
    state.ghostWireCleanup();
    state.ghostWireCleanup = null;
  }
  state.ghostWire = null;
}

export const nodeMap = new Map();

export function registerMouseHandlers(p, circuit, renderNodes, wires) {
  p.mousePressed = function (event) {
    if (state.labelEditing) return;
    if (state.justPlacedFromToolbar) {
      state.justPlacedFromToolbar = false;
    }
    const world = screenToWorld(p.mouseX, p.mouseY);
    state.dragging = renderNodes.find(n => n.containsPoint(world.x, world.y));
    bringToFront(renderNodes, state.dragging);

    if (state.mode === "edit") {
      // Check input ports
      if (state.drawingWire) {
        let wireConnection = findNearInputPort(world.x, world.y, p, renderNodes);
        if (wireConnection) {
          const outputIndex = state.drawingWire.fromOutputIndex;
          const inputIndex = wireConnection.index;
          if (inputIndex < 0 || inputIndex >= wireConnection.toNode.internalInputs) {
            console.error("Invalid index!");
            return;
          }
          const fromGate = state.drawingWire.fromNode.gate;
          const toGate = wireConnection.toNode.gate;
          let result = circuit.connectGates(fromGate, toGate, inputIndex, outputIndex);
          if (!result.ok) {
            console.error(result.error);
            return;
          };
          let wire = result.wire;
          let wireInfo = initWire(renderNodes, wire, state.ghostWire, nodeMap);
          wires.push(wireInfo);
        }
        state.drawingWire = null;
        cleanupGhostWire();
      } else {
        state.drawingWire = findNearOutputPort(world.x, world.y, p, renderNodes);
        state.changingWayPoint = findNearWaypoint(world.x, world.y, p, wires);

        // ── Update persistent selection ──────────────────────────
        if (state.dragging) {
          state.selectedNode = state.dragging;
        } else if (!state.drawingWire && !state.changingWayPoint) {
          // Clicked empty space or a wire — deselect
          state.selectedNode = null;
        }

        if (!state.drawingWire && !state.changingWayPoint && state.dragging) {
          const { x, y } = snapPointToGrid(world.x, world.y);
          state.offsetX = x - state.dragging.x;
          state.offsetY = y - state.dragging.y;

          let connectedInputWires = wires.filter(n => n.wire.to.id === state.dragging.gate.id);
          let connectedOutputWires = wires.filter(n => n.wire.from.id === state.dragging.gate.id);

          if (connectedInputWires || connectedOutputWires) {
            state.connectedWires = [];
            for (let i = 0; i < connectedInputWires.length; i++) {
              const lastWaypoint = connectedInputWires[i].waypoints.length - 1;
              state.connectedWires.push({
                wire: connectedInputWires[i],
                offsetX: x - connectedInputWires[i].waypoints[lastWaypoint].x,
                offsetY: y - connectedInputWires[i].waypoints[lastWaypoint].y,
                type: "input",
              });
            }

            for (let i = 0; i < connectedOutputWires.length; i++) {
              state.connectedWires.push({
                wire: connectedOutputWires[i],
                offsetX: x - connectedOutputWires[i].waypoints[0].x,
                offsetY: y - connectedOutputWires[i].waypoints[0].y,
                type: "output",
              });
            }
          }
        } else if (state.drawingWire && !state.changingWayPoint && !state.dragging) {
          const { waypoints, cleanup } = setCustomWaypoints(p);
          state.ghostWire = waypoints;
          state.ghostWireCleanup = cleanup;
        } else if (!state.drawingWire && !state.changingWayPoint && !state.dragging) {
          state.isPanning = true;
        }
      }
    } else if (state.mode === "run") {
      if (state.dragging && state.dragging.gate.type === "input") {
        const signal = state.dragging.gate.output === LOW ? HIGH : LOW;
        state.dragging.gate.setValue(signal);
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
      if (wouldOverlap(state.ghostNode, renderNodes)) return;
      circuit.registerGate(state.ghostNode.gate);
      renderNodes.push(state.ghostNode);
      rebuildNodeMap(renderNodes, nodeMap);

      document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
      document.getElementById("btn-edit").classList.add("active");

      if (event.shiftKey) {
        const gateType = state.ghostNode.gate.type;
        const { x, y } = snapPointToGrid(world.x, world.y);
        if (gateType !== "composite") {
          state.ghostNode = createBasicNode(gateType, x, y);
        } else {
          const circuitData = state.ghostNode.gate.circuitData;
          const name = state.ghostNode.gate.label;
          state.ghostNode = createCompositeNode(name, circuitData, x, y);
        }
      } else {
        state.mode = "edit";
        state.ghostNode = null;
      }
    } else if (state.mode === "delete") {
      if (state.dragging) {
        const nodeId = renderNodes.indexOf(state.dragging);
        const gateId = state.dragging.gate.id;

        circuit.removeGate(gateId);
        renderNodes.splice(nodeId, 1);

        const toRemove = wires.filter(n => n.wire.from.id === state.dragging.gate.id || n.wire.to.id === state.dragging.gate.id);
        toRemove.forEach(w => wires.splice(wires.indexOf(w), 1));

        if (state.selectedNode === state.dragging) state.selectedNode = null;
        state.dragging = null;

        rebuildNodeMap(renderNodes, nodeMap);
      } else {
        const wireInfo = getWireAtPoint(world.x, world.y, renderNodes, wires, nodeMap);
        if (wireInfo) {
          circuit.removeWire(wireInfo.wire);
          wires.splice(wires.indexOf(wireInfo), 1);
        }
      }
    }
  }

  p.mouseDragged = function () {
    if (state.mode === "edit") {
      const worldDrag = screenToWorld(p.mouseX, p.mouseY);
      if (state.dragging) {
        if (!state.changingPos) {
          state.currentX = state.dragging.x;
          state.currentY = state.dragging.y;
          state.changingPos = true;
          if (state.connectedWires) {
            state.connectedWiresWaypoints = new Map();
            for (let i = 0; i < state.connectedWires.length; i++) {
              const wireId = state.connectedWires[i].wire.wire.id;
              const waypoints = state.connectedWires[i].wire.waypoints.map(wp => ({ ...wp }));
              state.connectedWiresWaypoints.set(wireId, waypoints);
            }
          }
        }
        const { x, y } = snapPointToGrid(worldDrag.x, worldDrag.y);
        state.dragging.x = x - state.offsetX;
        state.dragging.y = y - state.offsetY;

        if (state.connectedWires) {
          for (let i = 0; i < state.connectedWires.length; i++) {
            const lastWaypoint = state.connectedWires[i].wire.waypoints.length - 1;
            const firstWaypoint = 0;
            if (state.connectedWires[i].type === "input") {
              state.connectedWires[i].wire.waypoints[lastWaypoint].y = y - state.connectedWires[i].offsetY;
            } else if (state.connectedWires[i].type === "output") {
              state.connectedWires[i].wire.waypoints[firstWaypoint].y = y - state.connectedWires[i].offsetY;
            }
          }
        }
      } else if (state.changingWayPoint) {
        state.changingWayPoint.waypoint.x = worldDrag.x;
        state.changingWayPoint.waypoint.y = worldDrag.y;
        if (state.changingWayPoint.otherWaypoint) {
          state.changingWayPoint.otherWaypoint.x = state.changingWayPoint.waypoint.x;
        }
      } else if (state.isPanning) {
        state.cameraX += (p.mouseX - p.pmouseX);
        state.cameraY += (p.mouseY - p.pmouseY);
      }
    }
  }

  p.mouseReleased = function () {
    if (state.dragging && wouldOverlap(state.dragging, renderNodes, state.dragging.gate.id)) {
      state.dragging.x = state.currentX;
      state.dragging.y = state.currentY;
      if (state.connectedWires && state.connectedWiresWaypoints) {
        for (let i = 0; i < state.connectedWires.length; i++) {
          const waypoints = state.connectedWiresWaypoints.get(state.connectedWires[i].wire.wire.id);
          state.connectedWires[i].wire.waypoints = waypoints;
        }
      }
    }
    state.dragging = null;
    state.offsetX = 0;
    state.offsetY = 0;
    state.connectedWires = null;
    state.currentX = 0;
    state.currentY = 0;
    state.changingPos = false;
    state.connectedWiresWaypoints = null;
    state.isPanning = false;
  }

  p.mouseWheel = function(event) {
    // Dismiss label editor on zoom — blur triggers commit → cleanup
    if (state.labelEditing) {
      document.activeElement?.blur();
    }

    // 1. Where are we looking BEFORE the zoom?
    const { x, y } = screenToWorld(p.mouseX, p.mouseY);

    // 2. Calculate the new zoom level
    const zoomFactor = 1.1;
    if (event.delta > 0) {
      state.zoom /= zoomFactor; // Scroll down = Zoom out
    } else {
      state.zoom *= zoomFactor; // Scroll up = Zoom in
    }

    state.zoom = p.constrain(state.zoom, 0.2, 3);

    // 3. Counter-pan the camera to pin the world to the mouse
    state.cameraX = p.mouseX - (x * state.zoom);
    state.cameraY = p.mouseY - (y * state.zoom);

    // Return false to prevent the entire web page from scrolling
    return false; 
  }

  // Right-click on an input/output gate to edit its label
  const canvasHost = document.querySelector(".canvas-host");
  canvasHost.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    if (state.mode !== "edit" || state.labelEditing) return;
    // Convert page coords to p5 canvas coords
    const canvas = canvasHost.querySelector("canvas");
    const rect = canvas.getBoundingClientRect();
    const screenX = (e.clientX - rect.left) * (p.width / rect.width);
    const screenY = (e.clientY - rect.top) * (p.height / rect.height);
    const { x: mx, y: my } = screenToWorld(screenX, screenY);
    const target = renderNodes.find(n => n.containsPoint(mx, my));
    if (!target) return;
    const gateType = target.gate.type;
    if (gateType !== "input" && gateType !== "output") return;
    openLabelEditor(target, p);
  });
}


export function isNearPort(mouseX, mouseY, port, p) {
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
    if (renderNodes[i].gate.type === "input") continue;
    const totalInputs = renderNodes[i].gate.inputCount;

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

function bringToFront(renderNodes, node) {
  const idx = renderNodes.indexOf(node);
  if (idx === -1) return;
  renderNodes.splice(idx, 1);
  renderNodes.push(node);
}

/**
 * Spawn a floating HTML <input> over the gate for label editing.
 * Commits on Enter or blur; cancels on Escape.
 */
function openLabelEditor(renderNode, p) {
  if (state.zoom < 0.6) {
    showToast("Zoom in to edit label", { type: "warning" });
    return;
  }
  state.labelEditing = true;
  const canvasHost = document.querySelector(".canvas-host");
  const canvas = canvasHost.querySelector("canvas");
  // Map p5 canvas coords → CSS pixels on the canvas element
  const canvasRect = canvas.getBoundingClientRect();
  const scaleX = canvasRect.width / p.width;
  const scaleY = canvasRect.height / p.height;
  // Position the input centered over the gate (convert world → screen)
  const gateCenter = worldToScreen(
    renderNode.x + renderNode.width / 2,
    renderNode.y + renderNode.height / 2
  );
  const cssX = gateCenter.x * scaleX;
  const cssY = gateCenter.y * scaleY;
  const zoom = state.zoom;
  const inputWidth = Math.max(renderNode.width * scaleX * zoom, 80);
  const input = document.createElement("input");
  input.type = "text";
  input.className = "gate-label-input";
  input.maxLength = 16;
  input.placeholder = renderNode.gate.type;
  input.value = renderNode.gate.label || "";
  input.style.left = `${cssX}px`;
  input.style.top = `${cssY}px`;
  input.style.transform = "translate(-50%, -50%)";
  input.style.width = `${inputWidth}px`;
  input.style.fontSize = `${13 * zoom}px`;
  input.style.padding = `${4 * zoom}px ${8 * zoom}px`;
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
