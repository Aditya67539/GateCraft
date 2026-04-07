import { Input, Output, Clock, Gate, CompositeGate } from "../logic/gates.js";
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

  getOutputPort(wire = null) {
    if (wire !== null && wire.from.type === "composite") {
      const index = wire.fromOutputIndex;
      const outputCount = wire.from.output.length;
      const spacing = this.height / outputCount;

      return {
        x: this.x + this.width,
        y: this.y + index * spacing + spacing / 2,
      };
    }
    return {
      x: this.x + this.width,
      y: this.y + this.height / 2
    };
  }

  getOutputPortByIndex(index, totalOutputs) {
    const spacing = this.height / totalOutputs;
    return {
      x: this.x + this.width,
      y: this.y + spacing * index + spacing / 2,
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

export function initNode(type, x, y) {
  const newGate = type === "input" ? new Input(false) : type === "output" ? new Output() : type === "clock" ? new Clock(false) : new Gate(type, []);
  return new RenderPoint(newGate, x, y);
}

export function createNode(type, mouseX, mouseY) {
  state.ghostNode = initNode(type, mouseX, mouseY);
  state.mode = "placing";
  modeText.textContent = "Mode: Placing";
}

export function createCompositeNode(name, circuitData, mouseX, mouseY) {
  const inputs = new Array(circuitData.renderNodes.filter(n => n.gate.type === "input").length);
  const gate = new CompositeGate(inputs, circuitData);
  gate.label = name;
  gate.parseCircuitData();
  state.ghostNode = new RenderPoint(gate, mouseX, mouseY);
  state.mode = "placing";
  modeText.textContent = "Mode: Placing";
}