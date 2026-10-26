import { run, bench, group, flags } from "mitata";
import { writeFileSync } from "node:fs";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";
import { SIGNAL } from "../../constants.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

const toggle = signal => signal === LOW ? HIGH : LOW;

// ─── Builder Helpers ─────────────────────────────────────────────────────────

function buildANDGate(withWasm = true) {
  const b = new CircuitBuilder();
  const A = b.addPrimitiveGate("input");
  const B = b.addPrimitiveGate("input");
  const gate = b.addPrimitiveGate("and");
  const out = b.addPrimitiveGate("output");
  b.connectToGate(A, gate, 0, null, false);
  b.connectToGate(B, gate, 1, null, false);
  b.connectToGate(gate, out, 0, null, false);
  A.setValue(HIGH);
  B.setValue(HIGH);
  if (withWasm) b.buildTypedData();
  return { builder: b, A, B, out };
}

function buildNOTGate(withWasm = true) {
  const b = new CircuitBuilder();
  const A = b.addPrimitiveGate("input");
  const gate = b.addPrimitiveGate("not");
  const out = b.addPrimitiveGate("output");
  b.connectToGate(A, gate, 0, null, false);
  b.connectToGate(gate, out, 0, null, false);
  A.setValue(HIGH);
  if (withWasm) b.buildTypedData();
  return { builder: b, A, out };
}

function buildXORGate(withWasm = true) {
  const b = new CircuitBuilder();
  const A = b.addPrimitiveGate("input");
  const B = b.addPrimitiveGate("input");
  const gate = b.addPrimitiveGate("xor");
  const out = b.addPrimitiveGate("output");
  b.connectToGate(A, gate, 0, null, false);
  b.connectToGate(B, gate, 1, null, false);
  b.connectToGate(gate, out, 0, null, false);
  A.setValue(HIGH);
  B.setValue(LOW);
  if (withWasm) b.buildTypedData();
  return { builder: b, A, B, out };
}

function buildHalfAdder(withWasm = true) {
  const b = new CircuitBuilder();
  const A = b.addPrimitiveGate("input");
  const B = b.addPrimitiveGate("input");
  const xor = b.addPrimitiveGate("xor");
  const and = b.addPrimitiveGate("and");
  const sum = b.addPrimitiveGate("output");
  const carry = b.addPrimitiveGate("output");

  b.connectToGate(A, xor, 0, null, false);
  b.connectToGate(B, xor, 1, null, false);
  b.connectToGate(xor, sum, 0, null, false);
  b.connectToGate(A, and, 0, null, false);
  b.connectToGate(B, and, 1, null, false);
  b.connectToGate(and, carry, 0, null, false);

  if (withWasm) b.buildTypedData();
  return { builder: b, A, B, sum, carry };
}

function buildFullAdder(withWasm = true) {
  const b = new CircuitBuilder();
  const A = b.addPrimitiveGate("input");
  const B = b.addPrimitiveGate("input");
  const C = b.addPrimitiveGate("input");

  const xor1 = b.addPrimitiveGate("xor");
  const xor2 = b.addPrimitiveGate("xor");
  const and1 = b.addPrimitiveGate("and");
  const and2 = b.addPrimitiveGate("and");
  const or1 = b.addPrimitiveGate("or");
  const or2 = b.addPrimitiveGate("or");

  const sum = b.addPrimitiveGate("output");
  const carry = b.addPrimitiveGate("output");

  b.connectToGate(A, xor1, 0, null, false);
  b.connectToGate(B, xor1, 1, null, false);
  b.connectToGate(xor1, xor2, 0, null, false);
  b.connectToGate(C, xor2, 1, null, false);
  b.connectToGate(xor2, sum, 0, null, false);
  b.connectToGate(A, and1, 0, null, false);
  b.connectToGate(B, and1, 1, null, false);
  b.connectToGate(A, or1, 0, null, false);
  b.connectToGate(B, or1, 1, null, false);
  b.connectToGate(and1, or2, 0, null, false);
  b.connectToGate(or1, and2, 0, null, false);
  b.connectToGate(C, and2, 1, null, false);
  b.connectToGate(and2, or2, 1, null, false);
  b.connectToGate(or2, carry, 0, null, false);

  if (withWasm) b.buildTypedData();
  return { builder: b, A, B, C, sum, carry };
}

