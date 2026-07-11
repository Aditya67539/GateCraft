import { run, bench, group, flags } from "mitata";
import { writeFileSync } from "node:fs";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";
import { SIGNAL } from "../../constants.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

const toggle = signal => signal === LOW ? HIGH : LOW;

// ─── Builder Helpers ─────────────────────────────────────────────────────────

function buildANDGate(withWasm = true) {
  const b = new CircuitBuilder();
  const A = b.addBasicGate("input");
  const B = b.addBasicGate("input");
  const gate = b.addBasicGate("and");
  const out = b.addBasicGate("output");
  b.connectGates(A, gate, 0, null, false);
  b.connectGates(B, gate, 1, null, false);
  b.connectGates(gate, out, 0, null, false);
  A.setValue(HIGH);
  B.setValue(HIGH);
  if (withWasm) b.buildTypedData();
  return { builder: b, A, B, out };
}

function buildNOTGate(withWasm = true) {
  const b = new CircuitBuilder();
  const A = b.addBasicGate("input");
  const gate = b.addBasicGate("not");
  const out = b.addBasicGate("output");
  b.connectGates(A, gate, 0, null, false);
  b.connectGates(gate, out, 0, null, false);
  A.setValue(HIGH);
  if (withWasm) b.buildTypedData();
  return { builder: b, A, out };
}

function buildXORGate(withWasm = true) {
  const b = new CircuitBuilder();
  const A = b.addBasicGate("input");
  const B = b.addBasicGate("input");
  const gate = b.addBasicGate("xor");
  const out = b.addBasicGate("output");
  b.connectGates(A, gate, 0, null, false);
  b.connectGates(B, gate, 1, null, false);
  b.connectGates(gate, out, 0, null, false);
  A.setValue(HIGH);
  B.setValue(LOW);
  if (withWasm) b.buildTypedData();
  return { builder: b, A, B, out };
}

function buildHalfAdder(withWasm = true) {
  const b = new CircuitBuilder();
  const A = b.addBasicGate("input");
  const B = b.addBasicGate("input");
  const xor = b.addBasicGate("xor");
  const and = b.addBasicGate("and");
  const sum = b.addBasicGate("output");
  const carry = b.addBasicGate("output");

  b.connectGates(A, xor, 0, null, false);
  b.connectGates(B, xor, 1, null, false);
  b.connectGates(xor, sum, 0, null, false);
  b.connectGates(A, and, 0, null, false);
  b.connectGates(B, and, 1, null, false);
  b.connectGates(and, carry, 0, null, false);

  if (withWasm) b.buildTypedData();
  return { builder: b, A, B, sum, carry };
}

function buildFullAdder(withWasm = true) {
  const b = new CircuitBuilder();
  const A = b.addBasicGate("input");
  const B = b.addBasicGate("input");
  const C = b.addBasicGate("input");

  const xor1 = b.addBasicGate("xor");
  const xor2 = b.addBasicGate("xor");
  const and1 = b.addBasicGate("and");
  const and2 = b.addBasicGate("and");
  const or1 = b.addBasicGate("or");
  const or2 = b.addBasicGate("or");

  const sum = b.addBasicGate("output");
  const carry = b.addBasicGate("output");

  b.connectGates(A, xor1, 0, null, false);
  b.connectGates(B, xor1, 1, null, false);
  b.connectGates(xor1, xor2, 0, null, false);
  b.connectGates(C, xor2, 1, null, false);
  b.connectGates(xor2, sum, 0, null, false);
  b.connectGates(A, and1, 0, null, false);
  b.connectGates(B, and1, 1, null, false);
  b.connectGates(A, or1, 0, null, false);
  b.connectGates(B, or1, 1, null, false);
  b.connectGates(and1, or2, 0, null, false);
  b.connectGates(or1, and2, 0, null, false);
  b.connectGates(C, and2, 1, null, false);
  b.connectGates(and2, or2, 1, null, false);
  b.connectGates(or2, carry, 0, null, false);

  if (withWasm) b.buildTypedData();
  return { builder: b, A, B, C, sum, carry };
}

