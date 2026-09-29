import { CircuitBuilder } from "./logic/CircuitBuilder.js";
import { RenderPoint } from "./render/RenderPoint.js";
import { BusConnection, WireConnection } from "./render/wireGeometry.js";

const STORAGE_KEY = "compositeGates";

/**
 * Retrieves the composite gate store from localStorage. 
 * 
 * @returns {Object<string, { circuitData: Object, renderData: Object }}
 * An object mapping gate names to their stored data. 
 */
function getStore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

/**
 * Persists the composite gate store to localStorage. 
 * 
 * @param {Object<string, { circuitData: Object, renderData: Object }} store 
 * The store object to save. 
 */
function setStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/**
 * Extracts logical circuit data (gates, wires, IO ordering) from render nodes. 
 * 
 * @param {Array<RenderPoint>} renderNodes - Array of RenderPoint objects. 
 * @param {Array<Object>} wireInfos - Array of wire object containing Wire instances. 
 * @param {Array<BusNode>} busNodes - Array of BusNode objects. 
 * @returns {{
 *   gates: Array<Object>,
 *   wires: Array<Object>,
 *   buses: Array<Object>,
 *   inputOrder: Array<number>,
 *   outputOrder: Array<number>
 * }}
 * Structured circuit data for reconstruction. 
 */
function getCircuitData(renderNodes, wireInfos, busNodes) {
  const gates = [];
  const wires = [];
  const buses = [];
  for (const node of renderNodes) {
    const data = {
      id: node.gate.id,
      type: node.gate.type === "clock" ? "input" : node.gate.type,
    };
    if (node.gate.type === "input") {
      data.signal = node.gate.output;
    }
    if (node.gate.label) {
      data.label = node.gate.label;
    }
    gates.push(data);
  }

  for (const busNode of busNodes) {
    buses.push({ id: busNode.bus.id });
  }
  
  for (const w of wireInfos) {
    const data = {
      from: w.wire.from.id,
      to: w.wire.to.id,
      toInputIndex: w.wire.toInputIndex,
      fromOutputIndex: w.wire.fromOutputIndex,
    }
    if (w instanceof WireConnection) {
      data.isBusConnection = false;
    } else if (w instanceof BusConnection) {
      data.isBusConnection = true;
      data.direction = w.direction;
    }
    wires.push(data);
  }

  let inputNodes = [];
  let outputNodes = [];

  renderNodes.forEach(node => {
    if (node.gate.type === "input" || node.gate.type === "clock") inputNodes.push(node);
    else if (node.gate.type === "output") outputNodes.push(node);
  });

  inputNodes.sort((a, b) => a.y - b.y);
  outputNodes.sort((a, b) => a.y - b.y);

  const inputOrder = inputNodes.map(node => node.gate.id);
  const outputOrder = outputNodes.map(node => node.gate.id);

  return { gates, wires, buses, inputOrder, outputOrder };
}

/**
 * Extracts rendering data (positions and wire paths) from render nodes. 
 * 
 * @param {Array<RenderPoint>} renderNodes - Array of RenderPoint objects. 
 * @param {Array<Object>} wireInfos - Array of wire objects containing Wire instances. 
 * @returns {{
 *   positions: Array<id: Number, x: number, y: number>,
 *   wires: Array<Object>
 * }}
 * Structered render data for UI reconstruction. 
 */
function getRenderData(renderNodes, wireInfos, busNodes) {
  const positions = [];
  const wires = [];
  const buses = [];

  for (const node of renderNodes) {
    const data = { "id": node.gate.id, "x": node.x, "y": node.y };
    positions.push(data);
  }

  for (const busNode of busNodes) {
    const data = {
      id: busNode.bus.id,
      startPoint: busNode.startPoint,
      endPoint: busNode.endPoint,
      waypoints: busNode.waypoints,
    }
    buses.push(data);
  }

  for (const w of wireInfos) {
    const data = {
      from: w.wire.from.id,
      to: w.wire.to.id,
      waypoints: w.waypoints,
      isCustomRouted: w.isCustomRouted,
    };
    if (w instanceof WireConnection) {
      data.isBusConnection = false;
    } else if (w instanceof BusConnection) {
      data.isBusConnection = true;
      data.direction = w.direction;
    }
    wires.push(data);
  }

  return { positions, wires, buses };
}

/**
 * Saves a composite gate definition to localStorage. 
 * 
 * @param {string} name - Name of the composite gate. 
 * @param {Array<RenderPoint>} renderNodes - Array of RenderPoint objects. 
 * @param {Array<Object>} wires - Array of wire objects containing Wire instances. 
 * @param {Array<BusNode>} buses - Array of BusNode objects. 
 */
