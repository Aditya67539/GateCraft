import { Input, Output, Clock, Gate } from "../logic/gates.js";
import { state } from "../state.js";
import { modeText } from "../ui/toolbar.js";

export class RenderPoint {
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

export function createNode(type, mouseX, mouseY) {
  const newGate = type === "input" ? new Input(false) : type === "output" ? new Output() : type === "clock" ? new Clock(false) : new Gate(type, []);
  state.ghostNode = new RenderPoint(newGate, mouseX, mouseY);
  state.mode = "placing";
  modeText.textContent = "Mode: Placing";
}