import { describe, it, expect } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";
import { SIGNAL } from "../../constants.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

/**
 * Reproducer for the bug: composite gates give wrong results when
 * upstream gates (e.g. XOR for 2's complement) feed into them.
 */

function halfAdderCircuitData() {
  const inner = new CircuitBuilder();
  const A = inner.addBasicGate("input");
  const B = inner.addBasicGate("input");
  const xor = inner.addBasicGate("xor");
  const and = inner.addBasicGate("and");
  const sum = inner.addBasicGate("output");
  const carry = inner.addBasicGate("output");

  inner.connectGates(A, xor, 0);
  inner.connectGates(B, xor, 1);
  inner.connectGates(xor, sum, 0);
  inner.connectGates(A, and, 0);
  inner.connectGates(B, and, 1);
  inner.connectGates(and, carry, 0);
  inner.buildFanout();

  return {
    builder: inner,
    inputOrder: [A.id, B.id],
    outputOrder: [sum.id, carry.id],
  };
}

function fullAdderCircuitData() {
  const inner = new CircuitBuilder();
  const A = inner.addBasicGate("input");
  const B = inner.addBasicGate("input");
  const Cin = inner.addBasicGate("input");
  const ha1 = inner.addCompositeGate("half-adder", halfAdderCircuitData());
  const ha2 = inner.addCompositeGate("half-adder", halfAdderCircuitData());
  const orGate = inner.addBasicGate("or");
  const sum = inner.addBasicGate("output");
  const carry = inner.addBasicGate("output");

  inner.connectGates(A, ha1, 0);
  inner.connectGates(B, ha1, 1);
  inner.connectGates(ha1, ha2, 0, 0); // sum of ha1 -> A of ha2
  inner.connectGates(Cin, ha2, 1);     // Cin -> B of ha2
  inner.connectGates(ha2, sum, 0, 0);  // sum of ha2 -> output sum
  inner.connectGates(ha1, orGate, 0, 1); // carry of ha1 -> OR
  inner.connectGates(ha2, orGate, 1, 1); // carry of ha2 -> OR
  inner.connectGates(orGate, carry, 0);
  inner.buildFanout();

  return {
    builder: inner,
    inputOrder: [A.id, B.id, Cin.id],
    outputOrder: [sum.id, carry.id],
  };
}

function fourBitAdderCircuitData() {
  const inner = new CircuitBuilder();
  const A0 = inner.addBasicGate("input");
  const A1 = inner.addBasicGate("input");
  const A2 = inner.addBasicGate("input");
  const A3 = inner.addBasicGate("input");
  const B0 = inner.addBasicGate("input");
  const B1 = inner.addBasicGate("input");
  const B2 = inner.addBasicGate("input");
  const B3 = inner.addBasicGate("input");
  const Cin = inner.addBasicGate("input");

  const fa0 = inner.addCompositeGate("full-adder", fullAdderCircuitData());
  const fa1 = inner.addCompositeGate("full-adder", fullAdderCircuitData());
  const fa2 = inner.addCompositeGate("full-adder", fullAdderCircuitData());
  const fa3 = inner.addCompositeGate("full-adder", fullAdderCircuitData());

  const S0 = inner.addBasicGate("output");
  const S1 = inner.addBasicGate("output");
  const S2 = inner.addBasicGate("output");
  const S3 = inner.addBasicGate("output");
  const Cout = inner.addBasicGate("output");

  // FA0: A0, B0, Cin
  inner.connectGates(A0, fa0, 0);
  inner.connectGates(B0, fa0, 1);
  inner.connectGates(Cin, fa0, 2);
  inner.connectGates(fa0, S0, 0, 0);
  // FA1: A1, B1, Cout0
  inner.connectGates(A1, fa1, 0);
  inner.connectGates(B1, fa1, 1);
  inner.connectGates(fa0, fa1, 2, 1); // carry chain
  inner.connectGates(fa1, S1, 0, 0);
  // FA2: A2, B2, Cout1
  inner.connectGates(A2, fa2, 0);
  inner.connectGates(B2, fa2, 1);
  inner.connectGates(fa1, fa2, 2, 1);
  inner.connectGates(fa2, S2, 0, 0);
  // FA3: A3, B3, Cout2
  inner.connectGates(A3, fa3, 0);
  inner.connectGates(B3, fa3, 1);
  inner.connectGates(fa2, fa3, 2, 1);
  inner.connectGates(fa3, S3, 0, 0);
  inner.connectGates(fa3, Cout, 0, 1);
  inner.buildFanout();

  return {
    builder: inner,
    inputOrder: [A0.id, A1.id, A2.id, A3.id, B0.id, B1.id, B2.id, B3.id, Cin.id],
    outputOrder: [S0.id, S1.id, S2.id, S3.id, Cout.id],
  };
}

