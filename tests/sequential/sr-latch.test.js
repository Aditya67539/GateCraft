import { describe, it, expect, test } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";
import { SIGNAL } from "../../constants.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

describe("SR Latch", ()=> {
  it("follows truth table", () => {
    const builder = new CircuitBuilder();

    const S = builder.addBasicGate("input");
    const R = builder.addBasicGate("input");
    const notS = builder.addBasicGate("not");
    const notR = builder.addBasicGate("not");
    const nand1 = builder.addBasicGate("nand");
    const nand2 = builder.addBasicGate("nand");
    const Q = builder.addBasicGate("output");
    const notQ = builder.addBasicGate("output");

    builder.connectGates(S, notS, 0);
    builder.connectGates(R, notR, 0);
    builder.connectGates(notS, nand1, 0);
    builder.connectGates(notR, nand2, 0);
    builder.connectGates(nand1, nand2, 1);
    builder.connectGates(nand2, nand1, 1);
    builder.connectGates(nand1, Q, 0);
    builder.connectGates(nand2, notQ, 0);

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