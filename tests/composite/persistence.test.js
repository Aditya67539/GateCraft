import { describe, it, expect } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";
import { buildCircuitFromData } from "../../persistence.js";
import { GATE_CATEGORIES, SIGNAL } from "../../constants.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Serializes a CircuitBuilder into the format that persistence.js getCircuitData
 * produces (gate-only, no buses).
 */
function serializeGateOnly(builder, inputOrder, outputOrder) {
  const gates = [];
  for (const gate of builder.getGates()) {
    const data = { id: gate.id, category: gate.category, type: gate.type };
    if (gate.type === "input") data.signal = gate.output;
    if (gate.label) data.label = gate.label;
    gates.push(data);
  }

  const wires = builder.wires.map((w) => ({
    fromId: w.from.id,
    toId: w.to.id,
    toInputIndex: w.toInputIndex,
    fromOutputIndex: w.fromOutputIndex,
    isBusConnection: false,
  }));

  return { gates, wires, buses: [], inputOrder, outputOrder };
}

/**
 * Serializes a CircuitBuilder that contains buses into the format that
 * persistence.js getCircuitData produces.
 *
 * `busWireDirections` maps wire index → "in" | "out" for wires
 * connected to a bus. All other wires are plain gate-to-gate.
 */
function serializeWithBuses(builder, inputOrder, outputOrder, busWireDirections = {}) {
  const gates = [];
  for (const gate of builder.getGates()) {
    const data = { id: gate.id, category: gate.category, type: gate.type };
    if (gate.type === "input") data.signal = gate.output;
    if (gate.label) data.label = gate.label;
    gates.push(data);
  }

  const buses = [];
  for (const bus of builder.getBuses()) {
    buses.push({ id: bus.id });
  }

  const busIds = new Set(buses.map(b => b.id));

  const wires = builder.wires.map((w, idx) => {
    const data = {
      fromId: w.from.id,
      toId: w.to.id,
      toInputIndex: w.toInputIndex,
      fromOutputIndex: w.fromOutputIndex,
    };

    if (busIds.has(w.from.id) || busIds.has(w.to.id)) {
      data.isBusConnection = true;
      data.direction = busWireDirections[idx];
    } else {
      data.isBusConnection = false;
    }

    return data;
  });

  return { gates, wires, buses, inputOrder, outputOrder };
}


// ---------------------------------------------------------------------------
// Tests: Backward compatibility (pre-bus serialized data)
// ---------------------------------------------------------------------------

