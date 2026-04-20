import { NextResponse } from "next/server";
import { z } from "zod";
import { getAtlasAuth, isOwner } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/** M7: tight Zod schema replaces the prior "accept any string" logic.
 *  Blocks unbounded names, javascript:/data: logo URLs and typo fields. */
const FirmPatchSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    /** null clears the logo, or an https URL up to 2048 chars */
    logoUrl: z
      .string()
      .url()
      .max(2048)
      .refine((v) => /^https:\/\//.test(v), {
        message: "logoUrl must be https",
      })
      .nullable()
      .optional(),
  })
  .strict();

// GET /api/atlas/settings/firm
export async function GET() {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    name: atlas.organizationName,
    logoUrl: atlas.organizationLogo,
    slug: atlas.organizationSlug,
    isOwner: isOwner(atlas.role),
  });
}

// PATCH /api/atlas/settings/firm — Owner only
export async function PATCH(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isOwner(atlas.role)) {
    return NextResponse.json(
      { error: "Only the owner can edit firm settings" },
      { status: 403 },
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = FirmPatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    // Audit L5: don't leak Zod schema shape in the error body. Full
    // issues go to the server log where an operator can debug.
    logger.warn("Atlas firm settings payload rejected", {
      issues: parsed.error.issues,
      userId: atlas.userId,
    });
    const fields = parsed.error.issues
      .map((i) => i.path.join("."))
      .filter(Boolean);
    return NextResponse.json(
      { error: "Invalid payload", fields },
      { status: 400 },
    );
  }

  const updates: { name?: string; logoUrl?: string | null } = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
  if (parsed.data.logoUrl !== undefined) updates.logoUrl = parsed.data.logoUrl;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  try {
    const org = await prisma.organization.update({
      where: { id: atlas.organizationId },
      data: updates,
      select: { name: true, logoUrl: true },
    });

    logger.info("Atlas firm settings updated", {
      organizationId: atlas.organizationId,
      updatedBy: atlas.userId,
      fields: Object.keys(updates),
    });

    return NextResponse.json(org);
  } catch (err) {
    logger.error("Atlas firm settings update failed", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