function buildSRLatch(withWasm = true) {
  const b = new CircuitBuilder();
  const S = b.addBasicGate("input");
  const R = b.addBasicGate("input");
  const notS = b.addBasicGate("not");
  const notR = b.addBasicGate("not");
  const nand1 = b.addBasicGate("nand");
  const nand2 = b.addBasicGate("nand");
  const Q = b.addBasicGate("output");
  const notQ = b.addBasicGate("output");

  b.connectGates(S, notS, 0, null, false);
  b.connectGates(R, notR, 0, null, false);
  b.connectGates(notS, nand1, 0, null, false);
  b.connectGates(notR, nand2, 0, null, false);
  b.connectGates(nand1, nand2, 1, null, false);
  b.connectGates(nand2, nand1, 1, null, false);
  b.connectGates(nand1, Q, 0, null, false);
  b.connectGates(nand2, notQ, 0, null, false);

  if (withWasm) b.buildTypedData();
  return { builder: b, S, R, Q, notQ };
}

function buildDLatch(withWasm = true) {
  const b = new CircuitBuilder();
  const D = b.addBasicGate("input");
  const E = b.addBasicGate("input");
  const notD = b.addBasicGate("not");
  const and1 = b.addBasicGate("and");
  const and2 = b.addBasicGate("and");
  const nor1 = b.addBasicGate("nor");
  const nor2 = b.addBasicGate("nor");
  const Q = b.addBasicGate("output");
  const notQ = b.addBasicGate("output");

  b.connectGates(D, notD, 0, null, false);
  b.connectGates(notD, and1, 0, null, false);
  b.connectGates(E, and1, 1, null, false);
  b.connectGates(E, and2, 0, null, false);
  b.connectGates(D, and2, 1, null, false);
  b.connectGates(and1, nor1, 0, null, false);
  b.connectGates(nor2, nor1, 1, null, false);
  b.connectGates(nor1, nor2, 0, null, false);
  b.connectGates(and2, nor2, 1, null, false);
  b.connectGates(nor1, Q, 0, null, false);
  b.connectGates(nor2, notQ, 0, null, false);

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
    A.push(b.addBasicGate("input"));
    B.push(b.addBasicGate("input"));
  }
  const Cin = b.addBasicGate("input");

  const S = [];
  let prevCarry = Cin;

  for (let i = 0; i < bits; i++) {
    const xor1 = b.addBasicGate("xor");
    const xor2 = b.addBasicGate("xor");
    const and1 = b.addBasicGate("and");
    const and2 = b.addBasicGate("and");
    const or1 = b.addBasicGate("or");
    const or2 = b.addBasicGate("or");
    const sum = b.addBasicGate("output");

    b.connectGates(A[i], xor1, 0, null, false);
    b.connectGates(B[i], xor1, 1, null, false);
    b.connectGates(xor1, xor2, 0, null, false);
    b.connectGates(prevCarry, xor2, 1, null, false);
    b.connectGates(xor2, sum, 0, null, false);

    b.connectGates(A[i], and1, 0, null, false);
    b.connectGates(B[i], and1, 1, null, false);

    b.connectGates(A[i], or1, 0, null, false);
    b.connectGates(B[i], or1, 1, null, false);

    b.connectGates(and1, or2, 0, null, false);
    b.connectGates(or1, and2, 0, null, false);
    b.connectGates(prevCarry, and2, 1, null, false);
    b.connectGates(and2, or2, 1, null, false);

    S.push(sum);

    prevCarry = or2;
  }

  const Cout = b.addBasicGate("output");
  b.connectGates(prevCarry, Cout, 0, null, false);
  if (withWasm) b.buildTypedData();

  return { builder: b, A, B, Cin, S, Cout };
}

/**
 * Builds a wide fan-out circuit: one input driving N OR gates.
 */
function buildWideFanout(width, withWasm = true) {
  const b = new CircuitBuilder();
  const src = b.addBasicGate("input");
  src.setValue(HIGH);

  for (let i = 0; i < width; i++) {
    const gate = b.addBasicGate("or");
    const out = b.addBasicGate("output");
    b.connectGates(src, gate, 0, null, false);
    b.connectGates(gate, out, 0, null, false);
  }

  if (withWasm) b.buildTypedData();

  return { builder: b, src };
}

