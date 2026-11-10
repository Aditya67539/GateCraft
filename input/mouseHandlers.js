import { state, screenToWorld, worldToScreen } from "../state.js";
import { CLOCK_TIMER, FREQUENCY, GATE_CATEGORIES, GRID_SIZE, PORT_DETECTION_THRESHOLD, SIGNAL } from "../constants.js";
import { setCustomWaypoints, getPointRefFromElement, projectPointOntoSegment, dist, getTapPointFromElement, getGhostWireStartPoint, getGhostWireEndPoint } from "../render/wireGeometry.js";
import { createPrimitiveNode, createCompositeNode, snapPointToGrid, wouldOverlap, wouldBusOverlap } from "../render/RenderNode.js";
import { showToast } from "../ui/toast.js";
import { MoveNodeCommand, PlaceGateCommand, RemoveGateCommand, RemoveWireCommand, ChangeWaypointCommand, PlaceBusCommand, RemoveBusCommand, AddWaypointCommand, CompositeCommand, buildConnectionCommand } from "../history/commands.js";
import { performCommand } from "../history/history.js";
import { loadCompositeGate, buildCircuitFromData } from "../persistence.js";
import { canWireConnectToTarget } from "../logic/wire.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

function cleanupGhostWire() {
  if (state.ghost.wireCleanup) {
    state.ghost.wireCleanup();
    state.ghost.wireCleanup = null;
  }
  state.ghost.wire = null;
}

function cleanupGhostBus() {
  if (state.ghostBusCleanup) {
    state.ghostBusCleanup();
    state.ghostBusCleanup = null;
  }
  state.ghostBus = null;
}

function cleanupWireEditor() {
  state.wireEditing = false;
  state.editorTarget = null;
}

export const nodeMap = new Map();
export const busMap = new Map();

