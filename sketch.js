import { Input } from "./logic/gates.js";
import { state } from "./state.js";
import { createNode } from "./render/RenderPoint.js";
import { computeWayPoints } from "./render/wireGeometry.js";
import { drawGate, drawWire } from "./render/draw.js";
import { registerMouseHandlers } from "./input/mouseHandlers.js";

let mouse = { x: 0, y: 0 };

export const modeText = document.getElementById("modeDisplay");

// Segmented mode switcher
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    state.mode = btn.dataset.mode;
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    modeText.textContent = `Mode: ${state.mode.charAt(0).toUpperCase() + state.mode.slice(1)}`;
  });
});

const canvasHost = document.querySelector(".canvas-host");
const WIDTH = canvasHost.clientWidth;
const HEIGHT = canvasHost.clientHeight;

const buttons = document.querySelectorAll(".addComponent");

buttons.forEach(button => {
  button.addEventListener("click", function () {
    const type = button.dataset.type;
    state.justPlacedFromToolbar = true;
    createNode(type, mouse.x, mouse.y);
  });
});

let renderNodes = [];
let wires = [];

const sketch = (p) => {
  p.setup = function() {
    const cnv = p.createCanvas(WIDTH, HEIGHT);
    cnv.parent(canvasHost);
  }

  p.draw = function() {
    mouse.x = p.mouseX;
    mouse.y = p.mouseY;
    p.background(220);
    for (let i = 0; i < renderNodes.length; i++) {
      drawGate(renderNodes[i], p);
      const port = renderNodes[i].getOutputPort();
      p.circle(port.x, port.y, 12);
    }
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
