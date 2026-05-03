import { describe, it, expect } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";
import { buildCircuitFromData } from "../../persistence.js";

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

  inner.connectGates(A, xor);
  inner.connectGates(B, xor);
  inner.connectGates(xor, sum);
  inner.connectGates(A, and);
  inner.connectGates(B, and);
  inner.connectGates(and, carry);

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

  inner.connectGates(A, not, null, null, false);
  inner.connectGates(not, Q, null, null, false);

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
    outer.connectGates(A, halfAdder, null, 0);
    outer.connectGates(B, halfAdder, null, 1);

    // Connect composite gate outputs → outer outputs (fromOutputIndex)
    outer.connectGates(halfAdder, sumOut, 0);
    outer.connectGates(halfAdder, carryOut, 1);

    const testCases = [
      //  A      B     Sum    Carry
      [false, false, false, false],
      [true,  false, true,  false],
      [false, true,  true,  false],
      [true,  true,  false, true],
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

    outer.connectGates(A, notGate, null, 0);
    outer.connectGates(notGate, out, 0);

    const testCases = [
      [false, true],
      [true,  false],
    ];

    for (const [a, expected] of testCases) {
      A.setValue(a);
      outer.evaluate();
      expect(out.output).toBe(expected);
    }
  });
});

describe("Composite Gate – Unconnected Inputs", () => {
  it("returns an error when not all inputs are connected", () => {
    const outer = new CircuitBuilder();

    const A = outer.addBasicGate("input");
    const halfAdder = outer.addCompositeGate("half-adder", halfAdderCircuitData());

    // Only connect one of the two required inputs
    outer.connectGates(A, halfAdder, null, 0);

    const result = halfAdder.evaluate();

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not all inputs connected/i);
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

    middle.connectGates(mA, not1, null, 0, false);
    middle.connectGates(not1, not2, 0, 0, false);
    middle.connectGates(not2, mQ, 0, null, false);

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

    top.connectGates(tA, doubleNot, null, 0);
    top.connectGates(doubleNot, tOut, 0);

    // Double-NOT should act as identity
    for (const val of [false, true]) {
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

    outer.connectGates(A, halfAdder, null, 0);
    outer.connectGates(B, halfAdder, null, 1);
    outer.connectGates(halfAdder, sumOut, 0);
    outer.connectGates(halfAdder, carryOut, 1);

    // First: 1 + 1 = carry 1, sum 0
    A.setValue(true);
    B.setValue(true);
    outer.evaluate();
    expect(sumOut.output).toBe(false);
    expect(carryOut.output).toBe(true);

    // Change to 1 + 0 = carry 0, sum 1
    B.setValue(false);
    outer.evaluate();
    expect(sumOut.output).toBe(true);
    expect(carryOut.output).toBe(false);

    // Change to 0 + 0 = carry 0, sum 0
    A.setValue(false);
    outer.evaluate();
    expect(sumOut.output).toBe(false);
    expect(carryOut.output).toBe(false);
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

    outer.connectGates(A, halfAdder, null, 0);
    outer.connectGates(B, halfAdder, null, 1);
    outer.connectGates(halfAdder, notGate, 0);    // sum → NOT
    outer.connectGates(notGate, invertedSum);       // NOT → output
    outer.connectGates(halfAdder, carryOut, 1);     // carry → output

    const testCases = [
      //  A      B     invertedSum  Carry
      [false, false, true,         false],   // sum=0 → inv=1
      [true,  false, false,        false],   // sum=1 → inv=0
      [false, true,  false,        false],   // sum=1 → inv=0
      [true,  true,  true,         true],    // sum=0 → inv=1
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

    inner.connectGates(A, xor);
    inner.connectGates(B, xor);
    inner.connectGates(xor, sum);
    inner.connectGates(A, and);
    inner.connectGates(B, and);
    inner.connectGates(and, carry);

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
        fromGateId: w.from.id,
        toGateId: w.to.id,
        toInputIndex: w.toInputIndex,
        fromOutputIndex: w.fromOutputIndex,
      })),
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

    outer.connectGates(oA, composite, null, 0);
    outer.connectGates(oB, composite, null, 1);
    outer.connectGates(composite, oSum, 0);
    outer.connectGates(composite, oCarry, 1);

    // Verify against truth table
    oA.setValue(true);
    oB.setValue(true);
    outer.evaluate();
    expect(oSum.output).toBe(false);
    expect(oCarry.output).toBe(true);

    oA.setValue(true);
    oB.setValue(false);
    outer.evaluate();
    expect(oSum.output).toBe(true);
    expect(oCarry.output).toBe(false);
  });
});
