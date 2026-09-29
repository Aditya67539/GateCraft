import { describe, it, expect } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";
import { SIGNAL } from "../../constants.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

describe("Half Adder", () => {
  it("follows truth table", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const xor = builder.addBasicGate("xor");
    const and = builder.addBasicGate("and");
    const sum = builder.addBasicGate("output");
    const carry = builder.addBasicGate("output");

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