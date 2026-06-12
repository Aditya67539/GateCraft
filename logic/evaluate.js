export var wasmMemory = null;
export var wasmInstance = null;

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
    const oldOutput = gate.type === "composite" ? gate.output.slice() : gate.output;
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
    if (gate.type === "composite") {
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
    if (currentDelta.size === 0) {
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
export function evaluateOnce(circuit) {
  const wires = circuit.wires;
  const gates = circuit.getGates();
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
    if (gate.hasNoInputsConnected()) continue;
    const result = gate.evaluate();
    if (!result.ok) {
      console.error(result.error);
      continue;
    }
    const newOutput = result.output;
    gate.output = newOutput;
    for (const wire of wires) {
      if (wire.from.id !== gate.id) continue;

      const signal = gate.type === "composite"
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
    allOutputs: [],
    wireFrom: [],
    wireTo: [],
    wireSignal: [],
    wireMap: new Map(),
    gateMap: new Map(),
    fanout: new Map(),
    fanin: new Map(),
  };
}

export function clearAccumulator(acc) {
  acc.gateTypes.length = 0;
  acc.outputOffset.length = 0;
  acc.allOutputs.length = 0;
  acc.wireFrom.length = 0;
  acc.wireTo.length = 0;
  acc.wireSignal.length = 0;
  acc.wireMap.clear();
  acc.gateMap.clear();
  acc.fanout.clear();
  acc.fanin.clear();
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
 * Converts standard arrays in the accumulator to TypedArrays allocated in the WASM shared memory buffer.
 * 
 * @param {Object} acc - The populated accumulator object.
 * @returns {Object} An object containing the typed array equivalents of the accumulator data.
 */
export function buildTypedArrays(acc) {
  if (!wasmMemory) {
    throw new Error("WASM not initialized. Call initWasm() first.");
  }

  // Emscripten stores C global variables (pointers, gate/wire counts) at
  // offsets 1024–1087 in linear memory. Start our typed arrays after that
  // region to prevent the C runtime from corrupting circuit data.
  let ptr = 1088;

  // 1-byte arrays
  const gateTypes = new Uint8Array(wasmMemory.buffer, ptr, acc.gateTypes.length);
  gateTypes.set(acc.gateTypes);
  ptr += gateTypes.byteLength;

  const allOutputs = new Uint8Array(wasmMemory.buffer, ptr, acc.allOutputs.length);
  allOutputs.set(acc.allOutputs);
  ptr += allOutputs.byteLength;

  const wireSignal = new Uint8Array(wasmMemory.buffer, ptr, acc.wireSignal.length);
  wireSignal.set(acc.wireSignal);
  ptr += wireSignal.byteLength;

  // Align to 2 bytes for Uint16Array
  if (ptr % 2 !== 0) ptr += 1;

  // 2-byte arrays
  const outputOffset = new Uint16Array(wasmMemory.buffer, ptr, acc.outputOffset.length);
  outputOffset.set(acc.outputOffset);
  ptr += outputOffset.byteLength;

  const wireFrom = new Uint16Array(wasmMemory.buffer, ptr, acc.wireFrom.length);
  wireFrom.set(acc.wireFrom);
  ptr += wireFrom.byteLength;

  const wireTo = new Uint16Array(wasmMemory.buffer, ptr, acc.wireTo.length);
  wireTo.set(acc.wireTo);
  ptr += wireTo.byteLength;

  // Auxiliary arrays for WASM evaluation loops
  const maxGates = Math.max(1024, acc.gateTypes.length * 2);
  const currentDelta = new Uint16Array(wasmMemory.buffer, ptr, maxGates);
  ptr += currentDelta.byteLength;

  const nextDelta = new Uint16Array(wasmMemory.buffer, ptr, maxGates);
  ptr += nextDelta.byteLength;

  const inDelta = new Uint16Array(wasmMemory.buffer, ptr, maxGates);
  ptr += inDelta.byteLength;

  // Serialize fanin arrays
  let totalFanin = 0;
  for (let i = 0; i < acc.gateTypes.length; i++) {
    totalFanin += (acc.fanin.get(i) || []).length;
  }
  
  // Serialize fanout arrays
  let totalFanout = 0;
  for (let i = 0; i < acc.gateTypes.length; i++) {
    totalFanout += (acc.fanout.get(i) || []).length;
  }

  const faninCounts = new Uint8Array(wasmMemory.buffer, ptr, acc.gateTypes.length);
  ptr += faninCounts.byteLength;

  const fanoutCounts = new Uint8Array(wasmMemory.buffer, ptr, acc.gateTypes.length);
  ptr += fanoutCounts.byteLength;

  if (ptr % 2 !== 0) ptr += 1;

  const faninOffsets = new Uint16Array(wasmMemory.buffer, ptr, acc.gateTypes.length);
  ptr += faninOffsets.byteLength;

  const fanoutOffsets = new Uint16Array(wasmMemory.buffer, ptr, acc.gateTypes.length);
  ptr += fanoutOffsets.byteLength;

  const faninWires = new Uint16Array(wasmMemory.buffer, ptr, totalFanin);
  ptr += faninWires.byteLength;

  const fanoutWires = new Uint16Array(wasmMemory.buffer, ptr, totalFanout);
  ptr += fanoutWires.byteLength;

  let faninPtr = 0;
  let fanoutPtr = 0;
  for (let i = 0; i < acc.gateTypes.length; i++) {
    const inWires = acc.fanin.get(i) || [];
    faninCounts[i] = inWires.length;
    faninOffsets[i] = faninPtr;
    for (const w of inWires) faninWires[faninPtr++] = w;

    const outWires = acc.fanout.get(i) || [];
    fanoutCounts[i] = outWires.length;
    fanoutOffsets[i] = fanoutPtr;
    for (const w of outWires) fanoutWires[fanoutPtr++] = w;
  }

  if (wasmInstance && wasmInstance.exports.init) {
    wasmInstance.exports.init(
      gateTypes.byteOffset,
      outputOffset.byteOffset,
      allOutputs.byteOffset,
      wireFrom.byteOffset,
      wireTo.byteOffset,
      wireSignal.byteOffset,
      currentDelta.byteOffset,
      nextDelta.byteOffset,
      inDelta.byteOffset,
      acc.gateTypes.length,
      acc.wireSignal.length,
      faninCounts.byteOffset,
      faninOffsets.byteOffset,
      faninWires.byteOffset,
      fanoutCounts.byteOffset,
      fanoutOffsets.byteOffset,
      fanoutWires.byteOffset
    );
  }

  // Precompute flat arrays for fast JS <-> WASM state synchronization
  acc.inputGates = [];
  acc.inputOffsets = [];
  acc.syncGates = [];
  acc.syncOffsets = [];
  acc.compositeGates = [];
  acc.compositeBoundaries = [];

  for (const [gate, entry] of acc.gateMap.entries()) {
    if (gate.type === "input" || gate.type === "clock") {
      acc.inputGates.push(gate);
      acc.inputOffsets.push(acc.outputOffset[entry]);
    }
    if (gate.type !== "composite") {
      acc.syncGates.push(gate);
      acc.syncOffsets.push(acc.outputOffset[entry]);
    } else {
      acc.compositeGates.push(gate);
      acc.compositeBoundaries.push(entry.outputBoundary);
    }
  }

  acc.syncWires = Array.from(acc.wireMap.keys());
  acc.syncWireIndices = Array.from(acc.wireMap.values());

  return {
    gateTypes,
    outputOffset,
    allOutputs,
    wireFrom,
    wireTo,
    wireSignal,
  };
}

/**
 * Initializes the WebAssembly module and allocates shared memory.
 * @param {string} wasmUrl - Path to the WASM file.
 */
export async function initWasm() {
  if (wasmInstance) return;

  wasmMemory = new WebAssembly.Memory({ initial: 256, maximum: 256 }); // 16MB

  const env = { memory: wasmMemory };

  try {
    let wasmBuffer;
    const wasmUrl = new URL('./evaluate.wasm', import.meta.url);

    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      // Node.js fallback
      const fs = await import('fs');
      wasmBuffer = fs.readFileSync(wasmUrl);
    } else {
      // Browser environment
      const response = await fetch(wasmUrl);
      wasmBuffer = await response.arrayBuffer();
    }

    const { instance } = await WebAssembly.instantiate(wasmBuffer, { env });
    wasmInstance = instance;

    if (instance.exports._initialize) {
      instance.exports._initialize();
    }
  } catch (error) {
    console.error("Failed to load or instantiate WebAssembly module:", error);
  }
}

/**
 * Evaluates the flattened circuit using the WebAssembly module for maximum performance.
 * 
 * @param {CircuitBuilder} circuit - The original circuit object.
 * @param {Object} acc - The accumulator containing mapping and topology data.
 * @param {Object} typedArrays - The typed arrays containing the current simulation state.
 */
export function evaluateWasm(circuit, acc, typedArrays) {
  let {
    outputOffset,
    allOutputs,
    wireSignal,
  } = typedArrays;

  // Copy input/clock states from JS objects to WASM memory
  if (acc.inputGates) {
    for (let i = 0; i < acc.inputGates.length; i++) {
      allOutputs[acc.inputOffsets[i]] = acc.inputGates[i].output ? 1 : 0;
    }
  } else {
    // Fallback if not built yet
    for (const [gate, entry] of acc.gateMap.entries()) {
      if (gate.type === "input" || gate.type === "clock") {
        allOutputs[outputOffset[entry]] = gate.output ? 1 : 0;
      }
    }
  }

  // Run the core evaluation logic in WebAssembly
  if (wasmInstance && wasmInstance.exports.evaluateFlat) {
    const changed = wasmInstance.exports.evaluateFlat();
    if (!changed) return; // Nothing changed — skip sync-back
  } else {
    console.error("WASM evaluateFlat not found");
    return;
  }

  // Copy state from WASM memory back to JS objects
  if (acc.syncGates) {
    for (let i = 0; i < acc.syncGates.length; i++) {
      acc.syncGates[i].output = allOutputs[acc.syncOffsets[i]] === 1;
    }
    for (let i = 0; i < acc.syncWires.length; i++) {
      acc.syncWires[i].signal = wireSignal[acc.syncWireIndices[i]] === 1;
    }
    // Handle composite gates
    if (acc.compositeGates) {
      for (let i = 0; i < acc.compositeGates.length; i++) {
        const boundary = acc.compositeBoundaries[i];
        const outArray = acc.compositeGates[i].output;
        for (let j = 0; j < boundary.length; j++) {
          outArray[j] = allOutputs[outputOffset[boundary[j]]] === 1;
        }
      }
    }
  } else {
    for (const [gate, entry] of acc.gateMap.entries()) {
      if (gate.type !== "composite") {
        gate.output = allOutputs[outputOffset[entry]] === 1;
      } else {
        const boundary = entry.outputBoundary;
        for (let j = 0; j < boundary.length; j++) {
          gate.output[j] = allOutputs[outputOffset[boundary[j]]] === 1;
        }
      }
    }
    for (const [wire, idx] of acc.wireMap.entries()) {
      wire.signal = wireSignal[idx] === 1;
    }
  }
}