export function registerMouseHandlers(p, circuit, renderNodes, wires, busNodes, wireDependents) {
  const canvasHost = document.querySelector(".canvas-host");
  const canvas = canvasHost.querySelector("canvas");
  const wireCtxMenu = document.getElementById("wire-context-menu");
  const gateCtxMenu = document.getElementById("gate-context-menu");

  p.mousePressed = function (event) {
    if (state.labelEditing) return;
    if (state.isAnyModalOpen) return;

    const world = screenToWorld(p.mouseX, p.mouseY);
    state.interaction.target = renderNodes.find(n => n.containsPoint(world.x, world.y));
    bringToFront(renderNodes, state.interaction.target);

    if (p.mouseButton.left) {
      if (state.mode === "edit") {
        // Check input ports
        if (state.interaction.wireCreation) {
          const useSnap = p.keyIsDown(p.SHIFT);
          const startPoint = getGhostWireStartPoint(
            state.interaction.wireCreation.originType,
            state.interaction.wireCreation.origin,
            nodeMap,
            busMap,
          );
          const endPoint = getGhostWireEndPoint(
            world,
            startPoint,
            state.ghost.wire,
            useSnap,
          );
          const destinationInfo = findWireDestination(endPoint.x, endPoint.y, renderNodes, busNodes, nodeMap, busMap);
          if (destinationInfo) {
            const connectionCommand = buildConnectionCommand(
              state.interaction.wireCreation,
              destinationInfo,
              circuit,
              wires,
              wireDependents,
              state.ghost.wire,
            );
            if (connectionCommand) {
              performCommand(connectionCommand);
            }
          }
          state.interaction.wireCreation = null;
          cleanupGhostWire();
        } else {
          if (state.wireEditing) {
            if (state.waypointInsertionTarget) {
              const source = state.waypointInsertionTarget.source;
              const index = state.waypointInsertionTarget.segmentIndex;
              const newWaypoint = state.waypointInsertionTarget.point;

              const addWaypointCommand = new AddWaypointCommand(source, index, newWaypoint);
              addWaypointCommand.do();
              state.pendingAddWaypointCommand = addWaypointCommand;
            }
            state.waypointRef = findNearWaypoint(world.x, world.y, wires, busNodes);
            if (!state.waypointRef) {
              cleanupWireEditor();
              performCommand(state.pendingAddWaypointCommand, { alreadyPerformed: true });
            }
          } else {
            state.interaction.wireCreation = findWireOrigin(
              world.x,
              world.y,
              renderNodes,
              busNodes,
              wires,
              nodeMap,
              busMap,
            );
          }

          // ── Update persistent selection ──────────────────────────
          if (state.interaction.target) {
            state.selectedNode = state.interaction.target;
          } else if (!state.interaction.wireCreation && !state.waypointRef) {
            // Clicked empty space or a wire — deselect
            state.selectedNode = null;
          }

          if (!state.interaction.wireCreation && !state.waypointRef && state.interaction.target) {
            const { x, y } = snapPointToGrid(world.x, world.y);
            state.interaction.dragging.offset.x = x - state.interaction.target.x;
            state.interaction.dragging.offset.y = y - state.interaction.target.y;
          } else if (state.interaction.wireCreation && !state.waypointRef && !state.interaction.target) {
            const originType = state.interaction.wireCreation.originType;
            const origin = state.interaction.wireCreation.origin;

            if (originType === "gate") {
              const fromNode = origin.fromNode;
              const startPoint = fromNode.gate.category === GATE_CATEGORIES.COMPOSITE
                ? fromNode.getOutputPortPositionByIndex(origin.fromOutputIndex, fromNode.gate.outputCount)
                : fromNode.getOutputPortPosition();

              const { waypoints, cleanup } = setCustomWaypoints(p, startPoint);

              state.ghost.wire = waypoints;
              state.ghost.wireCleanup = cleanup;
            } else if (originType === "bus") {
              const fromBus = origin.busNode;
              const tapRef = getPointRefFromElement(fromBus, world.x, world.y, nodeMap, busMap);
              const startPoint = getTapPointFromElement(fromBus, tapRef, nodeMap, busMap);

              const { waypoints, cleanup } = setCustomWaypoints(p, startPoint);

              state.ghost.wire = waypoints;
              state.ghost.wireCleanup = cleanup;
            } else if (originType === "wire") {
              const conn = origin.conn;
              const startPoint = getTapPointFromElement(conn, origin.tapRef, nodeMap, busMap);

              const { waypoints, cleanup } = setCustomWaypoints(p, startPoint);

              state.ghost.wire = waypoints;
              state.ghost.wireCleanup = cleanup;
            }
          } else if (!state.interaction.wireCreation && !state.waypointRef && !state.interaction.target) {
            state.camera.isPanning = true;
          } else if (state.waypointRef) {
            state.waypointSnapshot = {};
            const fromWaypoint = state.waypointRef.source.waypoints[state.waypointRef.waypointIndex];
            state.waypointSnapshot.fromWaypoint = structuredClone(fromWaypoint);
          }
        }
      } else if (state.mode === "run") {
        if (
          state.interaction.target &&
          state.interaction.target.gate.category === GATE_CATEGORIES.PRIMITIVE &&
          state.interaction.target.gate.type === "input"
        ) {
          const signal = state.interaction.target.gate.output === LOW ? HIGH : LOW;
          state.interaction.target.gate.setValue(signal);
          circuit.evaluate();
        } else if (
          state.interaction.target &&
          state.interaction.target.gate.category === GATE_CATEGORIES.PRIMITIVE &&
          state.interaction.target.gate.type === "clock"
        ) {
          if (state.interaction.target.intervalId != null) {
            clearInterval(state.interaction.target.intervalId);
            state.interaction.target.intervalId = null;
            return;
          }
          const clockNode = state.interaction.target;
          const timeInterval = 1000 / (2 * FREQUENCY);
          state.interaction.target.intervalId = setInterval(() => {
            clockNode.gate.tick();
            circuit.evaluate();
          }, timeInterval);

          setTimeout(() => {
            clearInterval(state.interaction.target.intervalId);
            state.interaction.target.intervalId = null;
          }, CLOCK_TIMER);
        }
      } else if (state.mode === "placing") {
        if (state.ghost.node) {
          if (wouldOverlap(state.ghost.node, renderNodes, busNodes, null)) return;
          const placeGateCommand = new PlaceGateCommand(circuit, renderNodes, state.ghost.node, nodeMap);
          performCommand(placeGateCommand);

          if (event.shiftKey) {
            const gateCategory = state.ghost.node.gate.category;
            const gateType = state.ghost.node.gate.type;
            const { x, y } = snapPointToGrid(world.x, world.y);
            if (gateCategory === GATE_CATEGORIES.PRIMITIVE) {
              state.ghost.node = createPrimitiveNode(gateType, x, y);
            } else {
              const saved = loadCompositeGate(gateType);
              if (saved) {
                const freshCircuit = buildCircuitFromData(saved.circuitData, saved.renderData);
                state.ghost.node = createCompositeNode(gateType, freshCircuit, x, y);
              }
            }
          } else {
            state.mode = "edit";
            state.ghost.node = null;
            document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
            document.getElementById("btn-edit").classList.add("active");
          }
        } else if (state.ghostBus) {
          if (!state.ghostBus.startPointPlaced && !state.ghostBus.endPointPlaced) {
            if (wouldBusOverlap(state.ghostBus, renderNodes, busNodes)) return;
            state.ghostBus.startPointPlaced = true;
            const startPoint = state.ghostBus.startPoint;
            const { waypoints, cleanup } = setCustomWaypoints(p, startPoint);
            state.ghostBus.waypoints = waypoints;
            state.ghostBusCleanup = cleanup;
          } else if (state.ghostBus.startPointPlaced && !state.ghostBus.endPointPlaced) {
            if (wouldBusOverlap(state.ghostBus, renderNodes, busNodes)) return;
            const placeBusCommand = new PlaceBusCommand(circuit, busNodes, state.ghostBus, busMap);
            performCommand(placeBusCommand);

            state.mode = "edit";
            state.ghostBus = null;
            document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
            document.getElementById("btn-edit").classList.add("active");
            cleanupGhostBus();
          }
        }
      }
    }

    else if (p.mouseButton.right) {
      if (state.mode !== "edit" || state.labelEditing) return;
      
      const rect = canvas.getBoundingClientRect();
      const clientX = rect.left + (p.mouseX / p.width) * rect.width;
      const clientY = rect.top + (p.mouseY / p.height) * rect.height;

      // 1. Check for input/output gates
      const target = renderNodes.find(n => n.containsPoint(world.x, world.y));
      if (target) {
        showContextMenu(gateCtxMenu, clientX, clientY, { type: "gate", source: target });
        return;
      }

      // 2. Check for wires and buses
      const wireInfo = getWireAtPoint(world.x, world.y, wires, nodeMap, busMap);
      if (wireInfo) {
        showContextMenu(wireCtxMenu, clientX, clientY, { type: "wire", source: wireInfo.conn });
        return;
      }

      const busInfo = getBusAtPoint(world.x, world.y, busNodes);
      if (busInfo) {
        showContextMenu(wireCtxMenu, clientX, clientY, { type: "bus", source: busInfo });
        return;
      }
    }
  }

  p.mouseDragged = function () {
    if (state.mode === "edit") {
      const worldDrag = screenToWorld(p.mouseX, p.mouseY);
      if (state.interaction.target) {
        if (!state.interaction.dragging.active) {
          state.interaction.dragging.originalPos.x = state.interaction.target.x;
          state.interaction.dragging.originalPos.y = state.interaction.target.y;
          state.interaction.dragging.active = true;
        }
        const { x, y } = snapPointToGrid(worldDrag.x, worldDrag.y);
        state.interaction.target.x = x - state.interaction.dragging.offset.x;
        state.interaction.target.y = y - state.interaction.dragging.offset.y;
      } else if (state.waypointRef) {
        const originalWaypoint = state.waypointRef.source.waypoints[state.waypointRef.waypointIndex];
        originalWaypoint.x = worldDrag.x;
        originalWaypoint.y = worldDrag.y;
      } else if (state.camera.isPanning) {
        state.camera.x += (p.mouseX - p.pmouseX);
        state.camera.y += (p.mouseY - p.pmouseY);
      }
    }
  }

  p.mouseReleased = function () {
    if (state.interaction.target) {
      if (
        wouldOverlap(
          state.interaction.target,
          renderNodes,
          busNodes,
          state.interaction.target.gate.id
        )
      ) {
        state.interaction.target.x = state.interaction.dragging.originalPos.x;
        state.interaction.target.y = state.interaction.dragging.originalPos.y;
      } else if (state.interaction.dragging.active) {
        const moveNodeCommand = new MoveNodeCommand(
          state.interaction.target,
          state.interaction.dragging.originalPos.x,
          state.interaction.dragging.originalPos.y,
          state.interaction.target.x,
          state.interaction.target.y,
        );
        performCommand(moveNodeCommand);
      }
    } else if (state.waypointRef) {
      const toWaypoint = state.waypointRef.source.waypoints[state.waypointRef.waypointIndex];
      state.waypointSnapshot.toWaypoint = structuredClone(toWaypoint);
      const changeWaypointCommand = new ChangeWaypointCommand(
        state.waypointSnapshot,
        state.waypointRef,
      );
      if (state.pendingAddWaypointCommand) {
        const compositeCommand = new CompositeCommand(
          [state.pendingAddWaypointCommand, changeWaypointCommand]
        );
        changeWaypointCommand.do();
        performCommand(compositeCommand, { alreadyPerformed: true });
      } else {
        performCommand(changeWaypointCommand);
      }
    }
    state.interaction.target = null;
    state.interaction.dragging.offset.x = 0;
    state.interaction.dragging.offset.y = 0;
    state.interaction.dragging.originalPos.x = 0;
    state.interaction.dragging.originalPos.y = 0;
    state.interaction.dragging.active = false;
    state.camera.isPanning = false;
    state.waypointSnapshot = null;
    state.waypointRef = null;
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
      state.camera.zoom /= zoomFactor; // Scroll down = Zoom out
    } else {
      state.camera.zoom *= zoomFactor; // Scroll up = Zoom in
    }

    state.camera.zoom = p.constrain(state.camera.zoom, 0.3, 3);

    // 3. Counter-pan the camera to pin the world to the mouse
    state.camera.x = p.mouseX - (x * state.camera.zoom);
    state.camera.y = p.mouseY - (y * state.camera.zoom);

    // Return false to prevent the entire web page from scrolling
    return false; 
  }


  function showContextMenu(contextMenu, clientX, clientY, target) {
    if (target.type === "gate") {
      const labelBtnDiv = document.getElementById("label-btn-div");
      if (target.source.gate.label) {
        labelBtnDiv.innerHTML = "Edit Label";
      } else {
        labelBtnDiv.innerHTML = "Add Label";
      }
    }
    state.contextMenuTarget = target;
    contextMenu.classList.add("open");
    contextMenu.style.left = `${clientX}px`;
    contextMenu.style.top = `${clientY}px`;

    const rect = contextMenu.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) {
      contextMenu.style.top = `${Math.max(0, clientY - rect.height)}px`;
    }
    if (rect.right > window.innerWidth) {
      contextMenu.style.left = `${Math.max(0, clientX - rect.width)}px`;
    }
    state.isAnyModalOpen = true;
  }

  function hideContextMenu(contextMenu) {
    if (!contextMenu.classList.contains("open")) return;
    contextMenu.classList.remove("open");
    state.contextMenuTarget = null;
    state.isAnyModalOpen = false;
  }

  // Wire and Bus edit button
  document.getElementById("ctx-wire-edit").addEventListener("click", () => {
    state.editorTarget = structuredClone(state.contextMenuTarget);
    hideContextMenu(wireCtxMenu);
    if (!state.editorTarget) return;
    state.wireEditing = true;
  });

  // Delete button
  document.querySelectorAll(".ctx-delete-target").forEach(element => {
    element.addEventListener("click", () => {
      const target = state.contextMenuTarget;
      hideContextMenu(wireCtxMenu);
      hideContextMenu(gateCtxMenu);
      if (!target) return;

      if (target.type === "wire") {
        const removeWireCommand = new RemoveWireCommand(
          circuit,
          wires,
          target.source,
          wireDependents,
          nodeMap,
          busMap,
        );
        performCommand(removeWireCommand);
      } else if (target.type === "bus") {
        const removeBusCommand = new RemoveBusCommand(
          busNodes,
          wires,
          circuit,
          target.source,
          nodeMap,
          busMap,
          wireDependents,
        );
        performCommand(removeBusCommand);
      } else if (target.type === "gate") {
        const removeGateCommand = new RemoveGateCommand(
          renderNodes,
          wires,
          circuit,
          target.source,
          nodeMap,
          busMap,
          wireDependents,
        );
        performCommand(removeGateCommand);
      }
    });
  });

  // Label button for gates
  document.getElementById("ctx-gate-edit").addEventListener("click", () => {
    const target = state.contextMenuTarget;
    if (!target || target.type !== "gate") return;

    openLabelEditor(target.source, p);
  });

  // Close wire context meny on any click or Escape
  document.addEventListener("click", () => {
    hideContextMenu(wireCtxMenu);
    hideContextMenu(gateCtxMenu);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideContextMenu(wireCtxMenu);
      hideContextMenu(gateCtxMenu);
    };
  });
}

