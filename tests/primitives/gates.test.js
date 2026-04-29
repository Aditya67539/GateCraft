import { describe, it, expect } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";

describe("AND Gate", () => {
  it("follows truth table", () => {
    const builder = new CircuitBuilder();
    
    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("and");
    const out = builder.addBasicGate("output");

    builder.connectGates(A, gate);
    builder.connectGates(B, gate);
    builder.connectGates(gate, out);

    const testCases = [
      [false, false, false],
      [true, false, false],
      [false, true, false],
      [true, true, true],
    ];

    for (const [a, b, expected] of testCases) {
      A.setValue(a);
      B.setValue(b);

      builder.evaluate();

      expect(out.output).toBe(expected);
    }
  });
});

describe("OR Gate", () => {
  it("follows truth table", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("or");
    const out = builder.addBasicGate("output");

    builder.connectGates(A, gate);
    builder.connectGates(B, gate);
    builder.connectGates(gate, out);

    const testCases = [
      [false, false, false],
      [true, false, true],
      [false, true, true],
      [true, true, true],
    ];

    for (const [a, b, expected] of testCases) {
      A.setValue(a);
      B.setValue(b);

      builder.evaluate();

      expect(out.output).toBe(expected);
    }
  });
});

describe("NOT Gate", () => {
  it("follows truth table", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const gate = builder.addBasicGate("not");
    const out = builder.addBasicGate("output");

    builder.connectGates(A, gate);
    builder.connectGates(gate, out);

    const testCases = [
      [false, true],
      [true, false],
    ];

    for (const [a, expected] of testCases) {
      A.setValue(a);

      builder.evaluate();

      expect(out.output).toBe(expected);
    }
  });
});

describe("NAND Gate", () => {
  it("follows truth table", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("nand");
    const out = builder.addBasicGate("output");

    builder.connectGates(A, gate);
    builder.connectGates(B, gate);
    builder.connectGates(gate, out);

    const testCases = [
      [false, false, true],
      [false, true, true],
      [true, false, true],
      [true, true, false],
    ];

    for (const [a, b, expected] of testCases) {
      A.setValue(a);
      B.setValue(b);

      builder.evaluate();

      expect(out.output).toBe(expected);
    }
  });
});

describe("NOR Gate", () => {
  it("follows truth table", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("nor");
    const out = builder.addBasicGate("output");

    builder.connectGates(A, gate);
    builder.connectGates(B, gate);
    builder.connectGates(gate, out);

    const testCases = [
      [false, false, true],
      [false, true, false],
      [true, false, false],
      [true, true, false],
    ];

    for (const [a, b, expected] of testCases) {
      A.setValue(a);
      B.setValue(b);

      builder.evaluate();

      expect(out.output).toBe(expected);
    }
  });
});

describe("XOR Gate", () => {
  it("follows truth table", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("xor");
    const out = builder.addBasicGate("output");

    builder.connectGates(A, gate);
    builder.connectGates(B, gate);
    builder.connectGates(gate, out);

    const testCases = [
      [false, false, false],
      [false, true, true],
      [true, false, true],
      [true, true, false],
    ];

    for (const [a, b, expected] of testCases) {
      A.setValue(a);
      B.setValue(b);

      builder.evaluate();

      expect(out.output).toBe(expected);
    }
  });
});

describe("XNOR Gate", () => {
  it("follows truth table", () => {
    const builder = new CircuitBuilder();

    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("xnor");
    const out = builder.addBasicGate("output");

    builder.connectGates(A, gate);
    builder.connectGates(B, gate);
    builder.connectGates(gate, out);

    const testCases = [
      [false, false, true],
      [false, true, false],
      [true, false, false],
      [true, true, true],
    ];

    for (const [a, b, expected] of testCases) {
      A.setValue(a);
      B.setValue(b);

      builder.evaluate();

      expect(out.output).toBe(expected);
    }
  });
});