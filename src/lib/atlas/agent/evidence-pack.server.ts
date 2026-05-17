/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Sprint D1 — Evidence-Pack ZIP Builder.
 * ────────────────────────────────────────────────────────────────────
 * Bundles one completed AtlasAgentRun into a single ZIP that's
 * Berufshaftpflicht-tauglich (insurer-grade audit evidence) and
 * ready for Akte-Archivierung.
 *
 * ZIP contents:
 *   ├─ agent-output.pdf     human-readable run summary (goal, plan,
 *   │                       artifacts, verification)
 *   ├─ citations.pdf        per-source metadata page (title, status,
 *   │                       last-verified, URL, occurrence count)
 *   ├─ audit-log.json       machine-readable structured record of the
 *   │                       FULL run — tokens, steps, reasoning,
 *   │                       approvals, lineage, costs, durations
 *   └─ README.md            human-readable index + purpose explainer
 *
 * Why these three formats:
 *   - PDFs are what the insurer / partner / client actually READS;
 *     plain-text PDFs survive 10+ years without rendering rot.
 *   - JSON is what an auditor RE-PROCESSES (re-import into another
 *     compliance tool, hash-chain verification, full-text search).
 *   - README.md tells future-you what the bundle is when you find it
 *     three years later on a shared drive.
 *
 * Why server-side (vs. client-side PDF gen like chat-briefing-pdf.ts):
 *   - The audit-log is privileged data — building it server-side
 *     means the lawyer's browser never sees fields like token-counts
 *     or budgetUsd before the membership-gate runs.
 *   - The ZIP can be 1-3 MB; server-streaming is more reliable than
 *     blob-passing through the browser's download flow.
 *
 * Pure module — exposes `buildEvidencePack()`; no HTTP / fetch.
 * The route at /api/atlas/agent/runs/[id]/evidence-pack calls this.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import archiver from "archiver";
import { Writable } from "node:stream";
import { jsPDF } from "jspdf";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/* ── Layout constants (mm, A4 portrait) ─────────────────────────── */
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 22;
const MARGIN_R = 22;
const MARGIN_T = 28;
const MARGIN_B = 24;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const MAX_Y = PAGE_H - MARGIN_B;

