import {
  CLOCK_TIMER,
  FREQUENCY,
  GATE_CATEGORIES,
  GRID_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  PORT_DETECTION_THRESHOLD,
  SIGNAL,
  WAYPOINT_DETECTION_THRESHOLD,
  WIRE_DETECTION_THRESHOLD,
  ROLE,
} from "../constants.js";
import {
  setCustomWaypoints,
  getPointRefFromElement,
  projectPointOntoSegment,
  isNearPoint,
  getTapPointFromElement,
  getGhostWireStartPoint,
  getGhostWireEndPoint,
  normalizeWaypointDirection,
} from "../render/wireGeometry.js";
import {
  createPrimitiveNode,
  createCompositeNode,
  snapPointToGrid,
  wouldOverlap,
  wouldBusOverlap,
} from "../render/RenderNode.js";
import {
  MoveNodeCommand,
  PlaceGateCommand,
  ChangeWaypointCommand,
  PlaceBusCommand,
  AddWaypointCommand,
  CompositeCommand,
  buildConnectionCommand,
} from "../history/commands.js";
import {
  hideAllMenus,
  showMenu,
} from "../ui/contextMenu.js";
import { state, screenToWorld, worldToScreen } from "../state.js";
import { showToast } from "../ui/toast.js";
import { performCommand } from "../history/history.js";
import { loadCompositeGate, buildCircuitFromData } from "../persistence.js";
import { isConnectionPossible } from "../logic/wire.js";
import { findClosestPort } from "../interaction/portInteraction.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

function cleanupGhostWire() {
  if (state.ghost.wireCleanup) {
    state.ghost.wireCleanup();
    state.ghost.wireCleanup = null;
  }
  state.ghost.wire = null;
}

function cleanupGhostBus() {
  if (state.ghost.busCleanup) {
    state.ghost.busCleanup();
    state.ghost.busCleanup = null;
  }
  state.ghost.bus = null;
}

export const nodeMap = new Map();
export const busMap = new Map();

