import { describe, it, expect } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";

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

    builder.connectGates(A, xor1, 0);
    builder.connectGates(B, xor1, 1);
    builder.connectGates(xor1, xor2, 0);
    builder.connectGates(C, xor2, 1);
    builder.connectGates(xor2, sum, 0);
    builder.connectGates(A, and1, 0);
    builder.connectGates(B, and1, 1);
    builder.connectGates(A, or1, 0);
    builder.connectGates(B, or1, 1);
    builder.connectGates(and1, or2, 0);
    builder.connectGates(or1, and2, 0);
    builder.connectGates(C, and2, 1);
    builder.connectGates(and2, or2, 1);
    builder.connectGates(or2, carry, 0);

    const testCases = [
      [false, false, false, false, false],
      [false, false, true, false, true],
      [false, true, false, false, true],
      [false, true, true, true, false],
      [true, false, false, false, true],
      [true, false, true, true, false],
      [true, true, false, true, false],
      [true, true, true, true, true],
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