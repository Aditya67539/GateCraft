import { state, screenToWorld, worldToScreen } from "../state.js";
import { CLOCK_TIMER, FREQUENCY, SIGNAL } from "../constants.js";
import { setCustomWaypoints, getPointRefFromElement, projectPointOntoSegment, dist, getTapPointFromElement, GateConnectionView, BusConnectionView } from "../render/wireGeometry.js";
import { createBasicNode, createCompositeNode, snapPointToGrid, wouldOverlap, wouldBusOverlap } from "../render/RenderPoint.js";
import { showToast } from "../ui/toast.js";
import { GateConnectionCommand, MoveNodeCommand, PlaceGateCommand, RemoveGateCommand, RemoveWireCommand, ChangeWaypointCommand, PlaceBusCommand, RemoveBusCommand, BusConnectionCommand } from "../history/commands.js";
import { performCommand } from "../history/history.js";
import { loadCompositeGate, buildCircuitFromData } from "../persistence.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

function cleanupGhostWire() {
  if (state.ghostWireCleanup) {
    state.ghostWireCleanup();
    state.ghostWireCleanup = null;
  }
  state.ghostWire = null;
}

function cleanupGhostBus() {
  if (state.ghostBusCleanup) {
    state.ghostBusCleanup();
    state.ghostBusCleanup = null;
  }
  state.ghostBus = null;
}

export const nodeMap = new Map();
export const busMap = new Map();

