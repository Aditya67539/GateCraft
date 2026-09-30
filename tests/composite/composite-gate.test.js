import { describe, it, expect } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";
import { buildCircuitFromData } from "../../persistence.js";
import { SIGNAL } from "../../constants.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

/**
 * Helper: builds the raw circuit-data object for a half-adder.
 *
 * Internal topology:
 *   Input A ──┬── XOR ── Output (Sum)
 *   Input B ──┤
 *             └── AND ── Output (Carry)
 *
 * inputOrder:  [A, B]
 * outputOrder: [Sum, Carry]
 */
function halfAdderCircuitData() {
  const inner = new CircuitBuilder();

  const A = inner.addBasicGate("input");
  const B = inner.addBasicGate("input");
  const xor = inner.addBasicGate("xor");
  const and = inner.addBasicGate("and");
  const sum = inner.addBasicGate("output");
  const carry = inner.addBasicGate("output");

  inner.connectToGate(A, xor, 0);
  inner.connectToGate(B, xor, 1);
  inner.connectToGate(xor, sum, 0);
  inner.connectToGate(A, and, 0);
  inner.connectToGate(B, and, 1);
  inner.connectToGate(and, carry, 0);

  inner.buildFanout();

  return {
    builder: inner,
    inputOrder: [A.id, B.id],
    outputOrder: [sum.id, carry.id],
  };
}

/**
 * Helper: builds the raw circuit-data object for a NOT gate.
 *
 * Internal topology:
 *   Input A ── NOT ── Output Q
 *
 * inputOrder:  [A]
 * outputOrder: [Q]
 */
function notGateCircuitData() {
  const inner = new CircuitBuilder();

  const A = inner.addBasicGate("input");
  const not = inner.addBasicGate("not");
  const Q = inner.addBasicGate("output");

  inner.connectToGate(A, not, 0, null, false);
  inner.connectToGate(not, Q, 0, null, false);

  inner.buildFanout();

  return {
    builder: inner,
    inputOrder: [A.id],
    outputOrder: [Q.id],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Composite Gate – Half Adder", () => {
  it("follows the half-adder truth table when used inside an outer circuit", () => {
    const outer = new CircuitBuilder();

    const A = outer.addBasicGate("input");
    const B = outer.addBasicGate("input");
    const halfAdder = outer.addCompositeGate("half-adder", halfAdderCircuitData());
    const sumOut = outer.addBasicGate("output");
    const carryOut = outer.addBasicGate("output");

    // Connect outer inputs → composite gate (fixed-index inputs)
    outer.connectToGate(A, halfAdder, 0);
    outer.connectToGate(B, halfAdder, 1);

    // Connect composite gate outputs → outer outputs (fromOutputIndex)
    outer.connectToGate(halfAdder, sumOut, 0, 0);
    outer.connectToGate(halfAdder, carryOut, 0, 1);

    const testCases = [
      //  A      B     Sum    Carry
      [LOW, LOW, LOW, LOW],
      [HIGH,  LOW, HIGH,  LOW],
      [LOW, HIGH,  HIGH,  LOW],
      [HIGH,  HIGH,  LOW, HIGH],
    ];

    for (const [a, b, expSum, expCarry] of testCases) {
      A.setValue(a);
      B.setValue(b);

      outer.evaluate();

      expect(sumOut.output).toBe(expSum);
      expect(carryOut.output).toBe(expCarry);
    }
  });
});

describe("Composite Gate – NOT wrapper", () => {
  it("inverts its single input", () => {
    const outer = new CircuitBuilder();

    const A = outer.addBasicGate("input");
    const notGate = outer.addCompositeGate("not-wrapper", notGateCircuitData());
    const out = outer.addBasicGate("output");

    outer.connectToGate(A, notGate, 0);
    outer.connectToGate(notGate, out, 0, 0);

    const testCases = [
      [LOW, HIGH],
      [HIGH,  LOW],
    ];

    for (const [a, expected] of testCases) {
      A.setValue(a);
      outer.evaluate();
      expect(out.output).toBe(expected);
    }
  });
});

describe("Composite Gate – Nested Composite", () => {
  it("evaluates a composite gate that contains another composite gate", () => {
    // Inner composite: NOT wrapper
    const notData = notGateCircuitData();

    // Outer composite: double-NOT (should be identity)
    const middle = new CircuitBuilder();

    const mA = middle.addBasicGate("input");
    const not1 = middle.addCompositeGate("not-wrapper", notData);
    // Build a fresh NOT data for the second instance to avoid shared state
    const not2 = middle.addCompositeGate("not-wrapper", notGateCircuitData());
    const mQ = middle.addBasicGate("output");

    middle.connectToGate(mA, not1, 0, null, false);
    middle.connectToGate(not1, not2, 0, 0, false);
    middle.connectToGate(not2, mQ, 0, null, false);

    middle.buildFanout();

    const doubleNotData = {
      builder: middle,
      inputOrder: [mA.id],
      outputOrder: [mQ.id],
    };

    // Top-level circuit using the nested composite
    const top = new CircuitBuilder();

    const tA = top.addBasicGate("input");
    const doubleNot = top.addCompositeGate("double-not", doubleNotData);
    const tOut = top.addBasicGate("output");

    top.connectToGate(tA, doubleNot, 0);
    top.connectToGate(doubleNot, tOut, 0, 0);

    // Double-NOT should act as identity
    for (const val of [LOW, HIGH]) {
      tA.setValue(val);
      top.evaluate();
      expect(tOut.output).toBe(val);
    }
  });
});

