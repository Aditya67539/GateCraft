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

  getInputPort(index) {
    const inputCount = this.gate.inputs.length;
    const spacing = this.height / inputCount;

    return {
      x: this.x,
      y: this.y + spacing * index + spacing / 2
    };
  }
}

let gate = new Gate("or", []);
let input1 = new Input(false);
let input2 = new Input(true);

let wire1 = gate.connect(input1);
let wire2 = gate.connect(input2);

gate.evaluate();

let renderNodes = [new RenderPoint(gate, 400, 300), new RenderPoint(input1, 300, 250), new RenderPoint(input2, 300, 350)];
let wires = [wire1, wire2];

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
  const end = toNode.getInputPort(wire.toInputIndex);

  line(start.x, start.y, end.x, end.y);
}

let dragging = null;
let offsetX = 0;
let offsetY = 0;

function mousePressed() {
  dragging = renderNodes.find(n => n.containsPoint(mouseX, mouseY));

  if (dragging) {
    offsetX = mouseX - dragging.x;
    offsetY = mouseY - dragging.y;
  }
}

function mouseDragged() {
  if (dragging) {
    dragging.x = mouseX - offsetX;
    dragging.y = mouseY - offsetY;
  }
}

function mouseReleased() {
  dragging = null;
  offsetX = 0;
  offsetY = 0;
}

function setup() {
  createCanvas(800, 600);
}

function draw() {
  background(220);
  for (let i = 0; i < renderNodes.length; i++) {
    drawGate(renderNodes[i]);
  }
  for (let i = 0; i < wires.length; i++) {
    drawWire(wires[i]);
  }
}
