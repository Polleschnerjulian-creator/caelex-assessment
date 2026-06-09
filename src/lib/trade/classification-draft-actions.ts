"use server";

/**
 * Trade Classification Draft server actions (Sprint Z4d).
 *
 * Thin wrappers around `classification-draft-service.ts` + the Z4a
 * extractor + Z4b builder. Same auth pattern as `euc-actions.ts`:
 * session → org membership → role gate → action.
 *
 * Two actions:
 *   - `generateDraftFromText` — operator paste-text path
 *   - `generateDraftFromPdf`  — operator PDF-upload path (base64
 *                                 encoded by the client because Next
 *                                 server actions can't accept File
 *                                 directly without FormData chrome)
 *   - `decideDraft`           — accept/reject/modify a pending draft
 *
 * The actions revalidate `/trade/classify` so the list refreshes.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ClassificationDraftDecision } from "@prisma/client";

import { logger } from "@/lib/logger";
import {
  resolveActionContext,
  TradeActionError as ActionError,
} from "@/lib/trade/resolve-action-context";

import {
  extractDatasheet,
  extractFromText,
  type DatasheetExtraction,
} from "@/lib/trade/datasheet-extractor";
import { buildClassificationDraft } from "@/lib/trade/classification-draft-builder";
import {
  createDraft,
  recordDecision,
  listDrafts,
  ApprovalPolicyError,
} from "@/lib/trade/classification-draft-service";
import { resolveApprovalContext } from "@/lib/trade/classification-approval-context.server";

// ─── Public action result type (mirrors euc-actions) ───────────────

export type ClassifyActionResult =
  | { ok: true; draftId: string; primary: string | null; summary: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type DecisionActionResult =
  | { ok: true; draftId: string; decision: ClassificationDraftDecision }
  | {
      ok: false;
      error: string;
      /**
       * Set when the four-eyes policy blocked the decision, so the UI
       * can render a distinct "second approver required" / "self-approval
       * blocked" state rather than a generic error toast.
       */
      policyBlock?: "SELF_APPROVAL_BLOCKED" | "SECOND_APPROVER_REQUIRED";
    };

// ─── Auth helpers ──────────────────────────────────────────────────

const EDITOR_ROLES = ["OWNER", "ADMIN", "MANAGER", "MEMBER"] as const;

function assertEditor(role: string) {
  if (!(EDITOR_ROLES as readonly string[]).includes(role)) {
    throw new ActionError(
      "Insufficient role — MEMBER or higher required to run classification drafts",
    );
  }
}

// ─── Schemas ───────────────────────────────────────────────────────

const optionalString = z
  .string()
  .optional()
  .transform((v) => {
    const t = v?.trim();
    return t && t.length > 0 ? t : null;
  });

const generateFromTextSchema = z.object({
  rawText: z
    .string()
    .min(20, "Datasheet text must be at least 20 characters")
    .max(200_000, "Datasheet text exceeds 200 kB upload limit"),
  tradeItemId: optionalString,
});

const generateFromPdfSchema = z.object({
  /** Base64-encoded PDF bytes (data: URI prefix tolerated). */
  pdfBase64: z.string().min(100, "PDF payload looks truncated"),
  sourceFilename: optionalString,
  tradeItemId: optionalString,
});

const decideSchema = z.object({
  draftId: z.string().min(1, "draftId required"),
  decision: z.enum(["ACCEPTED", "REJECTED", "MODIFIED"]),
  reviewNote: optionalString,
  /**
   * The (possibly modified) primary proposal the operator confirmed.
   * Required when decision is ACCEPTED or MODIFIED; ignored otherwise.
   *
   * For MODIFIED the operator may EDIT `canonicalId` (the control code)
   * and MUST supply `overrideSource` + `overrideJustification` — the
   * audited-reasoning fields that make the edit defensible.
   */
  acceptedSnapshot: z
    .object({
      canonicalId: z.string(),
      regime: z.string(),
      confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
      overrideSource: z.string().nullable(),
      overrideJustification: z.string().nullable(),
      modifiedFromCanonicalId: z.string().nullable(),
    })
    .partial()
    .optional()
    .nullable(),
});

export type GenerateFromTextInput = z.input<typeof generateFromTextSchema>;
export type GenerateFromPdfInput = z.input<typeof generateFromPdfSchema>;
export type DecideDraftInput = z.input<typeof decideSchema>;

// ─── Actions ───────────────────────────────────────────────────────

/**
 * Run the extractor on pasted datasheet text and persist the resulting
 * draft. Returns the new draft id + a one-line summary for the toast.
 */
export async function generateDraftFromText(
  input: GenerateFromTextInput,
): Promise<ClassifyActionResult> {
  return runGenerateAction(input, generateFromTextSchema, async (parsed) => {
    return extractFromText(parsed.rawText);
  });
}

/**
 * Run the extractor on uploaded PDF bytes and persist the resulting
 * draft. The caller is responsible for base64-encoding the file.
 */
export async function generateDraftFromPdf(
  input: GenerateFromPdfInput,
): Promise<ClassifyActionResult> {
  return runGenerateAction(input, generateFromPdfSchema, async (parsed) => {
    const buffer = decodeBase64Payload(parsed.pdfBase64);
    return extractDatasheet(buffer);
  });
}

