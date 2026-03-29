import { Input } from "./logic/gates.js";
import { settleCircuit, evaluateAll } from "./logic/evaluate.js";
import { FREQUENCY } from "./constants.js";
import { state } from "./state.js";
import { createNode } from "./render/RenderPoint.js";
import { computeWayPoints, reComputeWayPoint } from "./render/wireGeometry.js";
import { drawGate, drawWire } from "./render/draw.js";

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

function init_wire(wire) {
  let waypoints = computeWayPoints(renderNodes, wire);
  return {wire: wire, waypoints: waypoints};
}

function isNearPort(mouseX, mouseY, port, p) {
  const d = p.dist(mouseX, mouseY, port.x, port.y);
  return d < 15;
}

function findNearOutputPort(mx, my, p) {
  for (let i = 0; i < renderNodes.length; i++) {
    const port = renderNodes[i].getOutputPort();
    if (isNearPort(mx, my, port, p)) {
      return { fromNode: renderNodes[i] };
    }
  }
  return null;
}

function findNearInputPort(mx, my, p) {
  for (let i = 0; i < renderNodes.length; i++) {
    if (renderNodes[i].gate instanceof Input) continue;
    const totalInputs = renderNodes[i].gate.inputs.length + 1;

    for (let j = 0; j < totalInputs; j++) {
      const port = renderNodes[i].getInputPortByIndex(j, totalInputs);
      if (isNearPort(mx, my, port, p)) {
        return { toNode: renderNodes[i], index: j };
      }
    }
  }
  return null;
}

function isNearWaypoint(mx, my, waypoint, p) {
  const d = p.dist(mx, my, waypoint.x, waypoint.y);
  return d < 10;
}

