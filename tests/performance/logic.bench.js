import { run, bench, group } from "mitata";
import { writeFileSync } from "node:fs";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";

// ─── Builder Helpers ─────────────────────────────────────────────────────────

function buildANDGate(withWasm = true) {
  const b = new CircuitBuilder();
  const A = b.addBasicGate("input");
  const B = b.addBasicGate("input");
  const gate = b.addBasicGate("and");
  const out = b.addBasicGate("output");
  b.connectGates(A, gate);
  b.connectGates(B, gate);
  b.connectGates(gate, out);
  A.setValue(true);
  B.setValue(true);
  if (withWasm) b.buildTypedData();
  return { builder: b, A, B, out };
}

function buildNOTGate(withWasm = true) {
  const b = new CircuitBuilder();
  const A = b.addBasicGate("input");
  const gate = b.addBasicGate("not");
  const out = b.addBasicGate("output");
  b.connectGates(A, gate);
  b.connectGates(gate, out);
  A.setValue(true);
  if (withWasm) b.buildTypedData();
  return { builder: b, A, out };
}

function buildXORGate(withWasm = true) {
  const b = new CircuitBuilder();
  const A = b.addBasicGate("input");
  const B = b.addBasicGate("input");
  const gate = b.addBasicGate("xor");
  const out = b.addBasicGate("output");
  b.connectGates(A, gate);
  b.connectGates(B, gate);
  b.connectGates(gate, out);
  A.setValue(true);
  B.setValue(false);
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

  b.connectGates(A, xor);
  b.connectGates(B, xor);
  b.connectGates(xor, sum);
  b.connectGates(A, and);
  b.connectGates(B, and);
  b.connectGates(and, carry);

  if (withWasm) b.buildTypedData();
  return { builder: b, A, B, sum, carry };
}

function buildFullAdder(withWasm = true) {
  const b = new CircuitBuilder();
  const A = b.addBasicGate("input");
  const B = b.addBasicGate("input");
  const C = b.addBasicGate("input");

  const xor = b.addBasicGate("xor");
  const and1 = b.addBasicGate("and");
  const and2 = b.addBasicGate("and");
  const or1 = b.addBasicGate("or");
  const or2 = b.addBasicGate("or");

  const sum = b.addBasicGate("output");
  const carry = b.addBasicGate("output");

  b.connectGates(A, xor);
  b.connectGates(B, xor);
  b.connectGates(C, xor);
  b.connectGates(xor, sum);
  b.connectGates(A, and1);
  b.connectGates(B, and1);
  b.connectGates(A, or1);
  b.connectGates(B, or1);
  b.connectGates(and1, or2);
  b.connectGates(or1, and2);
  b.connectGates(C, and2);
  b.connectGates(and2, or2);
  b.connectGates(or2, carry);

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

  b.connectGates(S, notS);
  b.connectGates(R, notR);
  b.connectGates(notS, nand1);
  b.connectGates(notR, nand2);
  b.connectGates(nand1, nand2);
  b.connectGates(nand2, nand1);
  b.connectGates(nand1, Q);
  b.connectGates(nand2, notQ);

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

  b.connectGates(D, notD);
  b.connectGates(notD, and1);
  b.connectGates(E, and1);
  b.connectGates(E, and2);
  b.connectGates(D, and2);
  b.connectGates(and1, nor1);
  b.connectGates(nor2, nor1);
  b.connectGates(nor1, nor2);
  b.connectGates(and2, nor2);
  b.connectGates(nor1, Q);
  b.connectGates(nor2, notQ);

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
    const xor = b.addBasicGate("xor");
    const and1 = b.addBasicGate("and");
    const and2 = b.addBasicGate("and");
    const or1 = b.addBasicGate("or");
    const or2 = b.addBasicGate("or");
    const sum = b.addBasicGate("output");

    b.connectGates(A[i], xor, null, null, false);
    b.connectGates(B[i], xor, null, null, false);
    b.connectGates(prevCarry, xor, null, null, false);
    b.connectGates(xor, sum, null, null, false);

    b.connectGates(A[i], and1, null, null, false);
    b.connectGates(B[i], and1, null, null, false);

    b.connectGates(A[i], or1, null, null, false);
    b.connectGates(B[i], or1, null, null, false);

    b.connectGates(and1, or2, null, null, false);
    b.connectGates(or1, and2, null, null, false);
    b.connectGates(prevCarry, and2, null, null, false);
    b.connectGates(and2, or2, null, null, false);

    S.push(sum);

    prevCarry = or2;
  }

  const Cout = b.addBasicGate("output");
  b.connectGates(prevCarry, Cout, null, null, false);
  if (withWasm) b.buildTypedData();

  return { builder: b, A, B, Cin, S, Cout };
}