describe("4-bit adder with direct inputs", () => {
  it("computes 5 + 3 = 8 correctly", () => {
    const outer = new CircuitBuilder();
    const A0 = outer.addBasicGate("input"); // 1
    const A1 = outer.addBasicGate("input"); // 0
    const A2 = outer.addBasicGate("input"); // 1
    const A3 = outer.addBasicGate("input"); // 0
    const B0 = outer.addBasicGate("input"); // 1
    const B1 = outer.addBasicGate("input"); // 1
    const B2 = outer.addBasicGate("input"); // 0
    const B3 = outer.addBasicGate("input"); // 0
    const Cin = outer.addBasicGate("input"); // 0

    const adder = outer.addCompositeGate("4-bit-adder", fourBitAdderCircuitData());
    const S0 = outer.addBasicGate("output");
    const S1 = outer.addBasicGate("output");
    const S2 = outer.addBasicGate("output");
    const S3 = outer.addBasicGate("output");
    const Cout = outer.addBasicGate("output");

    outer.connectGates(A0, adder, 0);
    outer.connectGates(A1, adder, 1);
    outer.connectGates(A2, adder, 2);
    outer.connectGates(A3, adder, 3);
    outer.connectGates(B0, adder, 4);
    outer.connectGates(B1, adder, 5);
    outer.connectGates(B2, adder, 6);
    outer.connectGates(B3, adder, 7);
    outer.connectGates(Cin, adder, 8);

    outer.connectGates(adder, S0, 0, 0);
    outer.connectGates(adder, S1, 0, 1);
    outer.connectGates(adder, S2, 0, 2);
    outer.connectGates(adder, S3, 0, 3);
    outer.connectGates(adder, Cout, 0, 4);

    // 5 = 0101, 3 = 0011 => 8 = 1000
    A0.setValue(HIGH);  A1.setValue(LOW); A2.setValue(HIGH);  A3.setValue(LOW);
    B0.setValue(HIGH);  B1.setValue(HIGH);  B2.setValue(LOW); B3.setValue(LOW);
    Cin.setValue(LOW);
    outer.evaluate();

    expect(S0.output).toBe(LOW);
    expect(S1.output).toBe(LOW);
    expect(S2.output).toBe(LOW);
    expect(S3.output).toBe(HIGH);
    expect(Cout.output).toBe(LOW);
  });
});

