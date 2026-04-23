#!/usr/bin/env tsx
/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * scripts/atlas-embed.ts
 *
 * Build-time embedding pipeline for the Atlas semantic-search corpus.
 *
 * What it does:
 *   1. Walks every static Atlas entity (legal sources, authorities,
 *      landing-rights profiles, case studies, conduct conditions) and
 *      concatenates a multilingual document per item — English title
 *      and provisions plus German translations where they exist, plus
 *      jurisdiction and type metadata.
 *   2. SHA-256-hashes each doc to detect content changes.
 *   3. Diffs against the previous `src/data/atlas/embeddings.json` so
 *      only NEW or CHANGED items get re-embedded. Idempotent by design —
 *      a full re-run on unchanged content makes zero API calls.
 *   4. Calls the Vercel AI Gateway (`openai/text-embedding-3-small`,
 *      512 dimensions) in batches via `embedMany`.
 *   5. Writes the merged catalogue back to disk.
 *
 * Output shape (JSON):
 *   [
 *     {
 *       "id": "source:INT-OST-1967",
 *       "type": "source",
 *       "contentHash": "sha256…",
 *       "vector": [0.012, -0.034, …]          // 512 floats
 *     },
 *     …
 *   ]
 *
 * Authentication (Vercel AI Gateway — required):
 *   Preferred (zero-maintenance OIDC):
 *     vercel link
 *     vercel env pull .env.local   # provisions VERCEL_OIDC_TOKEN (~24h JWT)
 *   Alternative (CI or non-Vercel environments):
 *     AI_GATEWAY_API_KEY=<key>
 *
 *   All embedding calls route through the Vercel AI Gateway (auth,
 *   failover, spend tracking, audit logs). Direct provider keys are
 *   intentionally unsupported — they bypass gateway observability and
 *   per-user rate limits.
 *
 * Run:
 *   npm run atlas:embed
 *
 * Cost: ~$0.02 per ~1 M input tokens at text-embedding-3-small prices,
 * zero gateway markup. A full corpus embed is a couple of cents;
 * incremental runs are effectively free because unchanged items skip.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { embedMany } from "ai";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
  ALL_SOURCES,
  ALL_AUTHORITIES,
  type LegalSource,
  type Authority,
} from "@/data/legal-sources";
import {
  LEGAL_SOURCE_TRANSLATIONS_DE,
  AUTHORITY_TRANSLATIONS_DE,
} from "@/data/legal-sources/translations-de";
import {
  ALL_LANDING_RIGHTS_PROFILES,
  ALL_CASE_STUDIES,
  ALL_CONDUCT_CONDITIONS,
  type LandingRightsProfile,
  type CaseStudy,
  type ConductCondition,
} from "@/data/landing-rights";

// ─── Config ────────────────────────────────────────────────────────────

const OUTPUT_PATH = "src/data/atlas/embeddings.json";
const MODEL = "openai/text-embedding-3-small";
const DIMENSIONS = 512;
const BATCH_SIZE = 96; // OpenAI's hard ceiling is 2048 inputs/call but
// smaller batches cap worst-case latency per batch and keep one failure
// from poisoning a huge batch.
const MAX_PARALLEL = 4;

// ─── Types ─────────────────────────────────────────────────────────────

type EntityType = "source" | "authority" | "profile" | "case-study" | "conduct";

interface EmbeddingEntry {
  id: string;
  type: EntityType;
  contentHash: string;
  vector: number[];
}

interface Doc {
  id: string;
  type: EntityType;
  text: string;
}

// ─── Doc builders ──────────────────────────────────────────────────────
//
// Each builder produces a compact, information-dense representation of
// one entity. We optimise for matching intent over breadth: titles and
// key-provision summaries carry the semantic load; boilerplate (dates,
// URLs, references) is omitted so they don't dilute the vector.

function joinLines(parts: Array<string | undefined | null>): string {
  return parts.filter((x): x is string => !!x && x.trim() !== "").join("\n");
}

function buildSourceDoc(s: LegalSource): string {
  const en = joinLines([
    s.title_en,
    s.title_local,
    s.scope_description,
    s.compliance_areas.length
      ? `Areas: ${s.compliance_areas.join(", ")}`
      : null,
    s.key_provisions.map((p) => `${p.title}: ${p.summary}`).join("\n"),
  ]);
  const de = LEGAL_SOURCE_TRANSLATIONS_DE.get(s.id);
  const deText = de
    ? joinLines([
        de.title,
        de.scopeDescription,
        Object.values(de.provisions)
          .map((p) => `${p.title}: ${p.summary}`)
          .join("\n"),
      ])
    : "";
  return joinLines([
    `Jurisdiction: ${s.jurisdiction} • Type: ${s.type}`,
    en,
    deText,
  ]);
}

function buildAuthorityDoc(a: Authority): string {
  const de = AUTHORITY_TRANSLATIONS_DE.get(a.id);
  return joinLines([
    `Authority: ${a.name_en}${a.abbreviation ? ` (${a.abbreviation})` : ""}`,
    `Jurisdiction: ${a.jurisdiction}`,
    `Mandate: ${a.space_mandate}`,
    a.name_local && a.name_local !== a.name_en ? a.name_local : null,
    de ? `${de.name}\n${de.mandate}` : null,
  ]);
}