/**
 * Builds a wide fan-out circuit: one input driving N OR gates.
 */
function buildWideFanout(width, withWasm = true) {
  const b = new CircuitBuilder();
  const src = b.addBasicGate("input");
  src.setValue(true);

  for (let i = 0; i < width; i++) {
    const gate = b.addBasicGate("or");
    const out = b.addBasicGate("output");
    b.connectGates(src, gate, null, null, false);
    b.connectGates(gate, out, null, null, false);
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
  src.setValue(true);

  let prev = src;
  for (let i = 0; i < depth; i++) {
    const not = b.addBasicGate("not");
    b.connectGates(prev, not, null, null, false);
    prev = not;
  }

  const out = b.addBasicGate("output");
  b.connectGates(prev, out, null, null, false);

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

  inner.connectGates(A, xor, null, null, false);
  inner.connectGates(B, xor, null, null, false);
  inner.connectGates(xor, sum, null, null, false);
  inner.connectGates(A, and, null, null, false);
  inner.connectGates(B, and, null, null, false);
  inner.connectGates(and, carry, null, null, false);
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

  inner.connectGates(A, not, null, null, false);
  inner.connectGates(not, Q, null, null, false);
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

  b.connectGates(A, comp, null, 0);
  b.connectGates(B, comp, null, 1);
  b.connectGates(comp, sum, 0);
  b.connectGates(comp, carry, 1);

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
    b.connectGates(A[i], ha1, null, 0, false);
    b.connectGates(B[i], ha1, null, 1, false);

    const ha2 = b.addCompositeGate("ha", halfAdderCircuitData(false));
    b.connectGates(ha1, ha2, 0, 0, false);
    b.connectGates(prevCarry, ha2, null, 1, false);

    const sum = b.addBasicGate("output");
    b.connectGates(ha2, sum, 0, null, false);
    S.push(sum);

    const or = b.addBasicGate("or");
    b.connectGates(ha1, or, 1, null, false);
    b.connectGates(ha2, or, 1, null, false);
    prevCarry = or;
  }

  const Cout = b.addBasicGate("output");
  b.connectGates(prevCarry, Cout, null, null, false);
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

  middle.connectGates(mA, not1, null, 0, false);
  middle.connectGates(not1, not2, 0, 0, false);
  middle.connectGates(not2, mQ, 0, null, false);
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

  b.connectGates(A, comp, null, 0);
  b.connectGates(comp, out, 0);

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
  bench("AND gate", () => {
    andCircuit.builder.evaluate();
  });

  bench("NOT gate", () => {
    notCircuit.builder.evaluate();
  });

  bench("XOR gate", () => {
    xorCircuit.builder.evaluate();
  });
});


// Combinational circuit evaluation
group("Combinational Circuit Evaluation", () => {
  let haToggle = false;
  bench("warmup", () => { let w = false; for (let i = 0; i < 1000; i++) { w = !w; halfAdder.A.setValue(w); halfAdder.B.setValue(false); halfAdder.builder.evaluate(); } });

  bench("Half Adder", () => {
    haToggle = !haToggle;
    halfAdder.A.setValue(haToggle);
    halfAdder.B.setValue(false);
    halfAdder.builder.evaluate();
  });

  let faToggle = false;
  bench("Full Adder", () => {
    faToggle = !faToggle;
    fullAdder.A.setValue(faToggle);
    fullAdder.B.setValue(true);
    fullAdder.C.setValue(false);
    fullAdder.builder.evaluate();
  });

  let rca4Toggle = false;
  bench("4-bit Ripple-Carry Adder", () => {
    rca4Toggle = !rca4Toggle;
    rca4.A[0].setValue(rca4Toggle);
    rca4.A[1].setValue(false);
    rca4.builder.evaluate();
  });

  let rca16Toggle = false;
  bench("16-bit Ripple-Carry Adder", () => {
    rca16Toggle = !rca16Toggle;
    rca16.A[0].setValue(rca16Toggle);
    rca16.A[15].setValue(false);
    rca16.builder.evaluate();
  });

  let rca32Toggle = false;
  bench("32-bit Ripple-Carry Adder", () => {
    rca32Toggle = !rca32Toggle;
    rca32.A[0].setValue(rca32Toggle);
    rca32.A[31].setValue(false);
    rca32.builder.evaluate();
  });
});