function buildSRLatch(withWasm = true) {
  const b = new CircuitBuilder();
  const S = b.addPrimitiveGate("input");
  const R = b.addPrimitiveGate("input");
  const notS = b.addPrimitiveGate("not");
  const notR = b.addPrimitiveGate("not");
  const nand1 = b.addPrimitiveGate("nand");
  const nand2 = b.addPrimitiveGate("nand");
  const Q = b.addPrimitiveGate("output");
  const notQ = b.addPrimitiveGate("output");

  b.connectToGate(S, notS, 0, null, false);
  b.connectToGate(R, notR, 0, null, false);
  b.connectToGate(notS, nand1, 0, null, false);
  b.connectToGate(notR, nand2, 0, null, false);
  b.connectToGate(nand1, nand2, 1, null, false);
  b.connectToGate(nand2, nand1, 1, null, false);
  b.connectToGate(nand1, Q, 0, null, false);
  b.connectToGate(nand2, notQ, 0, null, false);

  if (withWasm) b.buildTypedData();
  return { builder: b, S, R, Q, notQ };
}

function buildDLatch(withWasm = true) {
  const b = new CircuitBuilder();
  const D = b.addPrimitiveGate("input");
  const E = b.addPrimitiveGate("input");
  const notD = b.addPrimitiveGate("not");
  const and1 = b.addPrimitiveGate("and");
  const and2 = b.addPrimitiveGate("and");
  const nor1 = b.addPrimitiveGate("nor");
  const nor2 = b.addPrimitiveGate("nor");
  const Q = b.addPrimitiveGate("output");
  const notQ = b.addPrimitiveGate("output");

  b.connectToGate(D, notD, 0, null, false);
  b.connectToGate(notD, and1, 0, null, false);
  b.connectToGate(E, and1, 1, null, false);
  b.connectToGate(E, and2, 0, null, false);
  b.connectToGate(D, and2, 1, null, false);
  b.connectToGate(and1, nor1, 0, null, false);
  b.connectToGate(nor2, nor1, 1, null, false);
  b.connectToGate(nor1, nor2, 0, null, false);
  b.connectToGate(and2, nor2, 1, null, false);
  b.connectToGate(nor1, Q, 0, null, false);
  b.connectToGate(nor2, notQ, 0, null, false);

  if (withWasm) b.buildTypedData();
  return { builder: b, D, E, Q, notQ };
}

/**
 * Builds a 4-bit ripple-carry adder from four full-adder stages.
 * Uses 20 logic gates + 8 inputs + 5 outputs = 33 gates, ~52 wires.
 */
