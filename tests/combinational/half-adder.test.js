import { describe, it, expect } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";
import { SIGNAL } from "../../constants.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

describe("Half Adder", () => {
  it("follows truth table", () => {
    const builder = new CircuitBuilder();

    const A = builder.addPrimitiveGate("input");
    const B = builder.addPrimitiveGate("input");
    const xor = builder.addPrimitiveGate("xor");
    const and = builder.addPrimitiveGate("and");
    const sum = builder.addPrimitiveGate("output");
    const carry = builder.addPrimitiveGate("output");

    builder.connectToGate(A, xor, 0);
    builder.connectToGate(B, xor, 1);
    builder.connectToGate(xor, sum, 0);
    builder.connectToGate(A, and, 0);
    builder.connectToGate(B, and, 1);
    builder.connectToGate(and, carry, 0);

    const testCases = [
      [LOW, LOW, LOW, LOW],
      [HIGH, LOW, HIGH, LOW],
      [LOW, HIGH, HIGH, LOW],
      [HIGH, HIGH, LOW, HIGH],
    ];

    for (const [a, b, exp_sum, exp_carry] of testCases) {
      A.setValue(a);
      B.setValue(b);

      builder.evaluate();

      expect(sum.output).toBe(exp_sum);
      expect(carry.output).toBe(exp_carry);
    }
  });
});