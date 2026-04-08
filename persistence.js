import { initNode } from "./render/RenderPoint.js";

const STORAGE_KEY = "compositeGates";

function getStore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function setStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function saveCompositeGate(name, renderNodes, wires) {
  const gateData = [];
  const wireData = [];

  renderNodes.forEach(node => {
    const data = {
      type: node.gate.type,
      id: node.gate.id,
      x: node.x,
      y: node.y,
    };
    if (node.gate.type === "input" || node.gate.type === "clock") {
      data.signal = node.gate.output;
    }
    gateData.push(data);
  });

  wires.forEach(w => {
    wireData.push({
      fromGateId: w.wire.from.id,
      toGateId: w.wire.to.id,
      toInputIndex: w.wire.toInputIndex,
      fromOutputIndex: w.wire.fromOutputIndex,
      waypoints: w.waypoints,
    });
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
    const newNode = initNode(gate.type, gate.x, gate.y);
    idMap[gate.id] = newNode.gate.id;
    if (gate.signal !== undefined) newNode.gate.output = gate.signal;
    renderNodes.push(newNode);
  });

  wireData.forEach(w => {
    const fromNode = renderNodes.find(n => n.gate.id === idMap[w.fromGateId]);
    const toNode = renderNodes.find(n => n.gate.id === idMap[w.toGateId]);
    if (!fromNode || !toNode) return;
    const wire = toNode.gate.connect(fromNode.gate, w.toInputIndex, w.fromOutputIndex);
    wires.push({ wire, waypoints: w.waypoints });
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