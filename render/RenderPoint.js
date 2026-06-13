import { FONT_SIZE, GRID_OFFSET, GRID_SIZE, PORT_LABEL_SIZE } from "../constants.js";
import { createBasicGate, createCompositeGate } from "../logic/gates.js";
import { state } from "../state.js";


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
      return this.getOutputPortByIndex(wire.fromOutputIndex, wire.from.outputCount);
    }
    return this.getOutputPortByIndex(0, 1);
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
    const inputCount = this.gate.inputCount;
    return this.getInputPortByIndex(index, inputCount);
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
}

function computeSize(gate) {
  const inputCount = gate.inputCount;
  const outputCount = gate.outputCount;

  const maxPortCount = Math.max(inputCount, outputCount);
  const centerLabel = gate.label || gate.type;

  const height = (maxPortCount + 1) * GRID_SIZE;

  if (gate.type === "composite") {
    // Measure the widest input and output port labels
    let maxInputLabelLen = 0;
    let maxOutputLabelLen = 0;
    if (gate.internalInputs) {
      for (const g of gate.internalInputs) {
        if (g.label) {
          const lbl = g.label;
          if (lbl.length > maxInputLabelLen) maxInputLabelLen = lbl.length;
        }
      }
    }
    if (gate.internalOutputs) {
      for (const g of gate.internalOutputs) {
        if (g.label) {
          const lbl = g.label;
          if (lbl.length > maxOutputLabelLen) maxOutputLabelLen = lbl.length;
        }
      }
    }

    const inputLabelWidth = maxInputLabelLen * PORT_LABEL_SIZE * 0.55 + 10;
    const outputLabelWidth = maxOutputLabelLen * PORT_LABEL_SIZE * 0.55 + 10;
    const centerLabelWidth = centerLabel.length * FONT_SIZE * 0.6 + 20;
    const rawWidth = Math.max(80, inputLabelWidth + centerLabelWidth + outputLabelWidth);
    // Snap width to the nearest larger multiple of GRID_SIZE
    const width = Math.ceil(rawWidth / GRID_SIZE) * GRID_SIZE;
    return { width, height };
  }

  const rawWidth = Math.max(60, centerLabel.length * FONT_SIZE * 0.6 + 20);
  // Snap width to the nearest larger multiple of GRID_SIZE
  const width = Math.ceil(rawWidth / GRID_SIZE) * GRID_SIZE;
  return { width, height };
}

export function rebuildNodeMap(renderNodes, nodeMap) {
  nodeMap.clear();

  for (const node of renderNodes) {
    nodeMap.set(node.gate.id, node);
  }
}

export function snapPointToGrid(x, y) {
  const point = {};
  point.x = Math.round((x - GRID_OFFSET) / GRID_SIZE) * GRID_SIZE + GRID_OFFSET;
  point.y = Math.round((y - GRID_OFFSET) / GRID_SIZE) * GRID_SIZE + GRID_OFFSET;
  return point;
}