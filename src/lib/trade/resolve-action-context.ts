/**
 * Shared server-action auth resolver for Trade modules (Sprint F2).
 *
 * Extracts the ten identical inline `resolveSessionContext()` copies that
 * existed across the trade server-action files into one source of truth.
 *
 * CONTRACT: throws `TradeActionError` on failure (so the server-action
 * error boundary catches it). This is DISTINCT from `getTradeAuth()` in
 * `trade-auth.ts`, which returns `null` for API-route 403s instead.
 *
 * Usage in action files:
 *   import { resolveActionContext, TradeActionError as ActionError }
 *     from "@/lib/trade/resolve-action-context";
 *
 * Keeping the local alias `ActionError` means existing `instanceof
 * ActionError` checks and `assertEditor` throws continue to work
 * unchanged — because the alias IS the same class reference.
 */

import "server-only";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";

// ─── Error class ─────────────────────────────────────────────────────

export class TradeActionError extends Error {
  constructor(public readonly publicMessage: string) {
    super(publicMessage);
    this.name = "TradeActionError";
  }
}

// ─── Context type ─────────────────────────────────────────────────────

export interface TradeActionContext {
  userId: string;
  orgId: string;
  role: string;
}

// ─── Resolver ─────────────────────────────────────────────────────────

/**
 * Resolves `{ userId, orgId, role }` for the current session.
 *
 * Super-admins bypass the `organizationMember` lookup and receive the
 * first active organisation with a synthetic `OWNER` role (mirrors the
 * behaviour of every trade page's server-side data fetch).
 *
 * Throws `TradeActionError` — never returns a nullable value — so
 * callers do not need to null-check the result.
 */
export async function resolveActionContext(): Promise<TradeActionContext> {
  const session = await auth();
  if (!session?.user?.id) throw new TradeActionError("Not signed in");
  const userId = session.user.id;

  if (isSuperAdmin(session.user.email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!anyOrg) throw new TradeActionError("No active organisation found");
    return { userId, orgId: anyOrg.id, role: "OWNER" };
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organizationId: true, role: true },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership)
    throw new TradeActionError("No active organisation membership");
  return { userId, orgId: membership.organizationId, role: membership.role };
}
