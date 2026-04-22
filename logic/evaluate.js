/**
 * Performs change-driven (delta-cycle) evaluation of the circuit. 
 * 
 * This function propagates signal changes through the circuit by only
 * re-evaluating gates whose inputs have changed. It uses a delta-cycle
 * approach to efficiently handle evaluation.
 * 
 * @param {Array<RenderPoint>} renderNodes - List of render nodes containing gate instances
 * @param {Array<Wire>} wires - List of wire objects connecting gates
 * @param {boolean} [seedAll=false] - If true, forces evaluation of every gate in the first delta cycle
 */
export function evaluateAll(renderNodes, wires, seedAll = false) {
  let currentDelta = new Set();
  let nextDelta = new Set();
  const gateMap = {};

  for (const rn of renderNodes) {
    gateMap[rn.gate.id] = rn.gate;
  }

  /**
   * Seeds all non-inputs gates to ensure a full evaluation pass.
   * 
   * This is necessary for composite gates with sequential logic (feedback wires)
   * where initial changes may not properly propagate correctly using purely
   * change-driven evaluation
   */
  if (seedAll) {
    for (const rn of renderNodes) {
      if (rn.gate.type !== "input" && rn.gate.type !== "clock") {
        currentDelta.add(rn.gate.id);
      }
    }
  }

  // Seed inputs and clocks if their state is changed
  for (const wi of wires) {
    const from = wi.wire.from;
    if (from.type === "input" || from.type === "clock") {
      const newSignal = from.output;
      if (wi.wire.signal !== newSignal) {
        wi.wire.signal = newSignal;
        currentDelta.add(wi.wire.to.id);
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
    const newOutput = gate.evaluate();
    gate.output = newOutput;

    /**
     * Propagate changes to downstream gates only if output changes
     */
    if (Array.isArray(newOutput)) {
      if (!arraysEqual(newOutput, oldOutput)) {
        // TODO: Replace O(n) scan with fanout adjacency list
        for (const wi of wires) {
          if (wi.wire.from.id === gate.id) {
            /**
             * NOTE:
             * Currently this propagates all outputs of composite gate
             * even if only one output port changes. 
             * Future optimization: track per-port changes
             */
            wi.wire.signal = newOutput[wi.wire.fromOutputIndex];
            const downstreamId = wi.wire.to.id;

            nextDelta.add(downstreamId);
          }
        }
      }
    } else {
      if (newOutput !== oldOutput) {
        for (const wi of wires) {
          // TODO: Replace O(n) scan with fanout adjacency list
          if (wi.wire.from.id === gate.id) {
            wi.wire.signal = newOutput;
            const downstreamId = wi.wire.to.id;

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
 * @param {Array<RenderPoint>} renderNodes - List of render nodes containing gate instances
 * @param {Array<Wire>} wires - List of wire objects connecting gates
 */
export function evaluateOnce(renderNodes, wires) {
  // Update signals from input and clock sources
  for (const wi of wires) {
    const from = wi.wire.from;
    if (from.type === "input" || from.type === "clock") {
      wi.wire.signal = from.output;
    }
  }

  // Evaluate every non-input and non-clock gate regardless of change
  for (const rn of renderNodes) {
    const gate = rn.gate;
    if (gate.type === "input" || gate.type === "clock") continue;
    gate.output = gate.evaluate();
    let signal;
    for (const wi of wires) {
      /**
       * NOTE:
       * This computes signal before verifying ownership (wire source). 
       * This is inefficient and can lead to undefined access for basic gates
       * 
       * TODO:
       * Check `wi.wire.from.id === gate.id` before signal computation
       */
      if (Array.isArray(gate.output)) signal = gate.output[wi.wire.fromOutputIndex];
      else signal = gate.output;
      if (wi.wire.from.id === gate.id) {
        wi.wire.signal = signal;
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
 * @param {Array<RenderPoint>} renderNodes - List of render nodes containing gate instances
 * @param {Array<Wire>} wires - List of wire objects connecting gates
 */
export function settleCircuit(renderNodes, wires) {
  let stable = false;
  // Prevent inifinite loops in oscillating circuits
  let iterations = 0;

  while (!stable && iterations < 100) {
    const before = wires.map(w => w.wire.signal);
    evaluateOnce(renderNodes, wires);
    const after = wires.map(w => w.wire.signal);
    stable = before.every((v, i) => v === after[i]);
    iterations++;
  }
}