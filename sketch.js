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

document.getElementById("toggle").addEventListener("click", function() {
  if (mode === "run") {
    mode = "edit";
    modeText.innerHTML = "Current mode: Edit";
  }
  else if (mode === "edit") {
    mode = "run";
    modeText.innerHTML = "Current mode: Run";
  }
});

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

let justPlacedFromToolbar = false;
const buttons = document.querySelectorAll(".addComponent");

buttons.forEach(button => {
  button.addEventListener("click", function() {
    const type = button.dataset.type;
    justPlacedFromToolbar = true;
    createNode(type);
  });
});

let ghostNode = null;

function createNode(type) {
  const newGate = new Gate(type, []);
  ghostNode = new RenderPoint(newGate, mouseX, mouseY);
  mode = "placing";
  modeText.innerHTML = "Current mode: Placing";
  console.log(mouseX, mouseY);
}

let gate = new Gate("and", []);
let input1 = new Input(true);
let input2 = new Input(true);

let output = new Output();

let wire1 = gate.connect(input1);
let wire2 = gate.connect(input2);
let wire3 = output.connect(gate);

let renderNodes = [new RenderPoint(gate, 400, 300), new RenderPoint(input1, 300, 250), new RenderPoint(input2, 300, 350), new RenderPoint(output, 500, 300)];
let wires = [wire1, wire2, wire3];

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

function drawWire(wire) {
  const fromNode = renderNodes.find(n => n.gate.id === wire.from.id);
  const toNode = renderNodes.find(n => n.gate.id === wire.to.id);

  const start = fromNode.getOutputPort();
  const end = toNode.getInputPort(wire);

  line(start.x, start.y, end.x, end.y);
}

let dragging = null;
let offsetX = 0;
let offsetY = 0;

let drawingWire = null;

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
        wires.push(wire);
        drawingWire = null;
        evaluateAll(renderNodes);
      } else {
        drawingWire = null;
      }
    } else {
      drawingWire = findNearOutputPort(mouseX, mouseY);

      if (!drawingWire && dragging) {
        offsetX = mouseX - dragging.x;
        offsetY = mouseY - dragging.y;
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
    modeText.innerHTML = "Current mode: Edit";
  } else if (mode === "delete") {
    if (dragging) {
      for (let i = 0; i < wires.length; i++) {
        if (wires[i].from.id === dragging.gate.id) {
          wires[i].to.inputs = wires[i].to.inputs.filter(
            input => input.from.id !== dragging.gate.id
          );
        }
      }
      wires = wires.filter(n => n.from.id !== dragging.gate.id && n.to.id !== dragging.gate.id);
      renderNodes = renderNodes.filter(n => n !== dragging);
    }
  }
}

function mouseDragged() {
  if (mode === "edit") {
    if (dragging) {
      dragging.x = mouseX - offsetX;
      dragging.y = mouseY - offsetY;
    }
  }
}

function mouseReleased() {
  dragging = null;
  offsetX = 0;
  offsetY = 0;
}

function setup() {
  createCanvas(WIDTH, HEIGHT);
}

function draw() {
  background(203, 203, 203);
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
