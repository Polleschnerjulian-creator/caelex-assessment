import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos Daily Briefing.
 *
 * Generiert pro Behörden-Profil eine Zusammenfassung der wichtigsten
 * Pharos-Aktivitäten der letzten 24h:
 *   - Frist-kritische Workflows (< 6h Rest)
 *   - Frist-verletzte Workflows (Breached*)
 *   - Offene Mitzeichnungen mit Pflicht-Rolle des Empfängers fehlend
 *   - Abnormale Webhook-Aktivität (> 10% rejected)
 *   - Norm-Drift-Alerts (neu seit gestern)
 *
 * Output: strukturiertes BriefingPayload, das vom Cron-Endpoint per
 * E-Mail (Resend) verschickt UND als signed Receipt in der Audit-
 * Chain protokolliert wird.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  EU_SPACE_ACT_AUTH_FSM_DEF,
  NIS2_INCIDENT_FSM_DEF,
} from "./workflow-fsm";
import { DEFAULT_PROFILES } from "./multi-party-approval";

const FSM_DEFS = {
  "nis2-incident-v1": NIS2_INCIDENT_FSM_DEF,
  "eu-space-act-authorisation-v1": EU_SPACE_ACT_AUTH_FSM_DEF,
};

export interface BriefingPayload {
  authorityProfileId: string;
  generatedAt: string;
  summary: {
    workflowsTotal: number;
    workflowsBreached: number;
    workflowsCritical: number; // < 6h Rest
    approvalsOpen: number;
    approvalsUrgent: number; // < 24h
    webhookInvocations24h: number;
    webhookRejectionRate: number; // 0..1
    newDriftAlerts: number;
  };
  topPriorities: BriefingPriority[];
  /** Sha256 über das Payload-JSON — landet in der Briefing-Hash-Chain. */
  briefingHash: string;
}

export interface BriefingPriority {
  kind:
    | "workflow-breach"
    | "workflow-critical"
    | "approval-urgent"
    | "webhook-anomaly"
    | "drift";
  message: string;
  href?: string;
  severity: "critical" | "warn" | "info";
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v).sort())
        out[k] = (v as Record<string, unknown>)[k];
      return out;
    }
    return v;
  });
}

