import { describe, it, expect } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";

describe("Half Adder", () => {
  it("follows truth table", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const xor = builder.addBasicGate("xor");
    const and = builder.addBasicGate("and");
    const sum = builder.addBasicGate("output");
    const carry = builder.addBasicGate("output");

    builder.connectGates(A, xor, 0);
    builder.connectGates(B, xor, 1);
    builder.connectGates(xor, sum, 0);
    builder.connectGates(A, and, 0);
    builder.connectGates(B, and, 1);
    builder.connectGates(and, carry, 0);

    const testCases = [
      [false, false, false, false],
      [true, false, true, false],
      [false, true, true, false],
      [true, true, false, true],
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