export function registerMouseHandlers(p, circuit, renderNodes, wires, busNodes, wireDependents) {
  const canvasHost = document.querySelector(".canvas-host");
  const canvas = canvasHost.querySelector("canvas");
  let rightClicked = false; // used to prevent right click actions from triggering on mouse release

  p.mousePressed = function (event) {
    rightClicked = false;
    if (state.ui.labelEditing) return;

    const world = screenToWorld(p.mouseX, p.mouseY);
    state.interaction.target = renderNodes.find(n => n.containsPoint(world.x, world.y));
    bringToFront(renderNodes, state.interaction.target);

    if (p.mouseButton.left) {
      if (state.isPlacing()) {
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
            state.ghost.node = null;
          }
        } else if (state.ghost.bus) {
          if (!state.ghost.bus.startPointPlaced && !state.ghost.bus.endPointPlaced) {
            if (wouldBusOverlap(state.ghost.bus, renderNodes, busNodes)) return;
            state.ghost.bus.startPointPlaced = true;
            const startPoint = state.ghost.bus.startPoint;
            const { waypoints, cleanup } = setCustomWaypoints(p, startPoint);
            state.ghost.bus.waypoints = waypoints;
            state.ghost.busCleanup = cleanup;
          } else if (state.ghost.bus.startPointPlaced && !state.ghost.bus.endPointPlaced) {
            if (wouldBusOverlap(state.ghost.bus, renderNodes, busNodes)) return;
            const placeBusCommand = new PlaceBusCommand(circuit, busNodes, state.ghost.bus, busMap);
            performCommand(placeBusCommand);

            state.ghost.bus = null;
            cleanupGhostBus();
          }
        }
      } else {
        // Check input ports
        if (state.interaction.wireCreation) {
          const useSnap = p.keyIsDown(p.SHIFT);
          const endPoint = getGhostWireEndPoint(
            world,
            state.ghost.wire.startPoint,
            state.ghost.wire.waypoints,
            useSnap,
          );
          const endPointInfo = findWireEndpoint(
            endPoint.x,
            endPoint.y,
            renderNodes,
            busNodes,
            wires,
            nodeMap,
            busMap,
            neededRole(state.interaction.wireCreation),
          );
          if (endPointInfo) {
            const { originInfo, destinationInfo } = resolveConnection(
              state.interaction.wireCreation,
              endPointInfo,
            );
            state.ghost.wire.waypoints = normalizeWaypointDirection(
              state.interaction.wireCreation,
              endPointInfo,
              state.ghost.wire.waypoints,
            );
            const connectionCommand = buildConnectionCommand(
              originInfo,
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
          if (state.wireEditing.active) {
            if (state.wireEditing.isInsertingWaypoint()) {
              const source = state.wireEditing.target.source;
              const index = state.wireEditing.waypoint.insert.index;
              const newWaypoint = state.wireEditing.waypoint.insert.point;

              const addWaypointCommand = new AddWaypointCommand(source, index, newWaypoint);
              addWaypointCommand.do();
              state.wireEditing.waypoint.insert.pendingCommand = addWaypointCommand;
              state.wireEditing.waypoint.move.index = index;
            } else {
              const waypointRef = findNearWaypoint(world.x, world.y, wires, busNodes);
              state.wireEditing.waypoint.move.index = waypointRef ? waypointRef.waypointIndex : null;
            }
            if (!state.wireEditing.isMovingWaypoint()) {
              const pendingCommand = state.wireEditing.waypoint.insert.pendingCommand;
              if (pendingCommand) {
                performCommand(pendingCommand, { alreadyPerformed: true });
              }
              state.wireEditing.reset();
            }
          } else {
            state.interaction.wireCreation = findWireEndpoint(
              world.x,
              world.y,
              renderNodes,
              busNodes,
              wires,
              nodeMap,
              busMap,
              ROLE.ANY,
            );
            if (
              state.interaction.wireCreation &&
              state.interaction.wireCreation.role === ROLE.SINK
            ) {
              const entity = state.interaction.wireCreation.entity;
              const gate = entity.toNode.gate;
              const index = entity.index;

              if (!gate.canConnect(index)) {
                state.interaction.wireCreation = null;
                showToast("Wire is already connected!", { type: "error" });
                return;
              } 
            }
          }

          // ── Update persistent selection ──────────────────────────
          if (state.interaction.target) {
            state.selectedNode = state.interaction.target;
          } else if (
            !state.interaction.wireCreation &&
            !state.wireEditing.isMovingWaypoint()
          ) {
            // Clicked empty space or a wire — deselect
            state.selectedNode = null;
          }

          if (
            !state.interaction.wireCreation &&
            !state.wireEditing.isMovingWaypoint() &&
            state.interaction.target
          ) {
            const { x, y } = snapPointToGrid(world.x, world.y);
            state.interaction.dragging.offset.x = x - state.interaction.target.x;
            state.interaction.dragging.offset.y = y - state.interaction.target.y;
          } else if (
            state.interaction.wireCreation &&
            !state.wireEditing.isMovingWaypoint() &&
            !state.interaction.target
          ) {
            const startPoint = getGhostWireStartPoint(
              state.interaction.wireCreation,
              nodeMap,
              busMap,
            );
            const { waypoints, cleanup } = setCustomWaypoints(p, startPoint);

            state.ghost.wire = {};
            state.ghost.wire.startPoint = startPoint;
            state.ghost.wire.waypoints = waypoints;
            state.ghost.wireCleanup = cleanup;
          } else if (
            !state.interaction.wireCreation &&
            !state.wireEditing.active &&
            !state.interaction.target
          ) {
            state.camera.isPanning = true;
          } else if (state.wireEditing.isMovingWaypoint()) {
            const source = state.wireEditing.target.source;
            const waypointIndex = state.wireEditing.waypoint.move.index;
            const fromWaypoint = source.waypoints[waypointIndex];

            state.wireEditing.waypoint.move.snapshot = {
              fromWaypoint: structuredClone(fromWaypoint),
            };
          }
        }
      }
    }

    else if (p.mouseButton.right) {
      rightClicked = true;
      if (state.ui.labelEditing) return;
      if (state.ui.isAnyModalOpen) {
        hideAllMenus();
        return;
      }
      if (state.wireEditing.active) {
        state.wireEditing.reset();
        return;
      }
      
      const rect = canvas.getBoundingClientRect();
      const clientX = rect.left + (p.mouseX / p.width) * rect.width;
      const clientY = rect.top + (p.mouseY / p.height) * rect.height;

      // 1. Check for input/output gates
      const target = renderNodes.find(n => n.containsPoint(world.x, world.y));
      if (target) {
        showMenu("gate-context-menu", clientX, clientY, { type: "gate", source: target }, {
          onBeforeShow: (t) => {
            const labelBtnDiv = document.getElementById("label-btn-div");
            labelBtnDiv.innerHTML = t.source.gate.label ? "Edit Label" : "Add Label";
          }
        });
        return;
      }

      // 2. Check for wires and buses
      const wireInfo = getWireAtPoint(world.x, world.y, wires, nodeMap, busMap);
      if (wireInfo) {
        showMenu("wire-context-menu", clientX, clientY, { type: "wire", source: wireInfo.conn });
        return;
      }

      const busInfo = findNearBus(world.x, world.y, busNodes, nodeMap, busMap);
      if (busInfo) {
        showMenu("wire-context-menu", clientX, clientY, { type: "bus", source: busInfo.busNode });
        return;
      }
    }
  }

  p.mouseDragged = function () {
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
    } else if (state.wireEditing.isMovingWaypoint()) {
      const source = state.wireEditing.target.source;
      const waypointIndex = state.wireEditing.waypoint.move.index;

      const originalWaypoint = source.waypoints[waypointIndex];
      originalWaypoint.x = worldDrag.x;
      originalWaypoint.y = worldDrag.y;
    } else if (state.camera.isPanning) {
      state.camera.x += (p.mouseX - p.pmouseX);
      state.camera.y += (p.mouseY - p.pmouseY);
    }
  }

  p.mouseReleased = function () {
    if (rightClicked) return;
    if (state.interaction.dragging.active) {
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
    } else if (state.wireEditing.isMovingWaypoint()) {
      const source = state.wireEditing.target.source;
      const waypointIndex = state.wireEditing.waypoint.move.index;

      const toWaypoint = source.waypoints[waypointIndex];
      state.wireEditing.waypoint.move.snapshot.toWaypoint = structuredClone(toWaypoint);
      const changeWaypointCommand = new ChangeWaypointCommand(
        state.wireEditing.waypoint.move.snapshot,
        state.wireEditing.target.source,
        state.wireEditing.waypoint.move.index,
      );
      if (state.wireEditing.waypoint.insert.pendingCommand) {
        const compositeCommand = new CompositeCommand(
          [state.wireEditing.waypoint.insert.pendingCommand, changeWaypointCommand]
        );
        changeWaypointCommand.do();
        performCommand(compositeCommand, { alreadyPerformed: true });
      } else {
        performCommand(changeWaypointCommand);
      }
    } else {
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
        clockNode.intervalId = setInterval(() => {
          clockNode.gate.tick();
          circuit.evaluate();
        }, timeInterval);

        setTimeout(() => {
          clearInterval(state.interaction.target.intervalId);
          state.interaction.target.intervalId = null;
        }, CLOCK_TIMER);
      }
    }
    state.interaction.target = null;
    state.interaction.dragging.reset();
    state.camera.isPanning = false;
    state.wireEditing.waypoint.move.reset();
    state.wireEditing.waypoint.insert.reset();
  }

  p.mouseWheel = function(event) {
    // Dismiss label editor on zoom — blur triggers commit → cleanup
    if (state.ui.labelEditing) {
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

    state.camera.zoom = p.constrain(state.camera.zoom, MIN_ZOOM, MAX_ZOOM);

    // 3. Counter-pan the camera to pin the world to the mouse
    state.camera.x = p.mouseX - (x * state.camera.zoom);
    state.camera.y = p.mouseY - (y * state.camera.zoom);

    // Return false to prevent the entire web page from scrolling
    return false; 
  }
}

