/**
 * AstraProposal Lifecycle (Sprint B4)
 *
 * Daily cron-friendly helpers that keep the proposal queue alive:
 *
 *   1. notifyExpiringProposals(orgScope?)
 *      Finds proposals with status=PENDING and expiresAt within the next
 *      ~24h, emails the proposal owner with a "decide before midnight"
 *      reminder. Idempotent: a per-proposal flag in metadata prevents
 *      double-sending.
 *
 *   2. processExpiredProposals(orgScope?)
 *      Finds proposals past their expiresAt that are still PENDING and
 *      transitions them to status=EXPIRED with an explanatory note. The
 *      original Action stays unexecuted; user can re-propose if needed.
 *
 * Both helpers are pure orchestration — they read the DB, call sendEmail,
 * write status updates. They never throw — every per-row failure is
 * logged + counted in the return summary.
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

// ─── Configuration ─────────────────────────────────────────────────────────

const REMINDER_LOOKAHEAD_HOURS = 24;
const REMINDER_FLAG_KEY = "expiry_reminder_sent";

// ─── Public API ────────────────────────────────────────────────────────────

export interface LifecycleSummary {
  /** Number of rows scanned for the run. */
  scanned: number;
  /** Successful emails / status transitions. */
  succeeded: number;
  /** Per-row failures (transient). */
  failed: number;
  /** Rows skipped (already notified, no email on file, etc.). */
  skipped: number;
  /** Per-row error samples (first 10). */
  errors: Array<{ proposalId: string; error: string }>;
  /** Wall-clock time. */
  durationMs: number;
}

/**
 * Notify owners of PENDING proposals that expire within the next 24h.
 * Idempotent via per-proposal metadata flag.
 */
