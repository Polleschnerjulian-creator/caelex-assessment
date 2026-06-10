/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/assessment/v2/pdf/dossier — the lawyer-grade obligation dossier
 * (plan Task 3.4). PDF by default; `?format=json` returns the machine-readable
 * export of the SAME stored substrate.
 *
 * Contract:
 *   - ACCOUNT-GATED (NextAuth session — the full tier sits behind a free
 *     account, founder §11.2) + `export` rate-limit tier, keyed per user.
 *   - PROFILE OWNERSHIP enforced: snapshot → profile → `userId` must equal
 *     the session user. A missing profile, a foreign profile and an unclaimed
 *     anonymous profile are the SAME 404 (no enumeration).
 *   - READ-ONLY composition from the STORED latest FULL verdict snapshot —
 *     nothing is recomputed and no client-supplied answers are accepted
 *     (honesty invariant 3). No FULL snapshot yet → 404.
 *   - STALENESS GUARD: if the profile's answers materially changed since the
 *     snapshot was computed (`profile.version !== snapshot.profileVersion`),
 *     the export is refused with 409 — a dossier that echoes answers the
 *     verdict was NOT computed from would pair facts with the wrong verdict,
 *     which is a fabrication. Recalculate first.
 *   - PDF: application/pdf + Content-Disposition attachment + the
 *     self-attesting SHA-256 in `X-Caelex-Dossier-Hash`.
 *   - JSON (`?format=json`): the stored `AssessmentVerdictSnapshot.result` +
 *     the answers echo + the rulebook block — same ownership gate, same
 *     staleness guard, nothing recomputed.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { RULEBOOK } from "@/data/assessment/rulebook";
import { buildObligationDossierPdf } from "@/lib/pdf/assessment/obligation-dossier.server";

export const runtime = "nodejs";

const JSON_FORMAT_VERSION = "caelex-obligation-dossier-json-v1";

const querySchema = z.object({
  profileId: z.string().min(1, "profileId is required"),
  format: z.enum(["pdf", "json"]).optional().default("pdf"),
});

export async function GET(request: NextRequest) {
  try {
    // ─── Account gate (the full tier sits behind an account) ───
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // ─── Rate limit (export tier — generated-document download) ───
    const rl = await checkRateLimit("export", `user:${userId}`);
    if (!rl.success) return createRateLimitResponse(rl);

    // ─── Query validation ───
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      profileId: url.searchParams.get("profileId") ?? undefined,
      format: url.searchParams.get("format") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const { profileId, format } = parsed.data;

    // ─── Ownership: profile.userId === session user, else ONE 404 ───
    // (missing, foreign and unclaimed-anonymous profiles are indistinguishable)
    const profile = await prisma.operatorAssessmentProfile.findUnique({
      where: { id: profileId },
      select: { id: true, userId: true, version: true, answers: true },
    });
    if (!profile || profile.userId === null || profile.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ─── The STORED latest FULL verdict — never recomputed ───
    const snapshot = await prisma.assessmentVerdictSnapshot.findFirst({
      where: { profileId: profile.id, tier: "FULL" },
      orderBy: { createdAt: "desc" },
    });
    if (!snapshot) {
      return NextResponse.json(
        { error: "No full assessment result for this profile yet" },
        { status: 404 },
      );
    }

    // ─── Staleness guard: the echo must be the answers the verdict rests on ───
    if (profile.version !== snapshot.profileVersion) {
      return NextResponse.json(
        {
          error:
            "Answers have changed since this verdict was computed — recalculate before exporting, so the dossier echoes the answers the verdict actually rests on.",
        },
        { status: 409 },
      );
    }

    // ─── JSON export: stored result + answers echo + rulebook block ───
    if (format === "json") {
      const datePart = new Date().toISOString().slice(0, 10);
      return NextResponse.json(
        {
          format: JSON_FORMAT_VERSION,
          snapshot: {
            id: snapshot.id,
            profileId: snapshot.profileId,
            profileVersion: snapshot.profileVersion,
            tier: snapshot.tier,
            rulebookVersion: snapshot.rulebookVersion,
            createdAt: snapshot.createdAt,
          },
          result: snapshot.result,
          answers: profile.answers,
          rulebook: {
            version: RULEBOOK.version,
            sources: RULEBOOK.sources,
          },
        },
        {
          status: 200,
          headers: {
            "Content-Disposition": `attachment; filename="caelex-obligation-dossier-${datePart}.json"`,
            "Cache-Control": "no-store",
          },
        },
      );
    }

    // ─── PDF: read-only composition from the stored substrate ───
    const pdf = buildObligationDossierPdf(
      snapshot.result,
      profile.answers,
      { name: session.user.name, email: session.user.email },
      { snapshotId: snapshot.id, profileVersion: snapshot.profileVersion },
    );

    return new NextResponse(Buffer.from(pdf.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdf.filename}"`,
        "Cache-Control": "no-store",
        "X-Caelex-Dossier-Hash": pdf.contentHash,
      },
    });
  } catch (error) {
    logger.error("assessment v2 dossier export failed", error);
    return NextResponse.json(
      { error: "Failed to generate the obligation dossier" },
      { status: 500 },
    );
  }
}
