import { describe, it, expect, test } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";

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

    builder.connectGates(S, notS);
    builder.connectGates(R, notR);
    builder.connectGates(notS, nand1);
    builder.connectGates(notR, nand2);
    builder.connectGates(nand1, nand2);
    builder.connectGates(nand2, nand1);
    builder.connectGates(nand1, Q);
    builder.connectGates(nand2, notQ);

    const testCases = [
      [true, false, true, false],
      [false, false, true, false],
      [false, true, false, true],
      [false, false, false, true],
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