// Sequential circuit evaluation
group("Sequential Circuit Evaluation", () => {
  bench("SR Latch", () => {
    srLatch.builder.evaluate();
  });

  bench("SR Latch — Set then Hold", () => {
    srLatch.S.setValue(true);
    srLatch.R.setValue(false);
    srLatch.builder.evaluate();
    srLatch.S.setValue(false);
    srLatch.builder.evaluate();
  });

  bench("D Latch", () => {
    dLatch.builder.evaluate();
  });

  bench("D Latch — Write then Hold", () => {
    dLatch.E.setValue(true);
    dLatch.D.setValue(true);
    dLatch.builder.evaluate();
    dLatch.E.setValue(false);
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
  let fan16Toggle = false;
  bench("16-wide fan-out evaluate", () => {
    fan16Toggle = !fan16Toggle;
    fan16.src.setValue(fan16Toggle);
    fan16.builder.evaluate();
  });

  let fan64Toggle = false;
  bench("64-wide fan-out evaluate", () => {
    fan64Toggle = !fan64Toggle;
    fan64.src.setValue(fan64Toggle);
    fan64.builder.evaluate();
  });

  let fan256Toggle = false;
  bench("256-wide fan-out evaluate", () => {
    fan256Toggle = !fan256Toggle;
    fan256.src.setValue(fan256Toggle);
    fan256.builder.evaluate();
  });
  let fan1024Toggle = false;
  bench("1024-wide fan-out evaluate", () => {
    fan1024Toggle = !fan1024Toggle;
    fan1024.src.setValue(fan1024Toggle);
    fan1024.builder.evaluate();
  });
  let fan4096Toggle = false;
  bench("4096-wide fan-out evaluate", () => {
    fan4096Toggle = !fan4096Toggle;
    fan4096.src.setValue(fan4096Toggle);
    fan4096.builder.evaluate();
  });
});

group("Scaling — Chain Depth", () => {
  let chain16Toggle = false;
  bench("16-deep NOT chain evaluate", () => {
    chain16Toggle = !chain16Toggle;
    chain16.src.setValue(chain16Toggle);
    chain16.builder.evaluate();
  });

  let chain64Toggle = false;
  bench("64-deep NOT chain evaluate", () => {
    chain64Toggle = !chain64Toggle;
    chain64.src.setValue(chain64Toggle);
    chain64.builder.evaluate();
  });

  let chain256Toggle = false;
  bench("256-deep NOT chain evaluate", () => {
    chain256Toggle = !chain256Toggle;
    chain256.src.setValue(chain256Toggle);
    chain256.builder.evaluate();
  });
  let chain1024Toggle = false;
  bench("1024-deep NOT chain evaluate", () => {
    chain1024Toggle = !chain1024Toggle;
    chain1024.src.setValue(chain1024Toggle);
    chain1024.builder.evaluate();
  });
  let chain4096Toggle = false;
  bench("4096-deep NOT chain evaluate", () => {
    chain4096Toggle = !chain4096Toggle;
    chain4096.src.setValue(chain4096Toggle);
    chain4096.builder.evaluate();
  });
});


// Composite gate evaluation
group("Composite Gate Evaluation", () => {
  bench("Composite Half Adder", () => {
    compositeHA.A.setValue(true);
    compositeHA.B.setValue(false);
    compositeHA.builder.evaluate();
  });

  bench("Composite 4-bit Ripple-Carry Adder", () => {
    compositeRCA4.A[0].setValue(true);
    compositeRCA4.A[1].setValue(false);
    compositeRCA4.A[2].setValue(true);
    compositeRCA4.A[3].setValue(true);
    compositeRCA4.B[0].setValue(true);
    compositeRCA4.B[1].setValue(true);
    compositeRCA4.B[2].setValue(false);
    compositeRCA4.B[3].setValue(false);
    compositeRCA4.Cin.setValue(false);
    compositeRCA4.builder.evaluate();
  });

  bench("Nested Composite (double-NOT)", () => {
    nestedComp.A.setValue(true);
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