export function isNearPoint(mx, my, point, threshold) {
  const d = dist(mx, my, point.x, point.y);
  return d <= threshold;
}

function findNearOutput(mx, my, renderNodes) {
  for (let i = 0; i < renderNodes.length; i++) {
    const gate = renderNodes[i].gate;
    if (gate.category === GATE_CATEGORIES.PRIMITIVE && gate.type === "output") continue;
    if (gate.category === GATE_CATEGORIES.COMPOSITE) {
      for (let j = 0; j < gate.outputCount; j++) {
        const port = renderNodes[i].getOutputPortPositionByIndex(j, gate.outputCount);
        if (isNearPoint(mx, my, port, PORT_DETECTION_THRESHOLD)) {
          return { fromNode: renderNodes[i], fromOutputIndex: j };
        }
      }
    }
    const port = renderNodes[i].getOutputPortPosition();
    if (isNearPoint(mx, my, port, PORT_DETECTION_THRESHOLD)) {
      return { fromNode: renderNodes[i], fromOutputIndex: null };
    }
  }
  return null;
}

function findNearInput(mx, my, renderNodes) {
  for (let i = 0; i < renderNodes.length; i++) {
    const gate = renderNodes[i].gate;
    if (gate.category === GATE_CATEGORIES.PRIMITIVE && gate.type === "input") continue;
    const totalInputs = gate.inputCount;

    for (let j = 0; j < totalInputs; j++) {
      const port = renderNodes[i].getInputPortPositionByIndex(j, totalInputs);
      if (isNearPoint(mx, my, port, PORT_DETECTION_THRESHOLD)) {
        return { toNode: renderNodes[i], index: j };
      }
    }
  }
  return null;
}

