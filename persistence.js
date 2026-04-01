import { initNode } from "./render/RenderPoint.js";

export function saveCircuit(renderNodes, wires) {
  let gateData = [];
  let wireData = [];

  renderNodes.forEach(node => {
    let data = {};
    data.type = node.gate.type;
    data.id = node.gate.id;
    data.x = node.x;
    data.y = node.y;
    if (node.gate.type === "input" || node.gate.type === "clock") {
      data.signal = node.gate.output;
    }
    // console.log("Local node data:");
    // console.log(data);
    gateData.push(data);
  });

  wires.forEach(w => {
    let data = {
      fromGateId: w.wire.from.id,
      toGateId: w.wire.to.id,
      toInputIndex: w.wire.toInputIndex,
      signal: w.wire.from.signal,
      waypoints: w.waypoints,
    }
    // console.log("Local wire data:");
    // console.log(data);
    wireData.push(data);
  });

  localStorage.setItem("circuitData", JSON.stringify({gateData: gateData, wireData: wireData}));
}

export function loadCircuit() {
  let circuitData = localStorage.getItem("circuitData");
  if (!circuitData) return null;

  const { gateData, wireData } = JSON.parse(circuitData);
  let renderNodes = [];
  let wires = [];

  gateData.forEach(gate => {
    const newGate = initNode(gate.type, gate.x, gate.y);
    newGate.gate.id = gate.id;
    if (gate.signal) {
      newGate.gate.output = gate.signal;
    }
    renderNodes.push(newGate);
  });

  wireData.forEach(w => {
    const fromGate = renderNodes.find(n => n.gate.id === w.fromGateId);
    const toGate = renderNodes.find(n => n.gate.id === w.toGateId);

    const wire = toGate.gate.connect(fromGate.gate, w.toInputIndex);

    wires.push({wire: wire, waypoints: w.waypoints});
  });

  return { renderNodes: renderNodes, wires: wires };
}