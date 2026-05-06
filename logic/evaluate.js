import { CircuitBuilder } from "./CircuitBuilder.js";

/**
 * Performs change-driven (delta-cycle) evaluation of the circuit. 
 * 
 * This function propagates signal changes through the circuit by only
 * re-evaluating gates whose inputs have changed. It uses a delta-cycle
 * approach to efficiently handle evaluation.
 * 
 * @param {CircuitBuilder} circuit - The circuit instance containing gates, wires, and fanout map
 * @param {boolean} [seedAll=false] - If true, forces evaluation of every gate in the first delta cycle
 */
export function evaluateAll(circuit, seedAll = false) {
  let currentDelta = new Set();
  let nextDelta = new Set();
  const gateMap = circuit.gates;
  const wires = circuit.wires;
  const fanout = circuit.fanout;
  
  /**
   * Seeds all non-inputs gates to ensure a full evaluation pass.
   * 
   * This is necessary for composite gates with sequential logic (feedback wires)
   * where initial changes may not properly propagate correctly using purely
   * change-driven evaluation
  */
  if (seedAll) {
    const gates = circuit.getGates();
    for (const gate of gates) {
      if (gate.type !== "input" && gate.type !== "clock") {
        currentDelta.add(gate.id);
      }
    }
  }

  // Seed inputs and clocks if their state is changed
  for (const wire of wires) {
    const from = wire.from;
    if (from.type === "input" || from.type === "clock") {
      const newSignal = from.output;
      if (wire.signal !== newSignal) {
        wire.signal = newSignal;
        currentDelta.add(wire.to.id);
      }
    }
  }

  // Prevent infinite loop in oscillating circuits
  let iterations = 0;

  while (currentDelta.size > 0 && iterations < 100) {
    const [gateId] = currentDelta;
    currentDelta.delete(gateId);

    const gate = gateMap.get(gateId);
    if (!gate || gate.type === "input" || gate.type === "clock") continue;

    // Composite gates use an array of outputs whereas basic gates only have one possible output
    const oldOutput = Array.isArray(gate.output) ? [...gate.output] : gate.output;
    const result = gate.evaluate();
    if (!result.ok) {
      console.error(result.error);
      continue;
    }
    const newOutput = result.output;
    gate.output = newOutput;

    /**
     * Propagate changes to downstream gates only if output changes
     */
    if (Array.isArray(newOutput)) {
      if (!arraysEqual(newOutput, oldOutput)) {
        const connections = fanout[gate.id];
        if (connections !== undefined) {
          for (const { wire, toId } of connections) {
            if (wire.signal !== newOutput[wire.fromOutputIndex]) {
              wire.signal = newOutput[wire.fromOutputIndex];
              nextDelta.add(toId);
            }
          }
        }
      }
    } else {
      if (newOutput !== oldOutput) {
        const connections = fanout[gate.id];
        if (connections !== undefined) {
          for (const { wire, toId } of connections) {
            wire.signal = newOutput;
            nextDelta.add(toId);
          }
        }
      }
    }

    // Move to the next delta cycle
    if (currentDelta.size == 0) {
      [currentDelta, nextDelta] = [nextDelta, currentDelta];
      iterations += 1;
    }
  }
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((val, index) => val === b[index]);
}


/**
 * Performs a full evaluation pass of the circuit without change tracking. 
 * 
 * It is simpler but unefficient, and is used in scenarios where
 * full evaluation is required (e.g., stabilization)
 * 
 * @param {CircuitBuilder} circuit - The circuit instance containing the gates, wires, and fanout map 
 */
export function evaluateOnce(ciruict) {
  const wires = ciruict.wires;
  const gates = ciruict.getGates();
  let changed = false;
  // Update signals from input and clock sources
  for (const wire of wires) {
    const from = wire.from;
    if (from.type === "input" || from.type === "clock") {
      wire.signal = from.output;
    }
  }

  // Evaluate every non-input and non-clock gate regardless of change
  for (const gate of gates) {
    if (gate.type === "input" || gate.type === "clock") continue;
    if (!gate.hasAllInputsConnected()) continue;
    const result = gate.evaluate();
    if (!result.ok) {
      console.error(result.error);
      continue;
    }
    const newOutput = result.output;
    gate.output = newOutput;
    let signal;
    for (const wire of wires) {
      if (wire.from.id !== gate.id) continue;

      const signal = Array.isArray(gate.output)
          ? gate.output[wire.fromOutputIndex]
          : gate.output;

      if (wire.signal !== signal) {
        wire.signal = signal;
        changed = true;
      }
    }
  }
  return !changed;
}

