import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { revalidatePath } from "next/cache";

/**
 * defineAction() — the Palantir-style Action framework for Comply v2.
 *
 * Every state-changing operation in V2 (mark-attested, snooze-item,
 * request-evidence, submit-NCA, escalate-to-counsel, …) is declared
 * once via this factory. The single declaration produces:
 *
 *   1. A `serverAction` callable from Server Components and forms
 *      (Next.js 15 Server Actions semantics).
 *   2. A `call()` callable from any server context with a typed
 *      argument tuple — used by Astra tools, cron jobs, webhook
 *      handlers.
 *   3. A `paletteVerb` registration for the Cmd-K Command Palette,
 *      auto-discovered via the registry below.
 *   4. An `astraToolDefinition` that the Astra engine registers as
 *      a tool — the AI inherits the same auth + validation gates as
 *      the human user.
 *
 * Auth gates:
 *   - `criteria.requireAuthenticated` — default true; rejects guests
 *   - `criteria.requireRoles` — at least one of the listed user roles
 *   - `criteria.allowSuperAdminBypass` — default true; super-admins
 *     skip role checks (see lib/super-admin.ts)
 *
 * High-impact actions can set `requiresApproval: true`. Phase 2 will
 * intercept these and write an AstraProposal row instead of executing
 * directly. Phase 1 ignores the flag and executes immediately.
 *
 * See docs/CAELEX-COMPLY-CONCEPT.md § 5 (Action Layer) and
 * § 7 (AstraProposal).
 */

export interface ActionContext {
  userId: string;
  userEmail: string | null | undefined;
  userRole: string | null | undefined;
  isSuperAdmin: boolean;
}

export class ActionAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionAuthError";
  }
}

export class ActionValidationError extends Error {
  issues: z.ZodIssue[];
  constructor(message: string, issues: z.ZodIssue[]) {
    super(message);
    this.name = "ActionValidationError";
    this.issues = issues;
  }
}

interface ActionCriteria {
  requireAuthenticated?: boolean;
  requireRoles?: string[];
  allowSuperAdminBypass?: boolean;
}

export interface PaletteVerbConfig {
  /** Human-readable label shown in the Cmd-K palette. */
  label: string;
  /** Subtitle / helper text. */
  hint?: string;
  /** Group bucket. */
  group: "navigate" | "create" | "ai" | "settings" | "item";
  /** Lucide icon name (string — resolved at render time to keep this
   *  module server-safe). */
  iconName: string;
  /** When true, only registered as a contextual verb (requires a
   *  selected ComplianceItem). Phase 2 wires that up. */
  contextual?: boolean;
}

export interface AstraToolConfig {
  /** Whether Astra is allowed to call this action. */
  enabled: boolean;
  /** Description for the LLM. Should describe the action verb,
   *  preconditions, and side effects. */
  description: string;
  /** When true, Astra writes an AstraProposal instead of executing
   *  directly. Reviewer (the user) approves to apply. */
  requiresProposal?: boolean;
}

export interface ActionConfig<TSchema extends z.ZodTypeAny> {
  /** Stable machine name — `kebab-case`, e.g. `"snooze-compliance-item"`. */
  name: string;
  /** Short human description. Surfaces in audit logs and palette UI. */
  description: string;
  /** Zod input schema. Inferred at type-level for the handler. */
  schema: TSchema;
  /** Auth + role gates. */
  criteria?: ActionCriteria;
  /** Set true to defer execution to an AstraProposal queue (Phase 2). */
  requiresApproval?: boolean;
  /** The actual mutation. Receives validated params + auth context. */
  handler: (params: z.infer<TSchema>, ctx: ActionContext) => Promise<unknown>;
  /** Cmd-K palette registration. Omit to hide from palette. */
  paletteVerb?: PaletteVerbConfig;
  /** Astra tool registration. Omit to hide from AI. */
  astra?: AstraToolConfig;
}

/**
 * The shape returned by `call()` and `serverAction()` when an action
 * is gated by `requiresApproval`. Instead of executing, the action
 * writes an `AstraProposal` row that a human reviewer can later
 * approve or reject from `/dashboard/proposals`.
 */