function buildRippleCarryAdder(bits, withWasm = true) {
  const b = new CircuitBuilder();

  const A = [];
  const B = [];
  for (let i = 0; i < bits; i++) {
    A.push(b.addPrimitiveGate("input"));
    B.push(b.addPrimitiveGate("input"));
  }
  const Cin = b.addPrimitiveGate("input");

  const S = [];
  let prevCarry = Cin;

  for (let i = 0; i < bits; i++) {
    const xor1 = b.addPrimitiveGate("xor");
    const xor2 = b.addPrimitiveGate("xor");
    const and1 = b.addPrimitiveGate("and");
    const and2 = b.addPrimitiveGate("and");
    const or1 = b.addPrimitiveGate("or");
    const or2 = b.addPrimitiveGate("or");
    const sum = b.addPrimitiveGate("output");

    b.connectToGate(A[i], xor1, 0, null, false);
    b.connectToGate(B[i], xor1, 1, null, false);
    b.connectToGate(xor1, xor2, 0, null, false);
    b.connectToGate(prevCarry, xor2, 1, null, false);
    b.connectToGate(xor2, sum, 0, null, false);

    b.connectToGate(A[i], and1, 0, null, false);
    b.connectToGate(B[i], and1, 1, null, false);

    b.connectToGate(A[i], or1, 0, null, false);
    b.connectToGate(B[i], or1, 1, null, false);

    b.connectToGate(and1, or2, 0, null, false);
    b.connectToGate(or1, and2, 0, null, false);
    b.connectToGate(prevCarry, and2, 1, null, false);
    b.connectToGate(and2, or2, 1, null, false);

    S.push(sum);

    prevCarry = or2;
  }

  const Cout = b.addPrimitiveGate("output");
  b.connectToGate(prevCarry, Cout, 0, null, false);
  if (withWasm) b.buildTypedData();

  return { builder: b, A, B, Cin, S, Cout };
}

/**
 * Builds a wide fan-out circuit: one input driving N OR gates.
 */
function buildWideFanout(width, withWasm = true) {
  const b = new CircuitBuilder();
  const src = b.addPrimitiveGate("input");
  src.setValue(HIGH);

  for (let i = 0; i < width; i++) {
    const gate = b.addPrimitiveGate("or");
    const out = b.addPrimitiveGate("output");
    b.connectToGate(src, gate, 0, null, false);
    b.connectToGate(gate, out, 0, null, false);
  }

  if (withWasm) b.buildTypedData();

  return { builder: b, src };
}

/**
 * Builds a deep chain: input → NOT → NOT → ... → output (N stages).
 */
function buildDeepChain(depth, withWasm = true) {
  const b = new CircuitBuilder();
  const src = b.addPrimitiveGate("input");
  src.setValue(HIGH);

  let prev = src;
  for (let i = 0; i < depth; i++) {
    const not = b.addPrimitiveGate("not");
    b.connectToGate(prev, not, 0, null, false);
    prev = not;
  }

  const out = b.addPrimitiveGate("output");
  b.connectToGate(prev, out, 0, null, false);

  if (withWasm) b.buildTypedData();

  return { builder: b, src, out };
}

/**
 * Creates circuit-data for a half-adder (used to instantiate CompositeGate).
 *
 * Topology: 2 inputs → XOR (sum), AND (carry) → 2 outputs
 */
function halfAdderCircuitData(withWasm = true) {
  const inner = new CircuitBuilder();
  const A = inner.addPrimitiveGate("input");
  const B = inner.addPrimitiveGate("input");
  const xor = inner.addPrimitiveGate("xor");
  const and = inner.addPrimitiveGate("and");
  const sum = inner.addPrimitiveGate("output");
  const carry = inner.addPrimitiveGate("output");

  inner.connectToGate(A, xor, 0, null, false);
  inner.connectToGate(B, xor, 1, null, false);
  inner.connectToGate(xor, sum, 0, null, false);
  inner.connectToGate(A, and, 0, null, false);
  inner.connectToGate(B, and, 1, null, false);
  inner.connectToGate(and, carry, 0, null, false);
  inner.buildFanout();

  if (withWasm) inner.buildTypedData();

  return {
    builder: inner,
    inputOrder: [A.id, B.id],
    outputOrder: [sum.id, carry.id],
  };
}

/**
 * Creates circuit-data for a NOT gate (used to instantiate CompositeGate).
 */
function notCircuitData(withWasm = true) {
  const inner = new CircuitBuilder();
  const A = inner.addPrimitiveGate("input");
  const not = inner.addPrimitiveGate("not");
  const Q = inner.addPrimitiveGate("output");

  inner.connectToGate(A, not, 0, null, false);
  inner.connectToGate(not, Q, 0, null, false);
  inner.buildFanout();

  if (withWasm) inner.buildTypedData();

  return {
    builder: inner,
    inputOrder: [A.id],
    outputOrder: [Q.id],
  };
}

