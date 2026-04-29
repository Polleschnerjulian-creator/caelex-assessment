import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos Citation Layer — "Verifiable Refusal" Foundation
 *
 * Jeder Pharos-Astra-Tool-Call gibt einen `ToolEnvelope` zurück, der
 * neben den eigentlichen Daten eine Liste von Citations trägt. Citations
 * sind die kryptografische Provenance jeder Aussage:
 *
 *   - data-row    — bezieht sich auf eine konkrete DB-Zeile (Table#id)
 *   - computation — bezieht sich auf eine deterministische Engine-Formel
 *   - audit-entry — bezieht sich auf einen Hash-Chain-Eintrag
 *   - norm        — bezieht sich auf einen Norm-Anchor (Phase 2: norm_anchor)
 *
 * Jede Citation enthält einen contentHash (sha256 über das zitierte
 * Snapshot), so dass spätere Überprüfung mathematisch verifizieren kann
 * ob die Aussage zum Zeitpunkt der Beantwortung zutraf.
 *
 * Die Engine erzwingt: jede finale Antwort muss MINDESTENS eine
 * Citation-ID aus den Tool-Results referenzieren — oder es ist eine
 * explizite Abstention. Halluzinationen werden so strukturell
 * unmöglich gemacht.
 *
 * Canonicalisation-Pattern identisch zu handshake.ts (alphabetisch
 * sortierte Keys auf jeder Ebene), damit contentHashes über Service-
 * Grenzen hinweg verifizierbar sind.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { createHash } from "node:crypto";
import { z } from "zod";

/** Canonical JSON serialisation — alphabetisch sortierte Keys auf jeder
 *  Nesting-Ebene. Identisch zum Pattern in handshake.ts, damit der hier
 *  berechnete contentHash auch von einem Verify-Tool reproduziert werden
 *  kann das nichts vom Pharos-Kern weiß. */
function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v).sort()) {
        out[k] = (v as Record<string, unknown>)[k];
      }
      return out;
    }
    return v;
  });
}

/** Sha256 über canonicalJson, prefixed mit Algorithmus-Tag und auf 32
 *  Hex-Zeichen gekürzt. Voller Hash wäre Token-teuer im LLM-Context. */
export function citationContentHash(content: unknown): string {
  const canonical = canonicalJson(content);
  const full = createHash("sha256").update(canonical, "utf8").digest("hex");
  return `sha256:${full.slice(0, 32)}`;
}

export const CitationSchema = z.object({
  /** Stable, eindeutiger Identifier — z.B. "DB:OversightRelationship:abc"
   *  oder "COMP:operator-compliance-score@v1.0". Diese ID ist was die
   *  finale LLM-Antwort in eckigen Klammern referenzieren muss. */
  id: z.string().min(3),
  kind: z.enum(["data-row", "computation", "audit-entry", "norm"]),
  /** Human-readable Quelle, z.B. "Caelex DB · OversightRelationship#abc" */
  source: z.string(),
  /** Optional: welcher Teil-Aspekt (z.B. "Spalten openIncidents,score" oder
   *  bei Normen "Abs. 2 Satz 1"). */
  span: z.string().optional(),
  /** Sha256-Prefix über das zitierte Content-Snapshot. */
  contentHash: z.string().regex(/^sha256:[0-9a-f]{32}$/),
  /** ISO-8601 Zeitpunkt der Datenabfrage. */
  retrievedAt: z.string(),
  /** Optional: Deeplink (z.B. EUR-Lex, gesetze-im-internet.de, dashboard
   *  /audit-center für interne Refs). */
  url: z.string().url().optional(),
});

export type Citation = z.infer<typeof CitationSchema>;

/** Tool-Return-Envelope. Jedes Pharos-Astra-Tool MUSS dieses Format
 *  liefern. Bei abstain=true darf citations leer sein, sonst muss
 *  citations.length >= 1 gelten. */
export const ToolEnvelopeSchema = z
  .object({
    ok: z.boolean(),
    data: z.unknown().optional(),
    citations: z.array(CitationSchema),
    abstain: z.boolean().optional(),
    abstainReason: z.string().optional(),
    error: z.string().optional(),
  })
  .refine(
    (v) => {
      if (!v.ok) return true; // failed calls don't need citations
      if (v.abstain === true) return true; // abstention is its own thing
      return v.citations.length >= 1;
    },
    {
      message:
        "Successful, non-abstained tool calls require at least one citation",
    },
  );

export type ToolEnvelope = z.infer<typeof ToolEnvelopeSchema>;

// ─── Citation-Builder ─────────────────────────────────────────────────

/** Mint a citation for a database row. */
export function dataRowCitation(opts: {
  table: string;
  id: string;
  span?: string;
  content: unknown;
  url?: string;
}): Citation {
  return {
    id: `DB:${opts.table}:${opts.id}`,
    kind: "data-row",
    source: `Caelex DB · ${opts.table}#${opts.id}`,
    span: opts.span,
    contentHash: citationContentHash(opts.content),
    retrievedAt: new Date().toISOString(),
    url: opts.url,
  };
}

/** Mint a citation for a deterministic computation (engine formula). */
export function computationCitation(opts: {
  name: string;
  version: string;
  inputs: unknown;
}): Citation {
  return {
    id: `COMP:${opts.name}@${opts.version}`,
    kind: "computation",
    source: `Pharos Engine · ${opts.name} v${opts.version}`,
    contentHash: citationContentHash({
      inputs: opts.inputs,
      name: opts.name,
      version: opts.version,
    }),
    retrievedAt: new Date().toISOString(),
  };
}

/** Mint a citation for a hash-chain audit-log entry. */
export function auditEntryCitation(opts: {
  oversightId: string;
  entryId: string;
  entryHash: string;
}): Citation {
  return {
    id: `AUDIT:${opts.oversightId}:${opts.entryId}`,
    kind: "audit-entry",
    source: `Pharos Hash-Chain · Oversight ${opts.oversightId}`,
    span: opts.entryHash.slice(0, 16),
    contentHash: `sha256:${opts.entryHash.slice(0, 32)}`,
    retrievedAt: new Date().toISOString(),
  };
}

// ─── Final-Answer-Validation ─────────────────────────────────────────

/** Marker that the model uses to signal an explicit abstention. The
 *  engine treats this as a valid "I don't know" — strucured refusal. */
export const ABSTENTION_MARKER = "[ABSTAIN]";

/** Returns true if the model's final answer either:
 *    (a) references at least one of the provided citation IDs verbatim
 *    (b) is an explicit abstention (starts with [ABSTAIN])
 *  Otherwise the answer is rejected by the engine as unsourced. */
export function answerIsCitationCompliant(
  answer: string,
  citations: Citation[],
): { compliant: boolean; reason?: string; abstained: boolean } {
  const trimmed = answer.trim();
  if (trimmed.startsWith(ABSTENTION_MARKER)) {
    return { compliant: true, abstained: true };
  }
  if (citations.length === 0) {
    return {
      compliant: false,
      reason:
        "Tools lieferten keine Citations und Antwort ist keine Abstention.",
      abstained: false,
    };
  }
  const hit = citations.some((c) => answer.includes(c.id));
  if (!hit) {
    return {
      compliant: false,
      reason:
        "Antwort referenziert keine der vom Tool gelieferten Citations. Halluzinations-Verdacht.",
      abstained: false,
    };
  }
  return { compliant: true, abstained: false };
}
