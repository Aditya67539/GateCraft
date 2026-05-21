import { state } from "./state.js";
import { drawGate, drawWaypoint, drawGhostWire, drawInputPorts, drawOutputPorts, drawWire, setFont, createGrid } from "./render/draw.js";
import { registerMouseHandlers, isNearWaypoint } from "./input/mouseHandlers.js";
import { initToolbar } from "./ui/toolbar.js";
import { getActiveTheme, applyTheme } from "./render/theme.js";
import { CircuitBuilder } from "./logic/CircuitBuilder.js";
import { nodeMap } from "./input/mouseHandlers.js";

let gridBuffer;
applyTheme(getActiveTheme());

let mouse = { x: 0, y: 0 };

const canvasHost = document.querySelector(".canvas-host");
const WIDTH = canvasHost.clientWidth;
const HEIGHT = canvasHost.clientHeight;

let renderNodes = [];
let wires = [];
let circuit = new CircuitBuilder();

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
    p.image(gridBuffer, 0, 0);
    setFont(theme, p);
    for (let i = 0; i < renderNodes.length; i++) {
      drawGate(renderNodes[i], p);
    }
    drawOutputPorts(renderNodes, p);
    drawInputPorts(renderNodes, p);
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
      drawGate(state.ghostNode, p);
      if (state.mode === "placing") {
        state.ghostNode.x = p.mouseX;
        state.ghostNode.y = p.mouseY;
      }
    }
    if (state.drawingWire) {
      drawGhostWire(state.drawingWire, p);
    }
  }

  registerMouseHandlers(p, circuit, renderNodes, wires);
}

new p5(sketch);