/**
 * Stabilizes the circuit after structural changes (e.g., wire connection and disconnection)
 * 
 * This repeatedly runs full evaluation until wire signals stop changing. 
 * It is required because structural changes are not detected by change-driven
 * evaluation. 
 * 
 * @param {CircuitBuilder} circuit - The circuit instance containing gates, wires, and fanout map 
 */
export function settleCircuit(circuit) {
  let stable = false;
  // Prevent inifinite loops in oscillating circuits
  let iterations = 0;

  while (!stable && iterations < 100) {
    stable = evaluateOnce(circuit);
    iterations++;
  }
}

const Types = Object.freeze({
  input: 0,
  clock: 1,
  output: 2,
  and: 3,
  or: 4,
  not: 5,
  nand: 6,
  nor: 7,
  xor: 8,
  xnor: 9,
  composite: 10,
});

function encodeType(type) {
  return Types[type];
}

/**
 * Creates an empty accumulator object to store the flattened circuit state.
 * 
 * The accumulator holds array-based representations of the circuit's gates,
 * wires, and their connections, optimized for fast evaluation.
 * 
 * @returns {Object} An empty accumulator object with initialized arrays and maps.
 */
export function createAccumulator() {
  return {
    gateTypes: [],
    outputOffset: [],
    outputCount: [],
    allOutputs: [],
    wireFrom: [],
    wireTo: [],
    wireSignal: [],
    wireFromOutputIndex: [],
    wireMap: new Map(),
    gateMap: new Map(),
    fanout: new Map(),
    fanin: new Map(),
  };
}

/**
 * Flattens a hierarchical circuit into a linear array-based representation.
 * 
 * This function traverses the circuit and its composite gates recursively,
 * populating the accumulator with a flattened graph of nodes (gates) and edges (wires).
 * It translates object references into array indices for efficient evaluation.
 * 
 * @param {CircuitBuilder} circuit - The circuit to flatten.
 * @param {Object} acc - The accumulator object to populate.
 * @param {Array<string>} [inputOrder=[]] - Ordered list of input gate IDs (used for composites).
 * @param {Array<string>} [outputOrder=[]] - Ordered list of output gate IDs (used for composites).
 * @param {number} [gateCount=0] - The current global gate index count.
 * @returns {Object} An object containing the index map, boundary map, and next gate count.
 */
export function flatten(circuit, acc, inputOrder = [], outputOrder = [], gateCount = 0) {
  const indexMap = {};

  // --- Pass 1: Assign indices, handle composite recursion ---

  for (const gate of circuit.getGates()) {
    if (gate.type !== "composite") {
      indexMap[gate.id] = gateCount;
      acc.gateMap.set(gate, gateCount);

      acc.gateTypes.push(encodeType(gate.type));
      acc.outputOffset.push(acc.allOutputs.length);
      acc.outputCount.push(1);
      acc.allOutputs.push(gate.output ? 1 : 0);

      gateCount++;
    } else {
      const result = flatten(
        gate.circuitData.builder,
        acc,
        gate.circuitData.inputOrder,
        gate.circuitData.outputOrder,
        gateCount
      );

      const compData = {
        isComposite: true,
        inputBoundary: result.boundaryMap.inputs,
        outputBoundary: result.boundaryMap.outputs,
      };

      indexMap[gate.id] = compData;
      acc.gateMap.set(gate, compData);

      gateCount = result.nextGateCount;
    }
  }

  // --- Pass 2: build boundary map for THIS circuit's Input/Output nodes ---
  // Switch to Set for O(1) lookup
  const inputNodes = [...circuit.getGates()]
    .filter(g => inputOrder.includes(g.id))
    .sort((a, b) => inputOrder.indexOf(a.id) - inputOrder.indexOf(b.id));
  const outputNodes = [...circuit.getGates()]
    .filter(g => outputOrder.includes(g.id))
    .sort((a, b) => outputOrder.indexOf(a.id) - outputOrder.indexOf(b.id));

  const boundaryMap = {
    inputs: inputNodes.map(g => indexMap[g.id]),
    outputs: outputNodes.map(g => indexMap[g.id]),
  };


  // --- Pass 3: process wires with boundary remapping ---
  for (const wire of circuit.wires) {
    let fromIndex;
    if (indexMap[wire.from.id].isComposite) {
      const portIndex = wire.fromOutputIndex;
      fromIndex = indexMap[wire.from.id].outputBoundary[portIndex];

      fromIndex = fromSourceOfOutputNode(fromIndex, acc);
    } else {
      fromIndex = indexMap[wire.from.id];
    }

    let toIndex;
    if (indexMap[wire.to.id].isComposite) {
      const portIndex = wire.toInputIndex;
      toIndex = indexMap[wire.to.id].inputBoundary[portIndex];
    } else {
      toIndex = indexMap[wire.to.id];
    }

    const wireIndex = acc.wireSignal.length;

    acc.wireMap.set(wire, wireIndex);
    acc.wireFrom.push(fromIndex);
    acc.wireTo.push(toIndex);
    acc.wireSignal.push(wire.signal ? 1 : 0);
    acc.wireFromOutputIndex.push(wire.fromOutputIndex);

    if (!acc.fanout.has(fromIndex)) {
      acc.fanout.set(fromIndex, []);
    }
    acc.fanout.get(fromIndex).push(wireIndex);

    if (!acc.fanin.has(toIndex)) {
      acc.fanin.set(toIndex, []);
    }
    acc.fanin.get(toIndex).push(wireIndex);
  }

  return { indexMap, boundaryMap, nextGateCount: gateCount };
}