/* ── Caelex palette (RGB tuples for jsPDF) ──────────────────────── */
const COL = {
  navy: [15, 23, 42] as [number, number, number],
  slate800: [30, 41, 59] as [number, number, number],
  slate700: [51, 65, 85] as [number, number, number],
  slate500: [100, 116, 139] as [number, number, number],
  slate400: [148, 163, 184] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  slate50: [248, 250, 252] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export interface EvidencePack {
  buffer: Buffer;
  filename: string;
  byteLength: number;
  /// Run-status at pack-time. The caller surfaces a warning when
  /// generating for non-complete runs (a "draft" pack is allowed but
  /// flagged in the README).
  runStatus: string;
}

/* Loose row-shape we feed the renderers. Prisma's Json columns come
   back as `unknown` so each renderer must defensively guard reads. */
interface RunForPack {
  id: string;
  status: string;
  goal: string;
  templateId: string | null;
  iterations: number;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  budgetUsd: import("@prisma/client/runtime/library").Decimal | null;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
  steps: unknown;
  reasoning: unknown;
  artifacts: unknown;
  citations: unknown;
  approvalGates: unknown;
  verificationResults: unknown;
  parentRunId: string | null;
  forkedFromStep: number | null;
  mandate: { id: string; name: string; clientName: string | null } | null;
}

/**
 * Build the full ZIP for one run. Returns null if the run can't be
 * found or the caller has no access. Errors during PDF/JSON generation
 * bubble up — the route returns 500 with a sanitised message.
 */
export async function buildEvidencePack(
  runId: string,
  userId: string,
  organizationId: string,
): Promise<EvidencePack | null> {
  const run = (await prisma.atlasAgentRun.findFirst({
    where: { id: runId, userId, organizationId },
    select: {
      id: true,
      status: true,
      goal: true,
      templateId: true,
      iterations: true,
      inputTokens: true,
      outputTokens: true,
      costUsd: true,
      budgetUsd: true,
      errorMessage: true,
      startedAt: true,
      completedAt: true,
      steps: true,
      reasoning: true,
      artifacts: true,
      citations: true,
      approvalGates: true,
      verificationResults: true,
      parentRunId: true,
      forkedFromStep: true,
      mandate: {
        select: { id: true, name: true, clientName: true },
      },
    },
  })) as RunForPack | null;
  if (!run) return null;

  const agentOutputPdf = buildAgentOutputPdf(run);
  const citationsPdf = buildCitationsPdf(run);
  const auditLog = buildAuditLog(run);
  const readme = buildReadme(run);

  const zipBuffer = await assembleZip([
    { name: "agent-output.pdf", content: agentOutputPdf },
    { name: "citations.pdf", content: citationsPdf },
    {
      name: "audit-log.json",
      content: Buffer.from(JSON.stringify(auditLog, null, 2), "utf8"),
    },
    { name: "README.md", content: Buffer.from(readme, "utf8") },
  ]);

  const dateStr = (run.completedAt ?? run.startedAt).toISOString().slice(0, 10);
  return {
    buffer: zipBuffer,
    filename: `atlas-run-${runId.slice(0, 8)}-${dateStr}-evidence-pack.zip`,
    byteLength: zipBuffer.length,
    runStatus: run.status,
  };
}

/* ─────────────────────────────────────────────────────────────────
   PDF: agent-output.pdf
   ───────────────────────────────────────────────────────────────── */

function buildAgentOutputPdf(run: RunForPack): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_T;

  /* ── Cover header ── */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...COL.navy);
  doc.text("Atlas Agent-Run", MARGIN_L, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COL.slate500);
  doc.text("Evidence Pack — agent-output.pdf", MARGIN_L, y);
  y += 14;

  /* ── Meta-block ── */
  y = drawMetaBlock(doc, run, y);
  y += 6;

  /* ── Goal ── */
  y = sectionHeading(doc, "Ziel", y);
  y = drawWrappedText(doc, run.goal, y, COL.slate700, 11);
  y += 4;

  /* ── Plan + Execution (steps grouped by iteration) ── */
  const steps = toStepsArray(run.steps);
  if (steps.length > 0) {
    y = sectionHeading(doc, "Plan + Ausführung", y);
    const iters = Array.from(new Set(steps.map((s) => s.iteration))).sort(
      (a, b) => a - b,
    );
    for (const iter of iters) {
      y = ensureRoom(doc, y, 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COL.emerald);
      doc.text(`Iteration ${iter}`, MARGIN_L, y);
      y += 5;

      const iterSteps = steps.filter((s) => s.iteration === iter);
      for (const step of iterSteps) {
        y = ensureRoom(doc, y, 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(...COL.slate800);
        const tag = step.isError ? "  [Fehler]" : "";
        doc.text(`• ${step.toolName}${tag}`, MARGIN_L + 4, y);
        y += 4;
        if (step.summary) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(...COL.slate500);
          y = drawWrappedText(
            doc,
            step.summary,
            y,
            COL.slate500,
            9,
            MARGIN_L + 8,
            CONTENT_W - 4,
          );
        }
        if (step.durationMs !== undefined) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...COL.slate400);
          doc.text(`${(step.durationMs / 1000).toFixed(2)}s`, MARGIN_L + 8, y);
          y += 4;
        }
      }
      y += 2;
    }
    y += 4;
  }

  /* ── Final Artifacts ── */
  const artifacts = toArtifactsArray(run.artifacts);
  if (artifacts.length > 0) {
    y = sectionHeading(doc, "Artefakte", y);
    for (const art of artifacts) {
      y = ensureRoom(doc, y, 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...COL.slate800);
      doc.text(`[${art.kind}] ${art.title}`, MARGIN_L, y);
      y += 5;
      const body = stripMarkdown(art.body);
      y = drawWrappedText(doc, body, y, COL.slate700, 10);
      y += 4;
    }
  }

  /* ── Verification findings ── */
  const findings = toVerificationFindings(run.verificationResults);
  if (findings.length > 0) {
    y = sectionHeading(doc, "Verifikations-Hinweise", y);
    for (const f of findings) {
      y = ensureRoom(doc, y, 6);
      const color = f.severity === "error" ? COL.red : COL.amber;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...color);
      doc.text(`[${f.kind}] Artefakt ${f.artifactIndex + 1}`, MARGIN_L, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...COL.slate700);
      y = drawWrappedText(
        doc,
        f.message,
        y,
        COL.slate700,
        9,
        MARGIN_L + 4,
        CONTENT_W - 4,
      );
      y += 2;
    }
  }

  /* ── Footer on every page ── */
  drawFooter(doc, run);

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