function findNearWaypoint(mx, my, p) {
  for (let i = 0; i < wires.length; i++) {
    const waypointCount = wires[i].waypoints.length;
    for (let j = 0; j < waypointCount; j++) {
      if (isNearWaypoint(mx, my, wires[i].waypoints[j], p)) {
        let otherWaypoint = null;
        if (waypointCount === 2) {
          otherWaypoint = wires[i].waypoints[j === 0 ? 1 : 0];
        } else if (waypointCount === 4) {
          let otherIndex = 0;
          if (j === 0) otherIndex = 1;
          else if (j === 1) otherIndex = 0;
          else if (j === 2) otherIndex = 3;
          else if (j === 3) otherIndex = 2;
          otherWaypoint = wires[i].waypoints[otherIndex];
        }
        return { waypoint: wires[i].waypoints[j], otherWaypoint: otherWaypoint };
      }
    }
  }
  return null;
}


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

  p.mousePressed = function() {
    if (state.justPlacedFromToolbar) {
      state.justPlacedFromToolbar = false;
      return;
    }
    state.dragging = renderNodes.find(n => n.containsPoint(p.mouseX, p.mouseY));

    if (state.mode === "edit") {
      // Check input ports
      if (state.drawingWire) {
        let wireConnection = findNearInputPort(p.mouseX, p.mouseY, p);
        if (wireConnection) {
          let wire = wireConnection.toNode.gate.connect(state.drawingWire.fromNode.gate);
          let wire_info = init_wire(wire);
          wires.push(wire_info);
          for (let i = 0; i < wires.length; i++) {
            reComputeWayPoint(renderNodes, wires[i]);
          }
          state.drawingWire = null;
          settleCircuit(renderNodes, wires);
        } else {
          state.drawingWire = null;
        }
      } else {
        state.drawingWire = findNearOutputPort(p.mouseX, p.mouseY, p);
        state.changingWayPoint = findNearWaypoint(p.mouseX, p.mouseY, p);

        if (!state.drawingWire && !state.changingWayPoint && state.dragging) {
          state.offsetX = p.mouseX - state.dragging.x;
          state.offsetY = p.mouseY - state.dragging.y;

          let connectedInputWires = wires.filter(n => n.wire.to.id === state.dragging.gate.id);
          let connectedOutputWires = wires.filter(n => n.wire.from.id === state.dragging.gate.id);

          if (connectedInputWires || connectedOutputWires) {
            state.connectedWires = [];
            for (let i = 0; i < connectedInputWires.length; i++) {
              const lastWaypoint = connectedInputWires[i].waypoints.length - 1;
              state.connectedWires.push({
                wire: connectedInputWires[i],
                offsetX: p.mouseX - connectedInputWires[i].waypoints[lastWaypoint].x,
                offsetY: p.mouseY - connectedInputWires[i].waypoints[lastWaypoint].y,
                type: "input",
              });
            }

            for (let i = 0; i < connectedOutputWires.length; i++) {
              state.connectedWires.push({
                wire: connectedOutputWires[i],
                offsetX: p.mouseX - connectedOutputWires[i].waypoints[0].x,
                offsetY: p.mouseY - connectedOutputWires[i].waypoints[0].y,
                type: "output",
              });
            }
          }
        }
      }
    } else if (state.mode === "run") {
      if (state.dragging && state.dragging.gate.type === "input") {
        state.dragging.gate.setValue(!state.dragging.gate.output);
        evaluateAll(renderNodes, wires);
      } else if (state.dragging && state.dragging.gate.type === "clock") {
        if (state.intervalId !== null) {
          clearInterval(state.intervalId);
          state.intervalId = null;
          return;
        }
        const clockNode = state.dragging;
        const timeInterval = 1000 / (2 * FREQUENCY);
        state.intervalId = setInterval(() => {
          clockNode.gate.tick();
          evaluateAll(renderNodes, wires);
        }, timeInterval);

        setTimeout(() => {
          clearInterval(state.intervalId);
          state.intervalId = null;
        }, 10000);
      }
    } else if (state.mode === "placing") {
      state.mode = "edit";
      renderNodes.push(state.ghostNode);
      state.ghostNode = null;
      modeText.textContent = "Mode: Edit";
      document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
      document.getElementById("btn-edit").classList.add("active");
    } else if (state.mode === "delete") {
      if (state.dragging) {
        for (let i = 0; i < wires.length; i++) {
          if (wires[i].wire.from.id === state.dragging.gate.id) {
            wires[i].wire.to.inputs = wires[i].wire.to.inputs.filter(
              input => input.from.id !== state.dragging.gate.id
            );
          }
        }
        wires = wires.filter(n => n.wire.from.id !== state.dragging.gate.id && n.wire.to.id !== state.dragging.gate.id);
        renderNodes = renderNodes.filter(n => n !== state.dragging);
        for (let i = 0; i < wires.length; i++) {
          reComputeWayPoint(renderNodes, wires[i]);
        }

        settleCircuit(renderNodes, wires);
      }
    }
  }

  p.mouseDragged = function() {
    if (state.mode === "edit") {
      if (state.dragging) {
        state.dragging.x = p.mouseX - state.offsetX;
        state.dragging.y = p.mouseY - state.offsetY;

        if (state.connectedWires) {
          for (let i = 0; i < state.connectedWires.length; i++) {
            const lastWaypoint = state.connectedWires[i].wire.waypoints.length - 1;
            const firstWaypoint = 0;
            if (state.connectedWires[i].type === "input") {
              state.connectedWires[i].wire.waypoints[lastWaypoint].y = p.mouseY - state.connectedWires[i].offsetY;
            } else if (state.connectedWires[i].type === "output") {
              state.connectedWires[i].wire.waypoints[firstWaypoint].y = p.mouseY - state.connectedWires[i].offsetY;
            }
          }
        }
      }
      if (state.changingWayPoint) {
        state.changingWayPoint.waypoint.x = p.mouseX;
        state.changingWayPoint.waypoint.y = p.mouseY;
        state.changingWayPoint.otherWaypoint.x = state.changingWayPoint.waypoint.x;
      }
    }
  }

  p.mouseReleased = function() {
    state.dragging = null;
    state.offsetX = 0;
    state.offsetY = 0;
  }
}

new p5(sketch);
