/**
 * POST /api/ontology/seed
 *
 * Admin-only endpoint that runs the ontology seed pipeline followed by
 * post-seed validation. Requires platform-level admin role or CRON_SECRET.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { seedOntology } from "@/lib/ontology/seed";
import { validateOntology } from "@/lib/ontology/seed-validation";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Allow CRON_SECRET-based auth (for CLI / cron triggers)
    const cronSecret = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");
    const isCronAuth =
      cronSecret &&
      process.env.CRON_SECRET &&
      cronSecret === process.env.CRON_SECRET;

    if (!isCronAuth) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Require platform-level admin role
      await requireRole(["admin"]);
    }

    // Run seed pipeline
    const seedResult = await seedOntology();

    if (!seedResult.success) {
      return NextResponse.json(
        {
          error: "Seed failed",
          errors: seedResult.errors,
          duration: seedResult.duration,
        },
        { status: 500 },
      );
    }

    // Run post-seed validation
    const validation = await validateOntology();

    logger.info("Ontology seed completed", {
      userId: isCronAuth ? "cron" : "admin",
      nodeCount: seedResult.nodeCount,
      edgeCount: seedResult.edgeCount,
      valid: validation.valid,
      duration: seedResult.duration,
    });

    return NextResponse.json({
      seed: {
        success: seedResult.success,
        version: seedResult.version,
        nodeCount: seedResult.nodeCount,
        edgeCount: seedResult.edgeCount,
        nodesByType: seedResult.nodesByType,
        edgesByType: seedResult.edgesByType,
        duration: seedResult.duration,
      },
      validation,
    });
  } catch (error: unknown) {
    const errName = error instanceof Error ? error.name : "";
    if (errName === "UnauthorizedError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (errName === "ForbiddenError") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    logger.error("Error seeding ontology", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