/* ─────────────────────────────────────────────────────────────────
   PDF: citations.pdf
   ───────────────────────────────────────────────────────────────── */

function buildCitationsPdf(run: RunForPack): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_T;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COL.navy);
  doc.text("Zitierte Quellen", MARGIN_L, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COL.slate500);
  doc.text(
    `Atlas Agent-Run ${run.id.slice(0, 8)} — citations.pdf`,
    MARGIN_L,
    y,
  );
  y += 12;

  const cits = toCitationsArray(run.citations);
  if (cits.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(...COL.slate500);
    doc.text(
      "Dieser Run hat keine ATLAS-Quellen-Zitate produziert.",
      MARGIN_L,
      y,
    );
    drawFooter(doc, run);
    return Buffer.from(doc.output("arraybuffer"));
  }

  /* Header summary line. */
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COL.slate700);
  const verified = cits.filter((c) => c.badge === "in_force").length;
  const halluc = cits.filter((c) => c.badge === "unknown").length;
  doc.text(
    `${cits.length} Zitat${cits.length === 1 ? "" : "e"} insgesamt — ${verified} verifiziert, ${halluc} unresolved.`,
    MARGIN_L,
    y,
  );
  y += 10;

  for (const c of cits) {
    y = ensureRoom(doc, y, 22);

    /* Source-id (mono-look via plain font, monospace not loaded). */
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COL.slate800);
    doc.text(`[${c.index}] ${c.sourceId}`, MARGIN_L, y);

    /* Badge pill (text-only — no jsPDF rounded rect to keep size). */
    const badgeColor =
      c.badge === "in_force"
        ? COL.emerald
        : c.badge === "amended" || c.badge === "needs_review"
          ? COL.amber
          : c.badge === "unknown" || c.badge === "repealed"
            ? COL.red
            : COL.slate500;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...badgeColor);
    doc.text(c.badge.toUpperCase(), PAGE_W - MARGIN_R - 28, y, {
      align: "left",
    });
    y += 5;

    /* Title (if known). */
    if (c.title) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...COL.slate700);
      y = drawWrappedText(doc, c.title, y, COL.slate700, 10);
    }

    /* Status / lastVerified / URL. */
    const metaLines: string[] = [];
    if (c.status) metaLines.push(`Status: ${c.status}`);
    if (c.lastVerified)
      metaLines.push(
        `Last verified: ${c.lastVerified.slice(0, 10)}${
          c.staleDays !== null ? ` (vor ${c.staleDays} Tagen)` : ""
        }`,
      );
    if (c.sourceUrl) metaLines.push(`URL: ${c.sourceUrl}`);
    if (c.occurrences > 1) metaLines.push(`${c.occurrences} Erwähnungen`);
    if (metaLines.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...COL.slate500);
      for (const line of metaLines) {
        y = drawWrappedText(doc, line, y, COL.slate500, 9);
      }
    }
    y += 4;
  }

  drawFooter(doc, run);
  return Buffer.from(doc.output("arraybuffer"));
}

/* ─────────────────────────────────────────────────────────────────
   audit-log.json
   ───────────────────────────────────────────────────────────────── */

function buildAuditLog(run: RunForPack): Record<string, unknown> {
  const durationSeconds =
    run.completedAt && run.startedAt
      ? Math.round((run.completedAt.getTime() - run.startedAt.getTime()) / 1000)
      : null;
  return {
    evidencePackVersion: 1,
    generatedAt: new Date().toISOString(),
    run: {
      id: run.id,
      status: run.status,
      goal: run.goal,
      templateId: run.templateId,
      lineage: {
        parentRunId: run.parentRunId,
        forkedFromStep: run.forkedFromStep,
      },
      mandate: run.mandate
        ? {
            id: run.mandate.id,
            name: run.mandate.name,
            clientName: run.mandate.clientName,
          }
        : null,
      iterations: run.iterations,
      tokens: {
        input: run.inputTokens,
        output: run.outputTokens,
      },
      costUsd: run.costUsd,
      budgetUsd: run.budgetUsd ? Number(run.budgetUsd) : null,
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt ? run.completedAt.toISOString() : null,
      durationSeconds,
      errorMessage: run.errorMessage,
    },
    execution: {
      steps: toStepsArray(run.steps),
      reasoning: toReasoningMap(run.reasoning),
    },
    approvals: {
      gates: toApprovalGates(run.approvalGates),
    },
    outputs: {
      artifacts: toArtifactsArray(run.artifacts),
      citations: run.citations ?? null,
      verificationFindings: toVerificationFindings(run.verificationResults),
    },
  };
}

