#!/usr/bin/env node

/**
 * compare-benchmarks.js
 *
 * Reads two benchmark JSON files (baseline vs current) and prints a
 * regression table.  Exits with code 1 if any benchmark regressed
 * beyond the configurable threshold (default 5 %).
 *
 * Usage:
 *   node scripts/compare-benchmarks.js <baseline.json> <current.json> [threshold%]
 *
 * Example:
 *   node scripts/compare-benchmarks.js baseline.json bench-results.json 5
 */

import { readFileSync } from "node:fs";

// ─── CLI args ────────────────────────────────────────────────────────────────

const [baselinePath, currentPath, thresholdArg] = process.argv.slice(2);

if (!baselinePath || !currentPath) {
  console.error(
    "Usage: node scripts/compare-benchmarks.js <baseline.json> <current.json> [threshold%]"
  );
  process.exit(2);
}

const THRESHOLD_PCT = Number(thresholdArg ?? 5);

// ─── Load files ──────────────────────────────────────────────────────────────

function loadJSON(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch (err) {
    console.error(`Error reading ${path}: ${err.message}`);
    process.exit(2);
  }
}

const baseline = loadJSON(baselinePath);
const current = loadJSON(currentPath);

// ─── Compare ─────────────────────────────────────────────────────────────────

/** Pretty-print nanoseconds with appropriate unit. */
function fmtNs(ns) {
  if (ns < 1_000) return `${ns.toFixed(2)} ns`;
  if (ns < 1_000_000) return `${(ns / 1_000).toFixed(2)} µs`;
  return `${(ns / 1_000_000).toFixed(2)} ms`;
}

const allNames = new Set([
  ...Object.keys(baseline.benchmarks),
  ...Object.keys(current.benchmarks),
]);

// Build rows
const rows = [];
let hasRegression = false;

for (const name of [...allNames].sort()) {
  const base = baseline.benchmarks[name];
  const curr = current.benchmarks[name];

  if (!base) {
    rows.push({ name, baseAvg: "—", currAvg: fmtNs(curr.avg_ns), delta: "NEW", status: "🆕" });
    continue;
  }
  if (!curr) {
    rows.push({ name, baseAvg: fmtNs(base.avg_ns), currAvg: "—", delta: "REMOVED", status: "🗑️" });
    continue;
  }

  const deltaPct = ((curr.avg_ns - base.avg_ns) / base.avg_ns) * 100;
  const sign = deltaPct >= 0 ? "+" : "";
  const deltaStr = `${sign}${deltaPct.toFixed(2)}%`;

  let status = "✅";
  if (deltaPct > THRESHOLD_PCT) {
    status = "🔴 REGRESSED";
    hasRegression = true;
  } else if (deltaPct < -THRESHOLD_PCT) {
    status = "🟢 FASTER";
  }

  rows.push({
    name,
    baseAvg: fmtNs(base.avg_ns),
    currAvg: fmtNs(curr.avg_ns),
    delta: deltaStr,
    status,
  });
}

// ─── Print table ─────────────────────────────────────────────────────────────

// Compute column widths
const cols = {
  name: "Benchmark",
  baseAvg: "Baseline",
  currAvg: "Current",
  delta: "Δ%",
  status: "Status",
};

const widths = {};
for (const key of Object.keys(cols)) {
  widths[key] = cols[key].length;
  for (const row of rows) {
    widths[key] = Math.max(widths[key], String(row[key]).length);
  }
}

function pad(str, len) {
  return String(str).padEnd(len);
}

const sep = Object.values(widths)
  .map((w) => "─".repeat(w + 2))
  .join("┼");

console.log();
console.log(
  `  Comparing: ${baselinePath} → ${currentPath}  (threshold: ${THRESHOLD_PCT}%)`
);
console.log();

// Header
console.log(
  "  " +
    Object.keys(cols)
      .map((k) => pad(cols[k], widths[k]))
      .join(" │ ")
);
console.log("  " + sep);

// Rows
for (const row of rows) {
  console.log(
    "  " +
      Object.keys(cols)
        .map((k) => pad(row[k], widths[k]))
        .join(" │ ")
  );
}

console.log();

// ─── Exit ────────────────────────────────────────────────────────────────────

if (hasRegression) {
  console.error(
    `❌ ${rows.filter((r) => r.status.includes("REGRESSED")).length} benchmark(s) regressed beyond ${THRESHOLD_PCT}% threshold.`
  );
  process.exit(1);
} else {
  console.log("✅ No regressions detected.");
  process.exit(0);
}
