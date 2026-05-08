import "server-only";

/**
 * Sprint UF21 — Server-side helpers for the use-case persona.
 *
 * The client-side `useUseCase()` hook reads from localStorage; this
 * server module reads from the User.useCase Prisma column (added
 * by migration 20260508185105_user_use_case).
 *
 * # Why two paths exist
 *
 * Server actions / API routes can't read localStorage. They need
 * the durable column for RBAC decisions like "block this PUT
 * because the user is in auditor mode". The client side keeps
 * localStorage for instant UI personalization (no network round-
 * trip per render).
 *
 * # Why this is honest enforcement, not theatre
 *
 * The auditor RBAC check on /api/tracker/articles uses
 * `assertNotAuditor` which 403s mutating requests when the
 * server-side useCase is "auditor". The client-side disabled
 * buttons + ReadOnlyBanner from UF9 remain — they're now
 * defense-in-depth, not the only barrier.
 *
 * A motivated attacker can NO LONGER bypass by clearing
 * localStorage: the server reads from User.useCase. The only path
 * to bypass is the user changing their persona via the
 * /api/user/use-case PATCH endpoint, which is itself audit-logged
 * (UF21 logAuditEvent on persona change).
 */

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export type UseCase = "operator" | "consultant" | "auditor" | "investor";

/**
 * Read the persona from the DB for a given user. Returns null when
 * the user has no persona set yet (legacy account, or wizard never
 * completed).
 */
export async function getUserUseCase(userId: string): Promise<UseCase | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { useCase: true },
  });
  if (!row?.useCase) return null;
  // Defensive narrowing: column is `String?` so any value is
  // technically allowed. Validate before returning.
  return isValidUseCase(row.useCase) ? row.useCase : null;
}

function isValidUseCase(v: string): v is UseCase {
  return ["operator", "consultant", "auditor", "investor"].includes(v);
}

/**
 * Sprint UF21 — RBAC primitive: 403 the request when the active
 * persona is "auditor", else return null to signal "proceed".
 *
 * Use this at the top of any mutating API route that the auditor
 * persona must not be allowed to call. Returns a NextResponse
 * directly so the route handler can do:
 *
 *     const block = await assertNotAuditor(userId);
 *     if (block) return block;
 *
 * Why we 403 instead of silently no-op'ing: an honest auditor
 * shouldn't be hitting these endpoints at all (the client-side
 * UF9 guards prevent it). A 403 surfaces the misconfiguration
 * clearly + lands in the audit log via the rejection path.
 */
export async function assertNotAuditor(
  userId: string,
): Promise<NextResponse | null> {
  const useCase = await getUserUseCase(userId);
  if (useCase === "auditor") {
    return NextResponse.json(
      {
        error: "Forbidden",
        code: "AUDITOR_READ_ONLY",
        message:
          "Mutations are disabled in auditor mode. Switch persona in onboarding settings to perform write actions.",
      },
      { status: 403 },
    );
  }
  return null;
}