describe("Persistence – Backward Compatibility", () => {
  it("reconstructs a circuit serialized without the buses property", () => {
    // Simulate old serialized data that has no `buses` key at all
    const inner = new CircuitBuilder();
    const A = inner.addPrimitiveGate("input");
    const not = inner.addPrimitiveGate("not");
    const Q = inner.addPrimitiveGate("output");

    inner.connectToGate(A, not, 0, null, false);
    inner.connectToGate(not, Q, 0, null, false);

    const category = GATE_CATEGORIES.PRIMITIVE;
    const serialized = {
      gates: [
        { id: A.id,   category, type: "input" },
        { id: not.id, category, type: "not" },
        { id: Q.id,   category, type: "output" },
      ],
      wires: [
        { fromId: A.id, toId: not.id, toInputIndex: 0, fromOutputIndex: null },
        { fromId: not.id, toId: Q.id, toInputIndex: 0, fromOutputIndex: null },
      ],
      // No `buses` property — simulates a save from before bus support
      // No `isBusConnection` on wires either
      inputOrder: [A.id],
      outputOrder: [Q.id],
    };

    const reconstructed = buildCircuitFromData(serialized);

    const outer = new CircuitBuilder();
    const oA = outer.addPrimitiveGate("input");
    const comp = outer.addCompositeGate("not-wrapper", reconstructed);
    const oQ = outer.addPrimitiveGate("output");

    outer.connectToGate(oA, comp, 0);
    outer.connectToGate(comp, oQ, 0, 0);

    oA.setValue(LOW);
    outer.evaluate();
    expect(oQ.output).toBe(HIGH);

    oA.setValue(HIGH);
    outer.evaluate();
    expect(oQ.output).toBe(LOW);
  });

  it("reconstructs wires without isBusConnection field as gate-to-gate connections", () => {
    const inner = new CircuitBuilder();
    const A = inner.addPrimitiveGate("input");
    const B = inner.addPrimitiveGate("input");
    const andGate = inner.addPrimitiveGate("and");
    const Q = inner.addPrimitiveGate("output");

    inner.connectToGate(A, andGate, 0, null, false);
    inner.connectToGate(B, andGate, 1, null, false);
    inner.connectToGate(andGate, Q, 0, null, false);

    // Wires have no isBusConnection — older format
    const category = GATE_CATEGORIES.PRIMITIVE;
    const serialized = {
      gates: [
        { id: A.id,       category, type: "input" },
        { id: B.id,       category, type: "input" },
        { id: andGate.id, category, type: "and" },
        { id: Q.id,       category, type: "output" },
      ],
      wires: [
        { fromId: A.id, toId: andGate.id, toInputIndex: 0, fromOutputIndex: null },
        { fromId: B.id, toId: andGate.id, toInputIndex: 1, fromOutputIndex: null },
        { fromId: andGate.id, toId: Q.id, toInputIndex: 0, fromOutputIndex: null },
      ],
      buses: [],
      inputOrder: [A.id, B.id],
      outputOrder: [Q.id],
    };

    const reconstructed = buildCircuitFromData(serialized);

    const outer = new CircuitBuilder();
    const oA = outer.addPrimitiveGate("input");
    const oB = outer.addPrimitiveGate("input");
    const comp = outer.addCompositeGate("and-gate", reconstructed);
    const oQ = outer.addPrimitiveGate("output");

    outer.connectToGate(oA, comp, 0);
    outer.connectToGate(oB, comp, 1);
    outer.connectToGate(comp, oQ, 0, 0);

    oA.setValue(HIGH);
    oB.setValue(HIGH);
    outer.evaluate();
    expect(oQ.output).toBe(HIGH);

    oA.setValue(HIGH);
    oB.setValue(LOW);
    outer.evaluate();
    expect(oQ.output).toBe(LOW);
  });
});


// ---------------------------------------------------------------------------
// Tests: Bus persistence round-trips
// ---------------------------------------------------------------------------