function findNearBus(mx, my, busNodes, nodeMap, busMap) {
  for (let i = 0; i < busNodes.length; i++) {
    const { start, waypoints, end } = busNodes[i].getPoints();
    const points = [start, ...waypoints, end];

    for (let j = 0; j < points.length - 1; j++) {
      if (isOnLineSegment(points[j], points[j + 1], { x: mx, y: my }, 15)) {
        return {
          busNode: busNodes[i],
          tapRef: getPointRefFromElement(busNodes[i], mx, my, nodeMap, busMap),
        };
      }
    }
  }
  return null;
}

function findWireOrigin(mx, my, renderNodes, busNodes, wires, nodeMap, busMap) {
  const nodeConn = findNearOutput(mx, my, renderNodes);
  const busConn = findNearBus(mx, my, busNodes, nodeMap, busMap);
  const wireConn = getWireAtPoint(mx, my, wires, nodeMap, busMap);
  
  if (nodeConn) {
    return {
      originType: "gate",
      origin: nodeConn,
    }
  } else if (busConn) {
    return {
      originType: "bus",
      origin: busConn,
    }
  } else if (wireConn) {
    return {
      originType: "wire",
      origin: wireConn,
    }
  }
  return null;
}

function findWireDestination(mx, my, renderNodes, busNodes, nodeMap, busMap) {
  const nodeConn = findNearInput(mx, my, renderNodes);
  const busConn = findNearBus(mx, my, busNodes, nodeMap, busMap);

  if (nodeConn) {
    return {
      destinationType: "gate",
      destination: nodeConn,
    }
  } else if (busConn) {
    return {
      destinationType: "bus",
      destination: busConn,
    }
  }
  return null;
}

