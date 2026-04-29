import { describe, it, expect, test } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";

describe("D Latch", () => {
  it("follows truth table", () => {
    const builder = new CircuitBuilder();

    const D = builder.addBasicGate("input");
    const E = builder.addBasicGate("input");
    const notD = builder.addBasicGate("not");
    const and1 = builder.addBasicGate("and");
    const and2 = builder.addBasicGate("and");
    const nor1 = builder.addBasicGate("nor");
    const nor2 = builder.addBasicGate("nor");
    const Q = builder.addBasicGate("output");
    const notQ = builder.addBasicGate("output");

    builder.connectGates(D, notD);
    builder.connectGates(notD, and1);
    builder.connectGates(E, and1);
    builder.connectGates(E, and2);
    builder.connectGates(D, and2);
    builder.connectGates(and1, nor1);
    builder.connectGates(nor2, nor1);
    builder.connectGates(nor1, nor2);
    builder.connectGates(and2, nor2);
    builder.connectGates(nor1, Q);
    builder.connectGates(nor2, notQ);

    const testCases = [
      [true, false, false, true],
      [true, true, true, false],
      [false, true, true, false],
      [false, false, true, false],
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