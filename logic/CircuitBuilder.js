import { settleCircuit, createAccumulator, flatten, buildTypedArrays, initWasm, clearAccumulator, evaluateWasm } from "./evaluate.js";
import { CompositeGate, createBasicGate, createCompositeGate, Gate, Output } from "./gates.js";
import { Wire } from "./wire.js";

await initWasm();

/**
 * Builder class for constructing and managing a digital logic circuit. 
 * Handles gates, wires, connections, evaluation, and structural updates. 
 */
export class CircuitBuilder {
  constructor() {
    /** @type {Map<number, Gate} Map of gateId -> gate instance */
    this.gates = new Map();
    /** @type {Array<Wire>} List of wire objects connecting gates */
    this.wires = [];
    this.dirty = false;
    this.accumulator = createAccumulator();
    const { indexMap } = flatten(this, this.accumulator);
    this.typedArrays = buildTypedArrays(this.accumulator);
    this.indexMap = indexMap;
    this.buildFanout();
  }

  /**
   * Creates and adds a basic gate instance based on the given type. 
   * 
   * @param {string} type - The type of gate ("input", "output", "clock" or logic gate type)
   * @returns {Input|Output|Clock|Gate} The instantiated gate object
   */
  addBasicGate(type) {
    const gate = createBasicGate(type);
    this.gates.set(gate.id, gate);
    return gate;
  }

  /**
   * Creates and adds a composite gate instance from the saved circuit data. 
   * @param {string} name - The label/name of the composite gate
   * @param {Object} circuitData - The circuit data used to construct the composite gate
   * @returns {CompositeGate} The instantiated composite gate object
   */
  addCompositeGate(name, circuitData) {
    const gate = createCompositeGate(name, circuitData);
    this.gates.set(gate.id, gate);
    return gate;
  }

  /**
   * Registers an existing gate instance into the circuit.
   *
   * @param {Gate} gate - Gate instance
   */
  registerGate(gate) {
    this.gates.set(gate.id, gate);
  }

  /**
   * Removes a gate and all associated wires from the circuit. 
   * Also updates the input indices of affected gates and settles the circuit. 
   * 
   * @param {number} gateId - ID of the gate to remove
   */
  removeGate(gateId) {
    // Find wires connected to this gate
    const affectedWires = this.wires.filter(
      w => w.from.id === gateId || w.to.id === gateId
    );

    // Disconnect each affected wire
    for (const wire of affectedWires) {
      const toGate = wire.to;
      const index = wire.toInputIndex;
      this.disconnectWires(toGate, index);
    }

    // Remove all wires connected to this gate
    this.wires = this.wires.filter(
      w => w.from.id !== gateId && w.to.id !== gateId
    );

    this.gates.delete(gateId);
    this.settle();
  }


  /**
   * Connects two gates with a wire. 
   * 
   * @param {Gate} fromGate - Source gate
   * @param {Gate} toGate - Destination gate
   * @param {?number} fromOutputIndex - Output index of source gate (if multi-output)
   * @param {?number} toInputIndex - Input index of destination gate
   * @param {?Boolean} settle - Settles the circuit if true
   * @returns {Wire} The instantiated wire object
   */
  connectGates(fromGate, toGate, fromOutputIndex = null, toInputIndex = null, settle = true) {
    const result = toGate.connect(fromGate, toInputIndex, fromOutputIndex);
    if (!result.ok) {
      console.error(result.error);
      return null;
    }
    const newWire = result.wire;
    this.wires.push(newWire);
    this.dirty = true;
    if (settle) this.settle();
    return newWire;
  }

  /**
   * Disconnects a wire from a gate's input. 
   * 
   * @param {Gate} toGate - Target gate whose input is being removed
   * @param {number} removedIndex - Index of the input to remove
   */
  disconnectWires(toGate, removedIndex) {
    toGate.inputs[removedIndex] = undefined;
  }

  /**
   * Removes a specific wire from the circuit and updates the target gate. 
   * 
   * @param {Wire} wire - Wire object to remove
   */
  removeWire(wire) {
    const toGate = wire.to;
    const removedIndex = wire.toInputIndex;

    this.disconnectWires(toGate, removedIndex);

    this.wires = this.wires.filter(w => w !== wire);
    this.settle();
    this.dirty = true;
  }

  buildFanout() {
    const fanout = {};
    for (const wire of this.wires) {
      if (fanout[wire.from.id] === undefined) {
        fanout[wire.from.id] = [];
      }
      fanout[wire.from.id].push({
        wire,
        toId: wire.to.id,
      });
    }
    this.fanout = fanout;
  }

  buildTypedData() {
    this.buildFanout();
    clearAccumulator(this.accumulator);
    const { indexMap } = flatten(this, this.accumulator);
    this.indexMap = indexMap;
    this.typedArrays = buildTypedArrays(this.accumulator);
    this.dirty = false;
  }

  /**
   * Evaluates the circuit by Delta-cycle
   */
  evaluate() {
    if (this.dirty) this.buildTypedData();
    evaluateWasm(this, this.accumulator, this.typedArrays);
  }

  /**
   * Settles the circuit by repeatedly evaluating until it stabilizes. 
   * Used after structural changes. 
   */
  settle() {
    settleCircuit(this);
  }

  /**
   * Returns all gates in the circuit. 
   * 
   * @returns {Array<Gate>} List of gate instances
   */
  getGates() {
    return this.gates.values();
  }

  /**
   * Returns all the wires in the circuit.  
   * 
   * @returns {Array<Wire>} List of wire instances
   */
  getWires() {
    return this.wires;
  }

  /**
   * Clears the entire circuit.
   * Removes all gates and wires, resetting the builder to an empty state.
   */
  clear() {
    this.gates.clear();
    this.wires = [];
  }
}