function isOnLineSegment(A, B, O, threshold) {
  const { distSq } = projectPointOntoSegment(A, B, O);
  return distSq <= Math.pow(threshold, 2);
}

export function getWireAtPoint(mx, my, wires, nodeMap, busMap) {
  for (const conn of wires) {
    const { start, waypoints, end } = conn.getPoints(nodeMap, busMap);
    const points = [ start, ...waypoints, end ];
    for (let i = 0; i < points.length - 1; i++) {
      if (isOnLineSegment(points[i], points[i + 1], { x: mx, y: my }, 15)) {
        return {
          conn: conn,
          tapRef: getPointRefFromElement(conn, mx, my, nodeMap, busMap), 
        };
      }
    }
  }
  return null;
}

export function getBusAtPoint(mx, my, busNodes) {
  for (const busNode of busNodes) {
    const { start, waypoints, end } = busNode.getPoints();
    const points = [ start, ...waypoints, end ];
    for (let i = 0; i < points.length - 1; i++) {
      if (isOnLineSegment(points[i], points[i + 1], { x: mx, y: my }, 15)) {
        return busNode;
      }
    }
  }
  return null;
}

function findNearWaypoint(mx, my, wires, busNodes) {
  for (let i = 0; i < wires.length; i++) {
    const waypointCount = wires[i].waypoints.length;
    for (let j = 0; j < waypointCount; j++) {
      if (isNearPoint(mx, my, wires[i].waypoints[j], PORT_DETECTION_THRESHOLD)) {
        return { source: wires[i], waypointIndex: j };
      }
    }
  }

  for (let i = 0; i < busNodes.length; i++) {
    const waypointCount = busNodes[i].waypoints.length;
    for (let j = 0; j < waypointCount; j++) {
      if (isNearPoint(mx, my, busNodes[i].waypoints[j], PORT_DETECTION_THRESHOLD)) {
        return { source: busNodes[i], waypointIndex: j };
      }
    }
  }
  return null;
}