export interface ProposalDeferral {
  status: "PROPOSED";
  proposalId: string;
  expiresAt: Date;
}

export interface DefinedAction<TSchema extends z.ZodTypeAny> {
  /** Source config (read-only). */
  readonly config: ActionConfig<TSchema>;
  /**
   * Direct server-side call — for cron jobs, Astra-tool execution,
   * webhook handlers. Does the same auth + validation as serverAction
   * but takes typed params instead of FormData.
   *
   * If the action is gated by `requiresApproval`, this writes an
   * AstraProposal row and returns `{ status: "PROPOSED", ... }`
   * instead of executing the handler. The proposal can then be
   * approved/rejected from /dashboard/proposals.
   */
  call: (
    params: z.infer<TSchema>,
    options?: { rationale?: string; itemId?: string | null },
  ) => Promise<unknown | ProposalDeferral>;
  /**
   * Server Action callable from forms (`<form action={action.serverAction}>`).
   * Reads FormData, parses according to schema, runs handler.
   * Returns either { ok: true, result } or { ok: false, error }.
   *
   * `requiresApproval` actions return { ok: true, result: ProposalDeferral }
   * — the form should redirect or show a "submitted for approval"
   * confirmation rather than treat the action as completed.
   */
  serverAction: (
    formData: FormData,
  ) => Promise<{ ok: true; result: unknown } | { ok: false; error: string }>;
  /**
   * Internal escape-hatch used by the proposal-approval flow. Skips
   * the `requiresApproval` gate (otherwise approving a proposal would
   * just create another proposal and loop forever). Still enforces
   * Zod validation and auth.
   *
   * Do NOT call this from feature code — it bypasses the trust layer.
   * Only the proposal-apply server action should use it.
   */
  applyApprovedProposal: (
    params: z.infer<TSchema>,
    asUserId: string,
  ) => Promise<unknown>;
}

const REGISTRY = new Map<string, DefinedAction<z.ZodTypeAny>>();

/**
 * Read-only access to the action registry. Used by:
 *   - CommandPalette → auto-register every action with a paletteVerb
 *   - Astra engine → auto-register every action with astra.enabled
 *   - /api/v2/actions/* — discovery endpoint for external integrations
 */
export function getActionRegistry(): ReadonlyMap<
  string,
  DefinedAction<z.ZodTypeAny>
> {
  return REGISTRY;
}

