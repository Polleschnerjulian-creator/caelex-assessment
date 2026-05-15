/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Sprint A2 — Verification-Pass.
 * ────────────────────────────────────────────────────────────────────
 * Runs three independent checks over each artefact the agent emitted,
 * produces a flat array of findings the route can stream as
 * `verification_warnings` SSE events and persist on
 * AtlasAgentRun.verificationResults:
 *
 *   1. Citation-Verifier — every [ATLAS:source-id] inside the artefact
 *      body must resolve to a known corpus entry. Citations with
 *      badge "unknown" are hallucinations (error). "repealed" cites a
 *      norm that was repealed (warn).
 *
 *   2. BORA-Konformitäts-Check — lexicon-based scan for the most
 *      common berufsrechtlichen Verstöße (Werbeverbot, Verschwiegen-
 *      heit, Honorar). Delegated to ./bora-checker.
 *
 *   3. Hallucination-Pass — substantive legal claims that lack a
 *      citation. Heuristic: paragraphs >= 40 words containing a legal-
 *      claim verb ("verstößt", "verpflichtet", "haftet", ...) but no
 *      [ATLAS:...] reference inside the same paragraph.
 *
 * The lawyer sees these as inline-warnings under the artefact card so
 * they can decide whether to keep, edit, or drop the flagged passage
 * before the artefact gets exported / saved.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { extractCitations } from "@/lib/atlas/citation-extractor.server";
import { checkBoraConformance, type ArtifactKindForBora } from "./bora-checker";

export type VerificationSeverity = "warn" | "error";

export type VerificationKind = "citation" | "bora" | "hallucination";

export interface VerificationFinding {
  /// Index into the artefact-array (0-based). The UI uses this to
  /// align the finding under the right artefact-card.
  artifactIndex: number;
  kind: VerificationKind;
  severity: VerificationSeverity;
  message: string;
  /// For citation-findings: the [ATLAS:source-id] that triggered the
  /// flag. Optional for bora / hallucination findings.
  citation?: string;
  /// Char-offset within the artefact body where the issue was
  /// detected. Optional — used by the UI to scroll-to / highlight on
  /// click. Citation-findings don't carry this (the citation literal
  /// itself is the locator).
  offset?: number;
}

export interface ArtifactToVerify {
  index: number;
  kind: ArtifactKindForBora;
  title: string;
  body: string;
}

/* Heuristic: legal-claim verbs that signal a substantive rechtliche
   Behauptung. Match-anywhere; case-insensitive; word-boundary on the
   left side so "verpflichtet" doesn't fire on "vorverpflichtet" etc.
   The "nach §" / "gemäß §" forms catch citations to a norm WITHOUT
   ATLAS-id, which is the exact hallucination-pattern we want to flag. */
const CLAIM_VERBS_RE =
  /\b(verstößt|verpflichtet|haftet|schuldet|ergibt sich aus)\b|\b(?:nach|gemäß)\s+§/i;

/* Pattern for a valid Atlas-citation inside a paragraph. Mirrors the
   shape used by citation-extractor.server.ts (which is the canonical
   source-of-truth) but doesn't need the same defence-in-depth restric-
   tions here — we only need to know "does this paragraph contain ANY
   [ATLAS:...] reference at all", not what the reference resolves to. */
const ATLAS_REF_RE = /\[ATLAS:[^\]]+\]/;

/* Threshold for the hallucination heuristic. Paragraphs shorter than
   this are too small to constitute a "substantive claim" — they're
   usually heading lines, list-items, or transitions. Tuning this up
   reduces false-positives on bullet-list outputs; tuning down catches
   shorter claims at the cost of more noise. */
const HALLUCINATION_MIN_WORDS = 40;

/**
 * Run all three verification passes over the artefact-array. Returns
 * a flat findings-array. Empty when nothing to flag.
 *
 * The function is async because the citation-extractor is conceptually
 * async (it reads from the corpus index); v1 of citation-extractor is
 * actually sync but we keep the signature async-ready so a future
 * corpus-fetch over network doesn't force a route refactor.
 */
export async function verifyArtifacts(
  artifacts: ArtifactToVerify[],
): Promise<VerificationFinding[]> {
  const findings: VerificationFinding[] = [];

  for (const a of artifacts) {
    /* ───────────────── 1. Citation check ─────────────────
       Every [ATLAS:...] in the body is resolved via the validity
       store. "unknown" = the model made up a source-id (red flag);
       "repealed" = the citation is real but the norm has been
       repealed (yellow flag, lawyer needs to substitute). Other
       badges (in_force, needs_review, pending, amended) are
       acceptable — those are surfaced by the existing top-banner
       verification card and don't need per-artefact duplication. */
    const cites = extractCitations(a.body);
    for (const c of cites) {
      if (c.badge === "unknown") {
        findings.push({
          artifactIndex: a.index,
          kind: "citation",
          severity: "error",
          message: `Zitat "${c.citation}" wurde im Atlas-Korpus nicht gefunden.`,
          citation: c.citation,
        });
      } else if (c.badge === "repealed") {
        findings.push({
          artifactIndex: a.index,
          kind: "citation",
          severity: "warn",
          message: `Zitat "${c.citation}" verweist auf eine aufgehobene Norm.`,
          citation: c.citation,
        });
      }
    }

    /* ───────────────── 2. BORA-Konformitäts-Check ─────────────────
       Delegated — the rule-set lives next-door in bora-checker.ts so
       it can be unit-tested in isolation and re-used elsewhere (e.g.
       chat-mode artefact-export) without dragging in this module's
       dependency tree. */
    const boraIssues = checkBoraConformance(a.body, a.kind);
    for (const issue of boraIssues) {
      findings.push({
        artifactIndex: a.index,
        kind: "bora",
        severity: issue.severity,
        message: `${issue.rule}: ${issue.message}`,
        offset: issue.offset,
      });
    }

    /* ───────────────── 3. Hallucination-Pass ─────────────────
       Heuristic: split into paragraphs (blank-line separated), then
       flag those that contain a legal-claim verb but no [ATLAS:...]
       citation in the same paragraph. The paragraph-locality requirement
       is intentional — citing the source three paragraphs later
       breaks the lawyer's ability to map claim → support, so we treat
       that as missing-citation too. */
    const paragraphs = a.body.split(/\n\s*\n/);
    let runningOffset = 0;
    for (const p of paragraphs) {
      const trimmed = p.trim();
      if (trimmed.length > 0) {
        /* Word-count is a cheap upper-bound on "substantive". Splitting
           on whitespace counts a single character as a word but that
           edge-case lives well below the 40-word floor. */
        const wordCount = trimmed.split(/\s+/).length;
        const hasClaim = CLAIM_VERBS_RE.test(trimmed);
        const hasCitation = ATLAS_REF_RE.test(trimmed);
        if (wordCount >= HALLUCINATION_MIN_WORDS && hasClaim && !hasCitation) {
          findings.push({
            artifactIndex: a.index,
            kind: "hallucination",
            severity: "warn",
            message:
              "Juristische Behauptung ohne Atlas-Korpus-Zitat. Bitte Quelle prüfen.",
            offset: runningOffset,
          });
        }
      }
      /* Account for the original paragraph length + the "\n\n"
         separator we split on. Approximates the absolute char-offset
         well enough for the UI to scroll-to the region; precise
         re-localisation is a v2 concern. */
      runningOffset += p.length + 2;
    }
  }

  return findings;
}
