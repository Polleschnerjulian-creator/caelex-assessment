/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/admin/seed-pharos-test
 *
 * One-shot endpoint that provisions a Pharos test setup against the
 * live database. Mirrors prisma/seed-pharos-test.ts but reachable
 * over HTTP — useful when DATABASE_URL isn't available locally and
 * you don't want to attach Prisma Studio to production.
 *
 * Auth:
 *   Header: Authorization: Bearer <PHAROS_SEED_TOKEN>
 *   The PHAROS_SEED_TOKEN env-var is REQUIRED. If not set the route
 *   returns 503 — never an empty-string-bypass.
 *
 * Body (all fields optional):
 *   {
 *     "email":    "you@example.com",   // attaches THIS user to the
 *                                       // AUTHORITY org. Default:
 *                                       // pharos-test@caelex.local
 *     "password": "ChooseAStrongOne1!", // only used if no user with
 *                                       // that email exists yet.
 *     "orgName":  "BAFA — Test (Pharos)" // optional override.
 *   }
 *
 * Behaviour:
 *   - Existing user with that email: password UNTOUCHED. Just becomes
 *     OWNER of the AUTHORITY org. Log in with your normal credentials.
 *   - New user: password is hashed and stored. Returned in the
 *     response so you can log in once.
 *   - The AUTHORITY org, AuthorityProfile, and demo OversightRelations
 *     to up-to-3 existing OPERATOR orgs are created idempotently.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).max(128).optional(),
  orgName: z.string().min(2).max(120).optional(),
});

const DEFAULT_EMAIL = "pharos-test@caelex.local";
const DEFAULT_ORG_NAME = "BAFA — Test (Pharos)";
const DEFAULT_ORG_SLUG = "bafa-test-pharos";

export async function POST(request: NextRequest) {
  try {
    // ─── Auth — Bearer token gate ────────────────────────────────────
    const expected = process.env.PHAROS_SEED_TOKEN;
    if (!expected || expected.length < 16) {
      return NextResponse.json(
        {
          error:
            "PHAROS_SEED_TOKEN env var not configured (must be at least 16 chars). Set it in Vercel project settings, then redeploy.",
        },
        { status: 503 },
      );
    }

    const authHeader = request.headers.get("authorization") ?? "";
    const supplied = authHeader.replace(/^Bearer\s+/i, "").trim();
    // Constant-time-ish comparison (length check first, then equality).
    if (supplied.length !== expected.length || supplied !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ─── Parse body ──────────────────────────────────────────────────
    const raw = await request.json().catch(() => ({}));
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const email = parsed.data.email ?? DEFAULT_EMAIL;
    const orgName = parsed.data.orgName ?? DEFAULT_ORG_NAME;
    const password =
      parsed.data.password ??
      "PharosTest" + randomBytes(4).toString("hex") + "!";

    // ─── 1. User (preserve password if user already exists) ──────────
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, password: true },
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
          name: "Pharos Test-Officer",
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

    // ─── 2. AUTHORITY-Org ────────────────────────────────────────────
    let org = await prisma.organization.findUnique({
      where: { slug: DEFAULT_ORG_SLUG },
      select: { id: true, orgType: true, isActive: true, name: true },
    });
    if (!org) {
      org = await prisma.organization.create({
        data: {
          slug: DEFAULT_ORG_SLUG,
          name: orgName,
          orgType: "AUTHORITY",
          isActive: true,
          plan: "FREE",
        },
        select: { id: true, orgType: true, isActive: true, name: true },
      });
    } else if (org.orgType !== "AUTHORITY" || !org.isActive) {
      org = await prisma.organization.update({
        where: { id: org.id },
        data: { orgType: "AUTHORITY", isActive: true, name: orgName },
        select: { id: true, orgType: true, isActive: true, name: true },
      });
    }

    // Membership (OWNER)
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

    // ─── 3. AuthorityProfile ─────────────────────────────────────────
    const profile = await prisma.authorityProfile.upsert({
      where: { organizationId: org.id },
      update: {
        authorityType: "BAFA",
        jurisdiction: "DE",
        oversightCategories: [
          "COMPLIANCE_ASSESSMENTS",
          "AUTHORIZATION_WORKFLOWS",
          "DOCUMENTS",
          "TIMELINE_DEADLINES",
          "INCIDENTS",
        ],
        contactEmail: email,
        legalReference: "§ 14 Weltraumgesetz (WRV) i.V.m. Art. 7 EU Space Act",
      },
      create: {
        organizationId: org.id,
        authorityType: "BAFA",
        jurisdiction: "DE",
        oversightCategories: [
          "COMPLIANCE_ASSESSMENTS",
          "AUTHORIZATION_WORKFLOWS",
          "DOCUMENTS",
          "TIMELINE_DEADLINES",
          "INCIDENTS",
        ],
        contactEmail: email,
        legalReference: "§ 14 Weltraumgesetz (WRV) i.V.m. Art. 7 EU Space Act",
      },
      select: { id: true },
    });

    // ─── 4. Demo OversightRelationships to existing operators ────────
    const operators = await prisma.organization.findMany({
      where: { orgType: "OPERATOR", isActive: true },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
      take: 3,
    });

    const created: { id: string; operator: string }[] = [];
    for (const op of operators) {
      const exists = await prisma.oversightRelationship.findFirst({
        where: {
          authorityProfileId: profile.id,
          operatorOrgId: op.id,
        },
        select: { id: true },
      });
      if (exists) continue;

      const ov = await prisma.oversightRelationship.create({
        data: {
          authorityProfileId: profile.id,
          operatorOrgId: op.id,
          oversightTitle: `Demo-Aufsicht: ${op.name}`,
          oversightReference: `BAFA-DEMO-${Math.floor(
            Math.random() * 9000 + 1000,
          )}`,
          legalReference: "§ 14 WRV i.V.m. Art. 7 EU Space Act",
          status: "ACTIVE",
          mandatoryDisclosure: [
            { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] },
            { category: "INCIDENTS", permissions: ["READ"] },
          ],
          voluntaryDisclosure: [],
          initiatedBy: userId,
          acceptedBy: userId,
          acceptedAt: new Date(),
          effectiveFrom: new Date(),
          effectiveUntil: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000),
          handshakeHash: "demo:" + randomBytes(16).toString("hex"),
        },
        select: { id: true },
      });
      created.push({ id: ov.id, operator: op.name });
    }

    return NextResponse.json({
      ok: true,
      message: "Pharos test setup complete.",
      login: {
        url: "/pharos-login",
        email,
        password: passwordWasSet
          ? password
          : "<unverändert — bestehende Credentials des Users>",
        passwordWasSet,
      },
      authorityOrg: {
        id: org.id,
        name: org.name,
        role: "OWNER",
      },
      demoOversights: {
        new: created.length,
        operators: created.map((c) => c.operator),
        skippedExisting: operators.length - created.length,
      },
      next: "Gehe nach /pharos-login, melde dich mit den oberen Daten an, dann landest du auf /pharos.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`seed-pharos-test failed: ${msg}`);
    return NextResponse.json(
      { error: "Seed failed", detail: msg },
      { status: 500 },
    );
  }
}
