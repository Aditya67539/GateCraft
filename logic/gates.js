import { Wire } from "./wire.js";
import { evaluateAll } from "./evaluate.js";
import { GATE_DEFS } from "../constants.js";

/**
 * Base class for generating unique gate IDs. 
 */
class Logic {
  static nextId = 1;
}

export class Input {
  constructor(value) {
    this.id = Logic.nextId++;
    this.type = "input";
    this.outputCount = GATE_DEFS[this.type].outputs;
    this.inputCount = GATE_DEFS[this.type].inputs;
    this.output = value;
  }

  setValue(newValue) {
    this.output = newValue;
  }

  evaluate() {
    return { ok: true, output: this.output }; 
  }
}

export class Clock extends Input {
  constructor(value) {
    super(value);
    this.type = "clock";
    this.intervalId = null;
  }

  tick() {
    super.setValue(!this.output);
  }
}

class ConnectableGate {
  connect(fromGate, toInputIndex, fromOutputIndex = null) {
    if (toInputIndex === null) {
      return { ok: false, error: "Invalid input index!" };
    } else if (this.inputs[toInputIndex] !== undefined) {
      return { ok: false, error: "Wire is already connected!" };
    }
    const wire = new Wire(fromGate, this, toInputIndex, fromOutputIndex);
    this.inputs[toInputIndex] = wire;
    return { ok: true, wire };
  }

  hasNoInputsConnected() {
    return this.inputs.length > 0 && this.inputs.every(n => n === undefined);
  }
}

export class Output extends ConnectableGate {
  constructor() {
    super();
    this.id = Logic.nextId++;
    this.type = "output";
    this.inputCount = GATE_DEFS[this.type].inputs;
    this.outputCount = GATE_DEFS[this.type].outputs;
    this.inputs = new Array(this.inputCount).fill(undefined);
    this.output = false;
    this.tempOutput = false;
  }

  evaluate() {
    if (this.inputs.length > 1) {
      return { ok: false, error: "Output does not support multiple inputs!" };
    }
    this.tempOutput = this.inputs[0] ? this.inputs[0].signal : false;
    return { ok: true, output: this.tempOutput };
  }
}

export class Gate extends ConnectableGate {
  constructor(type, inputs) {
    super();
    this.id = Logic.nextId++;
    this.type = type.toLowerCase();
    this.inputCount = GATE_DEFS[this.type].inputs;
    this.outputCount = GATE_DEFS[this.type].outputs;
    this.inputs = new Array(this.inputCount).fill(undefined);
    // this.inputs = inputs;
    this.output = false;
    this.tempOutput = false;
  }

  evaluate() {
    const resolvedInputs = resolveInputs(this.inputs);
    switch (this.type) {
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
          return { ok: false, error: "NOT operator does not support multiple inputs!" };
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
        return { ok: false, error: "Invalid operation" };
    }
    return { ok: true, output: this.tempOutput };
  }
}


export class CompositeGate extends ConnectableGate {
  constructor(inputs, circuitData) {
    super();
    this.id = Logic.nextId++;
    this.type = "composite";
    this.inputs = inputs;
    this.circuitData = circuitData;
    this.inputOrder = circuitData.inputOrder;
    this.outputOrder = circuitData.outputOrder;
    this.output = new Array(this.outputOrder.length).fill(false);
    this.tempOutput = new Array(this.outputOrder.length).fill(false);
  }

  parseCircuitData() {
    const gates = this.circuitData.builder.gates;
    
    for (let gate of gates.values()) {
      if (gate.type === "seven-seg") {
        this.embeddedDisplay = gate;
      }
    }

    this.internalInputs = this.circuitData.inputOrder.map(id => gates.get(id));
    this.internalOutputs = this.circuitData.outputOrder.map(id => gates.get(id));

    this.inputCount = this.internalInputs.length;
    this.outputCount = this.internalOutputs.length;

    for (const wire of this.circuitData.builder.wires) {
      wire.signal = false;
    }
  }

  evaluate() {
    const resolvedInputs = resolveInputs(this.inputs);

    for (let i = 0; i < this.internalInputs.length; i++) {
      this.internalInputs[i].setValue(resolvedInputs[i]);
    }

    const gates = this.circuitData.builder.getGates();
    const wires = this.circuitData.builder.wires;
    if (this.circuitData.builder.dirty) {
      this.circuitData.builder.buildFanout();
    }

    evaluateAll(this.circuitData.builder, true);

    for (let i = 0; i < this.internalOutputs.length; i++) {
      this.tempOutput[i] = this.internalOutputs[i].output;
    }

    return { ok: true, output: this.tempOutput };
  }
}

export class SevenSegmentDisplay extends ConnectableGate {
  constructor() {
    super();
    this.id = Logic.nextId++;
    this.type = "seven-seg";
    this.inputCount = GATE_DEFS[this.type].inputs;
    this.outputCount = GATE_DEFS[this.type].outputs;
    this.inputs = new Array(this.inputCount).fill(undefined);
    this.output = new Array(this.inputCount).fill(false);
    this.tempOutput = new Array(this.inputCount).fill(false);
  }

  evaluate() {
    for (let i = 0; i < this.inputCount; i++) {
      this.tempOutput[i] = this.inputs[i]?.signal ?? false;
    }
    return { ok: true, output: this.tempOutput };
  }
}


/**
 * Creates a basic gate instance based on the given type.
 * 
 * @param {string} type - The type of gate ("input", "output", "clock" or logic gate type)
 * @returns {Input|Output|Clock|Gate} The instantiated gate object
 */
export function createBasicGate(type) {
  return type === "input"
    ? new Input(false)
    : type === "output"
    ? new Output()
    : type === "clock"
    ? new Clock(false)
    : type === "seven-seg"
    ? new SevenSegmentDisplay()
    : new Gate(type, []);
}

/**
 * Creates a composite gate from saved circuit data. 
 * 
 * @param {string} name - The label/name of the composite gate
 * @param {Object} circuitData - The circuit data used to construct the composite gate
 * @returns {CompositeGate} The instantiated composite gate object 
 */
export function createCompositeGate(name, circuitData) {
  const gates = circuitData.builder.getGates();
  const inputCount = circuitData.inputOrder.length;
  const inputs = new Array(inputCount).fill(undefined);
  const gate = new CompositeGate(inputs, circuitData);
  gate.label = name;
  gate.parseCircuitData();
  return gate;
}

function resolveInputs(inputs) {
  return inputs.map(input => {
    if (input instanceof Wire) return input.signal;
    return false;
  });
}