/* ─────────────────────────────────────────────────────────────────
   README.md
   ───────────────────────────────────────────────────────────────── */

function buildReadme(run: RunForPack): string {
  const date = (run.completedAt ?? run.startedAt).toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push("# Atlas Agent-Run Evidence Pack");
  lines.push("");
  lines.push(`- **Run-ID:** \`${run.id}\``);
  lines.push(`- **Datum:** ${date}`);
  if (run.mandate) {
    lines.push(`- **Mandat:** ${run.mandate.name}`);
    if (run.mandate.clientName)
      lines.push(`- **Klient:** ${run.mandate.clientName}`);
  }
  lines.push(`- **Status:** \`${run.status}\``);
  if (run.parentRunId && run.forkedFromStep) {
    lines.push(
      `- **Forked from:** \`${run.parentRunId.slice(0, 8)}\` @ Iteration ${run.forkedFromStep}`,
    );
  }
  if (run.templateId) {
    lines.push(`- **Template:** \`${run.templateId}\``);
  }
  if (run.status !== "complete") {
    lines.push("");
    lines.push(
      `> **Hinweis:** Dieser Run hat den Status \`${run.status}\`. Die Inhalte sind möglicherweise unvollständig.`,
    );
  }
  lines.push("");
  lines.push("## Inhalt");
  lines.push("");
  lines.push(
    "- `agent-output.pdf` — Mensch-lesbare Zusammenfassung (Goal, Plan, Artefakte, Verifikations-Hinweise).",
  );
  lines.push(
    "- `citations.pdf` — Pro zitierte Quelle: ATLAS-ID, Titel, Status, Last-Verified, URL.",
  );
  lines.push(
    "- `audit-log.json` — Maschinen-lesbarer strukturierter Volltext-Record des gesamten Runs (Tokens, Steps, Reasoning, Approvals, Lineage, Kosten, Zeitstempel).",
  );
  lines.push("- `README.md` — Diese Datei.");
  lines.push("");
  lines.push("## Zweck");
  lines.push("");
  lines.push(
    "Dieses Bundle dokumentiert eine autonome KI-gestützte juristische Arbeitssession und ist gedacht für:",
  );
  lines.push("");
  lines.push(
    "1. **Berufshaftpflicht** — Belegt, was Atlas unter Anwalts-Aufsicht getan hat, was freigegeben wurde, was abgelehnt wurde.",
  );
  lines.push(
    "2. **Akte-Archivierung** — Vollständiger Aktenbestandteil zur Ablage in der Mandanten-Akte.",
  );
  lines.push(
    "3. **Mandantentransparenz** — Kann (vollständig oder ausschnittweise) an den Mandanten weitergegeben werden.",
  );
  lines.push("");
  lines.push("## Verifikation");
  lines.push("");
  lines.push(
    "Der `audit-log.json` ist self-contained — alle Modell-Entscheidungen, Tool-Aufrufe + ihre Inputs, vom Anwalt erteilten Freigaben sind nachvollziehbar enthalten. Pro zitierte Quelle finden Sie in `citations.pdf` die zum Zeitpunkt der Ausführung gültige Status-Information (`in_force` / `amended` / `repealed` / `unknown`).",
  );
  lines.push("");
  lines.push("Erzeugt von Caelex Atlas am " + new Date().toISOString() + ".");
  lines.push("");
  return lines.join("\n");
}

/* ─────────────────────────────────────────────────────────────────
   ZIP assembly
   ───────────────────────────────────────────────────────────────── */