describe("4-bit adder with upstream XOR gates (2's complement)", () => {
  it("computes A + (~B + 1) with XOR gates before B inputs", () => {
    const outer = new CircuitBuilder();
    // A = 5 = 0101
    const A0 = outer.addBasicGate("input");
    const A1 = outer.addBasicGate("input");
    const A2 = outer.addBasicGate("input");
    const A3 = outer.addBasicGate("input");
    // B = 3 = 0011
    const B0 = outer.addBasicGate("input");
    const B1 = outer.addBasicGate("input");
    const B2 = outer.addBasicGate("input");
    const B3 = outer.addBasicGate("input");
    // SUB signal = 1 (subtract mode: XOR with 1 inverts, Cin=1 for +1)
    const SUB = outer.addBasicGate("input");

    // XOR gates to conditionally invert B
    const xor0 = outer.addBasicGate("xor");
    const xor1 = outer.addBasicGate("xor");
    const xor2 = outer.addBasicGate("xor");
    const xor3 = outer.addBasicGate("xor");

    outer.connectGates(B0, xor0, 0);
    outer.connectGates(SUB, xor0, 1);
    outer.connectGates(B1, xor1, 0);
    outer.connectGates(SUB, xor1, 1);
    outer.connectGates(B2, xor2, 0);
    outer.connectGates(SUB, xor2, 1);
    outer.connectGates(B3, xor3, 0);
    outer.connectGates(SUB, xor3, 1);

    const adder = outer.addCompositeGate("4-bit-adder", fourBitAdderCircuitData());
    const S0 = outer.addBasicGate("output");
    const S1 = outer.addBasicGate("output");
    const S2 = outer.addBasicGate("output");
    const S3 = outer.addBasicGate("output");
    const Cout = outer.addBasicGate("output");

    outer.connectGates(A0, adder, 0);
    outer.connectGates(A1, adder, 1);
    outer.connectGates(A2, adder, 2);
    outer.connectGates(A3, adder, 3);
    outer.connectGates(xor0, adder, 4);
    outer.connectGates(xor1, adder, 5);
    outer.connectGates(xor2, adder, 6);
    outer.connectGates(xor3, adder, 7);
    outer.connectGates(SUB, adder, 8); // Cin = SUB for 2's complement

    outer.connectGates(adder, S0, 0, 0);
    outer.connectGates(adder, S1, 0, 1);
    outer.connectGates(adder, S2, 0, 2);
    outer.connectGates(adder, S3, 0, 3);
    outer.connectGates(adder, Cout, 0, 4);

    // 5 - 3 = 2:
    // A = 0101, B = 0011, SUB = 1
    // ~B = 1100, ~B+1 = 1101
    // 0101 + 1101 = 10010, lower 4 bits = 0010 = 2, Cout=1
    A0.setValue(HIGH);  A1.setValue(LOW); A2.setValue(HIGH);  A3.setValue(LOW);
    B0.setValue(HIGH);  B1.setValue(HIGH);  B2.setValue(LOW); B3.setValue(LOW);
    SUB.setValue(HIGH);
    outer.evaluate();

    expect(S0.output).toBe(LOW);  // bit 0
    expect(S1.output).toBe(HIGH);   // bit 1
    expect(S2.output).toBe(LOW);  // bit 2
    expect(S3.output).toBe(LOW);  // bit 3
    expect(Cout.output).toBe(HIGH); // overflow/carry
  });

  it("computes correctly after toggling inputs", () => {
    const outer = new CircuitBuilder();
    const A0 = outer.addBasicGate("input");
    const A1 = outer.addBasicGate("input");
    const A2 = outer.addBasicGate("input");
    const A3 = outer.addBasicGate("input");
    const B0 = outer.addBasicGate("input");
    const B1 = outer.addBasicGate("input");
    const B2 = outer.addBasicGate("input");
    const B3 = outer.addBasicGate("input");
    const SUB = outer.addBasicGate("input");

    const xor0 = outer.addBasicGate("xor");
    const xor1 = outer.addBasicGate("xor");
    const xor2 = outer.addBasicGate("xor");
    const xor3 = outer.addBasicGate("xor");

    outer.connectGates(B0, xor0, 0);
    outer.connectGates(SUB, xor0, 1);
    outer.connectGates(B1, xor1, 0);
    outer.connectGates(SUB, xor1, 1);
    outer.connectGates(B2, xor2, 0);
    outer.connectGates(SUB, xor2, 1);
    outer.connectGates(B3, xor3, 0);
    outer.connectGates(SUB, xor3, 1);

    const adder = outer.addCompositeGate("4-bit-adder", fourBitAdderCircuitData());
    const S0 = outer.addBasicGate("output");
    const S1 = outer.addBasicGate("output");
    const S2 = outer.addBasicGate("output");
    const S3 = outer.addBasicGate("output");
    const Cout = outer.addBasicGate("output");

    outer.connectGates(A0, adder, 0);
    outer.connectGates(A1, adder, 1);
    outer.connectGates(A2, adder, 2);
    outer.connectGates(A3, adder, 3);
    outer.connectGates(xor0, adder, 4);
    outer.connectGates(xor1, adder, 5);
    outer.connectGates(xor2, adder, 6);
    outer.connectGates(xor3, adder, 7);
    outer.connectGates(SUB, adder, 8);

    outer.connectGates(adder, S0, 0, 0);
    outer.connectGates(adder, S1, 0, 1);
    outer.connectGates(adder, S2, 0, 2);
    outer.connectGates(adder, S3, 0, 3);
    outer.connectGates(adder, Cout, 0, 4);

    // First: SUB=0, so add mode: 5 + 3 = 8 = 1000
    A0.setValue(HIGH);  A1.setValue(LOW); A2.setValue(HIGH);  A3.setValue(LOW);
    B0.setValue(HIGH);  B1.setValue(HIGH);  B2.setValue(LOW); B3.setValue(LOW);
    SUB.setValue(LOW);
    outer.evaluate();

    expect(S0.output).toBe(LOW);
    expect(S1.output).toBe(LOW);
    expect(S2.output).toBe(LOW);
    expect(S3.output).toBe(HIGH);
    expect(Cout.output).toBe(LOW);

    // Now toggle SUB to 1: 5 - 3 = 2 = 0010, Cout=1
    SUB.setValue(HIGH);
    outer.evaluate();

    expect(S0.output).toBe(LOW);
    expect(S1.output).toBe(HIGH);
    expect(S2.output).toBe(LOW);
    expect(S3.output).toBe(LOW);
    expect(Cout.output).toBe(HIGH);
  });
});