export function getEffectiveMousePosition(
  mouse,
  wireOrigin,
  ghostWire,
  circuit,
  renderNodes,
  busNodes,
  nodeMap,
  busMap,
  p
) {
  let effectiveMousePosition = mouse;
  if (wireOrigin) {
    const useSnap = p.keyIsDown(p.SHIFT);
    const startPoint = getGhostWireStartPoint(
      wireOrigin.originType,
      wireOrigin.origin,
      nodeMap,
      busMap,
    );

    effectiveMousePosition = getGhostWireEndPoint(
      mouse,
      startPoint,
      ghostWire,
      useSnap,
    );

    const hoveredDestination = findWireDestination(
      effectiveMousePosition.x,
      effectiveMousePosition.y,
      renderNodes,
      busNodes,
      nodeMap,
      busMap,
    );
    const validDestination = canWireConnectToTarget(circuit, wireOrigin, hoveredDestination);

    if (validDestination) {
      if (hoveredDestination.destinationType === "gate") {
        const inputIndex = hoveredDestination.destination.index;
        const toNode = hoveredDestination.destination.toNode;
        const totalInputs = toNode.gate.inputCount;

        effectiveMousePosition = toNode.getInputPortPositionByIndex(inputIndex, totalInputs);
      } else if (hoveredDestination.destinationType === "bus") {
        const busNode = hoveredDestination.destination.busNode;
        const tapRef = hoveredDestination.destination.tapRef;

        effectiveMousePosition = getTapPointFromElement(busNode, tapRef, nodeMap, busMap);
      }
    }
  }
  return effectiveMousePosition;
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
  if (state.camera.zoom < 0.6) {
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
  // Position the input below the center of the gate
  const labelPosition = worldToScreen(
    renderNode.x + renderNode.width / 2,
    renderNode.y + renderNode.height + GRID_SIZE,
  );
  const cssX = labelPosition.x * scaleX;
  const cssY = labelPosition.y * scaleY;
  const zoom = state.camera.zoom;
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