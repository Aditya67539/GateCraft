import { describe, it, expect } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";
import { SIGNAL } from "../../constants.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

// ─── disconnectWires ────────────────────────────────────────────────────────

describe("disconnectWires", () => {
  it("clears the input slot (sets undefined) on a basic gate", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("and"); // fixed 2 inputs

    builder.connectGates(A, gate, 0);
    builder.connectGates(B, gate, 1);

    expect(gate.inputs[0]).toBeDefined();
    expect(gate.inputs[1]).toBeDefined();

    builder.disconnectWires(gate, 0);

    // Slot is cleared but array length is preserved (fixed ports)
    expect(gate.inputs.length).toBe(2);
    expect(gate.inputs[0]).toBeUndefined();
    expect(gate.inputs[1]).toBeDefined();
    expect(gate.inputs[1].from).toBe(B);
  });

  it("clears the input slot on an output gate", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const out = builder.addBasicGate("output"); // fixed 1 input

    builder.connectGates(A, out, 0);
    expect(out.inputs[0]).toBeDefined();

    builder.disconnectWires(out, 0);

    expect(out.inputs.length).toBe(1);
    expect(out.inputs[0]).toBeUndefined();
  });

  it("clears the input slot on a composite gate", () => {
    const innerBuilder = new CircuitBuilder();
    const inA = innerBuilder.addBasicGate("input");
    const inB = innerBuilder.addBasicGate("input");
    const andGate = innerBuilder.addBasicGate("and");
    const outGate = innerBuilder.addBasicGate("output");

    innerBuilder.connectGates(inA, andGate, 0);
    innerBuilder.connectGates(inB, andGate, 1);
    innerBuilder.connectGates(andGate, outGate, 0);

    const circuitData = {
      builder: innerBuilder,
      inputOrder: [inA.id, inB.id],
      outputOrder: [outGate.id],
    };

    const builder = new CircuitBuilder();
    const compositeGate = builder.addCompositeGate("TestComposite", circuitData);

    const X = builder.addBasicGate("input");
    const Y = builder.addBasicGate("input");

    builder.connectGates(X, compositeGate, 0);
    builder.connectGates(Y, compositeGate, 1);

    expect(compositeGate.inputs[0]).toBeDefined();
    expect(compositeGate.inputs[1]).toBeDefined();

    builder.disconnectWires(compositeGate, 0);

    expect(compositeGate.inputs.length).toBe(2);
    expect(compositeGate.inputs[0]).toBeUndefined();
    expect(compositeGate.inputs[1]).toBeDefined();
  });

  it("does not affect wires targeting other gates", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate1 = builder.addBasicGate("and");
    const gate2 = builder.addBasicGate("or");

    builder.connectGates(A, gate1, 0);
    builder.connectGates(B, gate1, 1);
    const resultA2 = builder.connectGates(A, gate2, 0);
    const resultB2 = builder.connectGates(B, gate2, 1);

    const wireA2 = resultA2.wire;
    const wireB2 = resultB2.wire;

    // Disconnect gate1's index 0
    builder.disconnectWires(gate1, 0);

    // gate2's wires should be unaffected
    expect(wireA2.toInputIndex).toBe(0);
    expect(wireB2.toInputIndex).toBe(1);
    expect(gate2.inputs[0]).toBeDefined();
    expect(gate2.inputs[1]).toBeDefined();
  });

  it("allows reconnecting a previously disconnected slot", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("and");

    builder.connectGates(A, gate, 0);
    builder.connectGates(B, gate, 1);

    // Disconnect slot 0
    builder.disconnectWires(gate, 0);
    expect(gate.inputs[0]).toBeUndefined();

    // Reconnect a new input to slot 0
    const C = builder.addBasicGate("input");
    const resultC = builder.connectGates(C, gate, 0);

    const wireC = resultC.wire;

    expect(gate.inputs[0]).toBeDefined();
    expect(gate.inputs[0].from).toBe(C);
    expect(wireC.toInputIndex).toBe(0);
  });
});

