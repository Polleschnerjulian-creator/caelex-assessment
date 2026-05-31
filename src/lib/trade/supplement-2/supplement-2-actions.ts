"use server";

/**
 * Trade Supplement No. 2 server actions (Z29, Tier 4).
 *
 * Thin wrappers around `supplement-2-service.ts` with auth + role
 * check + Zod input parsing. Same pattern as `euc-actions.ts` /
 * `reexport-actions.ts`.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  markFiled,
  generateReport,
  parseReportingPeriod,
} from "./supplement-2-service";
import {
  resolveActionContext,
  TradeActionError as ActionError,
} from "@/lib/trade/resolve-action-context";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const EDITOR_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;

function assertEditor(role: string) {
  if (!(EDITOR_ROLES as readonly string[]).includes(role)) {
    throw new ActionError(
      "Insufficient role — MANAGER or higher required to manage Supplement No. 2 reports",
    );
  }
}

const MarkFiledInputSchema = z.object({
  reportId: z.string().min(1),
  bisReferenceNumber: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
});

/**
 * Server action: mark a Supplement No. 2 report as FILED (or AMENDED
 * for a re-file). `filedAt` is server-side `new Date()` — we don't
 * trust client-supplied timestamps for audit purposes.
 */
export async function markReportFiled(input: unknown): Promise<ActionResult> {
  try {
    const parsed = MarkFiledInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Invalid input",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { userId, orgId, role } = await resolveActionContext();
    assertEditor(role);

    const report = await markFiled({
      organizationId: orgId,
      reportId: parsed.data.reportId,
      filedAt: new Date(),
      bisReferenceNumber: parsed.data.bisReferenceNumber ?? null,
      notes: parsed.data.notes ?? null,
      lastActionById: userId,
    });

    revalidatePath("/trade/reports/supplement-2");
    revalidatePath(`/trade/reports/supplement-2/${report.id}`);
    return { ok: true, id: report.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("markReportFiled failed", err);
    return { ok: false, error: message };
  }
}

const RegenerateInputSchema = z.object({
  reportingPeriod: z
    .string()
    .regex(/^\d{4}-H[12]$/, 'Period must look like "YYYY-H1" or "YYYY-H2"'),
});

/**
 * Server action: manually re-aggregate a DRAFT report. Useful when
 * operators add late operations to a period after the cron's initial
 * draft. Refuses for FILED / AMENDED reports.
 */
export async function regenerateReport(input: unknown): Promise<ActionResult> {
  try {
    const parsed = RegenerateInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Invalid input",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const { userId, orgId, role } = await resolveActionContext();
    assertEditor(role);

    const period = parseReportingPeriod(parsed.data.reportingPeriod);
    const report = await generateReport(orgId, period, userId);

    revalidatePath("/trade/reports/supplement-2");
    revalidatePath(`/trade/reports/supplement-2/${report.id}`);
    return { ok: true, id: report.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("regenerateReport failed", err);
    return { ok: false, error: message };
  }
}
