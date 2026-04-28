/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/admin/seed-atlas-test
 *
 * One-shot endpoint that provisions an Atlas-test setup against the
 * live database. Mirrors `seed-pharos-test` but for LAW_FIRM orgs:
 *
 *   1. User (default `atlas-demo@caelex.local`) — existing user's
 *      password is preserved; new user gets a fresh hashed password.
 *   2. LAW_FIRM Org "Demo Kanzlei (Atlas Test)" — slug atlas-test-demo,
 *      orgType LAW_FIRM, isActive true.
 *   3. Membership: user is OWNER of the org.
 *
 * Auth: Bearer token from PHAROS_SEED_TOKEN env (re-uses the existing
 * env-var rather than introducing a new one).
 *
 * Body (optional): `{ email?, password?, orgName? }`. All defaults
 * sensible for a quick demo login.
 *
 * Returns the login info in JSON.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).max(128).optional(),
  orgName: z.string().min(2).max(120).optional(),
});

const DEFAULT_EMAIL = "atlas-demo@caelex.local";
const DEFAULT_PASSWORD = "AtlasDemoKanzlei2026!";
const DEFAULT_ORG_NAME = "Demo Kanzlei (Atlas Test)";
const DEFAULT_ORG_SLUG = "atlas-test-demo";

export async function POST(request: NextRequest) {
  try {
    // Bearer-Token gate — re-uses PHAROS_SEED_TOKEN. Same trust scope
    // as seed-pharos-test / migrate-atlas-workspace (one shared knob).
    const expected = process.env.PHAROS_SEED_TOKEN;
    if (!expected || expected.length < 16) {
      return NextResponse.json(
        { error: "PHAROS_SEED_TOKEN not configured" },
        { status: 503 },
      );
    }
    const supplied = (request.headers.get("authorization") ?? "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const email = parsed.data.email ?? DEFAULT_EMAIL;
    const password = parsed.data.password ?? DEFAULT_PASSWORD;
    const orgName = parsed.data.orgName ?? DEFAULT_ORG_NAME;

    // Step 1: User — preserve password if user already exists.
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    let userId: string;
    let passwordWasSet = false;
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      userId = existing.id;
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      const created = await prisma.user.create({
        data: {
          email,
          name: "Atlas Test-Anwalt",
          password: passwordHash,
          role: "user",
          isActive: true,
          emailVerified: new Date(),
        },
        select: { id: true },
      });
      userId = created.id;
      passwordWasSet = true;
    }

    // Step 2: LAW_FIRM Org — upsert via slug, ensure orgType + isActive.
    let org = await prisma.organization.findUnique({
      where: { slug: DEFAULT_ORG_SLUG },
      select: { id: true, orgType: true, isActive: true, name: true },
    });
    if (!org) {
      org = await prisma.organization.create({
        data: {
          slug: DEFAULT_ORG_SLUG,
          name: orgName,
          orgType: "LAW_FIRM",
          isActive: true,
          plan: "FREE",
        },
        select: { id: true, orgType: true, isActive: true, name: true },
      });
    } else if (org.orgType !== "LAW_FIRM" || !org.isActive) {
      org = await prisma.organization.update({
        where: { id: org.id },
        data: { orgType: "LAW_FIRM", isActive: true, name: orgName },
        select: { id: true, orgType: true, isActive: true, name: true },
      });
    }

    // Step 3: Membership (OWNER) — joinedAt is NORMAL (not epoch like
    // Pharos-preview) so this won't override Atlas's natural ordering.
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId,
        },
      },
      update: { role: "OWNER" },
      create: {
        organizationId: org.id,
        userId,
        role: "OWNER",
      },
    });

    // MED-5: never echo the plaintext password in the JSON response.
    // The caller already supplied it (or used the documented default),
    // so leaking it here only widens the exposure surface (Vercel
    // function logs, Sentry breadcrumbs, network traces). The success
    // signal `passwordWasSet` tells the operator whether a fresh hash
    // was written without disclosing the secret.
    return NextResponse.json({
      ok: true,
      message: "Atlas test setup complete.",
      login: {
        url: "/atlas-login",
        email,
        passwordWasSet,
      },
      lawFirmOrg: {
        id: org.id,
        name: org.name,
        slug: DEFAULT_ORG_SLUG,
        role: "OWNER",
      },
      next: "Gehe nach /atlas-login mit den vom Aufrufer gesetzten Credentials. ⌘5 öffnet einen Workspace.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`seed-atlas-test failed: ${msg}`);
    return NextResponse.json(
      { error: "Seed failed", detail: msg },
      { status: 500 },
    );
  }
}