export function defineAction<TSchema extends z.ZodTypeAny>(
  config: ActionConfig<TSchema>,
): DefinedAction<TSchema> {
  if (REGISTRY.has(config.name)) {
    throw new Error(
      `Duplicate action name: "${config.name}". Action names must be unique.`,
    );
  }

  const enforceCriteria = async (): Promise<ActionContext> => {
    const criteria: Required<ActionCriteria> = {
      requireAuthenticated: config.criteria?.requireAuthenticated ?? true,
      requireRoles: config.criteria?.requireRoles ?? [],
      allowSuperAdminBypass: config.criteria?.allowSuperAdminBypass ?? true,
    };

    const session = await auth();
    if (criteria.requireAuthenticated && !session?.user?.id) {
      throw new ActionAuthError("Unauthenticated");
    }
    if (!session?.user?.id) {
      throw new ActionAuthError("Unauthenticated");
    }

    const ctx: ActionContext = {
      userId: session.user.id,
      userEmail: session.user.email,
      userRole: (session.user as { role?: string }).role,
      isSuperAdmin: isSuperAdmin(session.user.email),
    };

    if (criteria.requireRoles.length > 0) {
      const allow =
        (criteria.allowSuperAdminBypass && ctx.isSuperAdmin) ||
        (ctx.userRole && criteria.requireRoles.includes(ctx.userRole));
      if (!allow) {
        throw new ActionAuthError(
          `Action "${config.name}" requires one of roles: ${criteria.requireRoles.join(", ")}`,
        );
      }
    }

    return ctx;
  };

  const validate = (input: unknown): z.infer<TSchema> => {
    const parsed = config.schema.safeParse(input);
    if (!parsed.success) {
      throw new ActionValidationError(
        `Invalid params for action "${config.name}"`,
        parsed.error.issues,
      );
    }
    return parsed.data;
  };

  /**
   * Write an AstraProposal row instead of executing immediately.
   * Default expiry: 7 days from now.
   */
  const writeProposal = async (
    params: z.infer<TSchema>,
    ctx: ActionContext,
    options?: { rationale?: string; itemId?: string | null },
  ): Promise<ProposalDeferral> => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const proposal = await prisma.astraProposal.create({
      data: {
        userId: ctx.userId,
        actionName: config.name,
        params: params as Prisma.InputJsonValue,
        itemId: options?.itemId ?? null,
        rationale: options?.rationale ?? null,
        // decisionLog left undefined → DB defaults to NULL via the
        // Prisma JSON nullable-field semantics (Prisma.JsonNull would
        // store JSON null literal, which is different).
        expiresAt,
      },
      select: { id: true, expiresAt: true },
    });
    revalidatePath("/dashboard/proposals");
    revalidatePath("/dashboard/today");
    return {
      status: "PROPOSED",
      proposalId: proposal.id,
      expiresAt: proposal.expiresAt,
    };
  };

  const action: DefinedAction<TSchema> = {
    config,
    async call(params, options) {
      const ctx = await enforceCriteria();
      const validated = validate(params);
      if (config.requiresApproval) {
        return writeProposal(validated, ctx, options);
      }
      return config.handler(validated, ctx);
    },
    async applyApprovedProposal(params, asUserId) {
      // Bypasses requiresApproval gate AND the auth-session lookup
      // — the proposal-apply flow has already verified the approver's
      // session. We construct a synthetic context based on the
      // proposal's owner (`asUserId`) so the handler runs with the
      // *original requester's* permissions, not the approver's.
      const validated = validate(params);
      const owner = await prisma.user.findUnique({
        where: { id: asUserId },
        select: { id: true, email: true, role: true },
      });
      if (!owner) {
        throw new ActionAuthError("Proposal owner no longer exists");
      }
      const ctx: ActionContext = {
        userId: owner.id,
        userEmail: owner.email,
        userRole: owner.role,
        isSuperAdmin: isSuperAdmin(owner.email),
      };
      return config.handler(validated, ctx);
    },
    async serverAction(formData) {
      try {
        const ctx = await enforceCriteria();
        // FormData → object (single-value fields). For complex types
        // pass JSON in a single "payload" field. Two reserved fields:
        //   _rationale  → optional human-readable note for the
        //                 proposal trail (only used when
        //                 requiresApproval=true)
        //   _itemId     → optional ComplianceItem the proposal targets
        const raw: Record<string, unknown> = {};
        let rationale: string | undefined;
        let proposalItemId: string | null | undefined;
        for (const [k, v] of formData.entries()) {
          if (k === "_rationale" && typeof v === "string") {
            rationale = v;
            continue;
          }
          if (k === "_itemId" && typeof v === "string") {
            proposalItemId = v;
            continue;
          }
          if (k === "payload" && typeof v === "string") {
            try {
              Object.assign(raw, JSON.parse(v));
              continue;
            } catch {
              // fall through and treat as plain string
            }
          }
          raw[k] = v;
        }
        const validated = validate(raw);
        if (config.requiresApproval) {
          const deferral = await writeProposal(validated, ctx, {
            rationale,
            itemId: proposalItemId ?? null,
          });
          return { ok: true, result: deferral };
        }
        const result = await config.handler(validated, ctx);
        return { ok: true, result };
      } catch (err) {
        if (err instanceof ActionAuthError) {
          return { ok: false, error: err.message };
        }
        if (err instanceof ActionValidationError) {
          return {
            ok: false,
            error: `Validation failed: ${err.issues.map((i) => i.message).join("; ")}`,
          };
        }
        const message =
          err instanceof Error ? err.message : "Action failed unexpectedly";
        return { ok: false, error: message };
      }
    },
  };

  REGISTRY.set(config.name, action as DefinedAction<z.ZodTypeAny>);
  return action;
}