function findNearOutput(mx, my, renderNodes) {
  for (let i = 0; i < renderNodes.length; i++) {
    const gate = renderNodes[i].gate;
    if (gate.category === GATE_CATEGORIES.PRIMITIVE && gate.type === "output") continue;
    const hit = findClosestPort(
      mx, my,
      gate.outputCount,
      (j, n) => renderNodes[i].getOutputPortPositionByIndex(j, n),
      PORT_DETECTION_THRESHOLD,
    );
    if (hit) return { fromNode: renderNodes[i], fromOutputIndex: hit.index };
  }
  return null;
}

function findNearInput(mx, my, renderNodes) {
  for (let i = 0; i < renderNodes.length; i++) {
    const gate = renderNodes[i].gate;
    if (gate.category === GATE_CATEGORIES.PRIMITIVE && gate.type === "input") continue;
    const hit = findClosestPort(
      mx, my,
      gate.inputCount,
      (j, n) => renderNodes[i].getInputPortPositionByIndex(j, n),
      PORT_DETECTION_THRESHOLD,
    );
    if (hit) return { toNode: renderNodes[i], index: hit.index };
  }
  return null;
}

export function findNearBus(mx, my, busNodes, nodeMap, busMap) {
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

function findWireEndpoint(mx, my, renderNodes, busNodes, wires, nodeMap, busMap, need = ROLE.ANY) {
  const canSource = need !== ROLE.SINK;
  const canSink   = need !== ROLE.SOURCE;
  
  if (canSink) {
    const inp = findNearInput(mx, my, renderNodes);
    if (inp) return { kind: "gate", role: ROLE.SINK, entity: inp };
  }
  if (canSource) {
    const out = findNearOutput(mx, my, renderNodes);
    if (out) return { kind: "gate", role: ROLE.SOURCE, entity: out };

    const wire = getWireAtPoint(mx, my, wires, nodeMap, busMap);
    if (wire) return { kind: "wire", role: ROLE.SOURCE, entity: wire };
  }
  const bus = findNearBus(mx, my, busNodes, nodeMap, busMap);
  if (bus) return { kind: "bus", role: ROLE.ANY, entity: bus };
  return null;
}

function neededRole(firstEndpoint) {
  if (!firstEndpoint) return ROLE.ANY;
  return firstEndpoint.role === ROLE.SOURCE
    ? ROLE.SINK
    : firstEndpoint.role ===  ROLE.SINK
    ? ROLE.SOURCE
    : ROLE.ANY;
}

// a = first click, b = second click
export function resolveConnection(a, b) {
  const swap = a.role === ROLE.SINK || b.role === ROLE.SOURCE;
  const [ from, to ] = swap ? [ b, a ] : [ a, b ];
  return {
    originInfo: { originType: from.kind, origin: from.entity },
    destinationInfo: { destinationType: to.kind, destination: to.entity },
  };
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
      if (isOnLineSegment(points[i], points[i + 1], { x: mx, y: my }, WIRE_DETECTION_THRESHOLD)) {
        return {
          conn: conn,
          tapRef: getPointRefFromElement(conn, mx, my, nodeMap, busMap), 
        };
      }
    }
  }
  return null;
}

