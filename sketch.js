import { state } from "./state.js";
import { drawGate, drawWaypoint, drawInputPorts, drawOutputPorts, drawWire } from "./render/draw.js";
import { registerMouseHandlers, isNearWaypoint } from "./input/mouseHandlers.js";
import { initToolbar } from "./ui/toolbar.js";
import { getActiveTheme, applyTheme } from "./render/theme.js";

applyTheme(getActiveTheme());

let mouse = { x: 0, y: 0 };

const canvasHost = document.querySelector(".canvas-host");
const WIDTH = canvasHost.clientWidth;
const HEIGHT = canvasHost.clientHeight;

let renderNodes = [];
let wires = [];

const sketch = (p) => {
  p.setup = function () {
    const cnv = p.createCanvas(WIDTH, HEIGHT);
    cnv.parent(canvasHost);
    initToolbar(p, renderNodes, wires);
  }

  p.draw = function () {
    mouse.x = p.mouseX;
    mouse.y = p.mouseY;
    const theme = getActiveTheme();
    p.background(theme.canvas.bg.hex);
    for (let i = 0; i < renderNodes.length; i++) {
      drawGate(renderNodes[i], p);
    }
    drawOutputPorts(renderNodes, p);
    drawInputPorts(renderNodes, p);
    for (let i = 0; i < wires.length; i++) {
      drawWire(renderNodes, wires[i], p);
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
      const node = state.drawingWire.fromNode;
      let start;
      if (node.gate.type === "composite") {
        const index = state.drawingWire.fromOutputIndex;
        const outputCount = node.gate.outputCount;
        start = node.getOutputPortByIndex(index, outputCount);
      } else {
        start = state.drawingWire.fromNode.getOutputPort();
      }
      p.stroke(theme.wires.ghost.hex);
      p.strokeWeight(3);
      p.line(start.x, start.y, p.mouseX, p.mouseY);
      p.stroke(0);
      p.strokeWeight(1);
    }
  }

  registerMouseHandlers(p, renderNodes, wires);
}

new p5(sketch);