// ─── removeWire ─────────────────────────────────────────────────────────────

describe("removeWire", () => {
  it("removes the wire from the circuit's wire list", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const gate = builder.addBasicGate("not");
    const out = builder.addBasicGate("output");

    const resultAG = builder.connectGates(A, gate, 0);
    const resultGO = builder.connectGates(gate, out, 0);

    const wireAG = resultAG.wire;
    const wireGO = resultGO.wire;

    expect(builder.wires.length).toBe(2);

    builder.removeWire(wireAG);

    expect(builder.wires.length).toBe(1);
    expect(builder.wires).toContain(wireGO);
    expect(builder.wires).not.toContain(wireAG);
  });

  it("clears the input slot on the target gate (does not splice)", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("and");

    const resultA = builder.connectGates(A, gate, 0);
    const wireA = resultA.wire;
    builder.connectGates(B, gate, 1);

    builder.removeWire(wireA);

    // Fixed ports: array length stays the same, slot 0 is cleared
    expect(gate.inputs.length).toBe(2);
    expect(gate.inputs[0]).toBeUndefined();
    expect(gate.inputs[1]).toBeDefined();
    expect(gate.inputs[1].from).toBe(B);
  });

  it("does not shift toInputIndex on remaining wires (fixed ports)", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("and");
    const out = builder.addBasicGate("output");

    const resultA = builder.connectGates(A, gate, 0);
    const resultB = builder.connectGates(B, gate, 1);
    const wireA = resultA.wire;
    const wireB = resultB.wire;
    builder.connectGates(gate, out, 0);

    builder.removeWire(wireA);

    // B's wire index should remain unchanged
    expect(wireB.toInputIndex).toBe(1);
  });

  it("marks the circuit as dirty after removal", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const gate = builder.addBasicGate("not");

    const result = builder.connectGates(A, gate, 0);
    const wire = result.wire;

    builder.dirty = false;
    builder.removeWire(wire);

    expect(builder.dirty).toBe(true);
  });

  it("can remove the only wire in the circuit", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const out = builder.addBasicGate("output");

    const result = builder.connectGates(A, out, 0);
    const wire = result.wire;

    builder.removeWire(wire);

    expect(builder.wires.length).toBe(0);
    expect(out.inputs[0]).toBeUndefined();
  });

  it("allows reconnection to the same slot after wire removal", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("not");

    const resultA = builder.connectGates(A, gate, 0);
    const wireA = resultA.wire;

    builder.removeWire(wireA);
    expect(gate.inputs[0]).toBeUndefined();

    // Should be able to connect B to the now-free slot 0
    const wireB = builder.connectGates(B, gate, 0);
    expect(wireB).not.toBeNull();
    expect(gate.inputs[0]).toBeDefined();
    expect(gate.inputs[0].from).toBe(B);
  });
});

// ─── removeGate ─────────────────────────────────────────────────────────────

