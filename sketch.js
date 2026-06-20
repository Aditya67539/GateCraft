import { state } from "./state.js";
import { drawGate, drawWaypoint, drawGhostWire, drawWire, drawPortTooltip, setFont, createGrid } from "./render/draw.js";
import { registerMouseHandlers, isNearWaypoint, isNearPort } from "./input/mouseHandlers.js";
import { initToolbar } from "./ui/toolbar.js";
import { getActiveTheme, applyTheme } from "./render/theme.js";
import { CircuitBuilder } from "./logic/CircuitBuilder.js";
import { nodeMap } from "./input/mouseHandlers.js";
import { GRID_OFFSET, GRID_SIZE } from "./constants.js";
import { snapPointToGrid, wouldOverlap } from "./render/RenderPoint.js";

let gridBuffer;
applyTheme(getActiveTheme());

let mouse = { x: 0, y: 0 };

const canvasHost = document.querySelector(".canvas-host");
const WIDTH = canvasHost.clientWidth;
const HEIGHT = canvasHost.clientHeight;

let renderNodes = [];
let wires = [];
let circuit = new CircuitBuilder();

// ── Port tooltip hover state ──────────────────────────────────
// Tracks the currently hovered port for smooth fade-in/out animation
let tooltipState = {
  active: false,        // is a port currently hovered?
  label: "",            // gate.label || gate.type
  port: { x: 0, y: 0 }, // port position
  opacity: 0,           // animation progress 0 → 1
  portType: "",         // input port || output port
};
const TOOLTIP_FADE_SPEED = 6; // units per second (reaches 1.0 in ~167ms)

const sketch = (p) => {
  p.setup = function () {
    const cnv = p.createCanvas(WIDTH, HEIGHT);
    cnv.parent(canvasHost);
    initToolbar(p, circuit, renderNodes, wires);

    const theme = getActiveTheme();    
    gridBuffer = createGrid(WIDTH, HEIGHT, theme, GRID_OFFSET, GRID_SIZE, p);
  }

  p.draw = function () {
    mouse.x = p.mouseX;
    mouse.y = p.mouseY;
    const theme = getActiveTheme();
    p.background(theme.canvas.bg.hex);
    if (state.gridDirty) {
      gridBuffer = createGrid(WIDTH, HEIGHT, theme, GRID_OFFSET, GRID_SIZE, p);
      state.gridDirty = false;
    }
    p.image(gridBuffer, 0, 0);
    setFont(theme, p);
    for (let i = 0; i < renderNodes.length; i++) {
      let nodeStatus = null;
      if (state.dragging && renderNodes[i] === state.dragging) {
        // Actively dragging — show overlap feedback
        nodeStatus = wouldOverlap(state.dragging, renderNodes, state.dragging.gate.id)
          ? "invalid"
          : "selected";
      } else if (state.selectedNode && renderNodes[i] === state.selectedNode) {
        // Persistently selected (not being dragged)
        nodeStatus = "selected";
      }
      drawGate(renderNodes[i], p, nodeStatus);
    }

    // ── Detect hovered port for tooltip ──────────────────────
    let hoveredPort = null;
    let hoveredLabel = "";
    let portType = "";
    for (let i = 0; i < renderNodes.length; i++) {
      const gate = renderNodes[i].gate;
      const totalInputs = gate.inputCount;
      const totalOutputs = gate.outputCount;

      if (totalInputs !== 0) {
        for (let j = 0; j < totalInputs; j++) {
          const port = renderNodes[i].getInputPortByIndex(j, totalInputs);
          if (isNearPort(mouse.x, mouse.y, port, p)) {
            hoveredPort = port;
            if (
              gate.type === "composite" &&
              gate.internalInputs &&
              gate.internalInputs[j] &&
              gate.internalInputs[j].label
            ) {
              hoveredLabel = gate.internalInputs[j].label;
            } else {
              hoveredLabel = "in";
            }
            portType = "input";
          }
        }
      }

      if (totalOutputs !== 0) {
        for (let j = 0; j < totalOutputs; j++) {
          const port = renderNodes[i].getOutputPortByIndex(j, totalOutputs);
          if (isNearPort(mouse.x, mouse.y, port, p)) {
            hoveredPort = port;
            if (
              gate.type === "composite" &&
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
    if (hoveredPort) {
      tooltipState.active = true;
      tooltipState.label = hoveredLabel;
      tooltipState.port = hoveredPort;
      tooltipState.portType = portType;
      tooltipState.opacity = Math.min(1, tooltipState.opacity + TOOLTIP_FADE_SPEED * dt);
    } else {
      tooltipState.opacity = Math.max(0, tooltipState.opacity - TOOLTIP_FADE_SPEED * dt);
      if (tooltipState.opacity <= 0) {
        tooltipState.active = false;
      }
    }

    for (let i = 0; i < wires.length; i++) {
      drawWire(renderNodes, wires[i], nodeMap, p);
      if (state.mode === "edit") {
        for (const waypoint of wires[i].waypoints) {
          if (isNearWaypoint(mouse.x, mouse.y, waypoint, p)) {
            drawWaypoint(wires[i], waypoint, p);
          }
        }
      }
    }
    if (state.ghostNode) {
      let status = wouldOverlap(state.ghostNode, renderNodes) ? "invalid" : "valid";
      drawGate(state.ghostNode, p, status);
      if (state.mode === "placing") {
        const { x, y } = snapPointToGrid(p.mouseX, p.mouseY);
        state.ghostNode.x = x;
        state.ghostNode.y = y;
      }
    }
    if (state.drawingWire) {
      drawGhostWire(state.drawingWire, p);
    }

    // ── Draw tooltip last so it renders on top of everything ──
    if (tooltipState.active && tooltipState.opacity > 0) {
      drawPortTooltip(tooltipState.label, tooltipState.port, tooltipState.opacity, tooltipState.portType, p);
    }
  }

  registerMouseHandlers(p, circuit, renderNodes, wires);
}

new p5(sketch);