/**
 * Builds an outer circuit containing a single composite half-adder gate.
 */
function buildCompositeHalfAdder(withWasm = true) {
  const b = new CircuitBuilder();
  const A = b.addPrimitiveGate("input");
  const B = b.addPrimitiveGate("input");
  const comp = b.addCompositeGate("half-adder", halfAdderCircuitData());
  const sum = b.addPrimitiveGate("output");
  const carry = b.addPrimitiveGate("output");

  b.connectToGate(A, comp, 0, null, false);
  b.connectToGate(B, comp, 1, null, false);
  b.connectToGate(comp, sum, 0, 0, false);
  b.connectToGate(comp, carry, 0, 1, false);

  if (withWasm) b.buildTypedData();

  return { builder: b, A, B, sum, carry };
}

/**
 * Builds a 4-bit ripple-carry adder using composite half-adder blocks.
 * Each bit stage uses an OR gate to combine carries from two composite half-adders.
 */
function buildCompositeRCA(bits, withWasm = true) {
  const b = new CircuitBuilder();
  const A = [];
  const B = [];
  for (let i = 0; i < bits; i++) {
    A.push(b.addPrimitiveGate("input"));
    B.push(b.addPrimitiveGate("input"));
  }
  const Cin = b.addPrimitiveGate("input");

  const S = [];
  let prevCarry = Cin;

  for (let i = 0; i < bits; i++) {
    const ha1 = b.addCompositeGate("ha", halfAdderCircuitData(false));
    b.connectToGate(A[i], ha1, 0, null, false);
    b.connectToGate(B[i], ha1, 1, null, false);

    const ha2 = b.addCompositeGate("ha", halfAdderCircuitData(false));
    b.connectToGate(ha1, ha2, 0, 0, false);
    b.connectToGate(prevCarry, ha2, 1, null, false);

    const sum = b.addPrimitiveGate("output");
    b.connectToGate(ha2, sum, 0, 0, false);
    S.push(sum);

    const or = b.addPrimitiveGate("or");
    b.connectToGate(ha1, or, 0, 1, false);
    b.connectToGate(ha2, or, 1, 1, false);
    prevCarry = or;
  }

  const Cout = b.addPrimitiveGate("output");
  b.connectToGate(prevCarry, Cout, 0, null, false);
  if (withWasm) b.buildTypedData();

  return { builder: b, A, B, Cin, S, Cout };
}

/**
 * Builds a nested composite gate: double-NOT (identity).
 */
function buildNestedComposite(withWasm = true) {
  // Middle layer: two NOT composites chained
  const middle = new CircuitBuilder();
  const mA = middle.addPrimitiveGate("input");
  const not1 = middle.addCompositeGate("not", notCircuitData());
  const not2 = middle.addCompositeGate("not", notCircuitData());
  const mQ = middle.addPrimitiveGate("output");

  middle.connectToGate(mA, not1, 0, null, false);
  middle.connectToGate(not1, not2, 0, 0, false);
  middle.connectToGate(not2, mQ, 0, 0, false);
  middle.buildFanout();

  const doubleNotData = {
    builder: middle,
    inputOrder: [mA.id],
    outputOrder: [mQ.id],
  };

  // Outer circuit using the nested composite
  const b = new CircuitBuilder();
  const A = b.addPrimitiveGate("input");
  const comp = b.addCompositeGate("double-not", doubleNotData);
  const out = b.addPrimitiveGate("output");

  b.connectToGate(A, comp, 0, null, false);
  b.connectToGate(comp, out, 0, 0, false);

  if (withWasm) b.buildTypedData();

  return { builder: b, A, out };
}


// ─── Benchmarks ──────────────────────────────────────────────────────────────

