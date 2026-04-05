import { Wire } from "./wire.js";
import { evaluateAll } from "./evaluate.js";

class Logic {
  static nextId = 1;
}

export class Input {
  constructor(value) {
    this.id = Logic.nextId++;
    this.type = "input";
    this.output = value;
  }

  setValue(newValue) {
    this.output = newValue;
  }

  evaluate() {
    return this.output;
  }
}

export class Clock extends Input {
  constructor(value) {
    super(value);
    this.type = "clock";
  }

  tick() {
    super.setValue(!this.output);
  }
}

class ConnectableGate {
  connect(fromGate, toInputIndex = null, fromOutputIndex = null) {
    if (!toInputIndex) {
      toInputIndex = this.inputs.length;
    }
    const wire = new Wire(fromGate, this, toInputIndex, fromOutputIndex);
    this.inputs[toInputIndex] = wire;
    return wire;
  }
}

export class Output extends ConnectableGate {
  constructor() {
    super();
    this.id = Logic.nextId++;
    this.type = "output";
    this.inputs = [];
    this.output = false;
    this.tempOutput = false;
  }

  evaluate() {
    if (this.inputs) {
      if (this.inputs.length > 1) {
        console.error("Output does not support multiple inputs!");
        return false;
      } else if (this.inputs.length === 0) {
        console.error("No input connected!");
        return false;
      }
    }
    this.tempOutput = this.inputs[0].signal;
    return this.tempOutput;
  }
}

export class Gate extends ConnectableGate {
  constructor(type, inputs) {
    super();
    this.id = Logic.nextId++;
    this.type = type.toLowerCase();
    this.inputs = inputs;
    this.output = false;
    this.tempOutput = false;
  }

  evaluate() {
    const resolvedInputs = this.inputs.map(input => {
      if (input instanceof Wire) {
        return input.signal;
      }
    });
    switch(this.type) {
      case "and":
        this.tempOutput = true;
        resolvedInputs.forEach(input => {
          this.tempOutput = this.tempOutput && input;
        });
        break;
      case "or":
        this.tempOutput = false;
        resolvedInputs.forEach(input => {
          this.tempOutput = this.tempOutput || input;
        });
        break;
      case "not":
        if (resolvedInputs.length > 1) {
          console.error("NOT operator does not support multiple inputs!");
          break;
        } else if (resolvedInputs.length === 0) {
          console.error("No input connected!");
          break;
        }
        this.tempOutput = !resolvedInputs[0];
        break;
      case "nand":
        this.tempOutput = true;
        resolvedInputs.forEach(input => {
          this.tempOutput = this.tempOutput && input;
        });
        this.tempOutput = !this.tempOutput;
        break;
      case "nor":
        this.tempOutput = false;
        resolvedInputs.forEach(input => {
          this.tempOutput = this.tempOutput || input;
        });
        this.tempOutput = !this.tempOutput;
        break;
      case "xor":
        let countXOR = 0;
        resolvedInputs.forEach(input => {
          if (input) countXOR += 1;
        });
        this.tempOutput = countXOR % 2 ? true : false;
        break;
      case "xnor":
        let countXNOR = 0;
        resolvedInputs.forEach(input => {
          if (input) countXNOR += 1;
        });
        this.tempOutput = countXNOR % 2 ? false : true;
        break;
      default:
        console.error("Invalid operation");
    }
    return this.tempOutput;
  }
}


export class CompositeGate extends ConnectableGate {
  constructor(inputs, circuitData) {
    super();
    this.id = Logic.nextId++;
    this.type = "composite";
    this.inputs = inputs;
    this.output = [];
    this.tempOutput = [];
    this.circuitData = circuitData;
  }

    parseCircuitData() {
    let inputNodes = [];
    let outputNodes = [];
    this.circuitData.renderNodes.forEach(node => {
      if (node.gate.type === "input") {
        inputNodes.push(node);
      } else if (node.gate.type === "output") {
        outputNodes.push(node);
      }
    });

    // TODO: Change to better sorting algorithm
    for (let i = 0; i < inputNodes.length; i++) {
      let min_idx = i;
      for (let j = i + 1; j < inputNodes.length; j++) {
        if (inputNodes[j].y < inputNodes[min_idx].y) min_idx = j;
      }
      [inputNodes[i], inputNodes[min_idx]] = [inputNodes[min_idx], inputNodes[i]];
    }

    for (let i = 0; i < outputNodes.length; i++) {
      let min_idx = i;
      for (let j = i + 1; j < outputNodes.length; j++) {
        if (outputNodes[j].y < outputNodes[min_idx].y) min_idx = j;
      }
      [outputNodes[i], outputNodes[min_idx]] = [outputNodes[min_idx], outputNodes[i]];
    }

    this.internalInputs = inputNodes.map(node => node.gate);
    this.internalOutputs = outputNodes.map(node => node.gate);

    this.outputCount = this.internalOutputs.length;
  }

  evaluate() {
    const resolvedInputs = this.inputs.map(input => {
      if (input instanceof Wire) {
        return input.signal;
      }
    });
    
    // Assuming internalInputs is array of input gates in the internal circuit
    for (let i = 0; i < this.internalInputs.length; i++) {
      this.internalInputs[i].setValue(resolvedInputs[i]);
    }

    evaluateAll(this.circuitData.renderNodes, this.circuitData.wires);

    // Assuming internalOutputs is array of output gates in the internal circuit
    for (let i = 0; i < this.internalOutputs.length; i++) {
      this.tempOutput[i] = this.internalOutputs[i].output;
    }

    return this.tempOutput;
  }
}