/**
 * Record an operator decision on a pending draft. Wraps
 * `recordDecision` from the service.
 */
export async function decideDraft(
  input: DecideDraftInput,
): Promise<DecisionActionResult> {
  try {
    const ctx = await resolveActionContext();
    assertEditor(ctx.role);

    const parsed = decideSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Invalid decision payload",
      };
    }

    // Resolve the four-eyes policy + sole-approver signal for THIS org
    // and the acting user. The author identity is read inside the
    // service (from the draft row) — here we only supply the org-level
    // policy so the gate can fail closed.
    const approvalCtx = await resolveApprovalContext(ctx.orgId, ctx.userId);

    const updated = await recordDecision(
      { organizationId: ctx.orgId, userId: ctx.userId },
      {
        draftId: parsed.data.draftId,
        decision: parsed.data.decision,
        reviewNote: parsed.data.reviewNote,
        // Cast through unknown — the action's input shape is a partial
        // subset of the builder's ProposedClassification, which is the
        // entire reason the schema is `.partial()`.
        acceptedSnapshot:
          parsed.data.decision === "REJECTED"
            ? null
            : ((parsed.data.acceptedSnapshot ?? null) as unknown as
                | null
                | Parameters<typeof recordDecision>[1]["acceptedSnapshot"]),
        approvalPolicy: {
          fourEyesEnabled: approvalCtx.fourEyesEnabled,
          soleEligibleApprover: approvalCtx.soleEligibleApprover,
        },
      },
    );

    revalidatePath("/trade/classify");
    return { ok: true, draftId: updated.id, decision: updated.decision };
  } catch (err) {
    // Four-eyes block → surface the specific reason so the UI can guide
    // the operator (ask a colleague vs. add a second reviewer).
    if (err instanceof ApprovalPolicyError) {
      return {
        ok: false,
        error: err.policy.message,
        policyBlock: err.reason ?? undefined,
      };
    }
    if (err instanceof ActionError) {
      return { ok: false, error: err.publicMessage };
    }
    logger.error("classification-draft-actions: decide failed", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Unexpected error while recording decision",
    };
  }
}

/**
 * Read-only helper for server components. Returns the most recent
 * PENDING + ACCEPTED + REJECTED drafts for the current org.
 */
export async function listDraftsForCurrentOrg() {
  const ctx = await resolveActionContext();
  return listDrafts(
    { organizationId: ctx.orgId, userId: ctx.userId },
    { take: 50 },
  );
}

// ─── Internal helpers ──────────────────────────────────────────────

/**
 * Generic generate-action runner. Extracts the parsing + persistence
 * pattern shared between the text and PDF code paths.
 */
async function runGenerateAction<TSchema extends z.ZodTypeAny>(
  input: unknown,
  schema: TSchema,
  extract: (parsed: z.infer<TSchema>) => Promise<DatasheetExtraction>,
): Promise<ClassifyActionResult> {
  try {
    const ctx = await resolveActionContext();
    assertEditor(ctx.role);

    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Some fields are invalid",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      };
    }

    const extraction = await extract(parsed.data as z.infer<TSchema>);
    if (extraction.parseError) {
      return {
        ok: false,
        error: `Failed to parse datasheet: ${extraction.parseError}`,
      };
    }

    const draft = buildClassificationDraft(extraction);

    const sourceFilename =
      typeof (parsed.data as Record<string, unknown>).sourceFilename ===
      "string"
        ? ((parsed.data as Record<string, unknown>).sourceFilename as string)
        : null;

    const tradeItemId =
      typeof (parsed.data as Record<string, unknown>).tradeItemId === "string"
        ? ((parsed.data as Record<string, unknown>).tradeItemId as string)
        : null;

    const row = await createDraft(
      { organizationId: ctx.orgId, userId: ctx.userId },
      {
        tradeItemId,
        draft,
        sourceFilename,
        rawTextSnapshot: extraction.rawText,
      },
    );

    revalidatePath("/trade/classify");
    return {
      ok: true,
      draftId: row.id,
      primary: draft.primary?.canonicalId ?? null,
      summary: draft.summary,
    };
  } catch (err) {
    if (err instanceof ActionError) {
      return { ok: false, error: err.publicMessage };
    }
    logger.error("classification-draft-actions: generate failed", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Unexpected error while generating draft",
    };
  }
}

/**
 * Decode a `data:` URI or bare base64 string into a Uint8Array.
 * Mirrors the helper in `tool-executor.ts` — kept local so the server
 * action doesn't pull the entire executor module's transitive deps.
 */
function decodeBase64Payload(input: string): Uint8Array {
  const payload = input.startsWith("data:")
    ? input.replace(/^data:[^;]+;base64,/, "")
    : input;
  const buf = Buffer.from(payload, "base64");
  const MAX_BYTES = 8 * 1024 * 1024;
  if (buf.byteLength > MAX_BYTES) {
    throw new ActionError(
      `Datasheet exceeds 8 MB upload limit (received ${buf.byteLength} bytes).`,
    );
  }
  return new Uint8Array(buf);
}
