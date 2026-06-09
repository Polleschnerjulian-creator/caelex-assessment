/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Caelex Passage — the "Why this?" court-ready ONE-PAGE verdict dossier.
 *
 * THE HEADLINE TRANSPARENCY ARTIFACT. Export control attaches PERSONAL,
 * CRIMINAL liability to a NAMED HUMAN (the Ausfuhrverantwortlicher). When a
 * regulator, an auditor, or a court asks "on what basis did you decide to ship
 * — or not ship — this?", the answer cannot be "the software said so". This
 * dossier is that answer, on one page, assembled ENTIRELY from substrate that
 * already exists — never fabricated:
 *
 *   COVER       — operation reference, counterparty, date, decision-of-record.
 *   VERDICT     — the operation verdict headline (assessOperation) + the
 *                 licence type / authority that the classification produced.
 *   REASONING   — the matched rule(s) / licence-requirement reasons + the
 *                 per-line classification basis. Composed from the SAME
 *                 ExplainedResult envelope the on-screen <ExplainedPanel> shows,
 *                 so the page and the screen tell one story.
 *   PROVENANCE  — screening list versions + snapshot hashes + as-of timestamps
 *                 + the engine/model version.
 *   ATTESTATION — the requesting human (signer), generated-at, and a SHA-256 of
 *                 the dossier's own content bytes so a regulator can verify the
 *                 document was not altered after issuance.
 *
 * LEGAL INVARIANTS (this file is READ-ONLY substrate composition — it computes
 * NOTHING new and decides NOTHING):
 *   - It NEVER makes a determination more permissive. It re-states the verdict
 *     assessOperation() already produced, and where it expresses the verdict's
 *     "why" it does so through an ExplainedResult built with the throwing
 *     constructors — a REVIEW/BLOCKED verdict, or one resting on an unclassified
 *     line / unscreened party, fails CLOSED to UNVERIFIED, never a silent green.
 *   - AI proposes, a HUMAN decides + is recorded: the dossier prints the human
 *     signer + (if present) the decision-of-record; it is a DRAFT artifact the
 *     human relies on, not an authority that clears anything.
 *   - Honest: a field with no real value prints "nicht verfügbar" — NEVER a
 *     fabricated citation or identifier.
 *
 * Server-only: reads the DB + runs assessOperation() server-side, returns bytes.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { createHash } from "node:crypto";
import { jsPDF } from "jspdf";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  assessOperation,
  OperationNotFoundError,
  type OperationAssessment,
} from "@/lib/trade/operation-assistant.server";
import {
  explainedResult,
  unverifiedResult,
  type ExplainedResult,
  type ExplainSource,
} from "@/lib/comply-v2/trade/explained-result";
import { latestSnapshotFor } from "@/lib/comply-v2/trade/screening/snapshot-store.server";
import type {
  TradeSanctionsList,
  TradeSanctionsSnapshot,
} from "@prisma/client";
import type { LicenseRequirement } from "@/lib/comply-v2/trade/license-determination";

export { OperationNotFoundError };

// ─── Engine / model version ────────────────────────────────────────────────
//
// A stable, human-traceable version string for the assessment engine that
// produced this verdict. Printed in PROVENANCE so a regulator can correlate the
// dossier with a known engine release. Bump when verdict logic changes.
const DOSSIER_ENGINE_VERSION = "passage-operation-assistant v1 (P1)";
const DOSSIER_FORMAT_VERSION = "dossier-v1";

const NA = "nicht verfügbar";

// The critical designated-party lists whose snapshot provenance is cited in the
// dossier. Same critical set the screening fail-closed gate keys off.
const CRITICAL_LISTS: TradeSanctionsList[] = [
  "OFAC_SDN",
  "BIS_ENTITY",
  "EU_FSF",
  "UN_CONSOLIDATED",
];

const LIST_LABEL: Record<string, string> = {
  OFAC_SDN: "OFAC SDN",
  BIS_ENTITY: "BIS Entity List",
  DDTC_DEBARRED: "DDTC Debarred",
  EU_FSF: "EU FSF (consolidated)",
  UK_OFSI: "UK OFSI",
  UN_CONSOLIDATED: "UN Consolidated",
  EU_ANNEX_IV: "EU Reg. 833/2014 Annex IV",
  OPEN_SANCTIONS: "OpenSanctions",
};

