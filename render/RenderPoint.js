import { FONT_SIZE, PORT_LABEL_SIZE } from "../constants.js";
import { Input, Output, Clock, Gate, CompositeGate } from "../logic/gates.js";
import { state } from "../state.js";
import { modeText } from "../ui/toolbar.js";

export class RenderPoint {
  constructor(gate, x, y) {
    this.gate = gate;
    this.x = x;
    this.y = y;
    const { width, height } = computeSize(this.gate);
    this.width = width;
    this.height = height;
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
    let inputCount = this.gate.inputs.length;
    if (this.gate.type !== "input" && this.gate.type !== "output" && this.gate.type !== "composite" && this.gate.type !== "not") {
      inputCount += 1;
    }
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
  const inputs = new Array(circuitData.renderNodes.filter(n => n.gate.type === "input").length);
  const gate = new CompositeGate(inputs, circuitData);
  gate.label = name;
  gate.parseCircuitData();
  return gate;
}

/**
 * Creates a renderable node (RenderPoint) for a basic gate. 
 * 
 * @param {string} type - The type of gate to create
 * @param {number} mouseX - The x-coordinate where the node will be placed
 * @param {number} mouseY - The y-coordinate where the node will be placed
 * @returns {RenderPoint} A renderable node containing the gate
 */
export function createBasicNode(type, mouseX, mouseY) {
  const gate = createBasicGate(type);
  return new RenderPoint(gate, mouseX, mouseY);
}

/**
 * Creates a renderable node (RenderPoint) for a composite gate. 
 * 
 * @param {string} name - The label/name of the composite gate
 * @param {Object} circuitData - The circuit data used to construct the composite gate
 * @param {number} mouseX - The x-coordinate where the node will be placed
 * @param {number} mouseY - The y-coordinate where the node will be placed
 * @returns {RenderPoint} A renderable node containing the gate
 */
export function createCompositeNode(name, circuitData, mouseX, mouseY) {
  const gate = createCompositeGate(name, circuitData);
  return new RenderPoint(gate, mouseX, mouseY);
}

/**
 * Spawns a basic node into the canvas
 * Sets the mode to "placing"
 * Sets the node as a ghost node for placement preview
 * 
 * @param {string} type - The type of gate to create
 * @param {number} mouseX - The x-coordinate where the node will be placed
 * @param {number} mouseY - The y-coordinate where the node will be placed
 */
export function spawnBasicNode(type, mouseX, mouseY) {
  state.ghostNode = createBasicNode(type, mouseX, mouseY);
  state.mode = "placing";
  modeText.textContent = "Mode: Placing";
}

/**
 * Spawns a composite node into the canvas
 * Sets the mode to "placing"
 * Sets the node as a ghost node for placement preview
 * 
 * @param {string} name - The label/name of the composte gate
 * @param {Object} circuitData - The circuit data used to construct the composite gate
 * @param {number} mouseX - The x-coordinate where the node will be placed
 * @param {number} mouseY - The y-coordinate where the node will be placed
 */
export function spawnCompositeNode(name, circuitData, mouseX, mouseY) {
  state.ghostNode = createCompositeNode(name, circuitData, mouseX, mouseY);
  state.mode = "placing";
  modeText.textContent = "Mode: Placing";
}

function computeSize(gate) {
  if (gate.type === "input" || gate.type === "output" || gate.type === "not" || gate.type === "clock") return { width: 60, height: 40 };
  const inputCount = gate.type === "composite" ? gate.inputCount : gate.inputs.length + 1;
  const outputCount = gate.type === "composite" ? gate.outputCount : 1;

  const maxPortCount = Math.max(inputCount, outputCount);
  const centerLabel = gate.label || gate.type;

  if (gate.type === "composite") {
    // Taller rows so port labels don't overlap
    const height = Math.max(60, maxPortCount * 30);

    // Measure the widest input and output port labels
    let maxInputLabelLen = 0;
    let maxOutputLabelLen = 0;
    if (gate.internalInputs) {
      for (const g of gate.internalInputs) {
        const lbl = g.label || g.type;
        if (lbl.length > maxInputLabelLen) maxInputLabelLen = lbl.length;
      }
    }
    if (gate.internalOutputs) {
      for (const g of gate.internalOutputs) {
        const lbl = g.label || g.type;
        if (lbl.length > maxOutputLabelLen) maxOutputLabelLen = lbl.length;
      }
    }

    const inputLabelWidth = maxInputLabelLen * PORT_LABEL_SIZE * 0.55 + 10;
    const outputLabelWidth = maxOutputLabelLen * PORT_LABEL_SIZE * 0.55 + 10;
    const centerLabelWidth = centerLabel.length * FONT_SIZE * 0.6 + 20;
    const width = Math.max(80, inputLabelWidth + centerLabelWidth + outputLabelWidth);
    return { width, height };
  }

  const height = Math.max(60, maxPortCount * 20);
  const width = Math.max(60, centerLabel.length * FONT_SIZE * 0.6 + 20);
  return { width, height };
}

export function setNodeSize(node) {
  if (node.gate.type === "input" || node.gate.type === "output") return;
  const { width, height } = computeSize(node.gate);
  node.width = width;
  node.height = height;
}