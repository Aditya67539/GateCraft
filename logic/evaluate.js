export function evaluateAll(renderNodes, wires) {
  const queue = new Set();
  const gateMap = {};

  for (const rn of renderNodes) {
    gateMap[rn.gate.id] = rn.gate;
  }

  for (const wi of wires) {
    const from = wi.wire.from;
    if (from.type === "input" || from.type === "clock") {
      const newSignal = from.output;
      if (wi.wire.signal !== newSignal) {
        wi.wire.signal = newSignal;
        queue.add(wi.wire.to.id);
      }
    }
  }

  const visited = new Set();

  while (queue.size > 0) {
    const [gateId] = queue;
    queue.delete(gateId);

    const gate = gateMap[gateId];
    if (!gate || gate.type === "input" || gate.type === "clock") continue;

    const oldOutput = gate.output;
    const newOutput = gate.evaluate();
    gate.output = newOutput;

    if (Array.isArray(newOutput)) {
      if (!arraysEqual(newOutput, oldOutput)) {
        for (const wi of wires) {
          if (wi.wire.from.id === gate.id) {
            wi.wire.signal = newOutput[wi.wire.fromOutputIndex];
            const downstreamId = wi.wire.to.id;

            if (!visited.has(downstreamId)) {
              queue.add(downstreamId);
            }
          }
        }
      }
    } else {
      if (newOutput !== oldOutput) {
        for (const wi of wires) {
          if (wi.wire.from.id === gate.id) {
            wi.wire.signal = newOutput;
            const downstreamId = wi.wire.to.id;

            if (!visited.has(downstreamId)) {
              queue.add(downstreamId);
            }
          }
        }
      }
    }

    visited.add(gateId);
  }
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((val, index) => val === b[index]);
}

export function evaluateOnce(renderNodes, wires) {
  for (const wi of wires) {
    const from = wi.wire.from;
    if (from.type === "input" || from.type === "clock") {
      wi.wire.signal = from.output;
    }
  }

  for (const rn of renderNodes) {
    const gate = rn.gate;
    if (gate.type === "input" || gate.type === "clock") continue;
    gate.output = gate.evaluate();
    let signal;
    for (const wi of wires) {
      if (Array.isArray(gate.output)) signal = gate.output[wi.wire.fromOutputIndex];
      else signal = gate.output;
      if (wi.wire.from.id === gate.id) {
        wi.wire.signal = signal;
      }
    }
  }
}

export function settleCircuit(renderNodes, wires) {
  let stable = false;
  let iterations = 0;

  while (!stable && iterations < 100) {
    const before = wires.map(w => w.wire.signal);
    evaluateOnce(renderNodes, wires);
    const after = wires.map(w => w.wire.signal);
    stable = before.every((v, i) => v === after[i]);
    iterations++;
  }
}