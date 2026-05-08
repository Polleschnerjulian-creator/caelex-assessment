/**
 * Sprint UF21 — Persist the use-case persona on the User record.
 *
 * UF6 stored the persona in localStorage as a bridge while we
 * deferred the schema migration. UF21 ships the column; this
 * endpoint is what the client calls to write it.
 *
 * # When the client calls this
 *
 *   1. End of the onboarding wizard (UF6 already calls saveUseCase()
 *      to localStorage; it now ALSO POSTs here so server has it).
 *   2. On dashboard mount when localStorage has a value but the
 *      session-attached `useCase` is missing — bridges legacy users
 *      who completed onboarding before UF21 shipped.
 *   3. From a future "switch persona" UI in settings.
 *
 * # Validation
 *
 * Only the 4 known values pass. `null` is accepted explicitly to
 * support clearing the persona ("I'd rather not say"). Any other
 * input is rejected 400.
 *
 * # Audit log
 *
 * Persona changes are audit-logged because they affect downstream
 * RBAC behaviour (auditor mode disables write actions on the
 * server). An attacker swapping personas should leave a trace.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { logger } from "@/lib/logger";

const VALID_USE_CASES = [
  "operator",
  "consultant",
  "auditor",
  "investor",
] as const;

const schema = z.object({
  useCase: z.enum(VALID_USE_CASES).nullable(),
});

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { useCase } = parsed.data;

    // Read prior value so the audit log can show the transition.
    const before = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { useCase: true },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { useCase },
    });

    // Audit-log persona change. Only when value actually changed —
    // chatty noise otherwise (the bridge in dashboard layout fires on
    // every page load until first persisted write).
    if (before?.useCase !== useCase) {
      const ctx = getRequestContext(request);
      await logAuditEvent({
        userId: session.user.id,
        action: "user_use_case_changed",
        entityType: "user",
        entityId: session.user.id,
        previousValue: { useCase: before?.useCase ?? null },
        newValue: { useCase },
        description: `Use-case persona changed from "${before?.useCase ?? "none"}" to "${useCase ?? "none"}"`,
        ...ctx,
      });
    }

    return NextResponse.json({ success: true, useCase });
  } catch (err) {
    logger.error("[user/use-case] PATCH failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET — return the current persona for the logged-in user. Used by
 * the client-side bridge to decide whether to forward the
 * localStorage value to the server (or trust the server already
 * has it).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { useCase: true },
  });

  return NextResponse.json({ useCase: user?.useCase ?? null });
}
