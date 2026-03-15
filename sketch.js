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
}

let gate = new Gate("and", []);
gate.output = true;

let node = new RenderPoint(gate, 400, 300);

function drawGate(renderNode) {
  let color = renderNode.gate.output ? "green" : "red";
  fill(color);
  rect(renderNode.x, renderNode.y, renderNode.width, renderNode.height);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(20);
  text(`${renderNode.gate.type}`, renderNode.x + renderNode.width / 2, renderNode.y + renderNode.height / 2);
}

function setup() {
  createCanvas(800, 600);
}

function draw() {
  background(220);
  drawGate(node);
}