describe("Composite Gate – Re-evaluation", () => {
  it("correctly updates outputs when inputs change across multiple evaluations", () => {
    const outer = new CircuitBuilder();

    const A = outer.addBasicGate("input");
    const B = outer.addBasicGate("input");
    const halfAdder = outer.addCompositeGate("half-adder", halfAdderCircuitData());
    const sumOut = outer.addBasicGate("output");
    const carryOut = outer.addBasicGate("output");

    outer.connectToGate(A, halfAdder, 0);
    outer.connectToGate(B, halfAdder, 1);
    outer.connectToGate(halfAdder, sumOut, 0, 0);
    outer.connectToGate(halfAdder, carryOut, 0, 1);

    // First: 1 + 1 = carry 1, sum 0
    A.setValue(HIGH);
    B.setValue(HIGH);
    outer.evaluate();
    expect(sumOut.output).toBe(LOW);
    expect(carryOut.output).toBe(HIGH);

    // Change to 1 + 0 = carry 0, sum 1
    B.setValue(LOW);
    outer.evaluate();
    expect(sumOut.output).toBe(HIGH);
    expect(carryOut.output).toBe(LOW);

    // Change to 0 + 0 = carry 0, sum 0
    A.setValue(LOW);
    outer.evaluate();
    expect(sumOut.output).toBe(LOW);
    expect(carryOut.output).toBe(LOW);
  });
});

describe("Composite Gate – Multiple Outputs Wired Independently", () => {
  it("allows each output index to drive a different downstream gate", () => {
    const outer = new CircuitBuilder();

    const A = outer.addBasicGate("input");
    const B = outer.addBasicGate("input");
    const halfAdder = outer.addCompositeGate("half-adder", halfAdderCircuitData());

    // Wire sum (index 0) through an extra NOT, but carry (index 1) directly
    const notGate = outer.addBasicGate("not");
    const invertedSum = outer.addBasicGate("output");
    const carryOut = outer.addBasicGate("output");

    outer.connectToGate(A, halfAdder, 0);
    outer.connectToGate(B, halfAdder, 1);
    outer.connectToGate(halfAdder, notGate, 0, 0);    // sum → NOT
    outer.connectToGate(notGate, invertedSum, 0);       // NOT → output
    outer.connectToGate(halfAdder, carryOut, 0, 1);     // carry → output

    const testCases = [
      //A      B   invertedSum  Carry
      [LOW,   LOW,   HIGH,      LOW],   // sum=0 → inv=1
      [HIGH,  LOW,   LOW,       LOW],   // sum=1 → inv=0
      [LOW,   HIGH,  LOW,       LOW],   // sum=1 → inv=0
      [HIGH,  HIGH,  HIGH,      HIGH],    // sum=0 → inv=1
    ];

    for (const [a, b, expInvSum, expCarry] of testCases) {
      A.setValue(a);
      B.setValue(b);
      outer.evaluate();
      expect(invertedSum.output).toBe(expInvSum);
      expect(carryOut.output).toBe(expCarry);
    }
  });
});

describe("Composite Gate – buildCircuitFromData round-trip", () => {
  it("reconstructs a half-adder from serialized data and evaluates correctly", () => {
    // Manually create the serialized format that persistence.js produces
    const inner = new CircuitBuilder();

    const A = inner.addBasicGate("input");
    const B = inner.addBasicGate("input");
    const xor = inner.addBasicGate("xor");
    const and = inner.addBasicGate("and");
    const sum = inner.addBasicGate("output");
    const carry = inner.addBasicGate("output");

    inner.connectToGate(A, xor, 0);
    inner.connectToGate(B, xor, 1);
    inner.connectToGate(xor, sum, 0);
    inner.connectToGate(A, and, 0);
    inner.connectToGate(B, and, 1);
    inner.connectToGate(and, carry, 0);

    // Serialize
    const serialized = {
      gates: [
        { id: A.id, type: "input" },
        { id: B.id, type: "input" },
        { id: xor.id, type: "xor" },
        { id: and.id, type: "and" },
        { id: sum.id, type: "output" },
        { id: carry.id, type: "output" },
      ],
      wires: inner.wires.map((w) => ({
        fromId: w.from.id,
        toId: w.to.id,
        toInputIndex: w.toInputIndex,
        fromOutputIndex: w.fromOutputIndex,
        isBusConnection: false,
      })),
      buses: [],
      inputOrder: [A.id, B.id],
      outputOrder: [sum.id, carry.id],
    };

    // Reconstruct via buildCircuitFromData
    const reconstructed = buildCircuitFromData(serialized);

    // Use the reconstructed circuit as a composite gate
    const outer = new CircuitBuilder();
    const oA = outer.addBasicGate("input");
    const oB = outer.addBasicGate("input");
    const composite = outer.addCompositeGate("half-adder", reconstructed);
    const oSum = outer.addBasicGate("output");
    const oCarry = outer.addBasicGate("output");

    outer.connectToGate(oA, composite, 0);
    outer.connectToGate(oB, composite, 1);
    outer.connectToGate(composite, oSum, 0, 0);
    outer.connectToGate(composite, oCarry, 0, 1);

    // Verify against truth table
    oA.setValue(HIGH);
    oB.setValue(HIGH);
    outer.evaluate();
    expect(oSum.output).toBe(LOW);
    expect(oCarry.output).toBe(HIGH);

    oA.setValue(HIGH);
    oB.setValue(LOW);
    outer.evaluate();
    expect(oSum.output).toBe(HIGH);
    expect(oCarry.output).toBe(LOW);
  });
});