function buildProfileDoc(p: LandingRightsProfile): string {
  return joinLines([
    `Landing Rights — ${p.jurisdiction}`,
    p.overview.summary,
    `Regime: ${p.overview.regime_type}`,
    `Regulators: ${p.regulators.map((r) => `${r.name} (${r.abbreviation})`).join(", ")}`,
    p.legal_basis.length
      ? `Legal basis: ${p.legal_basis.map((lb) => lb.title).join("; ")}`
      : null,
  ]);
}

function buildCaseStudyDoc(c: CaseStudy): string {
  return joinLines([
    `Case Study: ${c.title}`,
    `Jurisdiction: ${c.jurisdiction} • Operator: ${c.operator}`,
    c.narrative,
  ]);
}

function buildConductDoc(c: ConductCondition): string {
  return joinLines([
    `Conduct Condition: ${c.title}`,
    `Jurisdiction: ${c.jurisdiction} • Type: ${c.type}`,
    c.requirement,
  ]);
}

// ─── Hashing ───────────────────────────────────────────────────────────

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const docs: Doc[] = [
    ...ALL_SOURCES.map<Doc>((s) => ({
      id: `source:${s.id}`,
      type: "source",
      text: buildSourceDoc(s),
    })),
    ...ALL_AUTHORITIES.map<Doc>((a) => ({
      id: `authority:${a.id}`,
      type: "authority",
      text: buildAuthorityDoc(a),
    })),
    ...ALL_LANDING_RIGHTS_PROFILES.map<Doc>((p) => ({
      id: `profile:${p.jurisdiction}`,
      type: "profile",
      text: buildProfileDoc(p),
    })),
    ...ALL_CASE_STUDIES.map<Doc>((c) => ({
      id: `case-study:${c.id}`,
      type: "case-study",
      text: buildCaseStudyDoc(c),
    })),
    ...ALL_CONDUCT_CONDITIONS.map<Doc>((c) => ({
      id: `conduct:${c.id}`,
      type: "conduct",
      text: buildConductDoc(c),
    })),
  ];

  // Load existing catalogue, key by id. When the hash matches, we
  // reuse the existing vector; when it diverges (content changed), the
  // doc goes into the to-embed queue and the old vector is dropped.
  const existingById = new Map<string, EmbeddingEntry>();
  try {
    const raw = await readFile(OUTPUT_PATH, "utf8");
    const prev = JSON.parse(raw) as EmbeddingEntry[];
    for (const e of prev) existingById.set(e.id, e);
  } catch {
    // First run — no existing file. Not an error.
  }

  const output: EmbeddingEntry[] = [];
  const toEmbed: Array<{ doc: Doc; hash: string }> = [];

  for (const doc of docs) {
    const hash = sha256(doc.text);
    const existing = existingById.get(doc.id);
    if (existing && existing.contentHash === hash) {
      output.push(existing);
    } else {
      toEmbed.push({ doc, hash });
    }
  }

  const droppedCount = existingById.size - output.length;
  console.log(
    `Atlas embeddings: ${docs.length} total • ${output.length} unchanged • ${toEmbed.length} to (re-)embed • ${droppedCount} dropped`,
  );

  if (toEmbed.length === 0) {
    console.log("Nothing to embed. Done.");
    return;
  }

  // AI Gateway auth: the @ai-sdk/gateway package resolves either
  // VERCEL_OIDC_TOKEN (preferred, auto-rotated, provisioned by
  // `vercel env pull .env.local`) or AI_GATEWAY_API_KEY for
  // non-Vercel environments. Provider-specific keys are intentionally
  // unsupported — they bypass gateway spend tracking and per-user
  // rate limits.
  if (!process.env.VERCEL_OIDC_TOKEN && !process.env.AI_GATEWAY_API_KEY) {
    throw new Error(
      "Missing AI Gateway credentials. Run `vercel env pull .env.local` to provision VERCEL_OIDC_TOKEN, or set AI_GATEWAY_API_KEY for CI.",
    );
  }

  let totalTokens = 0;
  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + BATCH_SIZE);
    const { embeddings, usage } = await embedMany({
      model: MODEL,
      values: batch.map(({ doc }) => doc.text),
      // `dimensions` is OpenAI-specific; the SDK passes it through
      // providerOptions.openai. Harmless when the gateway routes to a
      // non-OpenAI provider — ignored instead of erroring.
      providerOptions: { openai: { dimensions: DIMENSIONS } },
      maxParallelCalls: MAX_PARALLEL,
    });
    for (let j = 0; j < batch.length; j++) {
      output.push({
        id: batch[j].doc.id,
        type: batch[j].doc.type,
        contentHash: batch[j].hash,
        vector: embeddings[j],
      });
    }
    totalTokens += usage?.tokens ?? 0;
    console.log(
      `  batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toEmbed.length / BATCH_SIZE)} — ${batch.length} items • ${usage?.tokens ?? "?"} tokens`,
    );
  }

  // Sort by id for stable diffs when the JSON is committed.
  output.sort((a, b) => a.id.localeCompare(b.id));

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");
  const sizeKb = (JSON.stringify(output).length / 1024).toFixed(1);
  console.log(
    `Wrote ${output.length} embeddings (${sizeKb} KB) to ${OUTPUT_PATH}. Total new tokens: ${totalTokens}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
