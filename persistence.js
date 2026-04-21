import { initNode, initCompositeNode } from "./render/RenderPoint.js";

const STORAGE_KEY = "compositeGates";

function getStore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function setStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getGateData(node) {
  const data = {
    type: node.gate.type,
    id: node.gate.id,
    x: node.x,
    y: node.y,
  };
  if (node.gate.type === "input" || node.gate.type === "clock") {
    data.signal = node.gate.output;
  }
  if (node.gate.label) {
    data.label = node.gate.label;
  }
  if (node.gate.type === "clock") {
    data.label = "clk";
  }
  return data;
}

function getWireData(w) {
  const data = {
    fromGateId: w.wire.from.id,
    toGateId: w.wire.to.id,
    toInputIndex: w.wire.toInputIndex,
    fromOutputIndex: w.wire.fromOutputIndex,
    waypoints: w.waypoints,
  };
  if (w.isCustomRouted) data.isCustomRouted = true;
  return data;
}

export function saveCompositeGate(name, renderNodes, wires) {
  const gateData = [];
  const wireData = [];

  renderNodes.forEach(node => {
    const data = getGateData(node);
    if (node.gate.type === "composite") {
      data.compositeName = node.gate.label;
    } else if (node.gate.type === "clock") {
      data.type = "input";
    }
    gateData.push(data);
  });

  wires.forEach(w => {
    wireData.push(getWireData(w));
  });

  const store = getStore();
  store[name] = { gateData, wireData };
  setStore(store);
}

export function loadCompositeGate(name) {
  const store = getStore();
  if (!store[name]) return null;

  const { gateData, wireData } = store[name];
  const renderNodes = [];
  const wires = [];

  // Give internal nodes fresh IDs so they don't collide with canvas nodes
  const idMap = {};
  gateData.forEach(gate => {
    let newNode;
    if (gate.type === "composite") {
      const circuitData = loadCompositeGate(gate.compositeName);
      if (!circuitData) {
        console.error(`Error: Missing nested composite gate '${gate.compositeName}'`);
        return;
      }
      newNode = initCompositeNode(gate.compositeName, circuitData, gate.x, gate.y);
    } else {
      newNode = initNode(gate.type, gate.x, gate.y);
    }
    idMap[gate.id] = newNode.gate.id;
    if (gate.signal !== undefined) newNode.gate.output = gate.signal;
    if (gate.label) newNode.gate.label = gate.label;
    renderNodes.push(newNode);
  });

  wireData.forEach(w => {
    const fromNode = renderNodes.find(n => n.gate.id === idMap[w.fromGateId]);
    const toNode = renderNodes.find(n => n.gate.id === idMap[w.toGateId]);
    if (!fromNode || !toNode) return;
    const wire = toNode.gate.connect(fromNode.gate, w.toInputIndex, w.fromOutputIndex);
    if (wire === null) return;
    const wire_info = { wire, waypoints: w.waypoints };
    if (w.isCustomRouted) wire_info.isCustomRouted = true;
    wires.push(wire_info);
  });

  return { renderNodes, wires };
}

export function listCompositeGates() {
  return Object.keys(getStore());
}

export function deleteCompositeGate(name) {
  const store = getStore();
  delete store[name];
  setStore(store);
}