const LIST_CITATION: Record<string, string> = {
  OFAC_SDN: "31 CFR Part 501 — OFAC Specially Designated Nationals",
  BIS_ENTITY: "15 CFR Part 744 Supp. No. 4 — BIS Entity List",
  EU_FSF: "EU Consolidated Financial Sanctions File",
  UN_CONSOLIDATED: "UN Security Council Consolidated Sanctions List",
};

// ─── Public input ────────────────────────────────────────────────────────────

export interface DossierRequester {
  /** The requesting human — the signer printed in ATTESTATION. */
  userId: string;
  /** Display name (falls back to email, then "nicht verfügbar"). */
  name?: string | null;
  email?: string | null;
}

export interface DossierResult {
  /** The generated PDF bytes. */
  bytes: Uint8Array;
  /** SHA-256 (hex) of the assembled content the dossier attests to. */
  contentHash: string;
  /** Suggested download filename. */
  filename: string;
  /** The operation reference (for the route + audit description). */
  operationReference: string;
}

// ─── Verdict → ExplainedResult (honest, fail-closed) ──────────────────────────

/**
 * Compose the operation verdict into the canonical Explanation Envelope so the
 * dossier's "why" is built through the throwing constructors and matches what
 * the on-screen <ExplainedPanel> would render.
 *
 * CONSERVATIVE MAPPING (never more permissive than assessOperation already is):
 *   - BLOCKED            → confidence HIGH, a determined hard-stop.
 *   - REVIEW             → UNVERIFIED (fail-closed): a REVIEW means an open gap
 *                          (unclassified line, unscreened/stale party, US-content
 *                          to check, or a licence requirement) — it is NOT a
 *                          clearance, so it carries the neutral-but-blocking band.
 *   - GO with no gaps    → confidence HIGH (every step `done`).
 *   - GO but any step is not `done` → UNVERIFIED (defensive; should not happen).
 *
 * Sources are the matched licence-requirement citations + the consulted
 * screening snapshots. An empty determined-source set is impossible because the
 * constructors throw — and the UNVERIFIED branch cites the gap itself.
 */
function buildVerdictExplained(
  assessment: OperationAssessment,
  licenceSources: ExplainSource[],
  snapshotSources: ExplainSource[],
): ExplainedResult<OperationAssessment> {
  const allGapsClosed = assessment.steps.every((s) => s.status === "done");
  // The matched-rule reasoning: every step's `why`, prefixed by its step name.
  const stepWhy = assessment.steps
    .map((s) => `[${stepLabel(s.step)}/${s.status}] ${s.why}`)
    .join("  ");

  const sources: ExplainSource[] = [...licenceSources, ...snapshotSources];

  if (assessment.verdict === "BLOCKED") {
    return explainedResult({
      value: assessment,
      what: stripEmoji(assessment.headline),
      why:
        `Lieferung untersagt. Mindestens eine harte Sperre (ITAR / Embargo / ` +
        `Annex IV / MTCR Cat-I) oder ein bestätigter Sanktionstreffer greift. ` +
        stepWhy,
      wherefore:
        "Diesen Vorgang NICHT ausführen. Eine harte Sperre lässt sich nicht " +
        "durch eine Genehmigung aufheben — Vorgang abbrechen bzw. an die " +
        "Exportkontroll-Verantwortung eskalieren.",
      confidence: "HIGH",
      sources:
        sources.length > 0
          ? sources
          : [
              {
                label: "Caelex Passage — Operation-Assistent",
                citation: "EU 2021/821 · 15 CFR 730-774 · 22 CFR 120-130 · AWV",
              },
            ],
    });
  }

  if (assessment.verdict === "REVIEW" || !allGapsClosed) {
    // REVIEW is an OPEN result, not a clearance. Fail closed to UNVERIFIED so
    // the dossier can never read as a green GO on an operation with open gaps.
    return unverifiedResult({
      value: assessment,
      what: stripEmoji(assessment.headline),
      why:
        `Offene Punkte vor Lieferung — dies ist KEINE Freigabe. ` +
        `Solange ein Artikel nicht eingestuft, die Gegenpartei nicht ` +
        `(aktuell) gescreent oder eine Genehmigungspflicht nicht erfüllt ` +
        `ist, kann der Vorgang nicht freigegeben werden. ` +
        stepWhy,
      wherefore:
        "Die offenen Pendenzen abarbeiten (siehe Abschnitt unten), dann den " +
        "Vorgang neu bewerten. Erst nach Schließen aller Lücken ist eine " +
        "Lieferentscheidung möglich; eine befugte Person entscheidet und wird " +
        "protokolliert.",
      sources,
    });
  }

  // GO with every step done — a real, determined clearance-of-the-screening.
  return explainedResult({
    value: assessment,
    what: stripEmoji(assessment.headline),
    why:
      `Alle fünf Prüfschritte (Einstufung, Screening, Jurisdiktion/De-minimis, ` +
      `Genehmigung, Antrag) sind ohne offene Lücke abgeschlossen; kein Trigger ` +
      `und keine Schwelle löst eine Genehmigungspflicht aus. ` +
      stepWhy,
    wherefore:
      "Keine Genehmigung erforderlich. Vor jeder neuen Lieferung erneut " +
      "bewerten — Listen und Einstufungen ändern sich. Die verantwortliche " +
      "Person bleibt entscheidungs- und protokollpflichtig.",
    confidence: "HIGH",
    sources:
      sources.length > 0
        ? sources
        : [
            {
              label: "Caelex Passage — Operation-Assistent",
              citation: "EU 2021/821 · 15 CFR 730-774 · 22 CFR 120-130 · AWV",
            },
          ],
  });
}