/**
 * Helper function to trace back the source of a composite gate's output node.
 * 
 * @param {number} outputNodeIndex - The index of the output node.
 * @param {Object} acc - The accumulator containing circuit connection data.
 * @returns {number} The index of the source gate driving the output node.
 */
function fromSourceOfOutputNode(outputNodeIndex, acc) {
  for (let i = 0; i < acc.wireTo.length; i++) {
    if (outputNodeIndex === acc.wireTo[i]) {
      return acc.wireFrom[i];
    }
  }
  return outputNodeIndex; // fallback if nothing found
}

/**
 * Converts standard arrays in the accumulator to TypedArrays.
 * 
 * TypedArrays provide better performance and memory efficiency during
 * the high-frequency evaluation loops in `evaluateFlat`.
 * 
 * @param {Object} acc - The populated accumulator object.
 * @returns {Object} An object containing the typed array equivalents of the accumulator data.
 */
export function buildTypedArrays(acc) {
  const gateTypes = new Uint8Array(acc.gateTypes.length);
  const outputOffset = new Uint16Array(acc.outputOffset.length);
  const outputCount = new Uint8Array(acc.outputCount.length);
  const allOutputs = new Uint8Array(acc.allOutputs.length);
  const wireFrom = new Uint16Array(acc.wireFrom.length);
  const wireTo = new Uint16Array(acc.wireTo.length);
  const wireSignal = new Uint8Array(acc.wireSignal.length);
  const wireFromOutputIndex = new Uint16Array(acc.wireFromOutputIndex.length);

  gateTypes.set(acc.gateTypes);
  outputOffset.set(acc.outputOffset);
  outputCount.set(acc.outputCount);
  allOutputs.set(acc.allOutputs);
  wireFrom.set(acc.wireFrom);
  wireTo.set(acc.wireTo);
  wireSignal.set(acc.wireSignal);
  wireFromOutputIndex.set(acc.wireFromOutputIndex);

  return {
    gateTypes,
    outputOffset,
    outputCount,
    allOutputs,
    wireFrom,
    wireTo,
    wireSignal,
    wireFromOutputIndex,
  };
}


/**
 * Evaluates the flattened circuit using TypedArrays for high performance.
 * 
 * This function performs a change-driven (delta-cycle) evaluation on the
 * flattened array-based representation of the circuit. It synchronizes the
 * simulation state from object instances to arrays, evaluates the logic,
 * and then writes the results back to the object instances.
 * 
 * @param {CircuitBuilder} circuit - The original circuit object.
 * @param {Object} acc - The accumulator containing mapping and topology data.
 * @param {Object} typedArrays - The typed arrays containing the current simulation state.
 */
