import p5 from "p5";
import { state, screenToWorld } from "./state.js";
import { drawGate, drawWaypoint, drawWire, drawPortTooltip, setFont, drawDynamicGrid, drawGhostPath, drawBus, drawGhostBus, drawGhostWaypoint } from "./render/draw.js";
import { registerMouseHandlers, isNearPoint, busMap, nodeMap, getWireAtPoint, getBusAtPoint, getEffectiveMousePosition } from "./input/mouseHandlers.js";
import { initToolbar } from "./ui/toolbar.js";
import { getActiveTheme, applyTheme } from "./render/theme.js";
import { CircuitBuilder } from "./logic/CircuitBuilder.js";
import { snapPointToGrid, wouldBusOverlap, wouldOverlap } from "./render/RenderNode.js";
import { registerKeyboardHandlers } from "./input/keyboardHandlers.js";
import { drawMinimap } from "./render/minimap.js";
import { getGhostWireEndPoint, getGhostWireStartPoint, projectPointOntoSegment } from "./render/wireGeometry.js";
import { canWireConnectToTarget } from "./logic/wire.js";
import { GATE_CATEGORIES, WAYPOINT_DETECTION_THRESHOLD, PORT_DETECTION_THRESHOLD, WAYPOINT_INSERTION_THRESHOLD_SQ, TOOLTIP_FADE_SPEED } from "./constants.js";

applyTheme(getActiveTheme());

const canvasHost = document.querySelector(".canvas-host");
const WIDTH = canvasHost.clientWidth;
const HEIGHT = canvasHost.clientHeight;