describe("Persistence – Bus round-trip", () => {
  it("reconstructs a single-driver bus circuit and evaluates correctly", () => {
    // Build: Input → Bus → Output
    const inner = new CircuitBuilder();
    const inp = inner.addPrimitiveGate("input");
    const bus = inner.addBus();
    const out = inner.addPrimitiveGate("output");

    inner.connectToBus(bus, inp, null, false);       // wire 0: gate→bus (direction "in")
    inner.connectToGate(bus, out, 0, null, false);    // wire 1: bus→gate (direction "out")

    const serialized = serializeWithBuses(
      inner,
      [inp.id],
      [out.id],
      { 0: "in", 1: "out" }
    );

    const reconstructed = buildCircuitFromData(serialized);

    // Use reconstructed circuit as composite gate
    const outer = new CircuitBuilder();
    const oA = outer.addPrimitiveGate("input");
    const comp = outer.addCompositeGate("bus-passthrough", reconstructed);
    const oQ = outer.addPrimitiveGate("output");

    outer.connectToGate(oA, comp, 0);
    outer.connectToGate(comp, oQ, 0, 0);

    oA.setValue(LOW);
    outer.evaluate();
    expect(oQ.output).toBe(LOW);

    oA.setValue(HIGH);
    outer.evaluate();
    expect(oQ.output).toBe(HIGH);
  });

  it("reconstructs a dual-driver bus and detects contention", () => {
    // Build: Input1 → Bus ← Input2, Bus → Output
    const inner = new CircuitBuilder();
    const inp1 = inner.addPrimitiveGate("input");
    const inp2 = inner.addPrimitiveGate("input");
    const bus = inner.addBus();
    const out = inner.addPrimitiveGate("output");

    inner.connectToBus(bus, inp1, null, false);       // wire 0
    inner.connectToBus(bus, inp2, null, false);       // wire 1
    inner.connectToGate(bus, out, 0, null, false);    // wire 2

    const serialized = serializeWithBuses(
      inner,
      [inp1.id, inp2.id],
      [out.id],
      { 0: "in", 1: "in", 2: "out" }
    );

    const reconstructed = buildCircuitFromData(serialized);

    const outer = new CircuitBuilder();
    const oA = outer.addPrimitiveGate("input");
    const oB = outer.addPrimitiveGate("input");
    const comp = outer.addCompositeGate("dual-bus", reconstructed);
    const oQ = outer.addPrimitiveGate("output");

    outer.connectToGate(oA, comp, 0);
    outer.connectToGate(oB, comp, 1);
    outer.connectToGate(comp, oQ, 0, 0);

    // Same value → no contention
    oA.setValue(HIGH);
    oB.setValue(HIGH);
    outer.evaluate();
    expect(oQ.output).toBe(HIGH);

    // Conflicting → error
    oA.setValue(HIGH);
    oB.setValue(LOW);
    outer.evaluate();
    expect(oQ.output).toBe(E);
  });

  it("reconstructs a bus with tri-state buffer drivers", () => {
    // Build: enable1,data1 → TSB1 → Bus ← TSB2 ← enable2,data2; Bus → Output
    const inner = new CircuitBuilder();
    const enable1 = inner.addPrimitiveGate("input");
    const data1 = inner.addPrimitiveGate("input");
    const tsb1 = inner.addPrimitiveGate("Tri-state Buffer");

    const enable2 = inner.addPrimitiveGate("input");
    const data2 = inner.addPrimitiveGate("input");
    const tsb2 = inner.addPrimitiveGate("Tri-state Buffer");

    const bus = inner.addBus();
    const out = inner.addPrimitiveGate("output");

    inner.connectToGate(enable1, tsb1, 0, null, false);
    inner.connectToGate(data1, tsb1, 1, null, false);
    inner.connectToGate(enable2, tsb2, 0, null, false);
    inner.connectToGate(data2, tsb2, 1, null, false);

    inner.connectToBus(bus, tsb1, null, false);       // wire 4
    inner.connectToBus(bus, tsb2, null, false);       // wire 5
    inner.connectToGate(bus, out, 0, null, false);    // wire 6

    const serialized = serializeWithBuses(
      inner,
      [enable1.id, data1.id, enable2.id, data2.id],
      [out.id],
      { 4: "in", 5: "in", 6: "out" }
    );

    const reconstructed = buildCircuitFromData(serialized);

    const outer = new CircuitBuilder();
    const oEn1 = outer.addPrimitiveGate("input");
    const oD1 = outer.addPrimitiveGate("input");
    const oEn2 = outer.addPrimitiveGate("input");
    const oD2 = outer.addPrimitiveGate("input");
    const comp = outer.addCompositeGate("tsb-bus", reconstructed);
    const oQ = outer.addPrimitiveGate("output");

    outer.connectToGate(oEn1, comp, 0);
    outer.connectToGate(oD1, comp, 1);
    outer.connectToGate(oEn2, comp, 2);
    outer.connectToGate(oD2, comp, 3);
    outer.connectToGate(comp, oQ, 0, 0);

    // Only TSB1 enabled with HIGH → bus = HIGH
    oEn1.setValue(HIGH);
    oD1.setValue(HIGH);
    oEn2.setValue(LOW);
    oD2.setValue(LOW);
    outer.evaluate();
    expect(oQ.output).toBe(HIGH);

    // Both disabled → bus = Z
    oEn1.setValue(LOW);
    oEn2.setValue(LOW);
    outer.evaluate();
    expect(oQ.output).toBe(Z);

    // Both enabled, same value → no contention
    oEn1.setValue(HIGH);
    oD1.setValue(LOW);
    oEn2.setValue(HIGH);
    oD2.setValue(LOW);
    outer.evaluate();
    expect(oQ.output).toBe(LOW);

    // Both enabled, different values → contention
    oEn1.setValue(HIGH);
    oD1.setValue(HIGH);
    oEn2.setValue(HIGH);
    oD2.setValue(LOW);
    outer.evaluate();
    expect(oQ.output).toBe(E);
  });
});


// ---------------------------------------------------------------------------
// Tests: Mixed circuits (gates + buses together)
// ---------------------------------------------------------------------------