describe("Wire signal consistency", () => {
  it("wire signal matches gate output after evaluation", () => {
    const outer = new CircuitBuilder();
    const A = outer.addBasicGate("input");
    const xor = outer.addBasicGate("xor");
    const B = outer.addBasicGate("input");
    const out = outer.addBasicGate("output");

    outer.connectGates(A, xor, 0);
    outer.connectGates(B, xor, 1);
    outer.connectGates(xor, out, 0);

    A.setValue(HIGH);
    B.setValue(LOW);
    outer.evaluate();

    // Check that the wire from xor to out matches xor's output
    const wireToOut = outer.wires.find(w => w.to === out);
    expect(wireToOut.signal).toBe(xor.output);
    expect(out.output).toBe(HIGH);

    // Toggle
    B.setValue(HIGH);
    outer.evaluate();
    expect(wireToOut.signal).toBe(xor.output);
    expect(out.output).toBe(LOW);
  });

  it("composite gate output wire signal matches composite output after evaluation", () => {
    const outer = new CircuitBuilder();
    const A = outer.addBasicGate("input");
    const B = outer.addBasicGate("input");
    const ha = outer.addCompositeGate("half-adder", halfAdderCircuitData());
    const sumOut = outer.addBasicGate("output");
    const carryOut = outer.addBasicGate("output");

    outer.connectGates(A, ha, 0);
    outer.connectGates(B, ha, 1);
    outer.connectGates(ha, sumOut, 0, 0);
    outer.connectGates(ha, carryOut, 0, 1);

    A.setValue(HIGH);
    B.setValue(HIGH);
    outer.evaluate();

    const wireToSum = outer.wires.find(w => w.to === sumOut);
    const wireToCarry = outer.wires.find(w => w.to === carryOut);

    // Sum should be 0, carry should be 1
    expect(sumOut.output).toBe(LOW);
    expect(carryOut.output).toBe(HIGH);
    expect(wireToSum.signal).toBe(sumOut.output);
    expect(wireToCarry.signal).toBe(carryOut.output);
  });
});