// Pre-build circuits (shared across iterations, same as before)
const andCircuit = buildANDGate();
const notCircuit = buildNOTGate();
const xorCircuit = buildXORGate();
const halfAdder = buildHalfAdder();
const fullAdder = buildFullAdder();
const rca4 = buildRippleCarryAdder(4);
const rca16 = buildRippleCarryAdder(16);
const rca32 = buildRippleCarryAdder(32);
const srLatch = buildSRLatch();
const dLatch = buildDLatch();
const srLatchSettle = buildSRLatch();
const fullAdderSettle = buildFullAdder();
const fan16 = buildWideFanout(16);
const fan64 = buildWideFanout(64);
const fan256 = buildWideFanout(256);
const fan1024 = buildWideFanout(1024);
const fan4096 = buildWideFanout(4096);
const chain16 = buildDeepChain(16);
const chain64 = buildDeepChain(64);
const chain256 = buildDeepChain(256);
const chain1024 = buildDeepChain(1024);
const chain4096 = buildDeepChain(4096);
const compositeHA = buildCompositeHalfAdder();
const compositeRCA4 = buildCompositeRCA(4);
const nestedComp = buildNestedComposite();
const compositeHASettle = buildCompositeHalfAdder();

// Primitive gate evaluation
group("Primitive Gate Evaluation", () => {
  let andToggle = LOW;
  bench("AND gate", () => {
    andToggle = toggle(andToggle);
    andCircuit.A.setValue(andToggle);
    andCircuit.builder.evaluate();
  });

  let notToggle = LOW;
  bench("NOT gate", () => {
    notToggle = toggle(notToggle);
    notCircuit.A.setValue(notToggle);
    notCircuit.builder.evaluate();
  });

  let xorToggle = LOW;
  bench("XOR gate", () => {
    xorToggle = toggle(xorToggle);
    xorCircuit.A.setValue(xorToggle);
    xorCircuit.builder.evaluate();
  });
});


// Combinational circuit evaluation
group("Combinational Circuit Evaluation", () => {
  let haToggle = LOW;
  bench("warmup", () => { let w = LOW; for (let i = 0; i < 1000; i++) { w = toggle(w); halfAdder.A.setValue(w); halfAdder.B.setValue(LOW); halfAdder.builder.evaluate(); } });

  bench("Half Adder", () => {
    haToggle = toggle(haToggle);
    halfAdder.A.setValue(haToggle);
    halfAdder.B.setValue(LOW);
    halfAdder.builder.evaluate();
  });

  let faToggle = LOW;
  bench("Full Adder", () => {
    faToggle = toggle(faToggle);
    fullAdder.A.setValue(faToggle);
    fullAdder.B.setValue(HIGH);
    fullAdder.C.setValue(LOW);
    fullAdder.builder.evaluate();
  });

  let rca4Toggle = LOW;
  bench("4-bit Ripple-Carry Adder", () => {
    rca4Toggle = toggle(rca4Toggle);
    rca4.A[0].setValue(rca4Toggle);
    rca4.A[1].setValue(LOW);
    rca4.builder.evaluate();
  });

  let rca16Toggle = LOW;
  bench("16-bit Ripple-Carry Adder", () => {
    rca16Toggle = toggle(rca16Toggle);
    rca16.A[0].setValue(rca16Toggle);
    rca16.A[15].setValue(LOW);
    rca16.builder.evaluate();
  });

  let rca32Toggle = LOW;
  bench("32-bit Ripple-Carry Adder", () => {
    rca32Toggle = toggle(rca32Toggle);
    rca32.A[0].setValue(rca32Toggle);
    rca32.A[31].setValue(LOW);
    rca32.builder.evaluate();
  });
});