describe("removeGate", () => {
  it("removes the gate from the circuit's gate map", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const gate = builder.addBasicGate("not");
    const out = builder.addBasicGate("output");

    builder.connectGates(A, gate, 0);
    builder.connectGates(gate, out, 0);

    const gateId = gate.id;
    builder.removeGate(gateId);

    expect(builder.gates.has(gateId)).toBe(false);
  });

  it("removes all wires connected to the gate (both inbound and outbound)", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const gate = builder.addBasicGate("not");
    const out = builder.addBasicGate("output");

    builder.connectGates(A, gate, 0);
    builder.connectGates(gate, out, 0);

    expect(builder.wires.length).toBe(2);

    builder.removeGate(gate.id);

    expect(builder.wires.length).toBe(0);
  });

  it("clears input slots on downstream gates (not spliced)", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("and");
    const out = builder.addBasicGate("output");

    builder.connectGates(A, gate, 0);
    builder.connectGates(B, gate, 1);
    builder.connectGates(gate, out, 0);

    // out has 1 fixed input slot, connected
    expect(out.inputs[0]).toBeDefined();

    builder.removeGate(gate.id);

    // out's input slot should be cleared (undefined), length preserved
    expect(out.inputs.length).toBe(1);
    expect(out.inputs[0]).toBeUndefined();
  });

  it("removes an input gate and clears the downstream slot", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("and");
    const out = builder.addBasicGate("output");

    builder.connectGates(A, gate, 0);
    builder.connectGates(B, gate, 1);
    builder.connectGates(gate, out, 0);

    builder.removeGate(A.id);

    // Wire from A -> gate should be removed
    expect(builder.wires.every(w => w.from.id !== A.id)).toBe(true);
    // The AND gate's slot 0 should be cleared, slot 1 still has B
    expect(gate.inputs.length).toBe(2);
    expect(gate.inputs[0]).toBeUndefined();
    expect(gate.inputs[1]).toBeDefined();
    expect(gate.inputs[1].from).toBe(B);
  });

  it("removes an output gate without affecting upstream gates", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const gate = builder.addBasicGate("not");
    const out = builder.addBasicGate("output");

    builder.connectGates(A, gate, 0);
    builder.connectGates(gate, out, 0);

    builder.removeGate(out.id);

    // NOT gate's inputs should be unaffected
    expect(gate.inputs[0]).toBeDefined();
    expect(gate.inputs[0].from).toBe(A);
    expect(builder.wires.length).toBe(1);
    expect(builder.gates.has(gate.id)).toBe(true);
  });

  it("removes a middle gate in a chain and cleans up both directions", () => {
    //  A -> NOT -> OR -> out
    //  B --------> OR
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const notGate = builder.addBasicGate("not");
    const orGate = builder.addBasicGate("or");
    const out = builder.addBasicGate("output");

    builder.connectGates(A, notGate, 0);
    builder.connectGates(notGate, orGate, 0);
    builder.connectGates(B, orGate, 1);
    builder.connectGates(orGate, out, 0);

    expect(builder.wires.length).toBe(4);

    builder.removeGate(notGate.id);

    // Wires A->NOT and NOT->OR should be gone
    expect(builder.wires.length).toBe(2);
    // OR gate's slot 0 should be cleared, slot 1 still has B
    expect(orGate.inputs[0]).toBeUndefined();
    expect(orGate.inputs[1]).toBeDefined();
    expect(orGate.inputs[1].from).toBe(B);
    // A and B should still exist
    expect(builder.gates.has(A.id)).toBe(true);
    expect(builder.gates.has(B.id)).toBe(true);
  });

  it("handles removing a gate with no connections", () => {
    const builder = new CircuitBuilder();

    const gate = builder.addBasicGate("and");
    const gateId = gate.id;

    expect(builder.gates.has(gateId)).toBe(true);

    builder.removeGate(gateId);

    expect(builder.gates.has(gateId)).toBe(false);
    expect(builder.wires.length).toBe(0);
  });

  it("handles removing a fan-out gate (one gate feeding multiple downstream)", () => {
    //  A -> out1
    //  A -> out2
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const out1 = builder.addBasicGate("output");
    const out2 = builder.addBasicGate("output");

    builder.connectGates(A, out1, 0);
    builder.connectGates(A, out2, 0);

    expect(builder.wires.length).toBe(2);

    builder.removeGate(A.id);

    expect(builder.wires.length).toBe(0);
    expect(out1.inputs[0]).toBeUndefined();
    expect(out2.inputs[0]).toBeUndefined();
  });

  it("preserves fixed slot positions on sibling wires after gate removal", () => {
    //  A -> AND (slot 0)
    //  B -> AND (slot 1)  <-- B is removed
    //  AND -> out
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("and");
    const out = builder.addBasicGate("output");

    const resultA = builder.connectGates(A, gate, 0);
    const wireA = resultA.wire;
    builder.connectGates(B, gate, 1);
    builder.connectGates(gate, out, 0);

    builder.removeGate(B.id);

    // gate should still have 2 fixed slots; slot 0 has A, slot 1 is cleared
    expect(gate.inputs.length).toBe(2);
    expect(gate.inputs[0]).toBeDefined();
    expect(gate.inputs[0].from).toBe(A);
    expect(gate.inputs[1]).toBeUndefined();
    expect(wireA.toInputIndex).toBe(0);
  });

  it("circuit evaluates correctly after gate removal and rewiring", () => {
    //  A -> NOT -> out   (initially)
    //  Remove NOT, then connect A -> out directly
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const notGate = builder.addBasicGate("not");
    const out = builder.addBasicGate("output");

    builder.connectGates(A, notGate, 0);
    builder.connectGates(notGate, out, 0);

    A.setValue(HIGH);
    builder.evaluate();
    expect(out.output).toBe(LOW); // NOT(true) = false

    builder.removeGate(notGate.id);
    builder.connectGates(A, out, 0);

    builder.evaluate();
    expect(out.output).toBe(HIGH); // Direct: true
  });
});

