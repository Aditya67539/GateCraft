/**
 * Performs change-driven (delta-cycle) evaluation of the circuit. 
 * 
 * This function propagates signal changes through the circuit by only
 * re-evaluating gates whose inputs have changed. It uses a delta-cycle
 * approach to efficiently handle evaluation.
 * 
 * @param {Array<Gate>} gates - List of gate instances
 * @param {Array<Wire>} wires - List of wire objects connecting gates
 * @param {boolean} [seedAll=false] - If true, forces evaluation of every gate in the first delta cycle
 */
export function evaluateAll(gates, wires, seedAll = false) {
  let currentDelta = new Set();
  let nextDelta = new Set();
  const gateMap = {};

  for (const gate of gates) {
    gateMap[gate.id] = gate;
  }

  /**
   * Seeds all non-inputs gates to ensure a full evaluation pass.
   * 
   * This is necessary for composite gates with sequential logic (feedback wires)
   * where initial changes may not properly propagate correctly using purely
   * change-driven evaluation
   */
  if (seedAll) {
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

    const gate = gateMap[gateId];
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
        // TODO: Replace O(n) scan with fanout adjacency list
        for (const wire of wires) {
          if (wire.from.id === gate.id) {
            /**
             * NOTE:
             * Currently this propagates all outputs of composite gate
             * even if only one output port changes. 
             * Future optimization: track per-port changes
             */
            wire.signal = newOutput[wire.fromOutputIndex];
            const downstreamId = wire.to.id;

            nextDelta.add(downstreamId);
          }
        }
      }
    } else {
      if (newOutput !== oldOutput) {
        for (const wire of wires) {
          // TODO: Replace O(n) scan with fanout adjacency list
          if (wire.from.id === gate.id) {
            wire.signal = newOutput;
            const downstreamId = wire.to.id;

            nextDelta.add(downstreamId);
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
 * @param {Array<Gate>} gates - List of gate instances
 * @param {Array<Wire>} wires - List of wire objects connecting gates
 */
export function evaluateOnce(gates, wires) {
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
      /**
       * NOTE:
       * This computes signal before verifying ownership (wire source). 
       * This is inefficient and can lead to undefined access for basic gates
       * 
       * TODO:
       * Check `wire.from.id === gate.id` before signal computation
       */
      if (Array.isArray(gate.output)) signal = gate.output[wire.fromOutputIndex];
      else signal = gate.output;
      if (wire.from.id === gate.id) {
        wire.signal = signal;
      }
    }
  }
}

/**
 * Stabilizes the circuit after structural changes (e.g., wire connection and disconnection)
 * 
 * This repeatedly runs full evaluation until wire signals stop changing. 
 * It is required because structural changes are not detected by change-driven
 * evaluation. 
 * 
 * @param {Array<Gate>} gates - List of gate instances
 * @param {Array<Wire>} wires - List of wire objects connecting gates
 */
export function settleCircuit(gates, wires) {
  let stable = false;
  // Prevent inifinite loops in oscillating circuits
  let iterations = 0;

  while (!stable && iterations < 100) {
    const before = wires.map(w => w.signal);
    evaluateOnce(gates, wires);
    const after = wires.map(w => w.signal);
    stable = before.every((v, i) => v === after[i]);
    iterations++;
  }
}