// Sequential circuit evaluation
group("Sequential Circuit Evaluation", () => {
  let srToggle = LOW;
  bench("SR Latch", () => {
    srToggle = toggle(srToggle);
    srLatch.S.setValue(srToggle);
    srLatch.R.setValue(toggle(srToggle));
    srLatch.builder.evaluate();
  });

  bench("SR Latch — Set then Hold", () => {
    srLatch.S.setValue(HIGH);
    srLatch.R.setValue(LOW);
    srLatch.builder.evaluate();
    srLatch.S.setValue(LOW);
    srLatch.builder.evaluate();
  });

  let dToggle = LOW;
  bench("D Latch", () => {
    dToggle = toggle(dToggle);
    dLatch.E.setValue(HIGH);
    dLatch.D.setValue(dToggle);
    dLatch.builder.evaluate();
  });

  bench("D Latch — Write then Hold", () => {
    dLatch.E.setValue(HIGH);
    dLatch.D.setValue(HIGH);
    dLatch.builder.evaluate();
    dLatch.E.setValue(LOW);
    dLatch.builder.evaluate();
  });
});


// Circuit settling (used after structural changes)
group("Circuit Settling", () => {
  bench("settle SR Latch", () => {
    srLatchSettle.builder.settle();
  });

  bench("settle Full Adder", () => {
    fullAdderSettle.builder.settle();
  });
});


// Circuit construction (building from scratch each iteration)
group("Circuit Construction (JS only)", () => {
  bench("build Half Adder (JS)", () => { buildHalfAdder(false); });
  bench("build Full Adder (JS)", () => { buildFullAdder(false); });
  bench("build SR Latch (JS)", () => { buildSRLatch(false); });
  bench("build 4-bit RCA (JS)", () => { buildRippleCarryAdder(4, false); });
  bench("build 32-bit RCA (JS)", () => { buildRippleCarryAdder(32, false); });
});

group("Circuit Construction (WASM + TypedData)", () => {
  bench("build Half Adder (WASM)", () => { buildHalfAdder(true); });
  bench("build Full Adder (WASM)", () => { buildFullAdder(true); });
  bench("build SR Latch (WASM)", () => { buildSRLatch(true); });
  bench("build 4-bit RCA (WASM)", () => { buildRippleCarryAdder(4, true); });
  bench("build 32-bit RCA (WASM)", () => { buildRippleCarryAdder(32, true); });
});


// Scaling: fan-out and depth
group("Scaling — Fan-out", () => {
  let fan16Toggle = LOW;
  bench("16-wide fan-out evaluate", () => {
    fan16Toggle = toggle(fan16Toggle);
    fan16.src.setValue(fan16Toggle);
    fan16.builder.evaluate();
  });

  let fan64Toggle = LOW;
  bench("64-wide fan-out evaluate", () => {
    fan64Toggle = toggle(fan64Toggle);
    fan64.src.setValue(fan64Toggle);
    fan64.builder.evaluate();
  });

  let fan256Toggle = LOW;
  bench("256-wide fan-out evaluate", () => {
    fan256Toggle = toggle(fan256Toggle);
    fan256.src.setValue(fan256Toggle);
    fan256.builder.evaluate();
  });
  let fan1024Toggle = LOW;
  bench("1024-wide fan-out evaluate", () => {
    fan1024Toggle = toggle(fan1024Toggle);
    fan1024.src.setValue(fan1024Toggle);
    fan1024.builder.evaluate();
  });
  let fan4096Toggle = LOW;
  bench("4096-wide fan-out evaluate", () => {
    fan4096Toggle = toggle(fan4096Toggle);
    fan4096.src.setValue(fan4096Toggle);
    fan4096.builder.evaluate();
  });
});

