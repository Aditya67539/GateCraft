import { describe, it, expect } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";
import { SIGNAL } from "../../constants.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

describe("Full Adder", () => {
  it("follows truth table", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const C = builder.addBasicGate("input");

    const xor1 = builder.addBasicGate("xor");
    const xor2 = builder.addBasicGate("xor");
    const and1 = builder.addBasicGate("and");
    const and2 = builder.addBasicGate("and");
    const or1 = builder.addBasicGate("or");
    const or2 = builder.addBasicGate("or");

    const sum = builder.addBasicGate("output");
    const carry = builder.addBasicGate("output");

    builder.connectToGate(A, xor1, 0);
    builder.connectToGate(B, xor1, 1);
    builder.connectToGate(xor1, xor2, 0);
    builder.connectToGate(C, xor2, 1);
    builder.connectToGate(xor2, sum, 0);
    builder.connectToGate(A, and1, 0);
    builder.connectToGate(B, and1, 1);
    builder.connectToGate(A, or1, 0);
    builder.connectToGate(B, or1, 1);
    builder.connectToGate(and1, or2, 0);
    builder.connectToGate(or1, and2, 0);
    builder.connectToGate(C, and2, 1);
    builder.connectToGate(and2, or2, 1);
    builder.connectToGate(or2, carry, 0);

    const testCases = [
      [LOW, LOW, LOW, LOW, LOW],
      [LOW, LOW, HIGH, LOW, HIGH],
      [LOW, HIGH, LOW, LOW, HIGH],
      [LOW, HIGH, HIGH, HIGH, LOW],
      [HIGH, LOW, LOW, LOW, HIGH],
      [HIGH, LOW, HIGH, HIGH, LOW],
      [HIGH, HIGH, LOW, HIGH, LOW],
      [HIGH, HIGH, HIGH, HIGH, HIGH],
    ];

    for (const [a, b, c, exp_carry, exp_sum] of testCases) {
      A.setValue(a);
      B.setValue(b);
      C.setValue(c);

      builder.evaluate();

      expect(carry.output).toBe(exp_carry);
      expect(sum.output).toBe(exp_sum);
    }

  });
});