// ─── connectGates ───────────────────────────────────────────────────────────

describe("connectGates", () => {
  it("creates a wire and adds it to the circuit", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const gate = builder.addBasicGate("not");

    const result = builder.connectGates(A, gate, 0);
    const wire = result.wire;

    expect(wire).not.toBeNull();
    expect(builder.wires.length).toBe(1);
    expect(builder.wires[0]).toBe(wire);
  });

  it("sets correct wire properties (from, to, toInputIndex, fromOutputIndex)", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const gate = builder.addBasicGate("not");

    const result = builder.connectGates(A, gate, 0);
    const wire = result.wire;

    expect(wire.from).toBe(A);
    expect(wire.to).toBe(gate);
    expect(wire.toInputIndex).toBe(0);
    expect(wire.fromOutputIndex).toBeNull();
  });

  it("stores the wire in the target gate's input slot", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("and");

    builder.connectGates(A, gate, 0);
    builder.connectGates(B, gate, 1);

    expect(gate.inputs[0].from).toBe(A);
    expect(gate.inputs[1].from).toBe(B);
  });

  it("initializes wire signal from the source gate's output", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const gate = builder.addBasicGate("not");

    A.setValue(true);
    const result = builder.connectGates(A, gate, 0);
    const wire = result.wire;

    expect(wire.signal).toBe(true);
  });

  it("marks the circuit as dirty after connection", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const gate = builder.addBasicGate("not");

    builder.dirty = false;
    builder.connectGates(A, gate, 0);

    expect(builder.dirty).toBe(true);
  });

  it("returns null when toInputIndex is null (fixed ports require explicit index)", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const gate = builder.addBasicGate("not");

    const result = builder.connectGates(A, gate, null);

    expect(result.ok).toBe(false);
    expect(builder.wires.length).toBe(0);
  });

  it("returns null when the target slot is already occupied", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("not");

    builder.connectGates(A, gate, 0);
    const duplicateResult = builder.connectGates(B, gate, 0);

    expect(duplicateResult.ok).toBe(false);
    // Only the first wire should exist
    expect(builder.wires.length).toBe(1);
    expect(gate.inputs[0].from).toBe(A);
  });

  it("allows connecting to different slots on the same gate", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("and");

    const resultA = builder.connectGates(A, gate, 0);
    const resultB = builder.connectGates(B, gate, 1);

    const wireA = resultA.wire;
    const wireB = resultB.wire;

    expect(wireA).not.toBeNull();
    expect(wireB).not.toBeNull();
    expect(builder.wires.length).toBe(2);
    expect(wireA.toInputIndex).toBe(0);
    expect(wireB.toInputIndex).toBe(1);
  });

  it("supports fan-out (one source to multiple destinations)", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const out1 = builder.addBasicGate("output");
    const out2 = builder.addBasicGate("output");

    const result1 = builder.connectGates(A, out1, 0);
    const result2 = builder.connectGates(A, out2, 0);

    const wire1 = result1.wire;
    const wire2 = result2.wire;

    expect(wire1).not.toBeNull();
    expect(wire2).not.toBeNull();
    expect(builder.wires.length).toBe(2);
    expect(wire1.from).toBe(A);
    expect(wire2.from).toBe(A);
  });

  it("settles the circuit by default after connecting", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const out = builder.addBasicGate("output");

    A.setValue(true);
    builder.connectGates(A, out, 0);

    // After settle, the output should reflect the input
    expect(out.output).toBe(true);
  });

  it("does not settle when settle parameter is false", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const out = builder.addBasicGate("output");

    A.setValue(HIGH);
    builder.connectGates(A, out, 0, null, false);

    // Without settling, output should still be the default
    expect(out.output).toBe(X);
  });

  it("connects to a composite gate with fromOutputIndex", () => {
    const innerBuilder = new CircuitBuilder();
    const inA = innerBuilder.addBasicGate("input");
    const inB = innerBuilder.addBasicGate("input");
    const andGate = innerBuilder.addBasicGate("and");
    const outGate = innerBuilder.addBasicGate("output");

    innerBuilder.connectGates(inA, andGate, 0);
    innerBuilder.connectGates(inB, andGate, 1);
    innerBuilder.connectGates(andGate, outGate, 0);

    const circuitData = {
      builder: innerBuilder,
      inputOrder: [inA.id, inB.id],
      outputOrder: [outGate.id],
    };

    const builder = new CircuitBuilder();
    const composite = builder.addCompositeGate("TestAnd", circuitData);
    const out = builder.addBasicGate("output");

    // Connect composite output 0 to out input 0
    const result = builder.connectGates(composite, out, 0, 0);
    const wire = result.wire;

    expect(wire).not.toBeNull();
    expect(wire.fromOutputIndex).toBe(0);
    expect(wire.to).toBe(out);
  });
});

