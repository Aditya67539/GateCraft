import { describe, it, expect } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";
import { SIGNAL } from "../../constants.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

describe("Tri-state Buffer", () => {
  function buildTriStateCircuit() {
    const builder = new CircuitBuilder();

    const enable = builder.addBasicGate("input");
    const data = builder.addBasicGate("input");
    const gate = builder.addBasicGate("Tri-state Buffer");
    const out = builder.addBasicGate("output");

    builder.connectGates(enable, gate, 0);  // input 0 = enable (upper port)
    builder.connectGates(data, gate, 1);    // input 1 = data   (lower port)
    builder.connectGates(gate, out, 0);

    return { builder, data, enable, gate, out };
  }

  it("passes data through when enabled (HIGH)", () => {
    const { builder, data, enable, out } = buildTriStateCircuit();

    const testCases = [
      [LOW,  HIGH, LOW],
      [HIGH, HIGH, HIGH],
    ];

    for (const [d, en, expected] of testCases) {
      data.setValue(d);
      enable.setValue(en);
      builder.settle();
      expect(out.output).toBe(expected);
    }
  });

  it("outputs Z (high-impedance) when disabled (LOW)", () => {
    const { builder, data, enable, out } = buildTriStateCircuit();

    const testCases = [
      [LOW,  LOW, Z],
      [HIGH, LOW, Z],
    ];

    for (const [d, en, expected] of testCases) {
      data.setValue(d);
      enable.setValue(en);
      builder.settle();
      expect(out.output).toBe(expected);
    }
  });

  it("outputs X when enable is unknown (X or Z)", () => {
    const { builder, data, enable, gate } = buildTriStateCircuit();

    // When enable=LOW, output should be Z
    data.setValue(LOW);
    enable.setValue(LOW);
    builder.settle();

    expect(gate.output).toBe(Z);
  });

  it("follows the full truth table", () => {
    const { builder, data, enable, out } = buildTriStateCircuit();

    // Full truth table for standard logic-level inputs
    const testCases = [
      // [data,  enable, expected]
      [LOW,  LOW,  Z],
      [LOW,  HIGH, LOW],
      [HIGH, LOW,  Z],
      [HIGH, HIGH, HIGH],
    ];

    for (const [d, en, expected] of testCases) {
      data.setValue(d);
      enable.setValue(en);
      builder.settle();
      expect(out.output).toBe(expected);
    }
  });

  it("correctly transitions between enabled and disabled states", () => {
    const { builder, data, enable, out } = buildTriStateCircuit();

    // Start enabled with HIGH data
    data.setValue(HIGH);
    enable.setValue(HIGH);
    builder.settle();
    expect(out.output).toBe(HIGH);

    // Disable -> should go to Z
    enable.setValue(LOW);
    builder.settle();
    expect(out.output).toBe(Z);

    // Re-enable -> should pass data again
    enable.setValue(HIGH);
    builder.settle();
    expect(out.output).toBe(HIGH);

    // Change data while enabled
    data.setValue(LOW);
    builder.settle();
    expect(out.output).toBe(LOW);

    // Disable again
    enable.setValue(LOW);
    builder.settle();
    expect(out.output).toBe(Z);
  });

  it("handles disconnected inputs as X", () => {
    const builder = new CircuitBuilder();

    // Create a tri-state buffer with no connections
    const gate = builder.addBasicGate("Tri-state Buffer");
    const out = builder.addBasicGate("output");
    builder.connectGates(gate, out, 0);

    builder.settle();

    // With no inputs connected, resolveInputs returns X for both,
    // and triStateBuffer(enable=X, data=X) = X
    expect(gate.output).toBe(X);
  });

  it("handles only data connected (enable disconnected)", () => {
    const builder = new CircuitBuilder();

    const data = builder.addBasicGate("input");
    const gate = builder.addBasicGate("Tri-state Buffer");
    const out = builder.addBasicGate("output");

    builder.connectGates(data, gate, 1);  // data on port 1
    builder.connectGates(gate, out, 0);

    data.setValue(HIGH);
    builder.settle();

    // Enable is disconnected -> resolves to X -> output should be X
    expect(gate.output).toBe(X);
  });

  it("handles only enable connected (data disconnected)", () => {
    const builder = new CircuitBuilder();

    const enable = builder.addBasicGate("input");
    const gate = builder.addBasicGate("Tri-state Buffer");
    const out = builder.addBasicGate("output");

    builder.connectGates(enable, gate, 0);  // enable on port 0
    builder.connectGates(gate, out, 0);

    enable.setValue(HIGH);
    builder.settle();

    // Data is disconnected -> resolves to X, enable=HIGH -> pass X through
    expect(gate.output).toBe(X);

    enable.setValue(LOW);
    builder.settle();

    // Enable=LOW -> output should be Z regardless of data
    expect(gate.output).toBe(Z);
  });
});