export function saveCompositeGate(name, renderNodes, wires, buses) {
  const circuitData = getCircuitData(renderNodes, wires, buses);
  const renderData = getRenderData(renderNodes, wires, buses);

  const store = getStore();
  store[name] = { circuitData, renderData };
  setStore(store);
}

/**
 * Loads a composite gate definition from localStorage. 
 * 
 * @param {string} name - Name of the composite gate. 
 * @returns {{ circuitData: Object, renderData: Object } | null}
 * The stored gate and render data, or null if not found. 
 */
export function loadCompositeGate(name) {
  const store = getStore();
  if (!store[name]) return null;
  return store[name];
}

/**
 * Reconstructs a circuit from serialized circuit data. 
 * 
 * @param {{
 *   gates: Array<Gate>,
 *   wires: Array<Wire>,
 *   buses: Array<Bus>,
 *   inputOrder: Array<number>,
 *   outputOrder: Array<number>
 * }} circuitData - Serialized circuit data. 
 * @returns {{
 *   builder: CircuitBuilder,
 *   inputOrder: Array<number>,
 *   outputOrder: Array<number>
 * }}
 * A builder instance with the reconstructed circuit and ordered IO mappings. 
 * 
 * @throws {Error} If a referenced nested composite gate is missing.
 */
export function buildCircuitFromData(circuitData, renderData = null) {
  const builder = new CircuitBuilder();
  const idMap = {};

  for (const gateSpec of circuitData.gates) {
    let gate;
    if (gateSpec.type === "composite") {
      const nestedCircuit = loadCompositeGate(gateSpec.label);
      if (!nestedCircuit) throw new Error(`Missing nested gate: ${gateSpec.label}`);
      const nestedBuilder = buildCircuitFromData(nestedCircuit.circuitData, nestedCircuit.renderData);
      gate = builder.addCompositeGate(gateSpec.label, nestedBuilder);
    } else {
      gate = builder.addBasicGate(gateSpec.type);
    }

    idMap[gateSpec.id] = gate.id;
    if (gateSpec.signal !== undefined) gate.output = gateSpec.signal;
    if (gateSpec.label) gate.label = gateSpec.label;
  }

  // NOTE: This condition is required for circuits that were saved before the simulator 
  // supported buses, since they do not have the buses property in their circuitData
  if (circuitData.buses) {
    for (const busSpec of circuitData.buses) {
      const bus = builder.addBus();
      idMap[busSpec.id] = bus.id;
    }
  }

  for (const wireSpec of circuitData.wires) {
    const fromId = idMap[wireSpec.from];
    const toId = idMap[wireSpec.to];
    const from = builder.gates.get(fromId) || builder.buses.get(fromId);
    const to = builder.gates.get(toId) || builder.buses.get(toId);
    if (from && to) {
      if (!wireSpec.isBusConnection) {
        builder.connectToGate(from, to, wireSpec.toInputIndex, wireSpec.fromOutputIndex, false);
      } else {
        if (wireSpec.direction === "in") {
          // "in" means gate output → bus: from=gate, to=bus
          builder.connectToBus(to, from, wireSpec.fromOutputIndex, false);
        } else if (wireSpec.direction === "out") {
          // "out" means bus → gate input: from=bus, to=gate
          builder.connectToGate(from, to, wireSpec.toInputIndex, wireSpec.fromOutputIndex, false);
        }
      }
    }
  }

  const inputOrder = circuitData.inputOrder.map(id => idMap[id]);
  const outputOrder = circuitData.outputOrder.map(id => idMap[id]);

  // Build a lookup from new gate IDs to their render positions
  let positionMap = null;
  if (renderData && renderData.positions) {
    positionMap = {};
    for (const pos of renderData.positions) {
      const newId = idMap[pos.id];
      if (newId !== undefined) {
        positionMap[newId] = { x: pos.x, y: pos.y };
      }
    }
  }

  return { builder, inputOrder, outputOrder, positionMap };
}

/**
 * Lists all saved composite gate names. 
 * 
 * @returns {Array<string>} Array of composite gate names. 
 */
export function listCompositeGates() {
  return Object.keys(getStore());
}

/**
 * Deletes a composite gate from storage. 
 * 
 * @param {string} name - Name of the composite gate to delete. 
 */
export function deleteCompositeGate(name) {
  const store = getStore();
  delete store[name];
  setStore(store);
}

/**
 * Renames a composite gate in storage.
 *
 * @param {string} oldName - Current name of the composite gate.
 * @param {string} newName - New name for the composite gate.
 * @returns {boolean} True if rename succeeded, false if oldName not found or newName already exists.
 */
export function renameCompositeGate(oldName, newName) {
  const store = getStore();
  if (!store[oldName] || store[newName]) return false;
  store[newName] = store[oldName];
  delete store[oldName];
  setStore(store);
  return true;
}