async function assembleZip(
  entries: { name: string; content: Buffer }[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const sink = new Writable({
      write(chunk: Buffer, _enc, cb) {
        chunks.push(Buffer.from(chunk));
        cb();
      },
    });
    sink.on("finish", () => resolve(Buffer.concat(chunks)));
    sink.on("error", reject);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", reject);
    /* `archiver`'s `warning` event fires for non-fatal issues
       (e.g. ENOENT on a missing file). We log + continue rather
       than reject — the only inputs we feed are Buffers, so this
       should never fire in practice. */
    archive.on("warning", (err) => {
      logger.warn("[atlas/evidence-pack] archiver warning", {
        message: err.message,
      });
    });
    archive.pipe(sink);

    for (const e of entries) {
      archive.append(e.content, { name: e.name });
    }
    void archive.finalize();
  });
}

/* ─────────────────────────────────────────────────────────────────
   jsPDF rendering helpers
   ───────────────────────────────────────────────────────────────── */

function sectionHeading(doc: jsPDF, label: string, y: number): number {
  y = ensureRoom(doc, y, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COL.navy);
  doc.text(label, MARGIN_L, y);
  y += 2;
  doc.setDrawColor(...COL.emerald);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_L, y, MARGIN_L + 20, y);
  y += 5;
  return y;
}

function drawWrappedText(
  doc: jsPDF,
  text: string,
  y: number,
  color: [number, number, number],
  size: number,
  x: number = MARGIN_L,
  maxWidth: number = CONTENT_W,
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    y = ensureRoom(doc, y, size * 0.45);
    doc.text(line, x, y);
    y += size * 0.42;
  }
  return y;
}

function drawMetaBlock(doc: jsPDF, run: RunForPack, y: number): number {
  const fields: [string, string][] = [
    ["Run-ID", run.id.slice(0, 16) + "…"],
    ["Status", run.status],
    ["Datum", (run.completedAt ?? run.startedAt).toISOString().slice(0, 10)],
    ["Iterationen", String(run.iterations)],
  ];
  if (run.mandate) fields.push(["Mandat", run.mandate.name]);
  if (run.templateId) fields.push(["Template", run.templateId]);
  if (run.costUsd !== null)
    fields.push(["Kosten", `$${run.costUsd.toFixed(4)} USD`]);
  if (run.parentRunId && run.forkedFromStep !== null)
    fields.push([
      "Forked from",
      `${run.parentRunId.slice(0, 8)} @ Iter. ${run.forkedFromStep}`,
    ]);

  /* Subtle background panel. */
  const panelH = fields.length * 5 + 6;
  doc.setFillColor(...COL.slate50);
  doc.rect(MARGIN_L, y, CONTENT_W, panelH, "F");

  let row = y + 5;
  for (const [k, v] of fields) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COL.slate500);
    doc.text(k, MARGIN_L + 3, row);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COL.slate800);
    doc.text(v, MARGIN_L + 32, row);
    row += 5;
  }
  return y + panelH;
}

function drawFooter(doc: jsPDF, run: RunForPack): void {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COL.slate400);
    const footer = `Atlas Evidence Pack · Run ${run.id.slice(0, 8)} · Seite ${i}/${total}`;
    doc.text(footer, MARGIN_L, PAGE_H - 10);
  }
}

function ensureRoom(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > MAX_Y) {
    doc.addPage();
    return MARGIN_T;
  }
  return y;
}

/* ─────────────────────────────────────────────────────────────────
   Json-column guards — defensive readers for Prisma's `unknown`
   ───────────────────────────────────────────────────────────────── */

interface StepLike {
  iteration: number;
  toolName: string;
  toolId?: string;
  input?: Record<string, unknown>;
  durationMs?: number;
  isError?: boolean;
  summary?: string;
}

function toStepsArray(raw: unknown): StepLike[] {
  if (!Array.isArray(raw)) return [];
  const out: StepLike[] = [];
  for (const s of raw) {
    if (typeof s !== "object" || s === null) continue;
    const r = s as Record<string, unknown>;
    if (typeof r.iteration !== "number") continue;
    if (typeof r.toolName !== "string") continue;
    out.push({
      iteration: r.iteration,
      toolName: r.toolName,
      toolId: typeof r.toolId === "string" ? r.toolId : undefined,
      input:
        typeof r.input === "object" && r.input !== null
          ? (r.input as Record<string, unknown>)
          : undefined,
      durationMs: typeof r.durationMs === "number" ? r.durationMs : undefined,
      isError: typeof r.isError === "boolean" ? r.isError : undefined,
      summary: typeof r.summary === "string" ? r.summary : undefined,
    });
  }
  return out;
}

