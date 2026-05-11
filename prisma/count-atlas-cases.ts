/**
 * One-shot sanity check for the merged ATLAS_CASES corpus. Confirms that
 * the research bundle (cases-additions-research-2026-05.ts) is now part
 * of the canonical ATLAS_CASES array and that every consumer (helpers
 * in legal-cases/index.ts) sees the merged total.
 *
 * Run:
 *   npx tsx prisma/count-atlas-cases.ts
 */

import {
  ATLAS_CASES,
  ATLAS_CASES_COUNT,
  CASES_BY_JURISDICTION,
  CASES_BY_FORUM,
  getCaseById,
} from "../src/data/legal-cases";

console.log("\n┌─ ATLAS_CASES merge sanity check ─────────────────┐");
console.log(`  ATLAS_CASES.length    = ${ATLAS_CASES.length}`);
console.log(`  ATLAS_CASES_COUNT     = ${ATLAS_CASES_COUNT}`);
console.log(`  expected              = 55  (44 base + 11 bundle)`);
console.log(
  `  match                 = ${ATLAS_CASES.length === 55 ? "✓" : "✗"}`,
);
console.log("");
console.log("  Last 11 entries (the research bundle):");
for (const c of ATLAS_CASES.slice(-11)) {
  console.log(
    `    ${c.id.padEnd(35)} · ${c.jurisdiction}  ${c.title.slice(0, 60)}`,
  );
}
console.log("");
console.log("  Spot-checks via getCaseById:");
const checks = [
  "CASE-IN-SC-DEVAS-2022",
  "CASE-SEC-MOMENTUS-2021",
  "CASE-ONEWEB-V-ROSCOSMOS-2022",
];
for (const id of checks) {
  const hit = getCaseById(id);
  console.log(`    ${id.padEnd(35)} ${hit ? "✓ found" : "✗ MISSING"}`);
}
console.log("");
console.log("  By jurisdiction (top 5):");
for (const [j, n] of Object.entries(CASES_BY_JURISDICTION)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)) {
  console.log(`    ${j.padEnd(8)} ${n}`);
}
console.log("");
console.log("  By forum (top 5):");
for (const [f, n] of Object.entries(CASES_BY_FORUM)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)) {
  console.log(`    ${f.padEnd(25)} ${n}`);
}
console.log("└──────────────────────────────────────────────────┘\n");
