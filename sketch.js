class RenderPoint {
  constructor(gate, x, y) {
    this.gate = gate;
    this.x = x;
    this.y = y;
    this.width = 60;
    this.height = 40;
  }

  containsPoint(px, py) {
    return (
      px >= this.x &&
      px <= this.x + this.width &&
      py >= this.y &&
      py <= this.y + this.height
    );
  }

  getOutputPort() {
    return {
      x: this.x + this.width,
      y: this.y + this.height / 2
    };
  }

  getInputPort(wire) {
    const index = this.gate.inputs.indexOf(wire);
    const inputCount = this.gate.inputs.length;
    const spacing = this.height / inputCount;

    return {
      x: this.x,
      y: this.y + spacing * index + spacing / 2
    };
  }

  getInputPortByIndex(index, totalInputs) {
    const spacing = this.height / totalInputs;
    return {
      x: this.x,
      y: this.y + spacing * index + spacing / 2
    };
  }
}

let mode = "edit";

const modeText = document.getElementById("modeDisplay");

// Segmented mode switcher
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    mode = btn.dataset.mode;
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    modeText.textContent = `Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`;
  });
});

const canvasHost = document.querySelector(".canvas-host");
const WIDTH = canvasHost.clientWidth;
const HEIGHT = canvasHost.clientHeight;

let justPlacedFromToolbar = false;
const buttons = document.querySelectorAll(".addComponent");

buttons.forEach(button => {
  button.addEventListener("click", function () {
    const type = button.dataset.type;
    justPlacedFromToolbar = true;
    createNode(type);
  });
});

let ghostNode = null;

function createNode(type) {
  const newGate = type === "input" ? new Input(false) : type === "output" ? new Output() : new Gate(type, []);
  ghostNode = new RenderPoint(newGate, mouseX, mouseY);
  mode = "placing";
  modeText.textContent = "Mode: Placing";
}

let renderNodes = [];
let wires = [];

evaluateAll(renderNodes);

function drawGate(renderNode) {
  let color = renderNode.gate.output ? "green" : "red";
  fill(color);
  rect(renderNode.x, renderNode.y, renderNode.width, renderNode.height);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(20);
  text(`${renderNode.gate.type}`, renderNode.x + renderNode.width / 2, renderNode.y + renderNode.height / 2);
}

function getWirePorts(wire) {
  const fromNode = renderNodes.find(n => n.gate.id === wire.from.id);
  const toNode = renderNodes.find(n => n.gate.id === wire.to.id);

  const start = fromNode.getOutputPort();
  const end = toNode.getInputPort(wire);

  return {start: start, end: end};
}

function computeWayPoints(wire) {
  let ports = getWirePorts(wire);
  let spacing = (wire.to.inputs.length + 1) * 5;
  let waypoint_1 = {x: ports.end.x - spacing, y: ports.start.y};
  let waypoint_2 = {x: waypoint_1.x, y: ports.end.y};
  return {waypoint_1: waypoint_1, waypoint_2: waypoint_2};
}

function reComputeWayPoint(wire_info) {
  let newWayPoints = computeWayPoints(wire_info.wire);
  wire_info.waypoint_2.y = newWayPoints.waypoint_2.y;
}

function init_wire(wire) {
  let waypoints = computeWayPoints(wire);

  return {wire: wire, waypoint_1: waypoints.waypoint_1, waypoint_2: waypoints.waypoint_2};
}

function drawWire(wire_info) {
  const ports = getWirePorts(wire_info.wire);
  strokeWeight(3);

  if (wire_info.wire.from.output) stroke(0, 200, 0);
  else stroke(255, 0, 0);

  line(ports.start.x, ports.start.y, wire_info.waypoint_1.x, wire_info.waypoint_1.y);
  line(wire_info.waypoint_1.x, wire_info.waypoint_1.y, wire_info.waypoint_2.x, wire_info.waypoint_2.y);
  line(wire_info.waypoint_2.x, wire_info.waypoint_2.y, ports.end.x, ports.end.y);

  stroke(0);
  strokeWeight(1);
}

let dragging = null;
let offsetX = 0;
let offsetY = 0;

let drawingWire = null;

let changingWayPoint = null;

let connectedWires = null;

function isNearPort(mouseX, mouseY, port) {
  const d = dist(mouseX, mouseY, port.x, port.y);
  return d < 15;
}

function findNearOutputPort(mx, my) {
  for (let i = 0; i < renderNodes.length; i++) {
    const port = renderNodes[i].getOutputPort();
    if (isNearPort(mx, my, port)) {
      return { fromNode: renderNodes[i] };
    }
  }
  return null;
}

function findNearInputPort(mx, my) {
  for (let i = 0; i < renderNodes.length; i++) {
    if (renderNodes[i].gate instanceof Input) continue;
    const totalInputs = renderNodes[i].gate.inputs.length + 1;

    for (let j = 0; j < totalInputs; j++) {
      const port = renderNodes[i].getInputPortByIndex(j, totalInputs);
      if (isNearPort(mx, my, port)) {
        return { toNode: renderNodes[i], index: j };
      }
    }
  }
  return null;
}

function isNearWaypoint(mx, my, waypoint) {
  const d = dist(mx, my, waypoint.x, waypoint.y);
  return d < 10;
}