export function registerMouseHandlers(p, circuit, renderNodes, wires, busNodes) {
  const canvasHost = document.querySelector(".canvas-host");
  const canvas = canvasHost.querySelector("canvas");
  const wireCtxMenu = document.getElementById("wire-context-menu");

  p.mousePressed = function (event) {
    if (state.labelEditing) return;
    if (state.isAnyModalOpen) return;
    if (state.justPlacedFromToolbar) {
      state.justPlacedFromToolbar = false;
    }
    const world = screenToWorld(p.mouseX, p.mouseY);
    state.dragging = renderNodes.find(n => n.containsPoint(world.x, world.y));
    bringToFront(renderNodes, state.dragging);

    if (p.mouseButton.left) {
      if (state.mode === "edit") {
        // Check input ports
        if (state.drawingWire) {
          const connInfo = findWireDestination(world.x, world.y, renderNodes, busNodes, nodeMap, busMap);
          if (state.drawingWire.originType === "gate") {
            if (connInfo?.destinationType === "gate") {
              const connection = connInfo.destination;
              
              const outputIndex = state.drawingWire.source.fromOutputIndex;
              const inputIndex = connection.index;
              const fromGate = state.drawingWire.source.fromNode.gate;
              const toGate = connection.toNode.gate;

              const connectGateCommand = new GateConnectionCommand(
                circuit,
                fromGate,
                toGate,
                inputIndex,
                outputIndex,
                state.ghostWire,
                wires,
              );
              performCommand(connectGateCommand);
            } else if (connInfo?.destinationType === "bus") {
              const connection = connInfo.destination;

              const outputIndex = state.drawingWire.source.fromOutputIndex;
              const fromGate = state.drawingWire.source.fromNode.gate;
              const bus = connection.busNode.bus;

              const busConnectionCommand = new BusConnectionCommand(
                circuit,
                fromGate,
                bus,
                state.ghostWire,
                wires,
                "in",
                outputIndex,
                connInfo.destination.tapRef,
              );
              performCommand(busConnectionCommand);
            }
          } else if (state.drawingWire.originType === "bus") {
            if (connInfo?.destinationType === "gate") {
              const toGate = connInfo.destination.toNode.gate;
              const fromBus = state.drawingWire.source.busNode.bus;
              const inputIndex = connInfo.destination.index;

              const busConnectionCommand = new BusConnectionCommand(
                circuit,
                toGate,
                fromBus,
                state.ghostWire,
                wires,
                "out",
                inputIndex,
                state.drawingWire.source.tapRef,
              );
              performCommand(busConnectionCommand);
            }
          } else if (state.drawingWire.originType === "wire") {
            if (state.drawingWire.source.conn instanceof GateConnectionView) {
              if (connInfo?.destinationType === "gate") {
                const connection = connInfo.destination;

                const outputIndex = state.drawingWire.source.conn.wire.fromOutputIndex;
                const inputIndex = connection.index;
                const fromGate = state.drawingWire.source.conn.wire.from;
                const toGate = connection.toNode.gate;

                const connectGateCommand = new GateConnectionCommand(
                  circuit,
                  fromGate,
                  toGate,
                  inputIndex,
                  outputIndex,
                  state.ghostWire,
                  wires,
                  true,
                  state.drawingWire.source,
                );
                performCommand(connectGateCommand);
              } else if (connInfo?.destinationType === "bus") {
                const connection = connInfo.destination;

                const outputIndex = state.drawingWire.source.conn.wire.fromOutputIndex;
                const fromGate = state.drawingWire.source.conn.wire.from;
                const bus = connection.busNode.bus;

                const busConnectionCommand = new BusConnectionCommand(
                  circuit,
                  fromGate,
                  bus,
                  state.ghostWire,
                  wires,
                  "in",
                  outputIndex,
                  connInfo.destination.tapRef,
                  true,
                  state.drawingWire.source,
                );
                performCommand(busConnectionCommand);
              }
            } else if (state.drawingWire.source.conn instanceof BusConnectionView) {
              if (state.drawingWire.source.conn.direction === "in") {
                if (connInfo?.destinationType === "gate") {
                  const connection = connInfo.destination;

                  const outputIndex = state.drawingWire.source.conn.wire.fromOutputIndex;
                  const inputIndex = connection.index;
                  const fromGate = state.drawingWire.source.conn.wire.from;
                  const toGate = connection.toNode.gate;

                  const connectGateCommand = new GateConnectionCommand(
                    circuit,
                    fromGate,
                    toGate,
                    inputIndex,
                    outputIndex,
                    state.ghostWire,
                    wires,
                    true,
                    state.drawingWire.source,
                  );
                  performCommand(connectGateCommand);
                } else if (connInfo?.destinationType === "bus") {
                  const connection = connInfo.destination;

                  const outputIndex = state.drawingWire.source.conn.wire.fromOutputIndex;
                  const fromGate = state.drawingWire.source.conn.wire.from;
                  const bus = connection.busNode.bus;

                  const busConnectionCommand = new BusConnectionCommand(
                    circuit,
                    fromGate,
                    bus,
                    state.ghostWire,
                    wires,
                    "in",
                    outputIndex,
                    connInfo.destination.tapRef,
                    true,
                    state.drawingWire.source,
                  );
                  performCommand(busConnectionCommand);
                }
              } else if (state.drawingWire.source.conn.direction === "out") {
                if (connInfo?.destinationType === "gate") {
                  const connection = connInfo.destination;

                  const toGate = connection.toNode.gate;
                  const fromBus = state.drawingWire.source.conn.wire.from;
                  const inputIndex = connection.index;

                  const busConnectionCommand = new BusConnectionCommand(
                    circuit,
                    toGate,
                    fromBus,
                    state.ghostWire,
                    wires,
                    "out",
                    inputIndex,
                    state.drawingWire.source.tapRef,
                    true,
                    state.drawingWire.source,
                  );
                  performCommand(busConnectionCommand);
                }
              }
            }
          }
          state.drawingWire = null;
          cleanupGhostWire();
        } else {
          state.drawingWire = findWireOrigin(world.x, world.y, renderNodes, busNodes, wires, nodeMap, busMap);
          state.changingWaypoint = findNearWaypoint(world.x, world.y, wires);

          // ── Update persistent selection ──────────────────────────
          if (state.dragging) {
            state.selectedNode = state.dragging;
          } else if (!state.drawingWire && !state.changingWaypoint) {
            // Clicked empty space or a wire — deselect
            state.selectedNode = null;
          }

          if (!state.drawingWire && !state.changingWaypoint && state.dragging) {
            const { x, y } = snapPointToGrid(world.x, world.y);
            state.offsetX = x - state.dragging.x;
            state.offsetY = y - state.dragging.y;
          } else if (state.drawingWire && !state.changingWaypoint && !state.dragging) {
            const connection = state.drawingWire.source;
            if (state.drawingWire.originType === "gate") {
              const fromNode = connection.fromNode;
              const startPoint = fromNode.gate.type === "composite"
                ? fromNode.getOutputPortByIndex(connection.fromOutputIndex, fromNode.gate.outputCount)
                : fromNode.getOutputPort();
              const { waypoints, cleanup } = setCustomWaypoints(p, startPoint);
              state.ghostWire = waypoints;
              state.ghostWireCleanup = cleanup;
            } else if (state.drawingWire.originType === "bus") {
              const fromBus = connection.busNode;
              const tapRef = getPointRefFromElement(fromBus, world.x, world.y, nodeMap, busMap);
              const startPoint = getTapPointFromElement(fromBus, tapRef, nodeMap, busMap);
              const { waypoints, cleanup } = setCustomWaypoints(p, startPoint);
              state.ghostWire = waypoints;
              state.ghostWireCleanup = cleanup;
            } else if (state.drawingWire.originType === "wire") {
              const conn = connection.conn;

              const startPoint = getTapPointFromElement(conn, connection.tapRef, nodeMap, busMap);
              const { waypoints, cleanup } = setCustomWaypoints(p, startPoint);

              state.ghostWire = waypoints;
              state.ghostWireCleanup = cleanup;
            }
          } else if (!state.drawingWire && !state.changingWaypoint && !state.dragging) {
            state.isPanning = true;
          } else if (state.changingWaypoint) {
            state.waypointSnapshot = {};
            state.waypointSnapshot.fromWaypoint = structuredClone(state.changingWaypoint);
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
        if (state.ghostNode) {
          if (wouldOverlap(state.ghostNode, renderNodes, busNodes, null)) return;
          const placeGateCommand = new PlaceGateCommand(circuit, renderNodes, state.ghostNode, nodeMap);
          performCommand(placeGateCommand);

          if (event.shiftKey) {
            const gateType = state.ghostNode.gate.type;
            const { x, y } = snapPointToGrid(world.x, world.y);
            if (gateType !== "composite") {
              state.ghostNode = createBasicNode(gateType, x, y);
            } else {
              const name = state.ghostNode.gate.label;
              const saved = loadCompositeGate(name);
              if (saved) {
                const freshCircuit = buildCircuitFromData(saved.circuitData, saved.renderData);
                state.ghostNode = createCompositeNode(name, freshCircuit, x, y);
              }
            }
          } else {
            state.mode = "edit";
            state.ghostNode = null;
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
      } else if (state.mode === "delete") {
        if (state.dragging) {
          const removeGateCommand = new RemoveGateCommand(
            renderNodes,
            wires,
            circuit,
            state.dragging,
            nodeMap,
          );
          performCommand(removeGateCommand);

          if (state.selectedNode === state.dragging) state.selectedNode = null;
          state.dragging = null;
        } else {
          const wireInfo = getWireAtPoint(world.x, world.y, wires, nodeMap, busMap);
          const busInfo = getBusAtPoint(world.x, world.y, busNodes);
          
          if (wireInfo) {
            const removeWireCommand = new RemoveWireCommand(circuit, wires, wireInfo.conn);
            performCommand(removeWireCommand);
          } else if (busInfo) {
            const removeBusCommand = new RemoveBusCommand(busNodes, wires, circuit, busInfo, busMap);
            performCommand(removeBusCommand);
          }
        }
      }
    }

    else if (p.mouseButton.right) {
      if (state.mode !== "edit" || state.labelEditing) return;
      
      const rect = canvas.getBoundingClientRect();
      const clientX = rect.left + (p.mouseX / p.width) * rect.width;
      const clientY = rect.top + (p.mouseY / p.height) * rect.height;

      // 1. Check for input/output gates (label editing)
      // TODO: Add a context menu instead of the direct label editor
      const target = renderNodes.find(n => n.containsPoint(world.x, world.y));
      if (target) {
        const gateType = target.gate.type;
        if (gateType === "input" || gateType === "output") {
          openLabelEditor(target, p);
          return;
        }
      }

      // 2. Check for wires and buses
      const wireInfo = getWireAtPoint(world.x, world.y, wires, nodeMap, busMap);
      if (wireInfo) {
        showWireContextMenu(clientX, clientY, { type: "wire", conn: wireInfo.conn });
        return;
      }

      const busInfo = getBusAtPoint(world.x, world.y, busNodes);
      if (busInfo) {
        showWireContextMenu(clientX, clientY, { type: "bus", busNode: busInfo });
        return;
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
        }
        const { x, y } = snapPointToGrid(worldDrag.x, worldDrag.y);
        state.dragging.x = x - state.offsetX;
        state.dragging.y = y - state.offsetY;
      } else if (state.changingWaypoint) {
        state.changingWaypoint.x = worldDrag.x;
        state.changingWaypoint.y = worldDrag.y;
      } else if (state.isPanning) {
        state.cameraX += (p.mouseX - p.pmouseX);
        state.cameraY += (p.mouseY - p.pmouseY);
      }
    }
  }

  p.mouseReleased = function () {
    if (state.dragging) {
      if (wouldOverlap(state.dragging, renderNodes, busNodes, state.dragging.gate.id)) {
        state.dragging.x = state.currentX;
        state.dragging.y = state.currentY;
      } else if (state.changingPos) {
        const moveNodeCommand = new MoveNodeCommand(
          state.dragging,
          state.currentX,
          state.currentY,
          state.dragging.x,
          state.dragging.y,
        );
        performCommand(moveNodeCommand);
      }
    } else if (state.changingWaypoint) {
      state.waypointSnapshot.toWaypoint = structuredClone(state.changingWaypoint);
      const changeWaypointCommand = new ChangeWaypointCommand(
        state.waypointSnapshot,
        state.changingWaypoint,
      );
      performCommand(changeWaypointCommand);
    }
    state.dragging = null;
    state.offsetX = 0;
    state.offsetY = 0;
    state.currentX = 0;
    state.currentY = 0;
    state.changingPos = false;
    state.isPanning = false;
    state.waypointSnapshot = null;
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

    state.zoom = p.constrain(state.zoom, 0.3, 3);

    // 3. Counter-pan the camera to pin the world to the mouse
    state.cameraX = p.mouseX - (x * state.zoom);
    state.cameraY = p.mouseY - (y * state.zoom);

    // Return false to prevent the entire web page from scrolling
    return false; 
  }


  function showWireContextMenu(clientX, clientY, target) {
    state.contextMenuTarget = target;
    wireCtxMenu.classList.add("open");
    wireCtxMenu.style.left = `${clientX}px`;
    wireCtxMenu.style.top = `${clientY}px`;

    const rect = wireCtxMenu.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) {
      wireCtxMenu.style.top = `${Math.max(0, clientY - rect.height)}px`;
    }
    if (rect.right > window.innerWidth) {
      wireCtxMenu.style.left = `${Math.max(0, clientX - rect.width)}px`;
    }
    state.isAnyModalOpen = true;
  }

  function hideWireContextMenu() {
    if (!wireCtxMenu.classList.contains("open")) return;
    wireCtxMenu.classList.remove("open");
    state.contextMenuTarget = null;
    state.isAnyModalOpen = false;
  }

  // Edit button - placeholder for waypoint editor (coming soon)
  document.getElementById("ctx-wire-edit").addEventListener("click", () => {
    const target = state.contextMenuTarget;
    hideWireContextMenu();
    if (!target) return;
    // TODO: open waypoint editor for target
  });

  // Delete button - remove the wire or bus
  document.getElementById("ctx-wire-delete").addEventListener("click", () => {
    const target = state.contextMenuTarget;
    hideWireContextMenu();
    if (!target) return;

    if (target.type === "wire") {
      const removeWireCommand = new RemoveWireCommand(circuit, wires, target.conn);
      performCommand(removeWireCommand);
    } else if (target.type === "bus") {
      const removeBusCommand = new RemoveBusCommand(busNodes, wires, circuit, target.busNode, busMap);
      performCommand(removeBusCommand);
    }
  });

  // Close wire context meny on any click or Escape
  document.addEventListener("click", () => hideWireContextMenu());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideWireContextMenu();
  });
}