describe("Persistence – Mixed gate and bus circuits", () => {
  it("reconstructs a circuit with both regular wires and bus connections", () => {
    // Build: Input → NOT → Bus → Output
    const inner = new CircuitBuilder();
    const inp = inner.addPrimitiveGate("input");
    const not = inner.addPrimitiveGate("not");
    const bus = inner.addBus();
    const out = inner.addPrimitiveGate("output");

    inner.connectToGate(inp, not, 0, null, false);    // wire 0: gate→gate
    inner.connectToBus(bus, not, null, false);         // wire 1: gate→bus
    inner.connectToGate(bus, out, 0, null, false);     // wire 2: bus→gate

    const serialized = serializeWithBuses(
      inner,
      [inp.id],
      [out.id],
      { 1: "in", 2: "out" }
    );

    const reconstructed = buildCircuitFromData(serialized);

    const outer = new CircuitBuilder();
    const oA = outer.addPrimitiveGate("input");
    const comp = outer.addCompositeGate("not-via-bus", reconstructed);
    const oQ = outer.addPrimitiveGate("output");

    outer.connectToGate(oA, comp, 0);
    outer.connectToGate(comp, oQ, 0, 0);

    oA.setValue(LOW);
    outer.evaluate();
    expect(oQ.output).toBe(HIGH);

    oA.setValue(HIGH);
    outer.evaluate();
    expect(oQ.output).toBe(LOW);
  });
});


// ---------------------------------------------------------------------------
// Tests: buildCircuitFromData structural integrity
// ---------------------------------------------------------------------------

describe("Persistence – buildCircuitFromData structure", () => {
  it("returns correct inputOrder and outputOrder mappings", () => {
    const inner = new CircuitBuilder();
    const A = inner.addPrimitiveGate("input");
    const B = inner.addPrimitiveGate("input");
    const Q = inner.addPrimitiveGate("output");

    inner.connectToGate(A, Q, 0, null, false);

    const serialized = serializeGateOnly(inner, [A.id, B.id], [Q.id]);
    const result = buildCircuitFromData(serialized);

    expect(result.inputOrder).toHaveLength(2);
    expect(result.outputOrder).toHaveLength(1);
    // The mapped IDs should exist in the rebuilt circuit
    for (const id of result.inputOrder) {
      expect(result.builder.gates.has(id)).toBe(true);
    }
    for (const id of result.outputOrder) {
      expect(result.builder.gates.has(id)).toBe(true);
    }
  });

  it("creates buses in the builder's bus map during reconstruction", () => {
    const inner = new CircuitBuilder();
    const inp = inner.addPrimitiveGate("input");
    const bus = inner.addBus();
    const out = inner.addPrimitiveGate("output");

    inner.connectToBus(bus, inp, null, false);
    inner.connectToGate(bus, out, 0, null, false);

    const serialized = serializeWithBuses(
      inner,
      [inp.id],
      [out.id],
      { 0: "in", 1: "out" }
    );

    const result = buildCircuitFromData(serialized);

    // Verify that the builder has exactly 1 bus
    const busArray = [...result.builder.getBuses()];
    expect(busArray).toHaveLength(1);
    expect(busArray[0].type).toBe("bus");
  });

  it("preserves wire count during reconstruction", () => {
    const inner = new CircuitBuilder();
    const A = inner.addPrimitiveGate("input");
    const B = inner.addPrimitiveGate("input");
    const xor = inner.addPrimitiveGate("xor");
    const Q = inner.addPrimitiveGate("output");

    inner.connectToGate(A, xor, 0, null, false);
    inner.connectToGate(B, xor, 1, null, false);
    inner.connectToGate(xor, Q, 0, null, false);

    const serialized = serializeGateOnly(inner, [A.id, B.id], [Q.id]);
    const result = buildCircuitFromData(serialized);

    expect(result.builder.wires).toHaveLength(3);
  });

  it("preserves gate labels through serialization", () => {
    const inner = new CircuitBuilder();
    const A = inner.addPrimitiveGate("input");
    A.label = "clk";
    const Q = inner.addPrimitiveGate("output");
    Q.label = "q_out";

    inner.connectToGate(A, Q, 0, null, false);

    const serialized = serializeGateOnly(inner, [A.id], [Q.id]);
    const result = buildCircuitFromData(serialized);

    const gates = [...result.builder.getGates()];
    const inputGate = gates.find(g =>  g.category === GATE_CATEGORIES.PRIMITIVE && g.type === "input");
    const outputGate = gates.find(g => g.category === GATE_CATEGORIES.PRIMITIVE && g.type === "output");

    expect(inputGate.label).toBe("clk");
    expect(outputGate.label).toBe("q_out");
  });
});