function findNearWaypoint(mx, my) {
  for (let i = 0; i < wires.length; i++) {
    if (isNearWaypoint(mx, my, wires[i].waypoint_1)) {
      return { waypoint: wires[i].waypoint_1, otherWaypoint: wires[i].waypoint_2 };
    } else if (isNearWaypoint(mx, my, wires[i].waypoint_2)) {
      return { waypoint: wires[i].waypoint_2, otherWaypoint: wires[i].waypoint_1 };
    }
  }
  return null;
}

function mousePressed() {
  if (justPlacedFromToolbar) {
    justPlacedFromToolbar = false;
    return;
  }
  dragging = renderNodes.find(n => n.containsPoint(mouseX, mouseY));

  if (mode === "edit") {
    // Check input ports
    if (drawingWire) {
      wireConnection = findNearInputPort(mouseX, mouseY);
      if (wireConnection) {
        let wire = wireConnection.toNode.gate.connect(drawingWire.fromNode.gate);
        let wire_info = init_wire(wire);
        wires.push(wire_info);
        for (let i = 0; i < wires.length; i++) {
          reComputeWayPoint(wires[i]);
        }
        drawingWire = null;
        evaluateAll(renderNodes);
      } else {
        drawingWire = null;
      }
    } else {
      drawingWire = findNearOutputPort(mouseX, mouseY);
      changingWayPoint = findNearWaypoint(mouseX, mouseY);

      if (!drawingWire && !changingWayPoint && dragging) {
        offsetX = mouseX - dragging.x;
        offsetY = mouseY - dragging.y;

        let connectedInputWires = wires.filter(n => n.wire.to.id === dragging.gate.id);
        let connectedOutputWires = wires.filter(n => n.wire.from.id === dragging.gate.id);

        if (connectedInputWires || connectedOutputWires) {
          connectedWires = [];
          for (let i = 0; i < connectedInputWires.length; i++) {
            connectedWires.push({
              wire: connectedInputWires[i],
              offsetX: mouseX - connectedInputWires[i].waypoint_2.x,
              offsetY: mouseY - connectedInputWires[i].waypoint_2.y,
              type: "input",
            });
          }

          for (let i = 0; i < connectedOutputWires.length; i++) {
            connectedWires.push({
              wire: connectedOutputWires[i],
              offsetX: mouseX - connectedOutputWires[i].waypoint_1.x,
              offsetY: mouseY - connectedOutputWires[i].waypoint_1.y,
              type: "output",
            });
          }
        }
      }
    }
  } else if (mode === "run") {
    if (dragging && dragging.gate.type === "input") {
      dragging.gate.setValue(!dragging.gate.output);
      evaluateAll(renderNodes);
    }
  } else if (mode === "placing") {
    mode = "edit";
    renderNodes.push(ghostNode);
    ghostNode = null;
    modeText.textContent = "Mode: Edit";
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("btn-edit").classList.add("active");
  } else if (mode === "delete") {
    if (dragging) {
      for (let i = 0; i < wires.length; i++) {
        if (wires[i].wire.from.id === dragging.gate.id) {
          wires[i].wire.to.inputs = wires[i].wire.to.inputs.filter(
            input => input.from.id !== dragging.gate.id
          );
        }
      }
      wires = wires.filter(n => n.wire.from.id !== dragging.gate.id && n.wire.to.id !== dragging.gate.id);
      renderNodes = renderNodes.filter(n => n !== dragging);
      for (let i = 0; i < wires.length; i++) {
        reComputeWayPoint(wires[i]);
      }
    }
  }
}

function mouseDragged() {
  if (mode === "edit") {
    if (dragging) {
      dragging.x = mouseX - offsetX;
      dragging.y = mouseY - offsetY;

      if (connectedWires) {
        for (let i = 0; i < connectedWires.length; i++) {
          if (connectedWires[i].type === "input") {
            connectedWires[i].wire.waypoint_2.y = mouseY - connectedWires[i].offsetY;
          } else if (connectedWires[i].type === "output") {
            connectedWires[i].wire.waypoint_1.y = mouseY - connectedWires[i].offsetY;
          }
        }
      }
    }
    if (changingWayPoint) {
      changingWayPoint.waypoint.x = mouseX;
      changingWayPoint.waypoint.y = mouseY;
      changingWayPoint.otherWaypoint.x = changingWayPoint.waypoint.x;
    }
  }
}

function mouseReleased() {
  dragging = null;
  offsetX = 0;
  offsetY = 0;
}

function setup() {
  const cnv = createCanvas(WIDTH, HEIGHT);
  cnv.parent(canvasHost);
}

function draw() {
  // background(15, 23, 42);
  background(220);
  for (let i = 0; i < renderNodes.length; i++) {
    drawGate(renderNodes[i]);
    const port = renderNodes[i].getOutputPort();
    circle(port.x, port.y, 12);
  }
  for (let i = 0; i < wires.length; i++) {
    drawWire(wires[i]);
  }
  if (ghostNode) {
    drawGate(ghostNode);
    if (mode === "placing") {
      ghostNode.x = mouseX;
      ghostNode.y = mouseY;
    }
  }
  if (drawingWire) {
    let start = drawingWire.fromNode.getOutputPort();
    line(start.x, start.y, mouseX, mouseY);
  }
}
