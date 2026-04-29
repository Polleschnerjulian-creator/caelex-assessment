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
 *   DATABASE_URL=<url> npx tsx scripts/seed-pharos-norms.ts          # alle Module
 *   DATABASE_URL=<url> npx tsx scripts/seed-pharos-norms.ts --only=eu-space-act
 *
 * Output: Counter pro Modul (inserted / updated / unchanged / drifted).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// CLI-Bypass: das norm-anchor.ts-Modul importiert "server-only" und
// würde in einem reinen tsx/CLI-Kontext werfen. Wir setzen den Marker
// vor dem Import, damit der Guard uns durchlässt.
process.env.NEXT_RUNTIME = process.env.NEXT_RUNTIME || "nodejs";

import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { articles } from "@/data/articles";

const prisma = new PrismaClient();

function computeContentHash(text: string): string {
  return (
    "sha256:" +
    createHash("sha256").update(text, "utf8").digest("hex").slice(0, 32)
  );
}

interface NormIngestInput {
  id: string;
  jurisdiction: string;
  instrument: string;
  unit: string;
  number: string;
  title?: string;
  text: string;
  sourceUrl?: string;
  effectiveFrom?: Date;
  language?: string;
}

async function upsertNormAnchor(input: NormIngestInput): Promise<{
  inserted: boolean;
  drifted: boolean;
  oldHash?: string;
  newHash: string;
}> {
  const newHash = computeContentHash(input.text);
  const existing = await prisma.normAnchor.findUnique({
    where: { id: input.id },
    select: { contentHash: true },
  });
  if (existing && existing.contentHash === newHash) {
    return { inserted: false, drifted: false, newHash };
  }
  await prisma.normAnchor.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      jurisdiction: input.jurisdiction,
      instrument: input.instrument,
      unit: input.unit,
      number: input.number,
      title: input.title ?? null,
      text: input.text,
      contentHash: newHash,
      sourceUrl: input.sourceUrl ?? null,
      effectiveFrom: input.effectiveFrom ?? null,
      language: input.language ?? "en",
    },
    update: {
      text: input.text,
      contentHash: newHash,
      title: input.title ?? null,
      sourceUrl: input.sourceUrl ?? null,
    },
  });
  return {
    inserted: !existing,
    drifted: !!existing,
    oldHash: existing?.contentHash,
    newHash,
  };
}

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
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