function findNearWaypoint(mx, my, wires, busNodes) {
  for (let i = 0; i < wires.length; i++) {
    const waypointCount = wires[i].waypoints.length;
    for (let j = 0; j < waypointCount; j++) {
      if (isNearPoint(mx, my, wires[i].waypoints[j], WAYPOINT_DETECTION_THRESHOLD)) {
        return { source: wires[i], waypointIndex: j };
      }
    }
  }

  for (let i = 0; i < busNodes.length; i++) {
    const waypointCount = busNodes[i].waypoints.length;
    for (let j = 0; j < waypointCount; j++) {
      if (isNearPoint(mx, my, busNodes[i].waypoints[j], WAYPOINT_DETECTION_THRESHOLD)) {
        return { source: busNodes[i], waypointIndex: j };
      }
    }
  }
  return null;
}

export function getEffectiveMousePosition(
  mouse,
  wireCreation,
  ghostWire,
  circuit,
  renderNodes,
  busNodes,
  wires,
  nodeMap,
  busMap,
  p
) {
  let effectiveMousePosition = mouse;
  if (wireCreation) {
    const useSnap = p.keyIsDown(p.SHIFT);

    effectiveMousePosition = getGhostWireEndPoint(
      mouse,
      ghostWire.startPoint,
      ghostWire.waypoints,
      useSnap,
    );

    const hoveredEndPointInfo = findWireEndpoint(
      effectiveMousePosition.x,
      effectiveMousePosition.y,
      renderNodes,
      busNodes,
      wires,
      nodeMap,
      busMap,
      neededRole(wireCreation),
    );
    if (hoveredEndPointInfo) {
      const { originInfo, destinationInfo } = resolveConnection(
        wireCreation,
        hoveredEndPointInfo,
      );
      const validDestination = isConnectionPossible(circuit, originInfo, destinationInfo);

      if (validDestination) {
        if (hoveredEndPointInfo.role === ROLE.SINK) {
          const { destinationType, destination } = destinationInfo;
          if (destinationType === "gate") {
            const inputIndex = destination.index;
            const toNode = destination.toNode;
            const totalInputs = toNode.gate.inputCount;

            effectiveMousePosition = toNode.getInputPortPositionByIndex(inputIndex, totalInputs);
          }
        } else if (hoveredEndPointInfo.role === ROLE.SOURCE) {
          const { originType, origin } = originInfo;
          if (originType === "gate") {
            const outputIndex = origin.fromOutputIndex;
            const fromNode = origin.fromNode;
            const totalOutputs = fromNode.gate.outputCount;

            effectiveMousePosition = fromNode.getOutputPortPositionByIndex(outputIndex, totalOutputs);
          } else if (originType === "wire") {            
            effectiveMousePosition = getTapPointFromElement(origin.conn, origin.tapRef, nodeMap, busMap);
          }
        } else if (hoveredEndPointInfo.role === ROLE.ANY) {
          const busNode = hoveredEndPointInfo.entity.busNode;
          const tapRef = hoveredEndPointInfo.entity.tapRef;

          effectiveMousePosition = getTapPointFromElement(busNode, tapRef, nodeMap, busMap);
        }
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
export function openLabelEditor(renderNode, p) {
  if (state.camera.zoom < 0.6) {
    showToast("Zoom in to edit label", { type: "warning" });
    return;
  }
  state.ui.labelEditing = true;
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
    state.ui.labelEditing = false;
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