export async function notifyExpiringProposals(
  organizationId?: string,
): Promise<LifecycleSummary> {
  const t0 = Date.now();
  const cutoff = new Date(
    Date.now() + REMINDER_LOOKAHEAD_HOURS * 60 * 60 * 1000,
  );

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  const errors: LifecycleSummary["errors"] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proposals: any[] = await (prisma as any).astraProposal
    .findMany({
      where: {
        status: "PENDING",
        expiresAt: {
          gt: new Date(),
          lt: cutoff,
        },
        ...(organizationId
          ? {
              user: {
                organizationMemberships: {
                  some: { organizationId },
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        actionName: true,
        rationale: true,
        expiresAt: true,
        user: { select: { id: true, email: true, name: true } },
        reproducibility: true,
      },
      take: 200,
      orderBy: { expiresAt: "asc" },
    })
    .catch((err: unknown) => {
      logger.error("[proposal-lifecycle] notify scan failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    });

  for (const p of proposals) {
    try {
      // Idempotency: skip if already reminded in this expiry window.
      const repro =
        p.reproducibility && typeof p.reproducibility === "object"
          ? (p.reproducibility as Record<string, unknown>)
          : {};
      if (repro[REMINDER_FLAG_KEY] === true) {
        skipped++;
        continue;
      }
      if (!p.user?.email) {
        skipped++;
        continue;
      }

      const hoursLeft = Math.max(
        0,
        Math.ceil((new Date(p.expiresAt).getTime() - Date.now()) / 3_600_000),
      );

      const html = composeReminderHtml({
        actionName: p.actionName,
        rationale: p.rationale,
        userName: p.user.name ?? null,
        hoursLeft,
        proposalId: p.id,
      });

      const result = await sendEmail({
        to: p.user.email,
        subject: `Astra proposal expiring in ${hoursLeft}h — decide before it auto-expires`,
        html,
        text: composeReminderText({
          actionName: p.actionName,
          hoursLeft,
        }),
        userId: p.user.id,
        // notificationType / entityType are open string-unions in the
        // SendEmailOptions type; widen via cast to keep the proposal-lifecycle
        // tag without polluting the enum.
        metadata: {
          notificationType: "astra_proposal_expiry_reminder",
          entityType: "astra-proposal",
          proposalId: p.id,
        },
      });

      if (!result.success) {
        failed++;
        if (errors.length < 10) {
          errors.push({
            proposalId: p.id,
            error: result.error ?? "unknown email failure",
          });
        }
        continue;
      }

      // Mark as notified (additive write to reproducibility JSON).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).astraProposal.update({
        where: { id: p.id },
        data: {
          reproducibility: { ...repro, [REMINDER_FLAG_KEY]: true },
        },
      });
      succeeded++;
    } catch (err) {
      failed++;
      if (errors.length < 10) {
        errors.push({
          proposalId: p.id,
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    }
  }

  return {
    scanned: proposals.length,
    succeeded,
    failed,
    skipped,
    errors,
    durationMs: Date.now() - t0,
  };
}

/**
 * Transition PENDING proposals past their expiresAt to status=EXPIRED.
 * Returns counts; never throws.
 */
export async function processExpiredProposals(
  organizationId?: string,
): Promise<LifecycleSummary> {
  const t0 = Date.now();
  let scanned = 0;
  let succeeded = 0;
  let failed = 0;
  const errors: LifecycleSummary["errors"] = [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (prisma as any).astraProposal.updateMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: new Date() },
        ...(organizationId
          ? {
              user: {
                organizationMemberships: { some: { organizationId } },
              },
            }
          : {}),
      },
      data: {
        status: "EXPIRED",
        reviewerNote:
          "Auto-expired by proposal-lifecycle cron — no decision was made before expiresAt.",
      },
    });
    scanned = result.count;
    succeeded = result.count;
  } catch (err) {
    failed = 1;
    errors.push({
      proposalId: "(batch)",
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  return {
    scanned,
    succeeded,
    failed,
    skipped: 0,
    errors,
    durationMs: Date.now() - t0,
  };
}

// ─── Template helpers ──────────────────────────────────────────────────────

function composeReminderHtml(args: {
  actionName: string;
  rationale: string | null;
  userName: string | null;
  hoursLeft: number;
  proposalId: string;
}): string {
  const safeAction = escapeHtml(args.actionName);
  const safeRationale = args.rationale ? escapeHtml(args.rationale) : "";
  const greeting = args.userName ? `Hi ${escapeHtml(args.userName)},` : "Hi,";

  return `
<!doctype html>
<html><body style="font-family: system-ui, sans-serif; color: #0F172A; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>${greeting}</p>
  <p>An Astra proposal is waiting for your decision.</p>
  <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
    <tr>
      <td style="padding: 8px; border: 1px solid #E2E8F0; font-weight: 600; width: 140px;">Action</td>
      <td style="padding: 8px; border: 1px solid #E2E8F0;"><code>${safeAction}</code></td>
    </tr>
    ${
      safeRationale
        ? `<tr><td style="padding: 8px; border: 1px solid #E2E8F0; font-weight: 600;">Rationale</td><td style="padding: 8px; border: 1px solid #E2E8F0;">${safeRationale}</td></tr>`
        : ""
    }
    <tr>
      <td style="padding: 8px; border: 1px solid #E2E8F0; font-weight: 600;">Expires in</td>
      <td style="padding: 8px; border: 1px solid #E2E8F0;">~${args.hoursLeft}h</td>
    </tr>
  </table>
  <p>
    <a href="${baseUrl()}/dashboard/proposals"
       style="display: inline-block; background: #10B981; color: white; padding: 10px 16px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Review proposal →
    </a>
  </p>
  <p style="color: #64748B; font-size: 13px; margin-top: 24px;">
    Proposal ID: <code>${args.proposalId}</code><br/>
    If you don't decide before it expires, the action will not be executed
    and you can re-propose later.
  </p>
</body></html>`;
}

function composeReminderText(args: {
  actionName: string;
  hoursLeft: number;
}): string {
  return [
    `Astra proposal expiring in ~${args.hoursLeft}h.`,
    `Action: ${args.actionName}`,
    `Review at: ${baseUrl()}/dashboard/proposals`,
    "",
    "If you don't decide before expiry, the action will not be executed.",
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );
}

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "https://caelex.eu"
  );
}
