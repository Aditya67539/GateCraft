import { run, bench, group } from "mitata";
import { writeFileSync } from "node:fs";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";

// ─── Builder Helpers ─────────────────────────────────────────────────────────

function buildANDGate() {
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
  return { builder: b, A, B, out };
}

function buildNOTGate() {
  const b = new CircuitBuilder();
  const A = b.addBasicGate("input");
  const gate = b.addBasicGate("not");
  const out = b.addBasicGate("output");
  b.connectGates(A, gate);
  b.connectGates(gate, out);
  A.setValue(true);
  return { builder: b, A, out };
}

function buildXORGate() {
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
  return { builder: b, A, B, out };
}

function buildHalfAdder() {
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

  return { builder: b, A, B, sum, carry };
}

function buildFullAdder() {
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

  return { builder: b, A, B, C, sum, carry };
}

function buildSRLatch() {
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

  return { builder: b, S, R, Q, notQ };
}

function buildDLatch() {
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

  return { builder: b, D, E, Q, notQ };
}

/**
 * Builds a 4-bit ripple-carry adder from four full-adder stages.
 * Uses 20 logic gates + 8 inputs + 5 outputs = 33 gates, ~52 wires.
 */
function buildRippleCarryAdder4Bit() {
  const b = new CircuitBuilder();

  const A = [];
  const B = [];
  for (let i = 0; i < 4; i++) {
    A.push(b.addBasicGate("input"));
    B.push(b.addBasicGate("input"));
  }
  const Cin = b.addBasicGate("input");

  const S = [];
  let prevCarry = Cin;

  for (let i = 0; i < 4; i++) {
    const xor = b.addBasicGate("xor");
    const and1 = b.addBasicGate("and");
    const and2 = b.addBasicGate("and");
    const or1 = b.addBasicGate("or");
    const or2 = b.addBasicGate("or");
    const sum = b.addBasicGate("output");

    b.connectGates(A[i], xor);
    b.connectGates(B[i], xor);
    b.connectGates(prevCarry, xor);
    b.connectGates(xor, sum);

    b.connectGates(A[i], and1);
    b.connectGates(B[i], and1);

    b.connectGates(A[i], or1);
    b.connectGates(B[i], or1);

    b.connectGates(and1, or2);
    b.connectGates(or1, and2);
    b.connectGates(prevCarry, and2);
    b.connectGates(and2, or2);

    S.push(sum);

    // or2 is the carry-out for this stage; use a gate node as carry wire
    prevCarry = or2;
  }

  const Cout = b.addBasicGate("output");
  b.connectGates(prevCarry, Cout);

  return { builder: b, A, B, Cin, S, Cout };
}

/**
 * Builds a wide fan-out circuit: one input driving N OR gates.
 */
function buildWideFanout(width) {
  const b = new CircuitBuilder();
  const src = b.addBasicGate("input");
  src.setValue(true);

  for (let i = 0; i < width; i++) {
    const gate = b.addBasicGate("or");
    const out = b.addBasicGate("output");
    b.connectGates(src, gate);
    b.connectGates(gate, out);
  }

  return { builder: b, src };
}

/**
 * Builds a deep chain: input → NOT → NOT → ... → output (N stages).
 */
function buildDeepChain(depth) {
  const b = new CircuitBuilder();
  const src = b.addBasicGate("input");
  src.setValue(true);

  let prev = src;
  for (let i = 0; i < depth; i++) {
    const not = b.addBasicGate("not");
    b.connectGates(prev, not);
    prev = not;
  }

  const out = b.addBasicGate("output");
  b.connectGates(prev, out);

  return { builder: b, src, out };
}


// ─── Benchmarks ──────────────────────────────────────────────────────────────

// Pre-build circuits (shared across iterations, same as before)
const andCircuit = buildANDGate();
const notCircuit = buildNOTGate();
const xorCircuit = buildXORGate();
const halfAdder = buildHalfAdder();
const fullAdder = buildFullAdder();
const rca4 = buildRippleCarryAdder4Bit();
const srLatch = buildSRLatch();
const dLatch = buildDLatch();
const srLatchSettle = buildSRLatch();
const fullAdderSettle = buildFullAdder();
const fan16 = buildWideFanout(16);
const fan64 = buildWideFanout(64);
const fan256 = buildWideFanout(256);
const chain16 = buildDeepChain(16);
const chain64 = buildDeepChain(64);
const chain256 = buildDeepChain(256);

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
  bench("Half Adder", () => {
    halfAdder.A.setValue(true);
    halfAdder.B.setValue(false);
    halfAdder.builder.evaluate();
  });

  bench("Full Adder", () => {
    fullAdder.A.setValue(true);
    fullAdder.B.setValue(true);
    fullAdder.C.setValue(false);
    fullAdder.builder.evaluate();
  });

  bench("4-bit Ripple-Carry Adder", () => {
    rca4.A[0].setValue(true);
    rca4.A[1].setValue(false);
    rca4.A[2].setValue(true);
    rca4.A[3].setValue(true);
    rca4.B[0].setValue(true);
    rca4.B[1].setValue(true);
    rca4.B[2].setValue(false);
    rca4.B[3].setValue(false);
    rca4.Cin.setValue(false);
    rca4.builder.evaluate();
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
group("Circuit Construction", () => {
  bench("build Half Adder", () => {
    buildHalfAdder();
  });

  bench("build Full Adder", () => {
    buildFullAdder();
  });

  bench("build SR Latch", () => {
    buildSRLatch();
  });

  bench("build 4-bit Ripple-Carry Adder", () => {
    buildRippleCarryAdder4Bit();
  });
});


// Scaling: fan-out and depth
group("Scaling — Fan-out", () => {
  bench("16-wide fan-out evaluate", () => {
    fan16.builder.evaluate();
  });

  bench("64-wide fan-out evaluate", () => {
    fan64.builder.evaluate();
  });

  bench("256-wide fan-out evaluate", () => {
    fan256.builder.evaluate();
  });
});

group("Scaling — Chain Depth", () => {
  bench("16-deep NOT chain evaluate", () => {
    chain16.builder.evaluate();
  });

  bench("64-deep NOT chain evaluate", () => {
    chain64.builder.evaluate();
  });

  bench("256-deep NOT chain evaluate", () => {
    chain256.builder.evaluate();
  });
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