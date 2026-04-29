/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * scripts/seed-pharos-norms.ts
 *
 * Bulk-Loader für NormAnchor — liest existierende Caelex-Regulatory-
 * Daten (articles.ts, nis2-requirements.ts) und legt sie als
 * NormAnchor-Rows ab. Idempotent: bei zweitem Lauf werden nur
 * geänderte Inhalte aktualisiert (contentHash-Diff).
 *
 * Usage:
 *   npx tsx scripts/seed-pharos-norms.ts          # alle Module
 *   npx tsx scripts/seed-pharos-norms.ts --only=eu-space-act
 *
 * Output: Counter pro Modul (inserted / updated / unchanged / drifted).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { upsertNormAnchor } from "@/lib/pharos/norm-anchor";
import { articles } from "@/data/articles";

interface SeedStats {
  module: string;
  inserted: number;
  updated: number;
  unchanged: number;
  drifted: number;
  errors: number;
}

async function seedEuSpaceAct(): Promise<SeedStats> {
  const stats: SeedStats = {
    module: "EU_SPACE_ACT",
    inserted: 0,
    updated: 0,
    unchanged: 0,
    drifted: 0,
    errors: 0,
  };

  for (const art of articles) {
    try {
      // Build the anchor text from the structured fields. Format
      // matters — the same canonical form must be used by every
      // consumer that recomputes the contentHash.
      const text = [
        `EU Space Act Article ${art.number} — ${art.title}`,
        ``,
        `${art.titleGroup} · ${art.titleName}`,
        ``,
        `Summary: ${art.summary}`,
        ``,
        `Operator action: ${art.operatorAction}`,
        ``,
        `Applies to: ${art.appliesTo.join(", ")}`,
        `Compliance type: ${art.complianceType}`,
        `Module: ${art.module}`,
        ...(art.exemptions ? [``, `Exemptions: ${art.exemptions}`] : []),
      ].join("\n");

      const id = `EUSPACEACT.ART.${art.number}`;
      const result = await upsertNormAnchor({
        id,
        jurisdiction: "EU",
        instrument: "EU_SPACE_ACT",
        unit: "ARTICLE",
        number: art.number,
        title: art.title,
        text,
        sourceUrl: `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52025PC0335#art_${art.number}`,
        language: "en",
      });

      if (result.inserted) stats.inserted++;
      else if (result.drifted) {
        stats.updated++;
        stats.drifted++;
      } else stats.unchanged++;
    } catch (err) {
      stats.errors++;
      console.error(
        `  ✗ ${art.number}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  return stats;
}

// ─── NIS2 stub — schema for nis2-requirements.ts varies; we wire it
// up minimally to demonstrate the pattern. Full mapping is a Phase 2
// task once the data shape is finalised.

async function seedNis2(): Promise<SeedStats | null> {
  // Lazy-load so the script doesn't fail if the file's shape changes.
  let nis2Mod: typeof import("@/data/nis2-requirements");
  try {
    nis2Mod = await import("@/data/nis2-requirements");
  } catch (err) {
    console.error(
      `  · NIS2 module not loadable: ${err instanceof Error ? err.message : err}`,
    );
    return null;
  }

  const stats: SeedStats = {
    module: "NIS2",
    inserted: 0,
    updated: 0,
    unchanged: 0,
    drifted: 0,
    errors: 0,
  };

  // Try a few common export names; tolerate variation.
  const reqs =
    (nis2Mod as Record<string, unknown>).nis2Requirements ??
    (nis2Mod as Record<string, unknown>).requirements ??
    (nis2Mod as Record<string, unknown>).default;
  if (!Array.isArray(reqs)) {
    console.error(`  · NIS2 export shape unrecognised — skipping`);
    return null;
  }

  for (const r of reqs as Array<Record<string, unknown>>) {
    try {
      const articleNum = String(r.article ?? r.number ?? r.id ?? "?");
      const title = String(r.title ?? r.name ?? "");
      const summary = String(r.summary ?? r.description ?? r.text ?? "");
      if (!articleNum || articleNum === "?" || !summary) continue;

      const id = `NIS2.ART.${articleNum}`;
      const text = [
        `NIS2 Directive Article ${articleNum} — ${title}`,
        ``,
        summary,
      ].join("\n");

      const result = await upsertNormAnchor({
        id,
        jurisdiction: "EU",
        instrument: "NIS2",
        unit: "ARTICLE",
        number: articleNum,
        title,
        text,
        sourceUrl:
          "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555",
        language: "en",
      });

      if (result.inserted) stats.inserted++;
      else if (result.drifted) {
        stats.updated++;
        stats.drifted++;
      } else stats.unchanged++;
    } catch (err) {
      stats.errors++;
    }
  }

  return stats;
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg?.split("=")[1];

  console.log("Pharos NormAnchor Seeder");
  console.log("─".repeat(50));

  const allStats: SeedStats[] = [];

  if (!only || only === "eu-space-act") {
    console.log("\n→ EU Space Act articles");
    allStats.push(await seedEuSpaceAct());
  }
  if (!only || only === "nis2") {
    console.log("\n→ NIS2 requirements");
    const s = await seedNis2();
    if (s) allStats.push(s);
  }

  console.log("\n" + "─".repeat(50));
  console.log("Summary");
  console.log("─".repeat(50));
  for (const s of allStats) {
    console.log(
      `  ${s.module.padEnd(20)} ` +
        `inserted=${s.inserted}  updated=${s.updated}  ` +
        `unchanged=${s.unchanged}  drifted=${s.drifted}  errors=${s.errors}`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