group("Scaling — Chain Depth", () => {
  let chain16Toggle = LOW;
  bench("16-deep NOT chain evaluate", () => {
    chain16Toggle = toggle(chain16Toggle);
    chain16.src.setValue(chain16Toggle);
    chain16.builder.evaluate();
  });

  let chain64Toggle = LOW;
  bench("64-deep NOT chain evaluate", () => {
    chain64Toggle = toggle(chain64Toggle);
    chain64.src.setValue(chain64Toggle);
    chain64.builder.evaluate();
  });

  let chain256Toggle = LOW;
  bench("256-deep NOT chain evaluate", () => {
    chain256Toggle = toggle(chain256Toggle);
    chain256.src.setValue(chain256Toggle);
    chain256.builder.evaluate();
  });
  let chain1024Toggle = LOW;
  bench("1024-deep NOT chain evaluate", () => {
    chain1024Toggle = toggle(chain1024Toggle);
    chain1024.src.setValue(chain1024Toggle);
    chain1024.builder.evaluate();
  });
  let chain4096Toggle = LOW;
  bench("4096-deep NOT chain evaluate", () => {
    chain4096Toggle = toggle(chain4096Toggle);
    chain4096.src.setValue(chain4096Toggle);
    chain4096.builder.evaluate();
  });
});


// Composite gate evaluation
group("Composite Gate Evaluation", () => {
  let compHAToggle = LOW;
  bench("Composite Half Adder", () => {
    compHAToggle = toggle(compHAToggle);
    compositeHA.A.setValue(compHAToggle);
    compositeHA.B.setValue(LOW);
    compositeHA.builder.evaluate();
  });

  let compRCAToggle = LOW;
  bench("Composite 4-bit Ripple-Carry Adder", () => {
    compRCAToggle = toggle(compRCAToggle);
    compositeRCA4.A[0].setValue(compRCAToggle);
    compositeRCA4.A[1].setValue(LOW);
    compositeRCA4.A[2].setValue(HIGH);
    compositeRCA4.A[3].setValue(HIGH);
    compositeRCA4.B[0].setValue(HIGH);
    compositeRCA4.B[1].setValue(HIGH);
    compositeRCA4.B[2].setValue(LOW);
    compositeRCA4.B[3].setValue(LOW);
    compositeRCA4.Cin.setValue(LOW);
    compositeRCA4.builder.evaluate();
  });

  let nestedToggle = LOW;
  bench("Nested Composite (double-NOT)", () => {
    nestedToggle = toggle(nestedToggle);
    nestedComp.A.setValue(nestedToggle);
    nestedComp.builder.evaluate();
  });
});


// Composite gate settling
group("Composite Gate Settling", () => {
  bench("settle Composite Half Adder", () => {
    compositeHASettle.builder.settle();
  });
});


// Composite gate construction
group("Composite Gate Construction (JS only)", () => {
  bench("build Composite Half Adder (JS)", () => { buildCompositeHalfAdder(false); });
  bench("build Composite 4-bit RCA (JS)", () => { buildCompositeRCA(4, false); });
  bench("build Nested Composite (JS)", () => { buildNestedComposite(false); });
});

group("Composite Gate Construction (WASM + TypedData)", () => {
  bench("build Composite Half Adder (WASM)", () => { buildCompositeHalfAdder(true); });
  bench("build Composite 4-bit RCA (WASM)", () => { buildCompositeRCA(4, true); });
  bench("build Nested Composite (WASM)", () => { buildNestedComposite(true); });
});


// ─── Run & emit JSON ─────────────────────────────────────────────────────────

const outFile = process.argv[2] || "bench-results.json";
const results = await run({ format: "mitata" });

// Normalise into a flat { name → { avg_ns, ... } } map for easy comparison.
// Each benchmark trial has a `runs` array; iterate over those.
const benchmarks = {};

for (const trial of results.benchmarks) {
  for (const r of trial.runs) {
    if (r.error || !r.stats) continue;
    benchmarks[r.name] = {
      avg_ns: r.stats.avg,
      min_ns: r.stats.min,
      max_ns: r.stats.max,
      p75_ns: r.stats.p75,
      p99_ns: r.stats.p99,
    };
  }
}

const output = {
  timestamp: new Date().toISOString(),
  runtime: `${results.context.runtime} ${results.context.version}`,
  cpu: results.context.cpu.name,
  benchmarks,
};

writeFileSync(outFile, JSON.stringify(output, null, 2) + "\n");
console.log(`\n✅ Results written to ${outFile}`);