export function evaluateFlat(circuit, acc, typedArrays) {
  let {
    gateTypes,
    outputOffset,
    outputCount,
    allOutputs,
    wireFrom,
    wireTo,
    wireSignal,
  } = typedArrays;

  for (const [gate, entry] of acc.gateMap.entries()) {
    if (gate.type === "input" || gate.type === "clock") {
      allOutputs[outputOffset[entry]] = gate.output ? 1 : 0;
    }
  }

  let currentDelta = new Set();
  let nextDelta = new Set();

  for (let i = 0; i < wireSignal.length; i++) {
    const gateType = gateTypes[wireFrom[i]];
    if (gateType === Types["input"] || gateType === Types["clock"]) {
      if (allOutputs[outputOffset[wireFrom[i]]] !== wireSignal[i]) {
        wireSignal[i] = allOutputs[outputOffset[wireFrom[i]]];
        currentDelta.add(wireTo[i]);
      }
    }
  }

  let iterations = 0;

  while (currentDelta.size > 0 && iterations < 100) {
    const [gateIndex] = currentDelta;
    currentDelta.delete(gateIndex);

    if (gateTypes[gateIndex] === Types.input || gateTypes[gateIndex] === Types.clock) {
      const faninWires = acc.fanin.get(gateIndex) ?? [];
      const newVal = faninWires.length > 0 ? wireSignal[faninWires[0]] : allOutputs[outputOffset[gateIndex]];

      const oldVal = allOutputs[outputOffset[gateIndex]];
      allOutputs[outputOffset[gateIndex]] = newVal;

      if (newVal !== oldVal) {
        for (let i = 0; i < wireFrom.length; i++) {
          if (wireFrom[i] === gateIndex) {
            wireSignal[i] = newVal;
            nextDelta.add(wireTo[i]);
          }
        }
      }
    } else {
      const faninWires = acc.fanin.get(gateIndex) ?? [];
      const inputSignals = faninWires.map(wireIdx => wireSignal[wireIdx]);

      const oldOutput = allOutputs[outputOffset[gateIndex]];
      const newOutput = evaluateGate(gateTypes[gateIndex], inputSignals);

      allOutputs[outputOffset[gateIndex]] = newOutput;

      if (newOutput !== oldOutput) {
        const fanoutWires = acc.fanout.get(gateIndex) ?? [];
        for (const wireIdx of fanoutWires) {
          wireSignal[wireIdx] = newOutput;
          nextDelta.add(wireTo[wireIdx]);
        }
      }
    }

    if (currentDelta.size === 0) {
      [currentDelta, nextDelta] = [nextDelta, currentDelta];
      iterations += 1;
    }
  }

  for (const [gate, entry] of acc.gateMap.entries()) {
    if (gate.type !== "composite") {
      gate.output = allOutputs[outputOffset[entry]] === 1;
    } else {
      gate.output = entry.outputBoundary.map(
        nodeIndex => allOutputs[outputOffset[nodeIndex]] === 1
      );
    }
  }

  for (const [wire, idx] of acc.wireMap.entries()) {
    wire.signal = wireSignal[idx] === 1;
  }

  for (let i = 0; i < allOutputs.length; i++) {
    acc.allOutputs[i] = allOutputs[i];
  }
  for (let i = 0; i < wireSignal.length; i++) {
    acc.wireSignal[i] = wireSignal[i];
  }
}

/**
 * Evaluates a single logic gate primitive based on its type and inputs.
 * 
 * @param {number} type - The numeric type identifier of the gate (from Types enum).
 * @param {Array<number>} inputs - An array of numeric input values (0 or 1).
 * @returns {number} The resulting output value (0 or 1).
 */
function evaluateGate(type, inputs) {
  let output;

  switch (type) {
    case Types.and:
      output = 1;
      inputs.forEach(input => {
        output = output & input;
      });
      break;
    case Types.or:
      output = 0;
      inputs.forEach(input => {
        output = output | input;
      });
      break;
    case Types.not:
      output = inputs[0] === 0 ? 1 : 0;
      break;
    case Types.nand:
      output = 1;
      inputs.forEach(input => {
        output = output & input;
      });
      output = output === 0 ? 1 : 0;
      break;
    case Types.nor:
      output = 0;
      inputs.forEach(input => {
        output = output | input;
      });
      output = output === 0 ? 1 : 0;
      break;
    case Types.xor:
      output = 0;
      inputs.forEach(input => {
        output = output ^ input;
      });
      break;
    case Types.xnor:
      output = 0;
      inputs.forEach(input => {
        output = output ^ input;
      });
      output = output === 0 ? 1 : 0;
      break;
    case Types.output:
      output = inputs[0];
      break;
  }
  return output;
}