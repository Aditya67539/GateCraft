import { describe, it, expect } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";
import { SIGNAL } from "../../constants.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

describe("AND Gate", () => {
  it("follows truth table", () => {
    const builder = new CircuitBuilder();
    
    const A = builder.addBasicGate("input");
    const B = builder.addBasicGate("input");
    const gate = builder.addBasicGate("and");
    const out = builder.addBasicGate("output");

    builder.connectGates(A, gate, 0);
    builder.connectGates(B, gate, 1);
    builder.connectGates(gate, out, 0);

    const testCases = [
      [LOW, LOW, LOW],
      [HIGH, LOW, LOW],
      [LOW, HIGH, LOW],
      [HIGH, HIGH, HIGH],
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

    builder.connectGates(A, gate, 0);
    builder.connectGates(B, gate, 1);
    builder.connectGates(gate, out, 0);

    const testCases = [
      [LOW, LOW, LOW],
      [HIGH, LOW, HIGH],
      [LOW, HIGH, HIGH],
      [HIGH, HIGH, HIGH],
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

    builder.connectGates(A, gate, 0);
    builder.connectGates(gate, out, 0);

    const testCases = [
      [LOW, HIGH],
      [HIGH, LOW],
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

    builder.connectGates(A, gate, 0);
    builder.connectGates(B, gate, 1);
    builder.connectGates(gate, out, 0);

    const testCases = [
      [LOW, LOW, HIGH],
      [LOW, HIGH, HIGH],
      [HIGH, LOW, HIGH],
      [HIGH, HIGH, LOW],
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

    builder.connectGates(A, gate, 0);
    builder.connectGates(B, gate, 1);
    builder.connectGates(gate, out, 0);

    const testCases = [
      [LOW, LOW, HIGH],
      [LOW, HIGH, LOW],
      [HIGH, LOW, LOW],
      [HIGH, HIGH, LOW],
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

    builder.connectGates(A, gate, 0);
    builder.connectGates(B, gate, 1);
    builder.connectGates(gate, out, 0);

    const testCases = [
      [LOW, LOW, LOW],
      [LOW, HIGH, HIGH],
      [HIGH, LOW, HIGH],
      [HIGH, HIGH, LOW],
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

    builder.connectGates(A, gate, 0);
    builder.connectGates(B, gate, 1);
    builder.connectGates(gate, out, 0);

    const testCases = [
      [LOW, LOW, HIGH],
      [LOW, HIGH, LOW],
      [HIGH, LOW, LOW],
      [HIGH, HIGH, HIGH],
    ];

    for (const [a, b, expected] of testCases) {
      A.setValue(a);
      B.setValue(b);

      builder.evaluate();

      expect(out.output).toBe(expected);
    }
  });
});