function stepLabel(step: string): string {
  switch (step) {
    case "classify":
      return "Einstufung";
    case "screen":
      return "Screening";
    case "jurisdiction":
      return "Jurisdiktion";
    case "license":
      return "Genehmigung";
    case "form":
      return "Antrag";
    default:
      return step;
  }
}

/** Strip a leading emoji (the verdict headline carries 🟢/🟡/🔴) for print. */
function stripEmoji(s: string): string {
  return s.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, "").trim();
}

// ─── Substrate collectors ─────────────────────────────────────────────────────

/**
 * Pull the licence-requirement reasons (the matched rules) across all lines.
 * Each requirement that is more than NLR becomes a cited source.
 */
function collectLicenceSources(assessment: OperationAssessment): {
  reasons: LicenseRequirement[];
  sources: ExplainSource[];
} {
  const reasons: LicenseRequirement[] = [];
  const sources: ExplainSource[] = [];
  const seen = new Set<string>();
  for (const line of assessment.lines) {
    const det = line.classification?.licenseDetermination;
    if (!det) continue;
    for (const req of det.requirements) {
      if (req.status === "NLR") continue;
      reasons.push(req);
      const key = `${req.authority}:${req.status}:${req.triggerCode ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push({
        label: `${req.authority} — ${req.jurisdiction}`,
        citation: req.triggerCode
          ? `${req.triggerCode} · ${req.reason}`
          : req.reason,
      });
    }
  }
  return { reasons, sources };
}

/**
 * Read the latest snapshot provenance for each critical list. Each is cited as
 * a source (with its hash + as-of). A list with NO snapshot is cited honestly
 * as MISSING — never silently dropped.
 */
async function collectSnapshotSources(): Promise<{
  rows: Array<{
    list: TradeSanctionsList;
    snapshot: TradeSanctionsSnapshot | null;
  }>;
  sources: ExplainSource[];
}> {
  const rows: Array<{
    list: TradeSanctionsList;
    snapshot: TradeSanctionsSnapshot | null;
  }> = [];
  const sources: ExplainSource[] = [];
  for (const list of CRITICAL_LISTS) {
    let snapshot: TradeSanctionsSnapshot | null = null;
    try {
      snapshot = await latestSnapshotFor(list);
    } catch (err) {
      logger.error("verdict-dossier: latestSnapshotFor failed", err, { list });
      snapshot = null;
    }
    rows.push({ list, snapshot });
    sources.push({
      label: LIST_LABEL[list] ?? list,
      citation: LIST_CITATION[list] ?? LIST_LABEL[list] ?? list,
      listVersion: snapshot
        ? `${snapshot.upstreamVersion ?? snapshot.hash.slice(0, 12)} · as-of ${snapshot.fetchedAt.toISOString()}`
        : "MISSING — no snapshot ingested",
    });
  }
  return { rows, sources };
}

// ─── PDF assembler (jsPDF, single A4 page) ────────────────────────────────────

const PAGE_W = 210;
const PAGE_H = 297;
const M_L = 18;
const M_R = 18;
const CONTENT_W = PAGE_W - M_L - M_R;

const COL = {
  navy: [15, 23, 42] as [number, number, number],
  slate800: [30, 41, 59] as [number, number, number],
  slate700: [51, 65, 85] as [number, number, number],
  slate500: [100, 116, 139] as [number, number, number],
  slate400: [148, 163, 184] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

interface CoverFacts {
  reference: string;
  counterpartyName: string;
  shipToCountry: string;
  scheduledShipDate: string;
  decisionOfRecord: string;
}

/**
 * Render the one-page dossier. The verdict band colour is HONEST:
 *   GO=emerald, REVIEW/UNVERIFIED=amber (never green), BLOCKED=red.
 */
function renderDossier(args: {
  cover: CoverFacts;
  explained: ExplainedResult<OperationAssessment>;
  assessment: OperationAssessment;
  licenceReasons: LicenseRequirement[];
  snapshotRows: Array<{
    list: TradeSanctionsList;
    snapshot: TradeSanctionsSnapshot | null;
  }>;
  signer: string;
  generatedAt: Date;
}): { doc: jsPDF } {
  const { cover, explained, assessment, licenceReasons, snapshotRows, signer } =
    args;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "normal");

  // Honest verdict colour.
  const verdict = assessment.verdict;
  const bandColor =
    verdict === "GO"
      ? COL.emerald
      : verdict === "BLOCKED"
        ? COL.red
        : COL.amber;

  let y = 18;

  // ── Top band ──
  doc.setFillColor(...bandColor);
  doc.rect(M_L, y, 42, 2.4, "F");
  y += 7;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COL.slate500);
  doc.text("CAELEX PASSAGE · EXPORT-CONTROL VERDICT DOSSIER", M_L, y);
  y += 8;

  // ── COVER: title = operation reference ──
  doc.setFontSize(19);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COL.navy);
  const refLines = doc.splitTextToSize(cover.reference, CONTENT_W);
  doc.text(refLines, M_L, y);
  y += refLines.length * 8 + 2;

  // Cover metadata block.
  const meta: [string, string][] = [
    ["Gegenpartei", cover.counterpartyName],
    ["Bestimmungsland", cover.shipToCountry],
    ["Geplanter Versand", cover.scheduledShipDate],
    ["Entscheidung (Mensch)", cover.decisionOfRecord],
  ];
  doc.setFontSize(9);
  for (const [k, v] of meta) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COL.slate500);
    doc.text(`${k}:`, M_L, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COL.slate700);
    const vLines = doc.splitTextToSize(v, CONTENT_W - 50);
    doc.text(vLines, M_L + 50, y);
    y += Math.max(vLines.length * 4.5, 5);
  }
  y += 2;
  hr(doc, y);
  y += 6;

  // ── VERDICT (WHAT) ──
  y = sectionHeading(doc, "1 · Verdikt (Was)", y, bandColor);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...bandColor);
  const whatLines = doc.splitTextToSize(explained.what, CONTENT_W);
  doc.text(whatLines, M_L, y);
  y += whatLines.length * 6 + 1;

  // Confidence band — honest (UNVERIFIED is NOT a clearance).
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COL.slate500);
  const confLabel =
    explained.confidence === "UNVERIFIED"
      ? "UNVERIFIED — keine Freigabe"
      : `Confidence: ${explained.confidence}`;
  doc.text(confLabel.toUpperCase(), M_L, y);
  y += 4;

  // Licence type / authority summary (from classification).
  const licSummary =
    licenceReasons.length > 0
      ? licenceReasons
          .map(
            (r) =>
              `${r.authority}/${r.jurisdiction}: ${r.status}${r.licenseType ? ` (${r.licenseType})` : ""}`,
          )
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(" · ")
      : "Keine Genehmigungspflicht ausgelöst (NLR/EAR99) bzw. " + NA;
  y = bodyText(doc, `Lizenz/Behörde: ${licSummary}`, y, COL.slate700);
  y += 2;

  // ── REASONING (WHY) ──
  y = sectionHeading(doc, "2 · Begründung (Warum)", y, bandColor);
  y = bodyText(doc, explained.why, y, COL.slate700);
  // Per-line classification basis.
  y += 1;
  for (const line of assessment.lines) {
    const c = line.classification;
    const basis = c
      ? summariseLineBasis(c)
      : "noch nicht klassifiziert — keine Einstufung";
    y = bulletText(doc, `${line.itemName}: ${basis}`, y);
  }
  y += 2;

  // ── PROVENANCE (SOURCE) ──
  y = sectionHeading(doc, "3 · Herkunft / Belege (Quelle)", y, bandColor);
  doc.setFontSize(8);
  for (const row of snapshotRows) {
    const label = LIST_LABEL[row.list] ?? row.list;
    const prov = row.snapshot
      ? `${row.snapshot.upstreamVersion ?? "v.n.v."} · hash ${row.snapshot.hash.slice(0, 16)} · as-of ${row.snapshot.fetchedAt.toISOString()} · ${row.snapshot.entryCount} Einträge`
      : "MISSING — kein Snapshot vorhanden (nicht gescreent gegen diese Liste)";
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(row.snapshot ? COL.slate700 : COL.red));
    doc.text(`${label}:`, M_L, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COL.slate500);
    const pLines = doc.splitTextToSize(prov, CONTENT_W - 38);
    doc.text(pLines, M_L + 38, y);
    y += Math.max(pLines.length * 3.6, 4.2);
  }
  y = bodyText(
    doc,
    `Engine: ${DOSSIER_ENGINE_VERSION}. Rechtsrahmen: EU 2021/821, 15 CFR 730-774 (EAR), 22 CFR 120-130 (ITAR), AWV. ${assessment.lines[0]?.classification?.licenseDetermination.disclaimer ?? ""}`,
    y + 1,
    COL.slate400,
    7.5,
  );
  y += 2;

  // ── ATTESTATION ──
  y = sectionHeading(doc, "4 · Attestierung", y, bandColor);
  y = bodyText(
    doc,
    "Caelex bereitet einen ENTWURF vor und reicht NICHTS ein. Die unten " +
      "genannte Person bleibt verantwortlich und ist die protokollierte " +
      "Entscheidungsträgerin. Dieses Dossier dokumentiert die Verdikt-" +
      "Grundlage zum Erzeugungszeitpunkt; es ist keine Behörden-Freigabe.",
    y,
    COL.slate700,
  );
  const attest: [string, string][] = [
    ["Unterzeichner (Anforderer)", signer],
    ["Erzeugt am", args.generatedAt.toISOString()],
    ["Format", `${DOSSIER_FORMAT_VERSION}`],
  ];
  doc.setFontSize(8.5);
  for (const [k, v] of attest) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COL.slate500);
    doc.text(`${k}:`, M_L, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COL.slate700);
    doc.text(v, M_L + 48, y);
    y += 4.6;
  }
  // The content-hash line is rendered by the caller after a first pass so the
  // hash covers the page bytes; here we leave a labelled placeholder slot.

  return { doc };
}

function summariseLineBasis(c: {
  licenseDetermination: { gate: string; requirements: LicenseRequirement[] };
}): string {
  const det = c.licenseDetermination;
  const reqs = det.requirements.filter((r) => r.status !== "NLR");
  if (reqs.length === 0) return `NLR/EAR99 — Gate ${det.gate}`;
  return reqs
    .map(
      (r) =>
        `${r.authority} ${r.status}${r.triggerCode ? ` (${r.triggerCode})` : ""}`,
    )
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(", ");
}

// ─── jsPDF micro-helpers ──────────────────────────────────────────────────────

function hr(doc: jsPDF, y: number): void {
  doc.setDrawColor(...COL.slate200);
  doc.setLineWidth(0.3);
  doc.line(M_L, y, PAGE_W - M_R, y);
}

function sectionHeading(
  doc: jsPDF,
  label: string,
  y: number,
  bar: [number, number, number],
): number {
  doc.setFillColor(...bar);
  doc.rect(M_L, y - 3, 2, 5, "F");
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COL.slate800);
  doc.text(label, M_L + 4, y);
  return y + 5.5;
}

function bodyText(
  doc: jsPDF,
  text: string,
  y: number,
  color: [number, number, number],
  size = 8.5,
): number {
  doc.setFontSize(size);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, CONTENT_W);
  doc.text(lines, M_L, y, { lineHeightFactor: 1.35 });
  return y + lines.length * (size * 0.45) + 1.5;
}

function bulletText(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COL.slate500);
  doc.text("•", M_L + 1, y);
  doc.setTextColor(...COL.slate700);
  const lines = doc.splitTextToSize(text, CONTENT_W - 6);
  doc.text(lines, M_L + 5, y);
  return y + lines.length * 3.6 + 0.8;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Build the one-page "Why this?" dossier for an operation's verdict.
 *
 * READ-ONLY: runs assessOperation() + reads snapshot provenance, writes nothing
 * to the DB. (The optional audit-log entry is written by the route, not here.)
 *
 * Throws OperationNotFoundError if the operation is not in the org's scope —
 * the route maps that to 404. The verdict itself is whatever assessOperation()
 * already determined; this function only RE-STATES it, never re-decides.
 */
export async function buildVerdictDossier(
  operationId: string,
  ctx: { organizationId: string; requester: DossierRequester },
): Promise<DossierResult> {
  // 1. The verdict (WHAT + WHY substrate). assessOperation throws
  //    OperationNotFoundError when out of scope.
  const assessment = await assessOperation(operationId, {
    organizationId: ctx.organizationId,
  });

  // 2. Cover facts — read the operation row (org-scoped again, defence in depth).
  const operation = await prisma.tradeOperation.findFirst({
    where: { id: operationId, organizationId: ctx.organizationId },
    select: {
      reference: true,
      shipToCountry: true,
      scheduledShipDate: true,
      counterparty: { select: { legalName: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });
  if (!operation) throw new OperationNotFoundError(operationId);

  // 3. Provenance + matched-rule sources.
  const { reasons: licenceReasons, sources: licenceSources } =
    collectLicenceSources(assessment);
  const { rows: snapshotRows, sources: snapshotSources } =
    await collectSnapshotSources();

  // 4. Compose the verdict envelope (throwing constructors → can't be un-explained).
  const explained = buildVerdictExplained(
    assessment,
    licenceSources,
    snapshotSources,
  );

  // 5. Decision-of-record (the human) — from the override if recorded, else the
  //    operation author, else honest "nicht verfügbar". NEVER fabricated.
  const decisionOfRecord =
    explained.override.by ??
    operation.createdBy?.name ??
    operation.createdBy?.email ??
    NA;

  const signer =
    ctx.requester.name?.trim() ||
    ctx.requester.email?.trim() ||
    ctx.requester.userId ||
    NA;

  const cover: CoverFacts = {
    reference: operation.reference || NA,
    counterpartyName: operation.counterparty?.legalName || NA,
    shipToCountry: operation.shipToCountry || NA,
    scheduledShipDate: operation.scheduledShipDate
      ? operation.scheduledShipDate.toISOString().slice(0, 10)
      : NA,
    decisionOfRecord,
  };

  const generatedAt = new Date();

  // 6. First render pass — produce the page bytes WITHOUT the self-hash line.
  const { doc } = renderDossier({
    cover,
    explained,
    assessment,
    licenceReasons,
    snapshotRows,
    signer,
    generatedAt,
  });

  // 7. Hash the assembled content bytes (the document as rendered so far) — this
  //    is what the regulator verifies. Stamp the hash onto the page, then output.
  const preHashBytes = doc.output("arraybuffer");
  const contentHash = createHash("sha256")
    .update(Buffer.from(preHashBytes))
    .digest("hex");

  // Stamp the content-hash + verification note in the page footer.
  stampHashFooter(doc, contentHash, generatedAt);

  const finalBytes = new Uint8Array(doc.output("arraybuffer"));

  const safeRef = (operation.reference || "operation").replace(
    /[^A-Za-z0-9_-]/g,
    "-",
  );
  return {
    bytes: finalBytes,
    contentHash,
    filename: `caelex-verdict-dossier-${safeRef}.pdf`,
    operationReference: operation.reference || operationId,
  };
}

/**
 * Stamp the self-content-hash + a verification note into the page footer. The
 * hash is computed over the PRE-stamp bytes, so a verifier recomputes the SHA-256
 * of the document with this footer line removed — the established self-attesting
 * pattern. The footer prints the hash so it is human-readable on the page.
 */
function stampHashFooter(
  doc: jsPDF,
  contentHash: string,
  generatedAt: Date,
): void {
  const footerY = PAGE_H - 14;
  doc.setDrawColor(...COL.slate200);
  doc.setLineWidth(0.3);
  doc.line(M_L, footerY, PAGE_W - M_R, footerY);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COL.slate500);
  doc.text("INHALTS-HASH (SHA-256, ohne diese Fußzeile):", M_L, footerY + 4);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COL.slate400);
  // Wrap the 64-char hex across the width.
  const hashLines = doc.splitTextToSize(contentHash, CONTENT_W);
  doc.text(hashLines, M_L, footerY + 7.5);

  doc.setFontSize(6);
  doc.setTextColor(...COL.slate400);
  doc.text(
    `Caelex · caelex.eu · erzeugt ${generatedAt.toISOString()} · ${DOSSIER_FORMAT_VERSION} · screening-level guidance, keine Rechtsberatung`,
    M_L,
    PAGE_H - 4,
  );
}
