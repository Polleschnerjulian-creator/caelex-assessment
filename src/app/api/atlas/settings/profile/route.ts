import { NextResponse } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/** M7: bounded Zod schema for the user-level profile patch. */
const ProfilePatchSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    language: z.enum(["en", "de", "fr", "es"]).optional(),
  })
  .strict();

// GET /api/atlas/settings/profile
export async function GET() {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    name: atlas.userName,
    email: atlas.userEmail,
    language: atlas.userLanguage,
  });
}

// PATCH /api/atlas/settings/profile
export async function PATCH(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = ProfilePatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.format() },
      { status: 400 },
    );
  }

  const updates: { name?: string; language?: string } = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
  if (parsed.data.language !== undefined)
    updates.language = parsed.data.language;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: atlas.userId },
      data: updates,
      select: { name: true, language: true },
    });

    logger.info("Atlas profile updated", {
      userId: atlas.userId,
      fields: Object.keys(updates),
    });

    return NextResponse.json(user);
  } catch (err) {
    logger.error("Atlas profile update failed", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
