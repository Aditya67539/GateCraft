import { FONT_SIZE, GRID_OFFSET, GRID_SIZE, PORT_LABEL_SIZE, PORT_RADIUS } from "../constants.js";
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
      x: this.x + this.width + GRID_SIZE,
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
      x: this.x - GRID_SIZE,
      y: this.y + spacing * index + spacing / 2
    };
  }

  getBounds(padding = 4) {
    const top = this.y - padding;
    const bottom = this.y + this.height + padding;
    let left = this.x - PORT_RADIUS / 2 - padding / 2;
    let right = this.x + this.width + PORT_RADIUS / 2 + padding / 2;
    if (this.gate.inputCount !== 0) left -= GRID_SIZE;
    if (this.gate.outputCount !== 0) right += GRID_SIZE;
    return { left, right, top, bottom };
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
  if (gate.type === "seven-seg") return { width: 9 * GRID_SIZE, height: 11 * GRID_SIZE };
  const inputCount = gate.inputCount;
  const outputCount = gate.outputCount;

  const maxPortCount = Math.max(inputCount, outputCount);
  const centerLabel = gate.label || gate.type;

  const portHeight = (maxPortCount + 1) * GRID_SIZE;

  if (gate.type === "composite") {
    const centerLabelWidth = centerLabel.length * FONT_SIZE * 0.6 + 20;

    if (gate.embeddedDisplays && gate.embeddedDisplays.length > 0) {
      // --- Embedded display sizing (supports multiple displays) ---
      // Seven-seg standalone size: 9×GRID_SIZE wide, 11×GRID_SIZE tall
      // Scale it down to ~70% for embedding
      const displayScale = 0.70;
      const displayW = Math.round(9 * GRID_SIZE * displayScale);
      const displayH = Math.round(11 * GRID_SIZE * displayScale);
      const displayCount = gate.embeddedDisplays.length;
      const displayGap = -16;

      // Label row at the top + padding around the display strip
      const labelRowH = GRID_SIZE * 1.5;
      const displayPad = GRID_SIZE * 0.5;

      // Total width of the display strip: N displays + (N-1) gaps
      const displayStripW = displayCount * displayW + (displayCount - 1) * displayGap;

      const rawWidth = Math.max(80, 10 + centerLabelWidth + 10, displayStripW + displayPad * 2);
      const rawHeight = Math.max(portHeight, labelRowH + displayH + displayPad * 2);

      const width = Math.ceil(rawWidth / GRID_SIZE) * GRID_SIZE;
      const height = Math.ceil(rawHeight / GRID_SIZE) * GRID_SIZE;

      // Stash display layout metrics for the draw pass
      gate._displayArea = { displayW, displayH, labelRowH, displayPad, displayCount, displayGap };

      return { width, height };
    }

    const rawWidth = Math.max(80, 10 + centerLabelWidth + 10);
    // Snap width to the nearest larger multiple of GRID_SIZE
    const width = Math.ceil(rawWidth / GRID_SIZE) * GRID_SIZE;
    return { width, height: portHeight };
  }

  const rawWidth = Math.max(60, centerLabel.length * FONT_SIZE * 0.6 + 20);
  // Snap width to the nearest larger multiple of GRID_SIZE
  const width = Math.ceil(rawWidth / GRID_SIZE) * GRID_SIZE;
  return { width, height: portHeight };
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

function overlaps(boundsA, boundsB) {
  return !(
    boundsA.right  < boundsB.left  ||
    boundsA.left   > boundsB.right ||
    boundsA.bottom < boundsB.top   ||
    boundsA.top    > boundsB.bottom
  )
}

export function wouldOverlap(candidate, renderNodes, excludeId = null) {
  let boundsA = candidate.getBounds();

  for (let node of renderNodes) {
    if (node.gate.id === excludeId) continue;
    let boundsB = node.getBounds();
    if (overlaps(boundsA, boundsB)) return true;
  }

  return false;
}