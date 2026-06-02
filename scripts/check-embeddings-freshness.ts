#!/usr/bin/env tsx
/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * scripts/check-embeddings-freshness.ts
 *
 * Checks whether src/data/atlas/embeddings.json covers the full Atlas
 * corpus as defined by the data sources that atlas-embed.ts iterates.
 *
 * ID-derivation mirrors atlas-embed.ts exactly:
 *   source:${s.id}           — ALL_SOURCES
 *   authority:${a.id}        — ALL_AUTHORITIES
 *   profile:${p.jurisdiction}— ALL_LANDING_RIGHTS_PROFILES
 *   case-study:${c.id}       — ALL_CASE_STUDIES
 *   conduct:${c.id}          — ALL_CONDUCT_CONDITIONS
 *   case:${c.id}             — ATLAS_CASES
 *
 * Exits:
 *   0 — fully up to date (all corpus IDs embedded)
 *   1 — stale (missing embeddings detected)
 *
 * Run via: `npm run check:embeddings`
 *
 * Wiring this as a CI step (non-blocking / `continue-on-error: true`) is a
 * follow-up to be added to the project's real CI workflow. That workflow does
 * not live on the `main` branch, so no ci.yml is injected here. A maintainer
 * should add a step that calls `npm run check:embeddings` with
 * `continue-on-error: true` once the real workflow is available.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ALL_SOURCES, ALL_AUTHORITIES } from "@/data/legal-sources";
import {
  ALL_LANDING_RIGHTS_PROFILES,
  ALL_CASE_STUDIES,
  ALL_CONDUCT_CONDITIONS,
} from "@/data/landing-rights";
import { ATLAS_CASES } from "@/data/legal-cases";
import { computeEmbeddingGap } from "@/lib/atlas/embeddings-freshness";

// ─── Derive expected IDs (same logic as atlas-embed.ts) ────────────

const expectedIds: string[] = [
  ...ALL_SOURCES.map((s) => `source:${s.id}`),
  ...ALL_AUTHORITIES.map((a) => `authority:${a.id}`),
  ...ALL_LANDING_RIGHTS_PROFILES.map((p) => `profile:${p.jurisdiction}`),
  ...ALL_CASE_STUDIES.map((c) => `case-study:${c.id}`),
  ...ALL_CONDUCT_CONDITIONS.map((c) => `conduct:${c.id}`),
  ...ATLAS_CASES.map((c) => `case:${c.id}`),
];

// ─── Load existing embeddings ───────────────────────────────────────

const EMBEDDINGS_PATH = join(
  process.cwd(),
  "src",
  "data",
  "atlas",
  "embeddings.json",
);

interface EmbeddingEntry {
  id: string;
}

async function main(): Promise<void> {
  let embeddedIds: string[] = [];
  try {
    const raw = await readFile(EMBEDDINGS_PATH, "utf8");
    const entries = JSON.parse(raw) as EmbeddingEntry[];
    embeddedIds = entries.map((e) => e.id);
  } catch (err) {
    console.warn(
      `[check-embeddings-freshness] WARNING: could not read ${EMBEDDINGS_PATH}: ${(err as Error).message}`,
    );
    console.warn(
      `[check-embeddings-freshness] Treating as 0 embeddings present.`,
    );
  }

  // ─── Compute gap ─────────────────────────────────────────────────

  const gap = computeEmbeddingGap(expectedIds, embeddedIds);

  // ─── Breakdown by entity type ─────────────────────────────────────

  const byType: Record<
    string,
    { expected: number; embedded: number; missing: number }
  > = {};
  for (const id of expectedIds) {
    const type = id.split(":")[0];
    if (!byType[type]) byType[type] = { expected: 0, embedded: 0, missing: 0 };
    byType[type].expected++;
  }
  const missingSet = new Set(
    gap.missingIds.length === gap.missing ? gap.missingIds : [],
  );
  // For full breakdown we need the complete missing set (not capped)
  const embeddedSet = new Set(embeddedIds);
  for (const id of expectedIds) {
    const type = id.split(":")[0];
    if (embeddedSet.has(id)) {
      byType[type].embedded++;
    } else {
      byType[type].missing++;
    }
  }

  // ─── Report ──────────────────────────────────────────────────────

  console.log("\n====================================================");
  console.log("  Atlas Embeddings Freshness Check");
  console.log("====================================================");
  console.log(`  Corpus total    : ${gap.total}`);
  console.log(`  Embedded        : ${gap.embedded}`);
  console.log(`  Missing         : ${gap.missing}`);
  console.log(
    `  Coverage        : ${((gap.embedded / gap.total) * 100).toFixed(1)}%`,
  );
  console.log("----------------------------------------------------");
  console.log("  By type:");
  for (const [type, counts] of Object.entries(byType).sort()) {
    const pct =
      counts.expected > 0
        ? ((counts.embedded / counts.expected) * 100).toFixed(0)
        : "n/a";
    const flag = counts.missing > 0 ? " ⚠" : " ✓";
    console.log(
      `    ${type.padEnd(14)} ${counts.embedded}/${counts.expected} (${pct}% covered)${flag}`,
    );
  }
  console.log("----------------------------------------------------");

  if (gap.missing > 0) {
    const preview = gap.missingIds.slice(0, 10).join(", ");
    const more = gap.missing > 10 ? ` … +${gap.missing - 10} more` : "";
    console.log(`  First missing IDs: ${preview}${more}`);
    console.log("----------------------------------------------------");
    console.log("  ACTION: Run `npm run atlas:embed` to regenerate.");
    console.log("  NOTE:   Requires Vercel AI Gateway credentials.");
    console.log("          This CI step is non-blocking (continue-on-error).");
    console.log("====================================================\n");
    process.exit(1);
  } else {
    console.log("  Status: FULLY UP TO DATE — all corpus IDs embedded.");
    console.log("====================================================\n");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("[check-embeddings-freshness] Fatal error:", err);
  process.exit(1);
});