export async function generateBriefing(
  authorityProfileId: string,
): Promise<BriefingPayload> {
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 3600_000);

  const [openCases, openApprovals, webhookInvocs24h, newDrifts] =
    await Promise.all([
      prisma.workflowCase.findMany({
        where: { authorityProfileId, closedAt: null },
        select: {
          id: true,
          fsmId: true,
          caseRef: true,
          currentState: true,
          enteredStateAt: true,
        },
      }),
      prisma.approvalRequest.findMany({
        where: {
          authorityProfileId,
          status: "OPEN",
          expiresAt: { gt: new Date() },
        },
        select: {
          id: true,
          kind: true,
          expiresAt: true,
          signatures: { select: { approverRole: true } },
        },
      }),
      prisma.pharosWebhookInvocation.findMany({
        where: {
          endpoint: { authorityProfileId },
          receivedAt: { gte: dayAgo },
        },
        select: { status: true },
      }),
      prisma.normDriftAlert.findMany({
        where: { detectedAt: { gte: dayAgo }, status: "OPEN" },
        select: { id: true, normAnchorId: true },
      }),
    ]);

  // Compute workflow tones
  const priorities: BriefingPriority[] = [];
  let workflowsBreached = 0;
  let workflowsCritical = 0;

  for (const c of openCases) {
    if (c.currentState.startsWith("Breached")) {
      workflowsBreached++;
      priorities.push({
        kind: "workflow-breach",
        severity: "critical",
        message: `${c.caseRef} — Frist verletzt (${c.currentState})`,
        href: `/pharos/workflow/${c.id}`,
      });
      continue;
    }
    const def = (FSM_DEFS as Record<string, typeof NIS2_INCIDENT_FSM_DEF>)[
      c.fsmId
    ];
    const stateDef = def?.states[c.currentState as keyof typeof def.states] as
      | { after?: { afterMs: number } }
      | undefined;
    if (!stateDef?.after) continue;
    const remaining =
      stateDef.after.afterMs - (now - c.enteredStateAt.getTime());
    if (remaining > 0 && remaining < 6 * 3600_000) {
      workflowsCritical++;
      priorities.push({
        kind: "workflow-critical",
        severity: "warn",
        message: `${c.caseRef} — < 6h bis ${c.currentState}-Frist`,
        href: `/pharos/workflow/${c.id}`,
      });
    }
  }

  // Approvals < 24h
  let approvalsUrgent = 0;
  for (const a of openApprovals) {
    const remaining = a.expiresAt.getTime() - now;
    if (remaining < 24 * 3600_000) {
      approvalsUrgent++;
      const profile = DEFAULT_PROFILES[a.kind as keyof typeof DEFAULT_PROFILES];
      const present = new Set(a.signatures.map((s) => s.approverRole));
      const missing = (profile?.requiredRoles ?? []).filter(
        (r) => !present.has(r),
      );
      priorities.push({
        kind: "approval-urgent",
        severity: remaining < 2 * 3600_000 ? "critical" : "warn",
        message: `${a.kind} — ${a.signatures.length}/${profile?.k ?? 2} sigs · fehlt: ${missing.join(", ") || "Quorum"}`,
        href: `/pharos/approvals/${a.id}`,
      });
    }
  }

  // Webhook anomaly
  const total = webhookInvocs24h.length;
  const rejected = webhookInvocs24h.filter(
    (i) => i.status !== "ACCEPTED",
  ).length;
  const rejectionRate = total === 0 ? 0 : rejected / total;
  if (total >= 10 && rejectionRate > 0.1) {
    priorities.push({
      kind: "webhook-anomaly",
      severity: "warn",
      message: `Webhook-Anomalie: ${(rejectionRate * 100).toFixed(0)}% rejected (${rejected}/${total})`,
      href: "/pharos/webhooks",
    });
  }

  // Drift alerts
  if (newDrifts.length > 0) {
    priorities.push({
      kind: "drift",
      severity: "info",
      message: `${newDrifts.length} neue Norm-Drift-Alert(s) seit gestern`,
    });
  }

  // Sort: critical → warn → info
  priorities.sort((a, b) => {
    const order = { critical: 0, warn: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  const summary = {
    workflowsTotal: openCases.length,
    workflowsBreached,
    workflowsCritical,
    approvalsOpen: openApprovals.length,
    approvalsUrgent,
    webhookInvocations24h: total,
    webhookRejectionRate: Number(rejectionRate.toFixed(3)),
    newDriftAlerts: newDrifts.length,
  };

  const payload: Omit<BriefingPayload, "briefingHash"> = {
    authorityProfileId,
    generatedAt: new Date().toISOString(),
    summary,
    topPriorities: priorities.slice(0, 10),
  };
  const briefingHash = sha256Hex(canonicalJson(payload));

  return { ...payload, briefingHash };
}

/** Cron-style sweep: generate briefing for every authority-profile +
 *  send Resend-Email an alle aktiven Mitglieder.
 *
 *  Wenn RESEND_API_KEY fehlt, läuft das Generieren trotzdem durch
 *  (für Logging) — nur kein Email-Versand. */
export async function generateBriefingForAllAuthorities(): Promise<{
  generated: number;
  errors: number;
  emailsSent: number;
  emailsSkipped: number;
  emailErrors: number;
}> {
  const profiles = await prisma.authorityProfile.findMany({
    select: { id: true },
    where: { organization: { isActive: true } },
  });

  // Lazy-import to avoid loading Resend on cold paths if disabled.
  const { sendBriefingEmails } = await import("./briefing-email");

  let generated = 0;
  let errors = 0;
  let emailsSent = 0;
  let emailsSkipped = 0;
  let emailErrors = 0;

  for (const p of profiles) {
    try {
      const briefing = await generateBriefing(p.id);
      logger.info(
        `[pharos-briefing] ${p.id}: ${briefing.summary.workflowsBreached} breached, ${briefing.summary.approvalsUrgent} urgent approvals, ${briefing.summary.newDriftAlerts} drift, hash=${briefing.briefingHash.slice(0, 16)}`,
      );
      generated++;

      const sendResult = await sendBriefingEmails(briefing);
      emailsSent += sendResult.sent;
      emailsSkipped += sendResult.skipped;
      emailErrors += sendResult.errors;
      if (!sendResult.ok && sendResult.reason) {
        logger.warn(
          `[pharos-briefing] email send for ${p.id} reason=${sendResult.reason}`,
        );
      }
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[pharos-briefing] ${p.id} failed: ${msg}`);
    }
  }
  return { generated, errors, emailsSent, emailsSkipped, emailErrors };
}
