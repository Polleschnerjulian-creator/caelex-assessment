/**
 * Assure Risk Scenarios API
 * GET: Return list of available scenario templates.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import {
  scenarioTemplates,
  type ScenarioTemplate,
} from "@/data/assure/dataroom-structure";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("assure", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    if (!MANAGER_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires MANAGER role or above." },
        { status: 403 },
      );
    }

    const scenarios = scenarioTemplates.map((s: ScenarioTemplate) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      triggeredRiskCategories: s.triggeredRiskCategories,
      timeToRecover: s.timeToRecover,
    }));

    return NextResponse.json({ scenarios });
  } catch (error) {
    logger.error("Assure risk scenarios list error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
