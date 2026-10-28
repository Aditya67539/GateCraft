import { describe, it, expect } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";
import { SIGNAL } from "../../constants.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

describe("Disconnected input handling through WASM", () => {
  it("OR gate with one disconnected input treats it as X", () => {
    const builder = new CircuitBuilder();

    const A = builder.addPrimitiveGate("input");
    const gate = builder.addPrimitiveGate("or");
    const out = builder.addPrimitiveGate("output");

    // Only connect input 0, leave input 1 disconnected
    builder.connectToGate(A, gate, 0);
    builder.connectToGate(gate, out, 0);

    // OR(LOW, X) = X
    A.setValue(LOW);
    builder.evaluate();
    expect(out.output).toBe(X);

    // OR(HIGH, X) = HIGH
    A.setValue(HIGH);
    builder.evaluate();
    expect(out.output).toBe(HIGH);

    // Toggle back: OR(LOW, X) = X — this was the reported bug
    A.setValue(LOW);
    builder.evaluate();
    expect(out.output).toBe(X);
  });

  it("AND gate with one disconnected input treats it as X", () => {
    const builder = new CircuitBuilder();

    const A = builder.addPrimitiveGate("input");
    const gate = builder.addPrimitiveGate("and");
    const out = builder.addPrimitiveGate("output");

    builder.connectToGate(A, gate, 0);
    builder.connectToGate(gate, out, 0);

    // AND(LOW, X) = LOW (LOW dominates in AND)
    A.setValue(LOW);
    builder.evaluate();
    expect(out.output).toBe(LOW);

    // AND(HIGH, X) = X
    A.setValue(HIGH);
    builder.evaluate();
    expect(out.output).toBe(X);

    // Toggle back: AND(LOW, X) = LOW
    A.setValue(LOW);
    builder.evaluate();
    expect(out.output).toBe(LOW);
  });

  it("XOR gate with one disconnected input treats it as X", () => {
    const builder = new CircuitBuilder();

    const A = builder.addPrimitiveGate("input");
    const gate = builder.addPrimitiveGate("xor");
    const out = builder.addPrimitiveGate("output");

    builder.connectToGate(A, gate, 0);
    builder.connectToGate(gate, out, 0);

    // XOR(LOW, X) = X
    A.setValue(LOW);
    builder.evaluate();
    expect(out.output).toBe(X);

    // XOR(HIGH, X) = X
    A.setValue(HIGH);
    builder.evaluate();
    expect(out.output).toBe(X);
  });

  it("NAND gate with one disconnected input treats it as X", () => {
    const builder = new CircuitBuilder();

    const A = builder.addPrimitiveGate("input");
    const gate = builder.addPrimitiveGate("nand");
    const out = builder.addPrimitiveGate("output");

    builder.connectToGate(A, gate, 0);
    builder.connectToGate(gate, out, 0);

    // NAND(HIGH, X) = NOT(AND(HIGH, X)) = NOT(X) = X
    A.setValue(HIGH);
    builder.evaluate();
    expect(out.output).toBe(X);

    // NAND(LOW, X) = NOT(AND(LOW, X)) = NOT(LOW) = HIGH
    A.setValue(LOW);
    builder.evaluate();
    expect(out.output).toBe(HIGH);
  });

  it("NOR gate with one disconnected input treats it as X", () => {
    const builder = new CircuitBuilder();

    const A = builder.addPrimitiveGate("input");
    const gate = builder.addPrimitiveGate("nor");
    const out = builder.addPrimitiveGate("output");

    builder.connectToGate(A, gate, 0);
    builder.connectToGate(gate, out, 0);

    // NOR(LOW, X) = NOT(OR(LOW, X)) = NOT(X) = X
    A.setValue(LOW);
    builder.evaluate();
    expect(out.output).toBe(X);

    // NOR(HIGH, X) = NOT(OR(HIGH, X)) = NOT(HIGH) = LOW
    A.setValue(HIGH);
    builder.evaluate();
    expect(out.output).toBe(LOW);
  });
});
