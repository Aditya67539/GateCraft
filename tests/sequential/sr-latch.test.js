import { describe, it, expect, test } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";
import { SIGNAL } from "../../constants.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

describe("SR Latch", ()=> {
  it("follows truth table", () => {
    const builder = new CircuitBuilder();

    const S = builder.addPrimitiveGate("input");
    const R = builder.addPrimitiveGate("input");
    const notS = builder.addPrimitiveGate("not");
    const notR = builder.addPrimitiveGate("not");
    const nand1 = builder.addPrimitiveGate("nand");
    const nand2 = builder.addPrimitiveGate("nand");
    const Q = builder.addPrimitiveGate("output");
    const notQ = builder.addPrimitiveGate("output");

    builder.connectToGate(S, notS, 0);
    builder.connectToGate(R, notR, 0);
    builder.connectToGate(notS, nand1, 0);
    builder.connectToGate(notR, nand2, 0);
    builder.connectToGate(nand1, nand2, 1);
    builder.connectToGate(nand2, nand1, 1);
    builder.connectToGate(nand1, Q, 0);
    builder.connectToGate(nand2, notQ, 0);

    const testCases = [
      [HIGH, LOW, HIGH, LOW],
      [LOW, LOW, HIGH, LOW],
      [LOW, HIGH, LOW, HIGH],
      [LOW, LOW, LOW, HIGH],
    ];

    for (const [s, r, exp_q, exp_notq] of testCases) {
      S.setValue(s);
      R.setValue(r);

      builder.evaluate();

      expect(Q.output).toBe(exp_q);
      expect(notQ.output).toBe(exp_notq);
    }
  });
});