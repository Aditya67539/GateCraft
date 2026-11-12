import p5 from "p5";
import { state, screenToWorld } from "./state.js";
import { drawGate, drawWaypoint, drawWire, drawPortTooltip, setFont, drawGhostPath, drawBus, drawGhostBus, drawGhostWaypoint } from "./render/draw.js";
import { registerMouseHandlers, isNearPoint, busMap, nodeMap, getWireAtPoint, getBusAtPoint, getEffectiveMousePosition } from "./input/mouseHandlers.js";
import { initToolbar } from "./ui/toolbar.js";
import { getActiveTheme, applyTheme } from "./render/theme.js";
import { CircuitBuilder } from "./logic/CircuitBuilder.js";
import { snapPointToGrid, wouldBusOverlap, wouldOverlap } from "./render/RenderNode.js";
import { registerKeyboardHandlers } from "./input/keyboardHandlers.js";
import { drawMinimap } from "./render/minimap.js";
import { getGhostWireEndPoint, getGhostWireStartPoint, projectPointOntoSegment } from "./render/wireGeometry.js";
import { canWireConnectToTarget } from "./logic/wire.js";
import { GATE_CATEGORIES, WAYPOINT_DETECTION_THRESHOLD, PORT_DETECTION_THRESHOLD, WAYPOINT_INSERTION_THRESHOLD_SQ, GRID_SIZE, GRID_OFFSET, MAX_ZOOM, GRID_DOT_SIZE } from "./constants.js";

applyTheme(getActiveTheme());

const canvasHost = document.querySelector(".canvas-host");
const WIDTH = canvasHost.clientWidth;
const HEIGHT = canvasHost.clientHeight;

let renderNodes = [];
let wires = [];
let busNodes = [];
let circuit = new CircuitBuilder();
let wireDependents = new Map();
let gridBuffer;
let lastZoom = state.zoom;

// ── Port tooltip hover state ──────────────────────────────────
// Tracks the currently hovered port for smooth fade-in/out animation
let tooltipState = {
  active: false,        // is a port currently hovered?
  label: "",            // gate.label || gate.type
  portPosition: { x: 0, y: 0 }, // port position
  opacity: 0,           // animation progress 0 → 1
  portType: "",         // input port || output port
};
const TOOLTIP_FADE_SPEED = 6; // units per second (reaches 1.0 in ~167ms)