/**
 * Builds a deep chain: input → NOT → NOT → ... → output (N stages).
 */
function buildDeepChain(depth, withWasm = true) {
  const b = new CircuitBuilder();
  const src = b.addBasicGate("input");
  src.setValue(HIGH);

  let prev = src;
  for (let i = 0; i < depth; i++) {
    const not = b.addBasicGate("not");
    b.connectGates(prev, not, 0, null, false);
    prev = not;
  }

  const out = b.addBasicGate("output");
  b.connectGates(prev, out, 0, null, false);

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
  const A = inner.addBasicGate("input");
  const B = inner.addBasicGate("input");
  const xor = inner.addBasicGate("xor");
  const and = inner.addBasicGate("and");
  const sum = inner.addBasicGate("output");
  const carry = inner.addBasicGate("output");

  inner.connectGates(A, xor, 0, null, false);
  inner.connectGates(B, xor, 1, null, false);
  inner.connectGates(xor, sum, 0, null, false);
  inner.connectGates(A, and, 0, null, false);
  inner.connectGates(B, and, 1, null, false);
  inner.connectGates(and, carry, 0, null, false);
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
  const A = inner.addBasicGate("input");
  const not = inner.addBasicGate("not");
  const Q = inner.addBasicGate("output");

  inner.connectGates(A, not, 0, null, false);
  inner.connectGates(not, Q, 0, null, false);
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
  const A = b.addBasicGate("input");
  const B = b.addBasicGate("input");
  const comp = b.addCompositeGate("half-adder", halfAdderCircuitData());
  const sum = b.addBasicGate("output");
  const carry = b.addBasicGate("output");

  b.connectGates(A, comp, 0, null, false);
  b.connectGates(B, comp, 1, null, false);
  b.connectGates(comp, sum, 0, 0, false);
  b.connectGates(comp, carry, 0, 1, false);

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
    A.push(b.addBasicGate("input"));
    B.push(b.addBasicGate("input"));
  }
  const Cin = b.addBasicGate("input");

  const S = [];
  let prevCarry = Cin;

  for (let i = 0; i < bits; i++) {
    const ha1 = b.addCompositeGate("ha", halfAdderCircuitData(false));
    b.connectGates(A[i], ha1, 0, null, false);
    b.connectGates(B[i], ha1, 1, null, false);

    const ha2 = b.addCompositeGate("ha", halfAdderCircuitData(false));
    b.connectGates(ha1, ha2, 0, 0, false);
    b.connectGates(prevCarry, ha2, 1, null, false);

    const sum = b.addBasicGate("output");
    b.connectGates(ha2, sum, 0, 0, false);
    S.push(sum);

    const or = b.addBasicGate("or");
    b.connectGates(ha1, or, 0, 1, false);
    b.connectGates(ha2, or, 1, 1, false);
    prevCarry = or;
  }

  const Cout = b.addBasicGate("output");
  b.connectGates(prevCarry, Cout, 0, null, false);
  if (withWasm) b.buildTypedData();

  return { builder: b, A, B, Cin, S, Cout };
}

/**
 * Builds a nested composite gate: double-NOT (identity).
 */
function buildNestedComposite(withWasm = true) {
  // Middle layer: two NOT composites chained
  const middle = new CircuitBuilder();
  const mA = middle.addBasicGate("input");
  const not1 = middle.addCompositeGate("not", notCircuitData());
  const not2 = middle.addCompositeGate("not", notCircuitData());
  const mQ = middle.addBasicGate("output");

  middle.connectGates(mA, not1, 0, null, false);
  middle.connectGates(not1, not2, 0, 0, false);
  middle.connectGates(not2, mQ, 0, 0, false);
  middle.buildFanout();

  const doubleNotData = {
    builder: middle,
    inputOrder: [mA.id],
    outputOrder: [mQ.id],
  };

  // Outer circuit using the nested composite
  const b = new CircuitBuilder();
  const A = b.addBasicGate("input");
  const comp = b.addCompositeGate("double-not", doubleNotData);
  const out = b.addBasicGate("output");

  b.connectGates(A, comp, 0, null, false);
  b.connectGates(comp, out, 0, 0, false);

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