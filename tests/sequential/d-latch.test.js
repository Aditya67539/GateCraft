import { describe, it, expect, test } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";
import { SIGNAL } from "../../constants.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

describe("D Latch", () => {
  it("follows truth table", () => {
    const builder = new CircuitBuilder();

    const D = builder.addPrimitiveGate("input");
    const E = builder.addPrimitiveGate("input");
    const notD = builder.addPrimitiveGate("not");
    const and1 = builder.addPrimitiveGate("and");
    const and2 = builder.addPrimitiveGate("and");
    const nor1 = builder.addPrimitiveGate("nor");
    const nor2 = builder.addPrimitiveGate("nor");
    const Q = builder.addPrimitiveGate("output");
    const notQ = builder.addPrimitiveGate("output");

    builder.connectToGate(D, notD, 0);
    builder.connectToGate(notD, and1, 0);
    builder.connectToGate(E, and1, 1);
    builder.connectToGate(E, and2, 0);
    builder.connectToGate(D, and2, 1);
    builder.connectToGate(and1, nor1, 0);
    builder.connectToGate(nor2, nor1, 1);
    builder.connectToGate(nor1, nor2, 0);
    builder.connectToGate(and2, nor2, 1);
    builder.connectToGate(nor1, Q, 0);
    builder.connectToGate(nor2, notQ, 0);

    const testCases = [
      [HIGH, LOW, LOW, HIGH],
      [HIGH, HIGH, HIGH, LOW],
      [LOW, HIGH, HIGH, LOW],
      [LOW, LOW, HIGH, LOW],
    ];

    for (const [e, d, exp_q, exp_notq] of testCases) {
      E.setValue(e);
      D.setValue(d);

      builder.evaluate();

      expect(Q.output).toBe(exp_q);
      expect(notQ.output).toBe(exp_notq);
    }
  });
});