const sketch = (p) => {
  p.setup = function () {
    const cnv = p.createCanvas(WIDTH, HEIGHT);
    cnv.parent(canvasHost);
    const toolbarActions = initToolbar(p, circuit, renderNodes, wires, busNodes);

    canvasHost.addEventListener("contextmenu", (e) => { 
      e.preventDefault();
      e.stopPropagation();
    });

    registerMouseHandlers(p, circuit, renderNodes, wires, busNodes, wireDependents);
    registerKeyboardHandlers(p, circuit, renderNodes, wires, toolbarActions);
    
    gridBuffer = p.createGraphics(
      WIDTH + MAX_ZOOM * GRID_SIZE * 2,
      HEIGHT + MAX_ZOOM * GRID_SIZE * 2,
    );
  }

  p.draw = function () {
    const world = screenToWorld(p.mouseX, p.mouseY);
    const mouse = getEffectiveMousePosition(
      world,
      state.drawingWire,
      state.ghostWire,
      circuit,
      renderNodes,
      busNodes,
      nodeMap,
      busMap,
      p,
    );
    const theme = getActiveTheme();

    if (state.gridDirty || state.zoom !== lastZoom) {
      updateGridBuffer(p, gridBuffer, theme);
      state.gridDirty = false;
      lastZoom = state.zoom;
    }

    p.background(theme.canvas.bg.hex);
    
    const { x: gridX, y: gridY } = computeGridBufferCoords();
    p.image(gridBuffer, gridX, gridY);
    p.translate(state.cameraX, state.cameraY);
    p.scale(state.zoom);

    setFont(theme, p);

    const hoveredBus = getBusAtPoint(mouse.x, mouse.y, busNodes);
    const isIdle = !state.ghostNode && !state.ghostBus && !state.dragging;

    for (let i = 0; i < busNodes.length; i++) {
      const busNode = busNodes[i];
      const isContextTarget = state.contextMenuTarget?.type === "bus" &&
        state.contextMenuTarget.source.bus.id === busNode.bus.id;
      const isEditorTarget = state.editorTarget?.type === "bus" &&
        state.editorTarget.source.bus.id === busNode.bus.id;
      const isHovered = hoveredBus?.bus.id === busNode.bus.id;
      const highlighted = isContextTarget || (
        !state.contextMenuTarget && isIdle &&
        (state.wireEditing ? isEditorTarget : isHovered) &&
        (
          !state.drawingWire || 
          canWireConnectToTarget(circuit, state.drawingWire, { destinationType: "bus", destination: { busNode } })
        )
      );
      drawBus(busNode, p, highlighted);
    }

    // ── Detect hovered port for tooltip ──────────────────────
    let hoveredPortPosition = null;
    let hoveredNode = null;
    let hoveredPortIndex = null;
    let hoveredLabel = "";
    let portType = "";
    for (let i = 0; i < renderNodes.length; i++) {
      const gate = renderNodes[i].gate;
      const totalInputs = gate.inputCount;
      const totalOutputs = gate.outputCount;

      if (totalInputs !== 0) {
        for (let j = 0; j < totalInputs; j++) {
          const portPosition = renderNodes[i].getInputPortPositionByIndex(j, totalInputs);
          if (isNearPoint(mouse.x, mouse.y, portPosition, PORT_DETECTION_THRESHOLD)) {
            hoveredNode = renderNodes[i];
            hoveredPortIndex = j;
            hoveredPortPosition = portPosition;
            if (
              gate.category === GATE_CATEGORIES.COMPOSITE &&
              gate.internalInputs &&
              gate.internalInputs[j] &&
              gate.internalInputs[j].label
            ) {
              hoveredLabel = gate.internalInputs[j].label;
            } else if (
              gate.category === GATE_CATEGORIES.PRIMITIVE &&
              gate.type === "Tri-state Buffer"
            ) {
              if (j === 0) hoveredLabel = "enable";
              else if (j === 1) hoveredLabel = "data";
              else hoveredLabel = "in";
            } else {
              hoveredLabel = "in";
            }
            portType = "input";
          }
        }
      }

      if (totalOutputs !== 0) {
        for (let j = 0; j < totalOutputs; j++) {
          const portPosition = renderNodes[i].getOutputPortPositionByIndex(j, totalOutputs);
          if (isNearPoint(mouse.x, mouse.y, portPosition, PORT_DETECTION_THRESHOLD)) {
            hoveredNode = renderNodes[i];
            hoveredPortIndex = j;
            hoveredPortPosition = portPosition;
            if (
              gate.category === GATE_CATEGORIES.COMPOSITE &&
              gate.internalOutputs &&
              gate.internalOutputs[j] &&
              gate.internalOutputs[j].label
            ) {
              hoveredLabel = gate.internalOutputs[j].label;
            } else {
              hoveredLabel = "out";
            }
            portType = "output";
          }
        }
      }
    }

    // Update tooltip animation state
    const dt = p.deltaTime / 1000; // seconds
    if (hoveredPortPosition) {
      tooltipState.active = true;
      tooltipState.label = hoveredLabel;
      tooltipState.portPosition = hoveredPortPosition;
      tooltipState.portType = portType;
      tooltipState.opacity = Math.min(1, tooltipState.opacity + TOOLTIP_FADE_SPEED * dt);
    } else {
      tooltipState.opacity = Math.max(0, tooltipState.opacity - TOOLTIP_FADE_SPEED * dt);
      if (tooltipState.opacity <= 0) {
        tooltipState.active = false;
      }
    }

    for (let i = 0; i < renderNodes.length; i++) {
      const node = renderNodes[i];
      let nodeStatus = null;
      const isContextTarget = state.contextMenuTarget?.type === "gate" &&
        state.contextMenuTarget.source.gate.id === node.gate.id;
      if (state.dragging && node === state.dragging) {
        // Actively dragging — show overlap feedback
        nodeStatus = wouldOverlap(state.dragging, renderNodes, busNodes, state.dragging.gate.id)
          ? "invalid"
          : "selected";
      } else if (
        (state.selectedNode && node === state.selectedNode) ||
        isContextTarget
      ) {
        // Persistently selected (not being dragged)
        nodeStatus = "selected";
      }

      // Highlight corresponding segment when hovering over an input port of a seven-segment display
      const isHoveredDisplayInput = (
        hoveredNode === node &&
        portType === "input" &&
        node.gate.category === GATE_CATEGORIES.PRIMITIVE &&
        node.gate.type === "seven-seg"
      );
      const highlightedSegmentIndex = isHoveredDisplayInput ? hoveredPortIndex : null;

      drawGate(node, p, nodeStatus, highlightedSegmentIndex);
    }

    const hoveredWire = getWireAtPoint(mouse.x, mouse.y, wires, nodeMap, busMap);

    for (let i = 0; i < wires.length; i++) {
      const conn = wires[i];
      const isContextTarget = state.contextMenuTarget?.type === "wire" &&
        state.contextMenuTarget.source.wire.id === conn.wire.id;
      const isEditorTarget = state.editorTarget?.type === "wire" &&
        state.editorTarget.source.wire.id === conn.wire.id;
      const isHovered = hoveredWire?.conn.wire.id === conn.wire.id;
      const highlighted = isContextTarget || (
        !state.contextMenuTarget && !state.drawingWire && isIdle &&
        (state.wireEditing ? isEditorTarget : isHovered)
      );
      drawWire(conn, nodeMap, busMap, p, highlighted);
    }

    if (state.wireEditing) {
      const signal = state.editorTarget.type === "wire"
        ? state.editorTarget.source.wire.signal
        : state.editorTarget.source.bus.output;
      const target = state.editorTarget.type === "wire"
        ? wires.find(n => n.wire.id === state.editorTarget.source.wire.id)
        : busNodes.find(n => n.bus.id === state.editorTarget.source.bus.id);

      if (target) {
        const { start, waypoints, end } = target.getPoints(nodeMap, busMap);
        const points = [ start, ...waypoints, end ];

        let bestGhost = null;
        state.waypointInsertionTarget = null;

        for (let i = 0; i < points.length - 1; i++) {
          const A = points[i];
          const B = points[i + 1];

          const hovered = isNearPoint(mouse.x, mouse.y, points[i], WAYPOINT_DETECTION_THRESHOLD);
          const nextHovered = isNearPoint(mouse.x, mouse.y, points[i + 1], WAYPOINT_DETECTION_THRESHOLD);
          const { point: nearestPoint, distSq } = projectPointOntoSegment(A, B, mouse);
          if (i !== 0) drawWaypoint(signal, points[i], p, hovered);
          if (!hovered && !nextHovered && !hoveredPortPosition && distSq <= WAYPOINT_INSERTION_THRESHOLD_SQ) {
            if (!bestGhost || distSq < bestGhost.distSq) {
              bestGhost = { point: nearestPoint, distSq };
              state.waypointInsertionTarget = {
                source: target,
                segmentIndex: i,
                point: nearestPoint,
              };
            }
          }
        }

        if (bestGhost) {
          drawGhostWaypoint(signal, bestGhost.point, p);
        }
      }
    }

    if (state.ghostNode) {
      let status = wouldOverlap(state.ghostNode, renderNodes, busNodes, null) ? "invalid" : "valid";
      drawGate(state.ghostNode, p, status);
      if (state.mode === "placing") {
        const { x, y } = snapPointToGrid(mouse.x, mouse.y);
        state.ghostNode.x = x;
        state.ghostNode.y = y;
      }
    }
    if (state.ghostBus) {
      if (state.mode === "placing") {
        const { x, y } = snapPointToGrid(mouse.x, mouse.y);
        if (!state.ghostBus.startPointPlaced && !state.ghostBus.endPointPlaced) {
          state.ghostBus.startPoint.x = state.ghostBus.endPoint.x = x;
          state.ghostBus.startPoint.y = state.ghostBus.endPoint.y = y;
        } else if (state.ghostBus.startPointPlaced && !state.ghostBus.endPointPlaced) {
          const useSnap = p.keyIsDown(p.SHIFT);
          state.ghostBus.endPoint = getGhostWireEndPoint(
            { x, y },
            state.ghostBus.startPoint,
            state.ghostBus.waypoints,
            useSnap,
          );
        }
      }
      let status = wouldBusOverlap(state.ghostBus, renderNodes, busNodes) ? "invalid" : "valid";
      drawGhostBus(state.ghostBus, p, status);
    }
    if (state.drawingWire) {
      const startPoint = getGhostWireStartPoint(
        state.drawingWire.originType,
        state.drawingWire.source,
        nodeMap,
        busMap,
      );
      const useSnap = p.keyIsDown(p.SHIFT);
      const endPoint = getGhostWireEndPoint(
        mouse,
        startPoint,
        state.ghostWire,
        useSnap,
      );

      drawGhostPath(startPoint, state.ghostWire, endPoint, p);
    }

    // ── Draw tooltip last so it renders on top of everything ──
    if (tooltipState.active && tooltipState.opacity > 0) {
      drawPortTooltip(tooltipState.label, tooltipState.portPosition, tooltipState.opacity, tooltipState.portType, p);
    }

    drawMinimap(p, renderNodes, busNodes, wires, state, nodeMap, busMap);
  }
}

new p5(sketch);


function computeGridBufferCoords() {
  const scaledSpacing = GRID_SIZE * state.zoom;
  let x = state.cameraX % scaledSpacing;
  let y = state.cameraY % scaledSpacing;
  if (x > 0) x -= scaledSpacing;
  if (y > 0) y -= scaledSpacing;
  return { x, y };
}

function updateGridBuffer(p, gridBuffer, theme) {
  const scaledSpacing = GRID_SIZE * state.zoom;
  const scaledOffset = (GRID_OFFSET * state.zoom) % scaledSpacing;

  gridBuffer.background(theme.canvas.bg.hex);
  gridBuffer.stroke(theme.canvas.grid.hex);
  gridBuffer.strokeWeight(GRID_DOT_SIZE);

  for (let i = scaledOffset; i < gridBuffer.width; i += scaledSpacing) {
    for (let j = scaledOffset; j < gridBuffer.height; j += scaledSpacing) {
      gridBuffer.point(i, j);
    }
  }
}