/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Lawyer-grade obligation DOSSIER PDF — full tier (plan Task 3.4).
 *
 * Pattern lineage: src/lib/pdf/trade/verdict-dossier.server.ts (jsPDF
 * server-side, self-attesting SHA-256 content hash computed over the
 * pre-footer-stamp bytes) via the Phase-2 sibling
 * src/lib/pdf/assessment/quick-summary.server.ts (pure content composition,
 * unit-testable without PDF text extraction). No Trade imports.
 *
 * READ-ONLY SUBSTRATE COMPOSITION — this module computes NOTHING new and
 * decides NOTHING. It re-states the STORED AssessmentVerdictSnapshot.result
 * (the ObligationMapResult shape, incl. the optional full-tier
 * readiness/creditMap/roadmap blocks) plus the profile's answers echo.
 *
 * STRUCTURE (the lawyer-verification surface, §6 full tier):
 *   HEADER      — rulebook stamp pinned to the SEMVER the verdict was
 *                 computed against, computed-at, prepared-for, snapshot
 *                 provenance (honest "not provided" empties).
 *   SOURCES     — EVERY rulebook source with its as-of date.
 *   ANSWERS     — the FULL check-your-answers echo: every stored answer,
 *                 including `{state:"unsure"}` and `{state:"not_asked"}`,
 *                 rendered AS SUCH — counsel verifies line by line. Question
 *                 titles resolved from the question graph; an answer key the
 *                 graph no longer knows is echoed verbatim, never dropped.
 *   SCOPE / REGIME / NIS2 — the stored gate, regime and gateway findings.
 *   OBLIGATION MAP — EVERY finding per cluster with its per-finding
 *                 citations (full tier — not headline-only like the quick
 *                 summary), evidence examples and why-traces.
 *   OVERLAPS / UNKNOWNS / READINESS / CREDIT MAP / ROADMAP — re-stated from
 *                 the stored result; absent optional blocks are said to be
 *                 absent, never synthesised.
 *   ACCURACY    — the accuracy-responsibility statement.
 *   ATTESTATION — how the self-hash is verified.
 *   APPENDIX    — the full three-text scenario tables (application date ×
 *                 CDR window × cyber architecture) from the rulebook's
 *                 CONTESTED_POSITIONS. Founder §11.4: the PDF appendix is
 *                 the ONLY full-matrix surface — finding lines carry only
 *                 the collapsed-conservative flux summary.
 *   FOOTER      — SHA-256 of the content bytes (excluding the footer line).
 *
 * HONESTY INVARIANTS:
 *   - NO overall numeric aggregate anywhere — per-cluster "N of M evidenced"
 *     bands only (invariant #6).
 *   - Honest empties: a missing value prints "not provided"; an empty lookup
 *     prints "none identified" — never a fabricated value (invariant #4).
 *   - The withhold guard: an incomplete explanation envelope is withheld
 *     with an explicit notice — never partially printed (invariant #5).
 *   - Every printed finding carries its legal basis with as-of date and the
 *     rulebook semver it was computed against (invariant #5).
 */

import "server-only";

import { createHash } from "node:crypto";
import { jsPDF } from "jspdf";

import { RULEBOOK, CONTESTED_POSITIONS } from "@/data/assessment/rulebook";
import { QUESTION_GRAPH } from "@/data/assessment/question-graph";
import type { QuestionNode } from "@/data/assessment/question-graph-types";
import {
  isFindingComplete,
  type AssessmentFinding,
} from "@/lib/assessment/finding";
import type { TriStateAnswer } from "@/lib/assessment/answers";

const NOT_PROVIDED = "not provided";
const FORMAT_VERSION = "obligation-dossier-v1";

// §6 (7) — scope-limiting, not confidence-retracting (same wording as the
// quick summary so the two artifacts tell one story).
const SCOPE_DISCLAIMER =
  "This maps the obligations that attach to the facts you provided; it is general information, not legal advice on your specific situation, and does not prove compliance.";

/** The accuracy-responsibility statement (plan Task 3.4) — exported so the
 *  test asserts it verbatim. Deliberately avoids any aggregate wording. */
export const ACCURACY_RESPONSIBILITY_STATEMENT =
  "This dossier re-states, without recomputation, the verdict stored for your assessment profile together with the answers it was computed from. The accuracy and completeness of those answers remain the responsibility of the person who provided them — Caelex has not independently verified them, and every finding stands or falls with the facts echoed in the check-your-answers section. Where an answer was recorded as unsure or not asked, the verdict took the conservative (obligation-widening) reading.";

const WITHHELD_LINE =
  "[withheld] One or more findings were withheld because their explanation envelope is incomplete — a conclusion we cannot fully explain and cite is never printed.";

// ─── Content model (pure — unit-tested without PDF text extraction) ─────────

export interface DossierSection {
  heading: string;
  lines: string[];
}

export interface ObligationDossierContent {
  title: string;
  rulebookStamp: string; // "Assessed against Caelex Rulebook vX.Y.Z"
  computedAtLine: string;
  preparedForLines: string[]; // honest "not provided" empties
  provenanceLines: string[]; // snapshot id + profile version, when provided
  sections: DossierSection[];
  disclaimer: string;
}

export interface DossierRecipient {
  name?: string | null;
  email?: string | null;
}

export interface DossierProvenance {
  snapshotId?: string;
  profileVersion?: number;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Minimal structural recognition of a stored ObligationMapResult. Anything
 *  else composes to `null` — the route maps that to an honest error, never
 *  an empty fabricated document. */
function isRenderableResult(raw: unknown): raw is Record<string, unknown> {
  if (!isRecord(raw)) return false;
  if (!isNonEmptyString(raw.rulebookVersion)) return false;
  if (!isNonEmptyString(raw.computedAt)) return false;
  if (!Array.isArray(raw.scope)) return false;
  if (!Array.isArray(raw.clusters)) return false;
  if (!isRecord(raw.nis2Gateway)) return false;
  if (!isRecord(raw.regime)) return false;
  return true;
}

// ─── Finding rendering (full envelope incl. evidence examples) ──────────────

function verdictTag(f: AssessmentFinding): string {
  switch (f.verdict) {
    case "applicable":
      return "[APPLICABLE]";
    case "conditional":
      return "[CONDITIONAL]";
    case "contested":
      return "[CONTESTED]";
    case "advisory":
      return "[ADVISORY]";
    case "not_applicable":
      return "[NOT APPLICABLE]";
  }
}

/** The full envelope as printable lines. The flux flag prints ONLY its
 *  collapsed-conservative summary here — the full position matrix lives in
 *  the appendix and nowhere else (founder §11.4). */
function findingLines(f: AssessmentFinding): string[] {
  const lines: string[] = [];
  lines.push(`${verdictTag(f)} ${f.what}`);
  lines.push(f.why);
  lines.push(`Next: ${f.wherefore}`);
  if (f.whyTrace.length > 0) {
    lines.push(
      `Because you answered: ${f.whyTrace
        .map((t) => `${t.questionId} — ${t.answerLabel}`)
        .join(" · ")}`,
    );
  }
  for (const s of f.sources) {
    lines.push(
      `Legal basis: ${s.label} — ${s.citation} (as of ${s.asOf})${
        s.verified ? "" : " · legal basis pending verification"
      }`,
    );
  }
  lines.push(
    `Confidence: ${f.confidence} · computed against rulebook v${f.rulebookVersion}`,
  );
  if (f.evidenceExamples && f.evidenceExamples.length > 0) {
    lines.push(
      `Evidence a supervisor would accept: ${f.evidenceExamples.join("; ")}`,
    );
  }
  if (f.fluxFlag) {
    lines.push(`${f.fluxFlag.summary} — see the contested-positions appendix.`);
  }
  return lines;
}

/** Withhold guard (invariant #5): an incomplete envelope is replaced by the
 *  explicit notice — never partially printed. */
function guardedFindingLines(raw: unknown): string[] {
  if (isFindingComplete(raw).length === 0) {
    return findingLines(raw as AssessmentFinding);
  }
  return [WITHHELD_LINE];
}

// ─── Check-your-answers echo ─────────────────────────────────────────────────

function isTriStateAnswer(v: unknown): v is TriStateAnswer {
  if (!isRecord(v)) return false;
  if (v.state === "answered") return "value" in v;
  return v.state === "unsure" || v.state === "not_asked";
}

function renderAnsweredValue(
  node: QuestionNode | undefined,
  value: string | string[] | boolean | number,
): string {
  const vals = Array.isArray(value) ? value : [value];
  return vals
    .map((v) => {
      const opt = node?.options?.find((o) => o.value === String(v));
      return opt ? opt.label : String(v);
    })
    .join(", ");
}

function renderAnswer(
  node: QuestionNode | undefined,
  answer: TriStateAnswer,
): string {
  switch (answer.state) {
    case "answered":
      return renderAnsweredValue(node, answer.value);
    case "unsure":
      return "I'm not sure — recorded as unsure (the verdict takes the conservative reading)";
    case "not_asked":
      return "Not asked — this branch was not part of your assessment path (recorded explicitly)";
  }
}

/**
 * The FULL echo: EVERY stored answer, graph order first, then any answer key
 * the current graph does not know — echoed verbatim and flagged, NEVER
 * dropped. Counsel verifies the verdict against exactly these facts.
 */
function answersEchoLines(rawAnswers: unknown): string[] {
  const lines: string[] = [];
  if (!isRecord(rawAnswers) || Object.keys(rawAnswers).length === 0) {
    lines.push(
      "No stored answers were found on this profile — the echo is empty, not omitted.",
    );
    return lines;
  }

  const remaining = new Map(Object.entries(rawAnswers));

  for (const node of QUESTION_GRAPH) {
    const stored = remaining.get(node.id);
    if (stored === undefined) continue;
    remaining.delete(node.id);
    lines.push(node.title);
    lines.push(
      `  Answer: ${
        isTriStateAnswer(stored)
          ? renderAnswer(node, stored)
          : `stored answer is malformed — echoed raw: ${JSON.stringify(stored)}`
      }`,
    );
  }

  for (const [id, stored] of remaining) {
    lines.push(`${id} (not in the current question graph — echoed verbatim)`);
    lines.push(
      `  Answer: ${
        isTriStateAnswer(stored)
          ? renderAnswer(undefined, stored)
          : `stored answer is malformed — echoed raw: ${JSON.stringify(stored)}`
      }`,
    );
  }

  return lines;
}

// ─── Full-tier blocks (readiness / credit map / roadmap) ─────────────────────

function clusterLabelById(raw: Record<string, unknown>): Map<string, string> {
  const map = new Map<string, string>();
  if (Array.isArray(raw.clusters)) {
    for (const c of raw.clusters) {
      if (
        isRecord(c) &&
        typeof c.id === "string" &&
        typeof c.label === "string"
      )
        map.set(c.id, c.label);
    }
  }
  return map;
}

/** Per-cluster "N of M evidenced" bands — the ONLY readiness representation
 *  (invariant #6: never a numeric aggregate). */
function readinessLines(raw: Record<string, unknown>): string[] {
  const readiness = raw.readiness;
  if (!Array.isArray(readiness)) {
    return [
      "Not present on this stored result — readiness bands are computed on the full tier only.",
    ];
  }
  if (readiness.length === 0) {
    return ["None identified on this result."];
  }
  const labels = clusterLabelById(raw);
  const lines: string[] = [];
  for (const r of readiness) {
    if (!isRecord(r)) continue;
    const label =
      labels.get(String(r.clusterId)) ?? String(r.clusterId ?? "cluster");
    lines.push(
      `${label}: ${Number(r.evidenced ?? 0)} of ${Number(r.total ?? 0)} evidenced · ${Number(
        r.partial ?? 0,
      )} partial · ${Number(r.missing ?? 0)} missing · ${Number(
        r.undocumented ?? 0,
      )} undocumented · ${Number(r.unsure ?? 0)} unsure`,
    );
  }
  return lines.length > 0 ? lines : ["None identified on this result."];
}

function creditMapLines(raw: Record<string, unknown>): string[] {
  const creditMap = raw.creditMap;
  if (!Array.isArray(creditMap)) {
    return [
      "Not present on this stored result — the credit map is computed on the full tier only.",
    ];
  }
  if (creditMap.length === 0) {
    return ["None identified — no recognised certifications were declared."];
  }
  const lines: string[] = [];
  for (const m of creditMap) {
    if (!isRecord(m)) continue;
    const covers = Array.isArray(m.covers) ? m.covers.join(", ") : "";
    lines.push(`${String(m.source ?? NOT_PROVIDED)} — covers: ${covers}`);
    if (isNonEmptyString(m.basis)) lines.push(`  Basis: ${m.basis}`);
  }
  return lines.length > 0
    ? lines
    : ["None identified — no recognised certifications were declared."];
}

function roadmapLines(raw: Record<string, unknown>): string[] {
  const roadmap = raw.roadmap;
  if (!Array.isArray(roadmap)) {
    return [
      "Not present on this stored result — the roadmap is computed on the full tier only.",
    ];
  }
  if (roadmap.length === 0) {
    return ["None identified on this result."];
  }
  const lines: string[] = [];
  for (const item of roadmap) {
    if (!isRecord(item)) continue;
    const due =
      item.due === "contested"
        ? "Due date contested between the legislative texts — no date fabricated (see the contested-positions appendix)"
        : `Due ${String(item.due ?? NOT_PROVIDED)}`;
    lines.push(`${due}: ${String(item.action ?? NOT_PROVIDED)}`);
    if (Array.isArray(item.basis)) {
      for (const s of item.basis) {
        if (!isRecord(s)) continue;
        lines.push(
          `  Legal basis: ${String(s.label ?? NOT_PROVIDED)} — ${String(
            s.citation ?? NOT_PROVIDED,
          )} (as of ${String(s.asOf ?? NOT_PROVIDED)})`,
        );
      }
    }
  }
  return lines.length > 0 ? lines : ["None identified on this result."];
}

// ─── Appendix: the full three-text scenario tables (founder §11.4) ───────────

const SOURCE_LABEL_BY_ID: ReadonlyMap<string, string> = new Map(
  RULEBOOK.sources.map((s): [string, string] => [s.id, s.label]),
);

function contestedTableLines(
  rows: readonly { source: string; position: string }[],
): string[] {
  return rows.map(
    (r) => `  ${SOURCE_LABEL_BY_ID.get(r.source) ?? r.source}: ${r.position}`,
  );
}

function appendixLines(): string[] {
  return [
    "The full multi-position matrices live in THIS appendix only; finding lines above carry the collapsed conservative reading.",
    "Table 1 — Application date",
    ...contestedTableLines(CONTESTED_POSITIONS.applicationDate),
    "Table 2 — Critical design review (CDR) window",
    ...contestedTableLines(CONTESTED_POSITIONS.cdrWindow),
    "Table 3 — Cybersecurity architecture",
    ...contestedTableLines(CONTESTED_POSITIONS.cyberArchitecture),
  ];
}

// ─── Composition (pure) ──────────────────────────────────────────────────────

/**
 * Compose the printable dossier content — PURE (no jsPDF, no crypto) so the
 * honesty assertions (rulebook stamp + every source with its as-of date, the
 * full tri-state answers echo, per-finding citations, the accuracy statement,
 * appendix-only scenario tables, no overall aggregate) are unit-testable
 * without extracting text from PDF bytes.
 *
 * Returns `null` when the stored result is unrecognizable — the route maps
 * that to an honest error, never an empty fabricated document.
 */
export function composeObligationDossierContent(
  rawResult: unknown,
  rawAnswers: unknown,
  recipient: DossierRecipient,
  provenance: DossierProvenance = {},
): ObligationDossierContent | null {
  if (!isRenderableResult(rawResult)) return null;
  const raw = rawResult;

  const sections: DossierSection[] = [];

  // ── Rulebook sources — EVERY source label with its as-of date ──
  sections.push({
    heading: "Rulebook sources",
    lines: RULEBOOK.sources.map(
      (s) =>
        `${s.label} — ${s.citation} (as of ${s.asOf})${
          s.verified ? "" : " · could not be verified against the primary text"
        }`,
    ),
  });

  // ── The FULL check-your-answers echo ──
  sections.push({
    heading:
      "Check your answers — the facts this verdict rests on (verify line by line)",
    lines: answersEchoLines(rawAnswers),
  });

  // ── Scope determination ──
  const scopeLines: string[] = [];
  const scopeArr = raw.scope as unknown[];
  if (scopeArr.length > 0) {
    for (const f of scopeArr) scopeLines.push(...guardedFindingLines(f));
  } else {
    scopeLines.push(
      "No scope exclusions or caveats were raised by your answers — the EU Space Act applicability gates passed.",
    );
  }
  sections.push({ heading: "Scope determination", lines: scopeLines });

  // ── Regime direction ──
  sections.push({
    heading: "Regime direction",
    lines: guardedFindingLines(raw.regime),
  });

  // ── NIS2 gateway ──
  sections.push({
    heading: "NIS2 gateway",
    lines: guardedFindingLines(raw.nis2Gateway),
  });

  // ── Obligation map — EVERY finding per cluster (full tier) ──
  const clusterLines: string[] = [];
  const clusters = raw.clusters as unknown[];
  if (clusters.length > 0) {
    for (const c of clusters) {
      if (!isRecord(c)) continue;
      const counts = isRecord(c.counts) ? c.counts : {};
      clusterLines.push(
        `${String(c.label ?? c.id ?? "Cluster")} — ${Number(
          counts.applicable ?? 0,
        )} applicable · ${Number(counts.conditional ?? 0)} conditional · ${Number(
          counts.contested ?? 0,
        )} contested · ${Number(counts.advisory ?? 0)} advisory`,
      );
      const findings = Array.isArray(c.findings) ? c.findings : [];
      if (findings.length === 0) {
        clusterLines.push("No findings recorded in this cluster.");
      }
      for (const f of findings) {
        clusterLines.push(...guardedFindingLines(f));
      }
    }
  } else {
    clusterLines.push(
      "No obligation clusters were assessed on this result — see the scope determination above.",
    );
  }
  if (Array.isArray(raw.aggregationDisclosures)) {
    for (const d of raw.aggregationDisclosures) {
      if (typeof d === "string") clusterLines.push(d);
    }
  }
  sections.push({
    heading: "Obligation map — every finding by cluster",
    lines: clusterLines,
  });

  // ── Cross-framework overlaps (honest "none identified") ──
  const overlapLines: string[] = [];
  const overlaps = Array.isArray(raw.crossFrameworkOverlaps)
    ? raw.crossFrameworkOverlaps
    : [];
  if (overlaps.length > 0) {
    for (const o of overlaps) {
      if (!isRecord(o)) continue;
      overlapLines.push(
        `${String(o.area ?? NOT_PROVIDED)}: EU Space Act ${String(
          o.euSpaceActRef ?? NOT_PROVIDED,
        )} <-> NIS2 ${String(o.nis2Ref ?? NOT_PROVIDED)}`,
      );
    }
  } else {
    overlapLines.push("None identified on this result.");
  }
  sections.push({
    heading: "Cross-framework overlaps",
    lines: overlapLines,
  });

  // ── Unknowns to resolve ──
  const unknowns = Array.isArray(raw.unknowns) ? raw.unknowns : [];
  const unknownLines: string[] = [];
  for (const u of unknowns) {
    if (!isRecord(u)) continue;
    const question =
      typeof u.question === "string" ? u.question : String(u.questionId ?? "");
    const priority = u.priority === "high" ? "HIGH" : "MEDIUM";
    unknownLines.push(`[${priority}] ${question}`);
    if (typeof u.whatAnsweringChanges === "string") {
      unknownLines.push(`What answering changes: ${u.whatAnsweringChanges}`);
    }
  }
  if (unknownLines.length === 0) {
    unknownLines.push("None identified — every question you saw was answered.");
  }
  sections.push({
    heading: `Unknowns to resolve (${unknowns.length})`,
    lines: unknownLines,
  });

  // ── Full-tier blocks (re-stated; absence is said, never synthesised) ──
  sections.push({
    heading: "Readiness — per-cluster evidence bands",
    lines: readinessLines(raw),
  });
  sections.push({
    heading: "Credit map — recognised certifications",
    lines: creditMapLines(raw),
  });
  sections.push({
    heading: "Roadmap — dated actions",
    lines: roadmapLines(raw),
  });

  // ── Accuracy-responsibility statement ──
  sections.push({
    heading: "Accuracy and responsibility",
    lines: [ACCURACY_RESPONSIBILITY_STATEMENT],
  });

  // ── Integrity attestation (the self-hash mechanism, printed) ──
  sections.push({
    heading: "Integrity attestation",
    lines: [
      "This document attests to its own integrity: the footer carries a SHA-256 hash computed over the document's content bytes BEFORE the footer stamp was added.",
      "To verify, recompute the SHA-256 of this document with the footer line removed and compare it to the printed value (it is also returned in the X-Caelex-Dossier-Hash header at download time).",
      `Format: ${FORMAT_VERSION}.`,
    ],
  });

  // ── APPENDIX — the only full-matrix surface (founder §11.4) ──
  sections.push({
    heading:
      "Appendix — contested legislative positions (full three-text scenario tables)",
    lines: appendixLines(),
  });

  const computedAtRaw = String(raw.computedAt);
  const computedDate = new Date(computedAtRaw);
  const computedAtLine = `Computed ${
    Number.isNaN(computedDate.getTime())
      ? computedAtRaw
      : computedDate.toISOString()
  } (full tier)`;

  const provenanceLines: string[] = [];
  if (provenance.snapshotId) {
    provenanceLines.push(`Verdict snapshot: ${provenance.snapshotId}`);
  }
  if (provenance.profileVersion !== undefined) {
    provenanceLines.push(
      `Computed from profile version ${provenance.profileVersion}`,
    );
  }

  return {
    title: "Caelex Full Assessment — Obligation Dossier",
    rulebookStamp: `Assessed against Caelex Rulebook v${String(raw.rulebookVersion)}`,
    computedAtLine,
    preparedForLines: [
      `Prepared for: ${recipient.name?.trim() || recipient.email?.trim() || NOT_PROVIDED}`,
      `Account email: ${recipient.email?.trim() || NOT_PROVIDED}`,
    ],
    provenanceLines,
    sections,
    disclaimer: SCOPE_DISCLAIMER,
  };
}

// ─── jsPDF renderer (multi-page, self-attesting hash footer) ─────────────────

const PAGE_W = 210;
const PAGE_H = 297;
const M_L = 18;
const M_R = 18;
const M_TOP = 18;
const M_BOTTOM = 24; // room for the hash footer on the last page
const CONTENT_W = PAGE_W - M_L - M_R;

const COL = {
  navy: [15, 23, 42] as [number, number, number],
  slate700: [51, 65, 85] as [number, number, number],
  slate500: [100, 116, 139] as [number, number, number],
  slate400: [148, 163, 184] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
};

export interface ObligationDossierPdfResult {
  bytes: Uint8Array;
  /** SHA-256 (hex) of the content bytes BEFORE the footer stamp. */
  contentHash: string;
  filename: string;
}

interface Cursor {
  y: number;
}

function ensureRoom(doc: jsPDF, cur: Cursor, needed: number): void {
  if (cur.y + needed > PAGE_H - M_BOTTOM) {
    doc.addPage();
    cur.y = M_TOP;
  }
}

function writeBody(
  doc: jsPDF,
  cur: Cursor,
  text: string,
  color: [number, number, number],
  size = 8.5,
  bold = false,
): void {
  doc.setFontSize(size);
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
  const lineH = size * 0.45;
  for (const line of lines) {
    ensureRoom(doc, cur, lineH + 0.5);
    doc.text(line, M_L, cur.y);
    cur.y += lineH;
  }
  cur.y += 1.2;
}

function writeHeading(doc: jsPDF, cur: Cursor, label: string): void {
  ensureRoom(doc, cur, 12);
  cur.y += 3;
  doc.setFillColor(...COL.emerald);
  doc.rect(M_L, cur.y - 3, 2, 5, "F");
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COL.navy);
  doc.text(label, M_L + 4, cur.y);
  cur.y += 6;
}

/**
 * Stamp the self-content-hash + a verification note into the last page's
 * footer. The hash is computed over the PRE-stamp bytes (the verdict-dossier
 * pattern): a verifier recomputes the SHA-256 of the document with this
 * footer removed.
 */
function stampHashFooter(
  doc: jsPDF,
  contentHash: string,
  generatedAt: Date,
): void {
  const page = doc.getNumberOfPages();
  doc.setPage(page);
  const footerY = PAGE_H - 16;
  doc.setDrawColor(...COL.slate200);
  doc.setLineWidth(0.3);
  doc.line(M_L, footerY, PAGE_W - M_R, footerY);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COL.slate500);
  doc.text("CONTENT HASH (SHA-256, excluding this footer):", M_L, footerY + 4);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COL.slate400);
  doc.text(contentHash, M_L, footerY + 7.5);

  doc.setFontSize(6);
  doc.setTextColor(...COL.slate400);
  doc.text(
    `Caelex · caelex.eu · generated ${generatedAt.toISOString()} · ${FORMAT_VERSION} · general information, not legal advice`,
    M_L,
    PAGE_H - 4,
  );
}

/**
 * Render the obligation-dossier PDF from a STORED full-tier verdict result
 * plus the profile's stored answers. READ-ONLY composition — computes
 * nothing new. Throws when the stored result is unrecognizable — the route
 * maps that to an honest error response (never a fabricated document).
 */
export function buildObligationDossierPdf(
  rawResult: unknown,
  rawAnswers: unknown,
  recipient: DossierRecipient,
  provenance: DossierProvenance = {},
): ObligationDossierPdfResult {
  const content = composeObligationDossierContent(
    rawResult,
    rawAnswers,
    recipient,
    provenance,
  );
  if (!content) {
    throw new Error(
      "obligation-dossier: stored verdict result is unrecognizable — refusing to fabricate a document.",
    );
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "normal");
  const cur: Cursor = { y: M_TOP };

  // Top band + product line.
  doc.setFillColor(...COL.emerald);
  doc.rect(M_L, cur.y, 42, 2.4, "F");
  cur.y += 7;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COL.slate500);
  doc.text("CAELEX · FULL ASSESSMENT — OBLIGATION DOSSIER", M_L, cur.y);
  cur.y += 8;

  // Title + stamp + provenance.
  writeBody(doc, cur, content.title, COL.navy, 16, true);
  writeBody(doc, cur, content.rulebookStamp, COL.slate700, 9.5, true);
  writeBody(doc, cur, content.computedAtLine, COL.slate500, 8.5);
  for (const line of content.preparedForLines) {
    writeBody(doc, cur, line, COL.slate500, 8.5);
  }
  for (const line of content.provenanceLines) {
    writeBody(doc, cur, line, COL.slate500, 8.5);
  }

  for (const section of content.sections) {
    writeHeading(doc, cur, section.heading);
    for (const line of section.lines) {
      writeBody(doc, cur, line, COL.slate700);
    }
  }

  writeHeading(doc, cur, "Disclaimer");
  writeBody(doc, cur, content.disclaimer, COL.slate500);

  // Self-attesting hash: computed over the PRE-stamp bytes (verdict-dossier
  // pattern); a verifier recomputes the SHA-256 with the footer removed.
  const generatedAt = new Date();
  const preHashBytes = doc.output("arraybuffer");
  const contentHash = createHash("sha256")
    .update(Buffer.from(preHashBytes))
    .digest("hex");
  stampHashFooter(doc, contentHash, generatedAt);

  const bytes = new Uint8Array(doc.output("arraybuffer"));
  const datePart = generatedAt.toISOString().slice(0, 10);
  return {
    bytes,
    contentHash,
    filename: `caelex-obligation-dossier-${datePart}.pdf`,
  };
}
