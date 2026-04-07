import { state } from "./state.js";
import { drawGate, drawInputPorts, drawOutputPorts, drawWire } from "./render/draw.js";
import { registerMouseHandlers } from "./input/mouseHandlers.js";
import { initToolbar } from "./ui/toolbar.js";

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
    p.background(220);
    for (let i = 0; i < renderNodes.length; i++) {
      drawGate(renderNodes[i], p);
    }
    drawOutputPorts(renderNodes, p);
    drawInputPorts(renderNodes, p);
    for (let i = 0; i < wires.length; i++) {
      drawWire(renderNodes, wires[i], p);
    }
    if (state.ghostNode) {
      drawGate(state.ghostNode, p);
      if (state.mode === "placing") {
        state.ghostNode.x = p.mouseX;
        state.ghostNode.y = p.mouseY;
      }
    }
    if (state.drawingWire) {
      let start = state.drawingWire.fromNode.getOutputPort();
      p.line(start.x, start.y, p.mouseX, p.mouseY);
    }
  }
  
  registerMouseHandlers(p, renderNodes, wires);
}

new p5(sketch);