// ─── Gate Fixed Port Initialization ─────────────────────────────────────────

describe("Gate fixed port initialization", () => {
  it("basic gates start with fixed-size input arrays filled with undefined", () => {
    const builder = new CircuitBuilder();

    const andGate = builder.addBasicGate("and");
    const orGate = builder.addBasicGate("or");
    const notGate = builder.addBasicGate("not");

    expect(andGate.inputs.length).toBe(2);
    expect(andGate.inputs.every(i => i === undefined)).toBe(true);

    expect(orGate.inputs.length).toBe(2);
    expect(orGate.inputs.every(i => i === undefined)).toBe(true);

    expect(notGate.inputs.length).toBe(1);
    expect(notGate.inputs.every(i => i === undefined)).toBe(true);
  });

  it("output gate starts with a fixed-size input array of 1", () => {
    const builder = new CircuitBuilder();
    const out = builder.addBasicGate("output");

    expect(out.inputs.length).toBe(1);
    expect(out.inputs[0]).toBeUndefined();
  });

  it("input and clock gates have inputCount 0", () => {
    const builder = new CircuitBuilder();
    const inp = builder.addBasicGate("input");
    const clk = builder.addBasicGate("clock");

    expect(inp.inputCount).toBe(0);
    expect(clk.inputCount).toBe(0);
  });

  it("all gate types report correct outputCount", () => {
    const builder = new CircuitBuilder();

    const inp = builder.addBasicGate("input");
    const clk = builder.addBasicGate("clock");
    const out = builder.addBasicGate("output");
    const andGate = builder.addBasicGate("and");
    const notGate = builder.addBasicGate("not");

    expect(inp.outputCount).toBe(1);
    expect(clk.outputCount).toBe(1);
    expect(out.outputCount).toBe(0);
    expect(andGate.outputCount).toBe(1);
    expect(notGate.outputCount).toBe(1);
  });
});
