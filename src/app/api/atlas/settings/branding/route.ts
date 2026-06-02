import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageFirm, getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { maskId } from "@/lib/atlas/log-masking";

export const runtime = "nodejs";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Kanzlei Letterhead (Briefkopf) API.
 *
 * GET  /api/atlas/settings/branding — fetch current AtlasOrgBranding row.
 * PATCH /api/atlas/settings/branding — upsert letterhead fields (OWNER or ADMIN only).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

const BrandingPatchSchema = z
  .object({
    letterheadName: z.string().trim().max(200).optional(),
    address: z.string().trim().max(1000).optional(),
    phone: z.string().trim().max(60).optional(),
    email: z.string().trim().email().max(254).optional(),
    website: z.string().trim().url().max(2048).optional(),
    raNumber: z.string().trim().max(100).optional(),
    authority: z.string().trim().max(200).optional(),
    insuranceNote: z.string().trim().max(500).optional(),
    bankName: z.string().trim().max(200).optional(),
    iban: z.string().trim().max(40).optional(),
    bic: z.string().trim().max(15).optional(),
    defaultJurisdiction: z.string().trim().max(100).optional(),
    defaultClosing: z.string().trim().max(1000).optional(),
    /** Logo stored in R2 — URL must be https. Null clears the field. */
    logoUrl: z
      .string()
      .url()
      .max(2048)
      .refine((v) => /^https:\/\//.test(v), {
        message: "logoUrl must be https",
      })
      .nullable()
      .optional(),
    logoStorageKey: z.string().trim().max(500).nullable().optional(),
    /** Client-local settings: stored as passthrough for localStorage sync.
     *  These are not persisted in the DB (no columns) but returned
     *  to let the client keep localStorage in sync with what it last saved. */
    logoDataUrl: z.string().max(300_000).nullable().optional(),
    logoWidthMm: z.number().min(15).max(60).optional(),
    footerLine: z.string().trim().max(2000).optional(),
  })
  .strict();

// GET /api/atlas/settings/branding
export async function GET() {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Upsert with empty update so we always get a row back (create if absent).
    const branding = await prisma.atlasOrgBranding.upsert({
      where: { organizationId: atlas.organizationId },
      create: { organizationId: atlas.organizationId },
      update: {},
      select: {
        letterheadName: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        raNumber: true,
        authority: true,
        insuranceNote: true,
        bankName: true,
        iban: true,
        bic: true,
        defaultJurisdiction: true,
        defaultClosing: true,
        logoUrl: true,
        logoStorageKey: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ...branding,
      canEditFirm: canManageFirm(atlas.role),
      role: atlas.role,
    });
  } catch (err) {
    logger.error("Atlas branding GET failed", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PATCH /api/atlas/settings/branding — Owner or Admin only
export async function PATCH(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageFirm(atlas.role)) {
    return NextResponse.json(
      { error: "Only owners and admins can edit firm branding" },
      { status: 403 },
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = BrandingPatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    logger.warn("Atlas branding PATCH payload rejected", {
      issues: parsed.error.issues,
      userId: maskId(atlas.userId),
    });
    const fields = parsed.error.issues
      .map((i) => i.path.join("."))
      .filter(Boolean);
    return NextResponse.json(
      { error: "Invalid payload", fields },
      { status: 400 },
    );
  }

  // Strip client-only fields that are not persisted in DB.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {
    logoDataUrl: _logoDataUrl,
    logoWidthMm: _logoWidthMm,
    footerLine: _footerLine,
    ...dbFields
  } = parsed.data;

  if (Object.keys(dbFields).length === 0) {
    // Nothing to write to DB — still return 200 (client may only
    // be saving localStorage-only fields).
    return NextResponse.json({ ok: true });
  }

  try {
    const branding = await prisma.atlasOrgBranding.upsert({
      where: { organizationId: atlas.organizationId },
      create: {
        organizationId: atlas.organizationId,
        ...dbFields,
      },
      update: dbFields,
      select: {
        letterheadName: true,
        address: true,
        phone: true,
        email: true,
        website: true,
        raNumber: true,
        authority: true,
        insuranceNote: true,
        bankName: true,
        iban: true,
        bic: true,
        defaultJurisdiction: true,
        defaultClosing: true,
        logoUrl: true,
        logoStorageKey: true,
        updatedAt: true,
      },
    });

    logger.info("Atlas branding updated", {
      organizationId: atlas.organizationId,
      updatedBy: maskId(atlas.userId),
      fields: Object.keys(dbFields),
    });

    return NextResponse.json(branding);
  } catch (err) {
    logger.error("Atlas branding PATCH failed", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
