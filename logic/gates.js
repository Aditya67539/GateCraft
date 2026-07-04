import { Wire } from "./wire.js";
import { evaluateAll } from "./evaluate.js";
import { GATE_DEFS, SIGNAL } from "../constants.js";

/**
 * Base class for generating unique gate IDs. 
 */
class Logic {
  static nextId = 1;
}

export class Input {
  constructor() {
    this.id = Logic.nextId++;
    this.type = "input";
    this.outputCount = GATE_DEFS[this.type].outputs;
    this.inputCount = GATE_DEFS[this.type].inputs;
    this.output = SIGNAL.LOW;
  }

  setValue(newValue) {
    this.output = newValue;
  }

  evaluate() {
    return { ok: true, output: this.output }; 
  }
}

export class Clock extends Input {
  constructor() {
    super();
    this.type = "clock";
    this.intervalId = null;
  }

  tick() {
    const signal = this.output === SIGNAL.LOW ? SIGNAL.HIGH : SIGNAL.LOW;
    super.setValue(signal);
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
    this.output = SIGNAL.X;
    this.tempOutput = SIGNAL.X;
  }

  evaluate() {
    this.tempOutput = this.inputs[0]?.signal ?? SIGNAL.X;
    return { ok: true, output: this.tempOutput };
  }
}

export class Gate extends ConnectableGate {
  constructor(type) {
    super();
    this.id = Logic.nextId++;
    this.type = type.toLowerCase();
    this.inputCount = GATE_DEFS[this.type].inputs;
    this.outputCount = GATE_DEFS[this.type].outputs;
    this.inputs = new Array(this.inputCount).fill(undefined);
    this.output = SIGNAL.X;
    this.tempOutput = SIGNAL.X;
  }

  evaluate() {
    const resolvedInputs = resolveInputs(this.inputs);
    switch (this.type) {
      case "and":
        this.tempOutput = SIGNAL.HIGH;
        resolvedInputs.forEach(input => {
          this.tempOutput = andPair(this.tempOutput, input);
        });
        break;
      case "or":
        this.tempOutput = SIGNAL.LOW;
        resolvedInputs.forEach(input => {
          this.tempOutput = orPair(this.tempOutput, input);
        });
        break;
      case "not":
        if (resolvedInputs.length > 1) {
          return { ok: false, error: "NOT operator does not support multiple inputs!" };
        }
        this.tempOutput = not(resolvedInputs[0]);
        break;
      case "nand":
        this.tempOutput = SIGNAL.HIGH;
        resolvedInputs.forEach(input => {
          this.tempOutput = andPair(this.tempOutput, input);
        });
        this.tempOutput = not(this.tempOutput);
        break;
      case "nor":
        this.tempOutput = SIGNAL.LOW;
        resolvedInputs.forEach(input => {
          this.tempOutput = orPair(this.tempOutput, input);
        });
        this.tempOutput = not(this.tempOutput);
        break;
      case "xor":
        this.tempOutput = SIGNAL.LOW;
        resolvedInputs.forEach(input => {
          this.tempOutput = xorPair(this.tempOutput, input);
        });
        break;
      case "xnor":
        this.tempOutput = SIGNAL.LOW;
        resolvedInputs.forEach(input => {
          this.tempOutput = xorPair(this.tempOutput, input);
        });
        this.tempOutput = not(this.tempOutput);
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
    this.output = new Array(this.outputOrder.length).fill(SIGNAL.X);
    this.tempOutput = new Array(this.outputOrder.length).fill(SIGNAL.X);
  }

  parseCircuitData() {
    const gates = this.circuitData.builder.gates;

    this.internalInputs = this.circuitData.inputOrder.map(id => gates.get(id));
    this.internalOutputs = this.circuitData.outputOrder.map(id => gates.get(id));

    this.inputCount = this.internalInputs.length;
    this.outputCount = this.internalOutputs.length;

    for (const wire of this.circuitData.builder.wires) {
      wire.signal = SIGNAL.X;
    }

    // Recursively collect all embedded seven-segment displays
    this.embeddedDisplays = collectDisplays(gates, this.circuitData.positionMap);
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
    this.output = new Array(this.inputCount).fill(SIGNAL.X);
    this.tempOutput = new Array(this.inputCount).fill(SIGNAL.X);
  }

  evaluate() {
    for (let i = 0; i < this.inputCount; i++) {
      this.tempOutput[i] = this.inputs[i]?.signal ?? SIGNAL.X;
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
    ? new Input()
    : type === "output"
    ? new Output()
    : type === "clock"
    ? new Clock()
    : type === "seven-seg"
    ? new SevenSegmentDisplay()
    : new Gate(type);
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

/**
 * Recursively collects all seven-segment display gates from a gate map,
 * including those nested inside composite gates. Returns them sorted
 * by x-coordinate (left-to-right).
 *
 * @param {Map<number, Object>} gates - The gate map to search
 * @param {Object|null} positionMap - Map of gate ID → { x, y } render positions
 * @returns {Array<Object>} Sorted array of display gate references
 */
function collectDisplays(gates, positionMap) {
  const displays = [];

  for (const [id, gate] of gates) {
    if (gate.type === "seven-seg") {
      const pos = positionMap ? positionMap[id] : null;
      const sortX = pos ? pos.x : 0;
      displays.push({ gate, sortX });
    } else if (gate.type === "composite" && gate.embeddedDisplays && gate.embeddedDisplays.length > 0) {
      // For nested composites that contain displays, use the composite gate's
      // own x position as the sort key for all its displays
      const pos = positionMap ? positionMap[id] : null;
      const outerX = pos ? pos.x : 0;
      for (const nested of gate.embeddedDisplays) {
        displays.push({ gate: nested.gate, sortX: outerX });
      }
    }
  }

  // Sort left-to-right by x position
  displays.sort((a, b) => a.sortX - b.sortX);
  return displays;
}

function resolveInputs(inputs) {
  return inputs.map(input => {
    if (input instanceof Wire && input.signal !== SIGNAL.Z) return input.signal;
    return SIGNAL.X;
  });
}


const NOTTABLE = [ SIGNAL.HIGH, SIGNAL.LOW, SIGNAL.X ];

const ANDTABLE = [
  [ SIGNAL.LOW, SIGNAL.LOW, SIGNAL.LOW ],
  [ SIGNAL.LOW, SIGNAL.HIGH, SIGNAL.X ],
  [ SIGNAL.LOW, SIGNAL.X, SIGNAL.X ],
];

const ORTABLE = [
  [ SIGNAL.LOW, SIGNAL.HIGH, SIGNAL.X ],
  [ SIGNAL.HIGH, SIGNAL.HIGH, SIGNAL.HIGH ],
  [ SIGNAL.X, SIGNAL.HIGH, SIGNAL.X ],
];

const not = (a) => NOTTABLE[a];
const andPair = (a, b) => ANDTABLE[a][b];
const orPair = (a, b) => ORTABLE[a][b];
const xorPair = (a, b) => orPair(andPair(a, not(b)), andPair(not(a), b));