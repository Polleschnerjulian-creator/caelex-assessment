/**
 * Pulse Email Dispatcher — Sprint 4E
 *
 * Builds the `PulseEmailContext` from a stored `PulseLead` row and
 * routes through the existing `sendEmail()` function for the chosen
 * stage. Used by:
 *
 *   - `/api/public/pulse/detect` and `/api/public/pulse/stream`: fire
 *     the **day-0 delivery** immediately after lead creation
 *     (best-effort — email failures don't block the API response)
 *   - `/api/cron/pulse-nurture`: walk PulseLead rows, send day-1 /
 *     day-3 / day-7 stage emails based on `createdAt` age + the
 *     `lastEmailStage` field on the row
 *
 * **Idempotence:** the cron writes `lastEmailStage` after each send,
 * so a same-day re-run skips already-sent stages. The day-0 trigger
 * uses an `if (!lead.lastEmailStage) send day0` check to avoid
 * double-sending if a request retries.
 *
 * **Halt-aware:** the underlying `sendEmail()` already checks
 * `isEmailDispatchHalted()` — we don't duplicate that here.
 *
 * **Unsubscribe:** if the lead's `unsubscribed` flag is true, we
 * skip silently. Sprint 4E ships only the schema + dispatcher
 * skip-logic; the actual /unsubscribe route lands in a future PR.
 */

import "server-only";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  renderPulseEmail,
  type PulseEmailContext,
  type PulseEmailStage,
} from "./templates";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pulseLead = (prisma as any).pulseLead;

interface PulseLeadRow {
  id: string;
  legalName: string;
  email: string;
  detectionResult: unknown;
  createdAt: Date;
  unsubscribed?: boolean;
  lastEmailStage?: PulseEmailStage | null;
}

interface DetectionSnapshot {
  successfulSources?: string[];
  failedSources?: Array<{ source: string }>;
  mergedFields?: Array<{
    fieldName: string;
    value: unknown;
    agreementCount: number;
  }>;
}

/** Public entry — send the email for `stage` to a lead. */
export async function sendPulseEmail(
  leadId: string,
  stage: PulseEmailStage,
): Promise<{ sent: boolean; reason?: string }> {
  const lead: PulseLeadRow | null = await pulseLead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      legalName: true,
      email: true,
      detectionResult: true,
      createdAt: true,
      unsubscribed: true,
      lastEmailStage: true,
    },
  });

  if (!lead) {
    return { sent: false, reason: "lead-not-found" };
  }
  if (lead.unsubscribed) {
    logger.info("[pulse-email] skipping — unsubscribed", {
      leadId,
      stage,
    });
    return { sent: false, reason: "unsubscribed" };
  }
  // Stage-idempotence — never resend the same stage to a single lead
  if (
    lead.lastEmailStage &&
    stageOrder(lead.lastEmailStage) >= stageOrder(stage)
  ) {
    return { sent: false, reason: "already-sent" };
  }

  const ctx = buildContext(lead);
  const rendered = renderPulseEmail(stage, ctx);

  const result = await sendEmail({
    to: lead.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    notificationType: "pulse_nurture",
    entityType: "pulse_lead",
    entityId: lead.id,
    metadata: { stage },
  });

  if (!result.success) {
    logger.warn("[pulse-email] send failed", {
      leadId,
      stage,
      error: result.error,
    });
    return { sent: false, reason: result.error ?? "send-failed" };
  }

  // Mark the stage as sent so subsequent cron ticks skip it
  try {
    await pulseLead.update({
      where: { id: leadId },
      data: { lastEmailStage: stage, lastEmailSentAt: new Date() },
    });
  } catch (err) {
    logger.warn("[pulse-email] stage-update failed (non-fatal)", {
      leadId,
      stage,
      error: (err as Error).message,
    });
  }

  return { sent: true };
}

/**
 * Convenience wrapper for the API routes — fire-and-forget the day-0
 * delivery email after lead creation. Caught + logged here so the
 * caller doesn't have to wrap.
 */
export async function fireDay0Delivery(leadId: string): Promise<void> {
  try {
    await sendPulseEmail(leadId, "day0");
  } catch (err) {
    logger.error("[pulse-email] day-0 delivery threw", {
      leadId,
      error: (err as Error).message ?? String(err),
    });
  }
}

// ─── Internals ─────────────────────────────────────────────────────────────

function buildContext(lead: PulseLeadRow): PulseEmailContext {
  const snapshot = (lead.detectionResult ?? {}) as DetectionSnapshot;
  const successfulCount = snapshot.successfulSources?.length ?? 0;
  const failedCount = snapshot.failedSources?.length ?? 0;
  const mergedFields = (snapshot.mergedFields ?? []).map((f) => ({
    fieldName: f.fieldName,
    value: f.value,
    agreementCount: f.agreementCount,
  }));
  const establishment =
    (mergedFields.find((f) => f.fieldName === "establishment")?.value as
      | string
      | undefined) ?? null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.caelex.com";

  return {
    legalName: lead.legalName,
    email: lead.email,
    leadId: lead.id,
    reportUrl: `${baseUrl}/api/public/pulse/report/${lead.id}`,
    signupUrl: `${baseUrl}/signup?leadId=${lead.id}`,
    demoUrl: `${baseUrl}/demo?leadId=${lead.id}`,
    unsubscribeUrl: `${baseUrl}/api/public/pulse/unsubscribe/${lead.id}`,
    successfulSourceCount: successfulCount,
    failedSourceCount: failedCount,
    mergedFields,
    establishment,
  };
}

const STAGE_ORDER: Record<PulseEmailStage, number> = {
  day0: 0,
  day1: 1,
  day3: 2,
  day7: 3,
};

function stageOrder(stage: PulseEmailStage): number {
  return STAGE_ORDER[stage];
}