let renderNodes = [];
let wires = [];
let busNodes = [];
let circuit = new CircuitBuilder();
let wireDependents = new Map();

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

    const theme = getActiveTheme();    
  }

  p.draw = function () {
    const world = screenToWorld(p.mouseX, p.mouseY);
    const mouse = getEffectiveMousePosition(
      world,
      state.interaction.wireCreation,
      state.ghost.wire,
      circuit,
      renderNodes,
      busNodes,
      nodeMap,
      busMap,
      p,
    );
    const theme = getActiveTheme();
    p.background(theme.canvas.bg.hex);

    drawDynamicGrid(p, theme, state.camera.x, state.camera.y, state.camera.zoom);
    p.translate(state.camera.x, state.camera.y);
    p.scale(state.camera.zoom);

    setFont(theme, p);

    const hoveredBus = getBusAtPoint(mouse.x, mouse.y, busNodes);

    for (let i = 0; i < busNodes.length; i++) {
      const busNode = busNodes[i];
      const isContextTarget = state.ui.contextMenuTarget?.type === "bus" &&
        state.ui.contextMenuTarget.source.bus.id === busNode.bus.id;
      const isEditorTarget = state.wireEditing.target?.type === "bus" &&
        state.wireEditing.target.source.bus.id === busNode.bus.id;
      const isHovered = hoveredBus?.bus.id === busNode.bus.id;
      const highlighted = isContextTarget || (
        !state.ui.contextMenuTarget && !state.isInteractionBlocked() &&
        (state.wireEditing.active ? isEditorTarget : isHovered) &&
        (
          !state.interaction.wireCreation || 
          canWireConnectToTarget(
            circuit,
            state.interaction.wireCreation,
            { destinationType: "bus", destination: { busNode } }
          )
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
      state.ui.tooltip.active = true;
      state.ui.tooltip.label = hoveredLabel;
      state.ui.tooltip.node = hoveredNode;
      state.ui.tooltip.port.index = hoveredPortIndex;
      state.ui.tooltip.port.position = hoveredPortPosition;
      state.ui.tooltip.port.type = portType;
      state.ui.tooltip.opacity = Math.min(1, state.ui.tooltip.opacity + TOOLTIP_FADE_SPEED * dt);
    } else {
      state.ui.tooltip.opacity = Math.max(0, state.ui.tooltip.opacity - TOOLTIP_FADE_SPEED * dt);
      if (state.ui.tooltip.opacity <= 0) {
        state.ui.tooltip.reset();
      }
    }

    for (let i = 0; i < renderNodes.length; i++) {
      const node = renderNodes[i];
      let nodeStatus = null;
      const isContextTarget = state.ui.contextMenuTarget?.type === "gate" &&
        state.ui.contextMenuTarget.source.gate.id === node.gate.id;
      if (state.interaction.target && node === state.interaction.target) {
        // Actively dragging — show overlap feedback
        nodeStatus = wouldOverlap(state.interaction.target, renderNodes, busNodes, state.interaction.target.gate.id)
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
      const isContextTarget = state.ui.contextMenuTarget?.type === "wire" &&
        state.ui.contextMenuTarget.source.wire.id === conn.wire.id;
      const isEditorTarget = state.wireEditing.target?.type === "wire" &&
        state.wireEditing.target.source.wire.id === conn.wire.id;
      const isHovered = hoveredWire?.conn.wire.id === conn.wire.id;
      const highlighted = isContextTarget || (
        !state.ui.contextMenuTarget &&
        !state.interaction.wireCreation &&
        !state.isInteractionBlocked() &&
        (state.wireEditing.active ? isEditorTarget : isHovered)
      );
      drawWire(conn, nodeMap, busMap, p, highlighted);
    }

    if (state.wireEditing.active) {
      const signal = state.wireEditing.target.type === "wire"
        ? state.wireEditing.target.source.wire.signal
        : state.wireEditing.target.source.bus.output;
      const target = state.wireEditing.target.type === "wire"
        ? wires.find(n => n.wire.id === state.wireEditing.target.source.wire.id)
        : busNodes.find(n => n.bus.id === state.wireEditing.target.source.bus.id);

      if (target) {
        const { start, waypoints, end } = target.getPoints(nodeMap, busMap);
        const points = [ start, ...waypoints, end ];

        let bestGhost = null;
        state.wireEditing.waypoint.insert.reset();

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
              state.wireEditing.waypoint.insert.index = i;
              state.wireEditing.waypoint.insert.point = nearestPoint;
            }
          }
        }

        if (bestGhost) {
          drawGhostWaypoint(signal, bestGhost.point, p);
        }
      }
    }

    if (state.ghost.node) {
      let status = wouldOverlap(state.ghost.node, renderNodes, busNodes, null) ? "invalid" : "valid";
      drawGate(state.ghost.node, p, status);
      if (state.mode === "placing") {
        const { x, y } = snapPointToGrid(mouse.x, mouse.y);
        state.ghost.node.x = x;
        state.ghost.node.y = y;
      }
    }
    if (state.ghost.bus) {
      if (state.mode === "placing") {
        const { x, y } = snapPointToGrid(mouse.x, mouse.y);
        if (!state.ghost.bus.startPointPlaced && !state.ghost.bus.endPointPlaced) {
          state.ghost.bus.startPoint.x = state.ghost.bus.endPoint.x = x;
          state.ghost.bus.startPoint.y = state.ghost.bus.endPoint.y = y;
        } else if (state.ghost.bus.startPointPlaced && !state.ghost.bus.endPointPlaced) {
          const useSnap = p.keyIsDown(p.SHIFT);
          state.ghost.bus.endPoint = getGhostWireEndPoint(
            { x, y },
            state.ghost.bus.startPoint,
            state.ghost.bus.waypoints,
            useSnap,
          );
        }
      }
      let status = wouldBusOverlap(state.ghost.bus, renderNodes, busNodes) ? "invalid" : "valid";
      drawGhostBus(state.ghost.bus, p, status);
    }
    if (state.interaction.wireCreation) {
      const startPoint = getGhostWireStartPoint(
        state.interaction.wireCreation.originType,
        state.interaction.wireCreation.origin,
        nodeMap,
        busMap,
      );
      const useSnap = p.keyIsDown(p.SHIFT);
      const endPoint = getGhostWireEndPoint(
        mouse,
        startPoint,
        state.ghost.wire,
        useSnap,
      );

      drawGhostPath(startPoint, state.ghost.wire, endPoint, p);
    }

    // ── Draw tooltip last so it renders on top of everything ──
    if (!state.isInteractionBlocked() && state.ui.tooltip.active && state.ui.tooltip.opacity > 0) {
      drawPortTooltip(
        state.ui.tooltip.label,
        state.ui.tooltip.port.position,
        state.ui.tooltip.opacity,
        state.ui.tooltip.port.type,
        p
      );
    }

    drawMinimap(p, renderNodes, busNodes, wires, state, nodeMap, busMap);
  }
}

new p5(sketch);