interface ArtifactLike {
  kind: string;
  title: string;
  body: string;
}

function toArtifactsArray(raw: unknown): ArtifactLike[] {
  if (!Array.isArray(raw)) return [];
  const out: ArtifactLike[] = [];
  for (const a of raw) {
    if (typeof a !== "object" || a === null) continue;
    const r = a as Record<string, unknown>;
    if (
      typeof r.kind !== "string" ||
      typeof r.title !== "string" ||
      typeof r.body !== "string"
    )
      continue;
    out.push({ kind: r.kind, title: r.title, body: r.body });
  }
  return out;
}

interface CitationLite {
  sourceId: string;
  citation: string;
  badge: string;
  title: string | null;
  status: string | null;
  lastVerified: string | null;
  staleDays: number | null;
  sourceUrl: string | null;
  index: number;
  occurrences: number;
}

function toCitationsArray(raw: unknown): CitationLite[] {
  /* citations column shape per route: { total, verified, warnings,
     hallucinated, citations: [...] } — drill into the inner array. */
  if (typeof raw !== "object" || raw === null) return [];
  const r = raw as Record<string, unknown>;
  const inner = r.citations;
  if (!Array.isArray(inner)) return [];
  const out: CitationLite[] = [];
  for (const c of inner) {
    if (typeof c !== "object" || c === null) continue;
    const rc = c as Record<string, unknown>;
    if (typeof rc.sourceId !== "string") continue;
    out.push({
      sourceId: rc.sourceId,
      citation: typeof rc.citation === "string" ? rc.citation : rc.sourceId,
      badge: typeof rc.badge === "string" ? rc.badge : "unknown",
      title: typeof rc.title === "string" ? rc.title : null,
      status: typeof rc.status === "string" ? rc.status : null,
      lastVerified:
        typeof rc.lastVerified === "string" ? rc.lastVerified : null,
      staleDays: typeof rc.staleDays === "number" ? rc.staleDays : null,
      sourceUrl: typeof rc.sourceUrl === "string" ? rc.sourceUrl : null,
      index: typeof rc.index === "number" ? rc.index : 0,
      occurrences: typeof rc.occurrences === "number" ? rc.occurrences : 1,
    });
  }
  return out;
}

interface FindingLike {
  artifactIndex: number;
  kind: string;
  severity: string;
  message: string;
  citation?: string;
}

function toVerificationFindings(raw: unknown): FindingLike[] {
  if (!Array.isArray(raw)) return [];
  const out: FindingLike[] = [];
  for (const f of raw) {
    if (typeof f !== "object" || f === null) continue;
    const r = f as Record<string, unknown>;
    if (typeof r.artifactIndex !== "number") continue;
    if (typeof r.kind !== "string") continue;
    if (typeof r.severity !== "string") continue;
    if (typeof r.message !== "string") continue;
    out.push({
      artifactIndex: r.artifactIndex,
      kind: r.kind,
      severity: r.severity,
      message: r.message,
      citation: typeof r.citation === "string" ? r.citation : undefined,
    });
  }
  return out;
}

function toApprovalGates(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw;
}

function toReasoningMap(raw: unknown): Record<string, string> {
  if (typeof raw !== "object" || raw === null) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/* Strip Markdown markers for plain-text PDF rendering. v1 covers the
   common ones; complex tables / images aren't supported (they don't
   appear in Atlas artefacts in practice). */
function stripMarkdown(md: string): string {
  return (
    md
      /* Headings */
      .replace(/^#{1,6}\s+/gm, "")
      /* Bold + italic */
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      /* Inline code */
      .replace(/`([^`]+)`/g, "$1")
      /* Links — keep text, drop URL */
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      /* List bullets */
      .replace(/^[-*+]\s+/gm, "• ")
      /* Numbered list — leave as-is, jsPDF wraps fine */
      /* Horizontal rules */
      .replace(/^---+$/gm, "")
      /* Trim multi-blank-lines to max 2 */
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
