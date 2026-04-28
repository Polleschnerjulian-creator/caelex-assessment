/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * One-shot HTTP wrapper around prisma/fix-admin-access.ts. Exists so
 * the fix can be applied on prod without local DB credentials — hit
 * with the CRON_SECRET bearer token from anywhere.
 *
 * REVERT THIS FILE in the next commit after the 5 authorized accounts
 * are bootstrapped — keeping a privilege-escalation endpoint live is
 * a standing security risk even with secret-gating.
 *
 *   curl -X POST https://app.caelex.eu/api/admin/bootstrap-admins \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * Same idempotency + logic as prisma/fix-admin-access.ts:
 *   - User.role          → "admin"
 *   - User.isActive      → true
 *   - User.onboardingCompleted → true   (clears the /onboarding redirect)
 *   - Caelex-org membership → OWNER     (auto-creates if missing)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const ADMIN_EMAILS = [
  "julian@caelex.eu",
  "cs@ahrensandco.de",
  "polleschnerjulian@gmail.com",
  "niklas@caelex.eu",
  "niklas0506wieczorek@gmail.com",
];

const CAELEX_ORG_ID = "cmmngncn7000213hsaf2dvtk6";

function isValidCronSecret(header: string, secret: string): boolean {
  try {
    const headerBuffer = Buffer.from(header);
    const expectedBuffer = Buffer.from(`Bearer ${secret}`);
    if (headerBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(headerBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

interface PerEmailResult {
  email: string;
  status: "fixed" | "noop" | "not_found";
  changes: string[];
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }
  if (
    !isValidCronSecret(request.headers.get("authorization") ?? "", cronSecret)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const caelexOrg = await prisma.organization.findUnique({
    where: { id: CAELEX_ORG_ID },
    select: { id: true, name: true, isActive: true },
  });
  if (!caelexOrg) {
    return NextResponse.json(
      { error: `Caelex org ${CAELEX_ORG_ID} not found` },
      { status: 500 },
    );
  }
  if (!caelexOrg.isActive) {
    return NextResponse.json(
      { error: `Caelex org "${caelexOrg.name}" is INACTIVE` },
      { status: 500 },
    );
  }

  const results: PerEmailResult[] = [];

  for (const email of ADMIN_EMAILS) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        onboardingCompleted: true,
        organizationMemberships: {
          where: { organizationId: CAELEX_ORG_ID },
          select: { role: true },
        },
      },
    });

    if (!user) {
      results.push({ email, status: "not_found", changes: [] });
      continue;
    }

    const changes: string[] = [];

    if (user.role !== "admin") {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "admin" },
      });
      changes.push(`role: ${user.role} → admin`);
    }
    if (!user.isActive) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true },
      });
      changes.push("isActive: false → true");
    }
    if (!user.onboardingCompleted) {
      await prisma.user.update({
        where: { id: user.id },
        data: { onboardingCompleted: true },
      });
      changes.push("onboardingCompleted: false → true");
    }

    const existing = user.organizationMemberships[0];
    if (!existing) {
      await prisma.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: CAELEX_ORG_ID,
          role: "OWNER",
        },
      });
      changes.push("caelex-membership: created (OWNER)");
    } else if (existing.role !== "OWNER") {
      await prisma.organizationMember.updateMany({
        where: { userId: user.id, organizationId: CAELEX_ORG_ID },
        data: { role: "OWNER" },
      });
      changes.push(`caelex-membership: ${existing.role} → OWNER`);
    }

    results.push({
      email,
      status: changes.length === 0 ? "noop" : "fixed",
      changes,
    });

    if (changes.length > 0) {
      logger.info(`[bootstrap-admins] ${email}: ${changes.join(", ")}`);
    }
  }

  const summary = {
    fixed: results.filter((r) => r.status === "fixed").length,
    noop: results.filter((r) => r.status === "noop").length,
    not_found: results.filter((r) => r.status === "not_found").length,
  };

  return NextResponse.json({
    ok: true,
    org: { id: caelexOrg.id, name: caelexOrg.name },
    summary,
    results,
    note: "Affected users must log out + back in for the new role to propagate into their JWT.",
  });
}
