import { CircuitBuilder } from "./logic/CircuitBuilder.js";
import { RenderPoint } from "./render/RenderPoint.js";

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
 * @returns {{
 *   gates: Array<Object>,
 *   wires: Array<Object>,
 *   inputOrder: Array<number>,
 *   outputOrder: Array<number>
 * }}
 * Structured circuit data for reconstruction. 
 */
function getCircuitData(renderNodes, wireInfos) {
  const gates = [];
  const wires = [];
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
  
  for (const w of wireInfos) {
    const data = {
      fromGateId: w.wire.from.id,
      toGateId: w.wire.to.id,
      toInputIndex: w.wire.toInputIndex,
      fromOutputIndex: w.wire.fromOutputIndex,
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

  return { gates, wires, inputOrder, outputOrder };
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
function getRenderData(renderNodes, wireInfos) {
  const positions = [];
  const wires = [];

  for (const node of renderNodes) {
    const data = { "id": node.gate.id, "x": node.x, "y": node.y };
    positions.push(data);
  }

  for (const w of wireInfos) {
    const data = {
      fromGateId: w.wire.from.id,
      toGateId: w.wire.to.id,
      waypoints: w.waypoints,
    };
    if (w.isCustomRouted) data.isCustomRouted = true;
    wires.push(data);
  }

  return { positions, wires };
}

/**
 * Saves a composite gate definition to localStorage. 
 * 
 * @param {string} name - Name of the composite gate. 
 * @param {Array<RenderPoint>} renderNodes - Array of RenderPoint objects. 
 * @param {Array<Object>} wires - Array of wire objects containing Wire instances. 
 */
export function saveCompositeGate(name, renderNodes, wires) {
  const circuitData = getCircuitData(renderNodes, wires);
  const renderData = getRenderData(renderNodes, wires);

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
export function buildCircuitFromData(circuitData) {
  const builder = new CircuitBuilder();
  const idMap = {};

  for (const gateSpec of circuitData.gates) {
    let gate;
    if (gateSpec.type === "composite") {
      const nestedCircuit = loadCompositeGate(gateSpec.label);
      if (!nestedCircuit) throw new Error(`Missing nested gate: ${gateSpec.label}`);
      const nestedBuilder = buildCircuitFromData(nestedCircuit.circuitData);
      gate = builder.addCompositeGate(gateSpec.label, nestedBuilder);
    } else {
      gate = builder.addBasicGate(gateSpec.type);
    }

    idMap[gateSpec.id] = gate.id;
    if (gateSpec.signal !== undefined) gate.output = gateSpec.signal;
    if (gateSpec.label) gate.label = gateSpec.label;
  }

  for (const wireSpec of circuitData.wires) {
    const fromGate = builder.gates.get(idMap[wireSpec.fromGateId]);
    const toGate = builder.gates.get(idMap[wireSpec.toGateId]);
    if (fromGate && toGate) {
      builder.connectGates(fromGate, toGate, wireSpec.fromOutputIndex, wireSpec.toInputIndex, false);
    }
  }

  const inputOrder = circuitData.inputOrder.map(id => idMap[id]);
  const outputOrder = circuitData.outputOrder.map(id => idMap[id]);

  return { builder, inputOrder, outputOrder };
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