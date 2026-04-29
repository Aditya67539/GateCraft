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

    builder.connectGates(A, xor);
    builder.connectGates(B, xor);
    builder.connectGates(xor, sum);
    builder.connectGates(A, and);
    builder.connectGates(B, and);
    builder.connectGates(and, carry);

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