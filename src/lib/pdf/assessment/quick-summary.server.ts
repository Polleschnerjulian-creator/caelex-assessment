/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Quick-check obligation SUMMARY PDF (plan Task 2.4).
 *
 * Pattern lineage: src/lib/pdf/trade/verdict-dossier.server.ts (jsPDF
 * server-side, self-attesting SHA-256 content hash stamped in the footer,
 * honest empties). Re-composed for the assessment surface — no Trade imports.
 *
 * STRUCTURE (mirrors the on-screen quick result, §6b "counts + headlines"):
 *   HEADER     — rulebook stamp ("Assessed against Caelex Rulebook vX.Y.Z"),
 *                computed-at, prepared-for (honest "not provided" empties).
 *   SOURCES    — every rulebook source with its as-of date.
 *   SCOPE      — gate verdicts (or the honest no-caveats line).
 *   REGIME     — direction headline + the finding envelope text.
 *   NIS2       — gateway classification incl. the EXPLICIT
 *                needs_clarification copy (never "does not apply").
 *   CLUSTERS   — per-cluster counts + the ONE headline finding each.
 *   UNKNOWNS   — the full unknowns section (§6 (3)) when the stored result
 *                carries the list; the count otherwise.
 *   APPENDIX   — contested positions: the full multi-position scenario
 *                tables live HERE, collapsed-conservative on screen
 *                (founder §11.4).
 *   DISCLAIMER — the §6 (7) scope-limiting wording.
 *   FOOTER     — SHA-256 of the content bytes (excluding the footer line).
 *
 * HONESTY INVARIANTS:
 *   - NO overall score — no 0–100 aggregate appears anywhere.
 *   - Honest empties: a missing value prints "not provided" — never a
 *     fabricated value or citation (invariant #4).
 *   - The withhold guard: an incomplete explanation envelope is withheld
 *     with an explicit notice — never partially printed (invariant #5).
 *   - Every printed finding carries its legal basis with as-of date and the
 *     rulebook semver it was computed against (invariant #5).
 */

import "server-only";

import { createHash } from "node:crypto";
import { jsPDF } from "jspdf";

import { RULEBOOK } from "@/data/assessment/rulebook";
import {
  isFindingComplete,
  type AssessmentFinding,
} from "@/lib/assessment/finding";
import {
  projectQuickResult,
  type QuickResultView,
} from "@/components/assessment/spine/quick-projection";

const NOT_PROVIDED = "not provided";
const FORMAT_VERSION = "quick-summary-v1";

// §6 (7) — scope-limiting, not confidence-retracting.
const SCOPE_DISCLAIMER =
  "This maps the obligations that attach to the facts you provided; it is general information, not legal advice on your specific situation, and does not prove compliance.";

const REGIME_DIRECTION: Record<string, string> = {
  eligible: "Light regime: eligible on your answers",
  likely_eligible_verify: "Likely light regime — verify group structure",
  not_eligible: "Standard regime applies",
};

const NIS2_HEADLINE: Record<string, string> = {
  essential: "NIS2: essential entity",
  important: "NIS2: important entity",
  out_of_scope: "NIS2: out of scope on your answers",
  needs_clarification:
    "NIS2: needs clarification — an OPEN question, not a negative",
};

const WITHHELD_LINE =
  "[withheld] One or more findings were withheld because their explanation envelope is incomplete — a conclusion we cannot fully explain and cite is never printed.";

// ─── Content model (pure — unit-tested without PDF text extraction) ─────────

export interface QuickSummarySection {
  heading: string;
  lines: string[];
}

export interface QuickSummaryContent {
  title: string;
  rulebookStamp: string; // "Assessed against Caelex Rulebook vX.Y.Z"
  computedAtLine: string;
  preparedForLines: string[]; // honest "not provided" empties
  sections: QuickSummarySection[];
  disclaimer: string;
}

export interface QuickSummaryRecipient {
  email: string;
  company?: string | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

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
  if (f.fluxFlag) {
    lines.push(`${f.fluxFlag.summary} — see the contested-positions appendix.`);
  }
  return lines;
}

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

/** All complete findings reachable in the stored result (full shape: every
 *  cluster finding; projected shape: the top findings) — for the appendix. */
function collectFindings(
  raw: unknown,
  view: QuickResultView,
): AssessmentFinding[] {
  const out: AssessmentFinding[] = [];
  const push = (v: unknown) => {
    if (isFindingComplete(v).length === 0) out.push(v as AssessmentFinding);
  };

  for (const f of view.scope) push(f);
  if (view.nis2Gateway) push(view.nis2Gateway);
  if (view.regime) push(view.regime);

  if (isRecord(raw) && Array.isArray(raw.clusters)) {
    for (const c of raw.clusters) {
      if (!isRecord(c)) continue;
      if (Array.isArray(c.findings)) {
        for (const f of c.findings) push(f);
      } else if (c.topFinding !== undefined) {
        push(c.topFinding);
      }
    }
  }
  return out;
}

/** The unknowns SECTION from the stored result — full list when present
 *  (the QUICK snapshot stores the pipeline result), count-only otherwise. */
function unknownsLines(raw: unknown, view: QuickResultView): string[] {
  if (isRecord(raw) && Array.isArray(raw.unknowns) && raw.unknowns.length > 0) {
    const lines: string[] = [];
    for (const u of raw.unknowns) {
      if (!isRecord(u)) continue;
      const question =
        typeof u.question === "string"
          ? u.question
          : String(u.questionId ?? "");
      const change =
        typeof u.whatAnsweringChanges === "string"
          ? u.whatAnsweringChanges
          : "";
      const priority = u.priority === "high" ? "HIGH" : "MEDIUM";
      lines.push(`[${priority}] ${question}`);
      if (change) lines.push(`What answering changes: ${change}`);
    }
    return lines;
  }
  if (view.unknownsCount > 0) {
    return [
      `${view.unknownsCount} unknown${view.unknownsCount === 1 ? "" : "s"} to resolve — run the full assessment to see each one with what answering it would change.`,
    ];
  }
  return [
    "None identified — every question you saw was answered. (Answers you were not asked on the quick tier are covered in the full assessment.)",
  ];
}

/**
 * Compose the printable content — PURE (no jsPDF, no crypto) so the honesty
 * assertions (stamp, as-of dates, honest empties, no overall score) are
 * unit-testable without extracting text from PDF bytes.
 *
 * Returns `null` when the stored result is unrecognizable — the route maps
 * that to an honest error, never an empty fabricated document.
 */
export function composeQuickSummaryContent(
  rawResult: unknown,
  recipient: QuickSummaryRecipient,
): QuickSummaryContent | null {
  const view = projectQuickResult(rawResult);
  if (!view) return null;

  const sections: QuickSummarySection[] = [];

  // ── Rulebook sources (as-of dates) ──
  sections.push({
    heading: "Rulebook sources",
    lines: RULEBOOK.sources.map(
      (s) => `${s.label} — ${s.citation} (as of ${s.asOf})`,
    ),
  });

  // ── Scope determination ──
  const scopeLines: string[] = [];
  if (view.scope.length > 0) {
    for (const f of view.scope) scopeLines.push(...findingLines(f));
  } else {
    scopeLines.push(
      "No scope exclusions or caveats were raised by your answers — the EU Space Act applicability gates passed.",
    );
  }
  if (view.scopeWithheldCount > 0) scopeLines.push(WITHHELD_LINE);
  sections.push({ heading: "Scope determination", lines: scopeLines });

  // ── Regime direction ──
  const regimeLines: string[] = [];
  if (view.regime) {
    const direction =
      typeof view.regime.value === "string"
        ? REGIME_DIRECTION[view.regime.value]
        : undefined;
    if (direction) regimeLines.push(direction);
    regimeLines.push(...findingLines(view.regime));
  } else {
    regimeLines.push(WITHHELD_LINE);
  }
  sections.push({ heading: "Regime direction", lines: regimeLines });

  // ── NIS2 gateway ──
  const nis2Lines: string[] = [];
  if (view.nis2Gateway) {
    const cls =
      typeof view.nis2Gateway.value === "string" ? view.nis2Gateway.value : "";
    const headline = NIS2_HEADLINE[cls];
    if (headline) nis2Lines.push(headline);
    if (cls === "needs_clarification") {
      nis2Lines.push(
        "Your NIS2 classification turns on answers you have not given yet — it is listed in your unknowns. Resolving it can add (never remove) an entire obligation set.",
      );
    }
    nis2Lines.push(...findingLines(view.nis2Gateway));
  } else {
    nis2Lines.push(WITHHELD_LINE);
  }
  sections.push({ heading: "NIS2 gateway", lines: nis2Lines });

  // ── Obligation clusters (counts + headlines) ──
  const clusterLines: string[] = [];
  if (view.clusters.length > 0) {
    for (const c of view.clusters) {
      clusterLines.push(
        `${c.label} — ${c.counts.applicable} applicable · ${c.counts.conditional} conditional · ${c.counts.contested} contested · ${c.counts.advisory} advisory`,
      );
      if (c.topFinding) {
        clusterLines.push(...findingLines(c.topFinding));
      } else {
        clusterLines.push(WITHHELD_LINE);
      }
      if (c.totalFindings > 1) {
        clusterLines.push(
          `${c.totalFindings - 1} more obligation${c.totalFindings - 1 === 1 ? "" : "s"} identified in this cluster — assessed in detail in the full assessment.`,
        );
      }
    }
  } else {
    clusterLines.push(
      "No obligation clusters were assessed on this result — see the scope determination above.",
    );
  }
  if (view.aggregationDisclosures.length > 0) {
    clusterLines.push(...view.aggregationDisclosures);
  }
  sections.push({
    heading: `Obligation clusters — ${view.totalObligations} identified (counts and headlines)`,
    lines: clusterLines,
  });

  // ── Unknowns to resolve ──
  sections.push({
    heading: `Unknowns to resolve (${view.unknownsCount})`,
    lines: unknownsLines(rawResult, view),
  });

  // ── Appendix: contested positions (full scenario tables, founder §11.4) ──
  const fluxed = collectFindings(rawResult, view).filter((f) => f.fluxFlag);
  const appendixLines: string[] = [];
  const seen = new Set<string>();
  for (const f of fluxed) {
    const flux = f.fluxFlag;
    if (!flux) continue;
    const key = `${f.what}::${flux.summary}`;
    if (seen.has(key)) continue;
    seen.add(key);
    appendixLines.push(`${f.what}`);
    appendixLines.push(`Conservative reading: ${flux.conservativeReading}`);
    for (const p of flux.positions) {
      appendixLines.push(`  ${p.source}: ${p.position}`);
    }
  }
  if (appendixLines.length === 0) {
    appendixLines.push("None identified on this result.");
  }
  sections.push({
    heading: "Appendix — contested legislative positions",
    lines: appendixLines,
  });

  const computedDate = new Date(view.computedAt);
  const computedAtLine = `Computed ${
    Number.isNaN(computedDate.getTime())
      ? view.computedAt
      : computedDate.toISOString()
  } (quick tier)`;

  return {
    title: "Caelex Quick Check — Obligation Summary",
    rulebookStamp: `Assessed against Caelex Rulebook v${view.rulebookVersion}`,
    computedAtLine,
    preparedForLines: [
      `Prepared for: ${recipient.email || NOT_PROVIDED}`,
      `Company: ${recipient.company?.trim() || NOT_PROVIDED}`,
    ],
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

export interface QuickSummaryPdfResult {
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
 * Render the quick-summary PDF from a stored QUICK verdict result.
 * Throws when the stored result is unrecognizable — the route maps that to
 * an honest error response (never an empty fabricated document).
 */
export function buildQuickSummaryPdf(
  rawResult: unknown,
  recipient: QuickSummaryRecipient,
): QuickSummaryPdfResult {
  const content = composeQuickSummaryContent(rawResult, recipient);
  if (!content) {
    throw new Error(
      "quick-summary: stored verdict result is unrecognizable — refusing to fabricate a document.",
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
  doc.text("CAELEX · QUICK CHECK — OBLIGATION SUMMARY", M_L, cur.y);
  cur.y += 8;

  // Title + stamp.
  writeBody(doc, cur, content.title, COL.navy, 16, true);
  writeBody(doc, cur, content.rulebookStamp, COL.slate700, 9.5, true);
  writeBody(doc, cur, content.computedAtLine, COL.slate500, 8.5);
  for (const line of content.preparedForLines) {
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

  // Self-attesting hash: computed over the PRE-stamp bytes; a verifier
  // recomputes the SHA-256 of the document with the footer removed.
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
    filename: `caelex-quick-check-summary-${datePart}.pdf`,
  };
}