export function isNearPort(mouseX, mouseY, port) {
  const d = dist(mouseX, mouseY, port.x, port.y);
  return d < 15;
}

export function isNearWaypoint(mx, my, waypoint) {
  const d = dist(mx, my, waypoint.x, waypoint.y);
  return d < 10;
}

function findNearOutput(mx, my, renderNodes) {
  for (let i = 0; i < renderNodes.length; i++) {
    const gate = renderNodes[i].gate;
    if (gate.type === "output") continue;
    if (gate.type === "composite") {
      for (let j = 0; j < gate.outputCount; j++) {
        const port = renderNodes[i].getOutputPortByIndex(j, gate.outputCount);
        if (isNearPort(mx, my, port)) {
          return { fromNode: renderNodes[i], fromOutputIndex: j };
        }
      }
    }
    const port = renderNodes[i].getOutputPort();
    if (isNearPort(mx, my, port)) {
      return { fromNode: renderNodes[i], fromOutputIndex: null };
    }
  }
  return null;
}

function findNearInput(mx, my, renderNodes) {
  for (let i = 0; i < renderNodes.length; i++) {
    if (renderNodes[i].gate.type === "input") continue;
    const totalInputs = renderNodes[i].gate.inputCount;

    for (let j = 0; j < totalInputs; j++) {
      const port = renderNodes[i].getInputPortByIndex(j, totalInputs);
      if (isNearPort(mx, my, port)) {
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
      source: nodeConn,
    }
  } else if (busConn) {
    return {
      originType: "bus",
      source: busConn,
    }
  } else if (wireConn) {
    return {
      originType: "wire",
      source: wireConn,
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

export function canWireConnectToBus(drawingWire, bus, wires) {
  if (!drawingWire) return true;
  if (drawingWire.originType === "bus") return false;
  if (
    drawingWire.originType === "wire" &&
    drawingWire.source.conn instanceof BusConnectionView &&
    drawingWire.source.conn.direction === "out"
  ) return false;

  const fromGateId = drawingWire.originType === "gate"
    ? drawingWire.source.fromNode.gate.id
    : drawingWire.source.conn.wire.from.id;

  const fromOutputIndex = drawingWire.originType === "gate"
    ? drawingWire.source.fromOutputIndex
    : drawingWire.source.conn.wire.fromOutputIndex;

  const alreadyConnected = wires.some(
    n => (
      n.wire.to.type === "bus" &&
      n.wire.to.id === bus?.id &&
      n.wire.from.id === fromGateId &&
      n.wire.fromOutputIndex === fromOutputIndex
    )
  );
  return !alreadyConnected;
}

function findNearWaypoint(mx, my, wires) {
  for (let i = 0; i < wires.length; i++) {
    const waypointCount = wires[i].waypoints.length;
    for (let j = 0; j < waypointCount; j++) {
      if (isNearWaypoint(mx, my, wires[i].waypoints[j])) {
        return wires[i].waypoints[j];
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
