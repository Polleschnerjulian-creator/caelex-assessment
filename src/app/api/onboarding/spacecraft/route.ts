import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Onboarding-wizard Spacecraft creation endpoint.
 *
 * Accepts a batch of 1-12 spacecraft (the wizard caps at 12; bigger
 * fleets bulk-import via /modules/registration after onboarding).
 * Validates each row, then creates them all in one transaction tied
 * to the user's first organization.
 *
 * The wizard sends sparse data (just name + missionType + orbitType +
 * launch status). NORAD-ID-driven CelesTrak auto-import lives in the
 * existing `/api/spacecraft/import-tle` endpoint and is wired up
 * after the wizard completes — keeping this endpoint pure-DB-create.
 */

const VALID_MISSION_TYPES = [
  "communication",
  "earth_observation",
  "navigation",
  "science",
  "sar",
  "technology_demonstration",
  "other",
] as const;

const VALID_ORBIT_TYPES = ["LEO", "MEO", "GEO", "HEO"] as const;

const VALID_STATUSES = ["PRE_LAUNCH", "LAUNCHED", "OPERATIONAL"] as const;

const spacecraftSchema = z.object({
  name: z.string().min(1).max(100),
  missionType: z.enum(VALID_MISSION_TYPES),
  orbitType: z.enum(VALID_ORBIT_TYPES),
  status: z.enum(VALID_STATUSES).default("PRE_LAUNCH"),
  launchDate: z.string().datetime().optional().nullable(),
  noradId: z.string().max(20).optional().nullable(),
});

const requestSchema = z.object({
  spacecraft: z.array(spacecraftSchema).min(1).max(12),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Resolve the user's primary organization. This was created by
  // /api/onboarding/organization in step 2 of the wizard, so by step
  // 3 it must exist — if not, the user is doing something out of
  // order and we 409 instead of silently creating an orphan org.
  const member = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });

  if (!member) {
    return NextResponse.json(
      {
        error: "No organization found. Complete the organization step first.",
      },
      { status: 409 },
    );
  }

  // Single transaction so a partial failure doesn't leave half the
  // fleet in DB. createMany doesn't return the rows, so we do
  // sequential creates to get the IDs back for the wizard's next step.
  const created = await prisma.$transaction(
    parsed.data.spacecraft.map((sc) =>
      prisma.spacecraft.create({
        data: {
          organizationId: member.organizationId,
          name: sc.name,
          missionType: sc.missionType,
          orbitType: sc.orbitType,
          status: sc.status,
          launchDate: sc.launchDate ? new Date(sc.launchDate) : null,
          noradId: sc.noradId ?? null,
        },
        select: {
          id: true,
          name: true,
          missionType: true,
          orbitType: true,
          status: true,
        },
      }),
    ),
  );

  return NextResponse.json({
    success: true,
    spacecraft: created,
    count: created.length,
  });
}
