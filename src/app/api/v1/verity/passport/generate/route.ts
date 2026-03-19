import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildPassportData } from "@/lib/verity/passport/builder.server";

/**
 * POST /api/v1/verity/passport/generate
 * Generates a compliance passport from the organisation's active attestations.
 * Auth: Session required.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      label?: string;
      satelliteNorad?: string;
      satelliteName?: string;
      jurisdictions?: string[];
      isPublic?: boolean;
    };

    const {
      label = "Compliance Passport",
      satelliteNorad,
      satelliteName,
      jurisdictions = [],
      isPublic = true,
    } = body;

    // Resolve organisation
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organisation found for this user" },
        { status: 403 },
      );
    }

    const { organizationId } = membership;
    const operatorId = session.user.id;

    // Fetch active attestations (not revoked, not expired)
    const now = new Date();

    const dbAttestations = await prisma.verityAttestation.findMany({
      where: {
        organizationId,
        revokedAt: null,
        expiresAt: { gt: now },
        ...(satelliteNorad ? { satelliteNorad } : {}),
      },
      select: {
        attestationId: true,
        regulationRef: true,
        dataPoint: true,
        result: true,
        trustLevel: true,
        issuedAt: true,
        expiresAt: true,
      },
    });

    // Fetch active certificates
    const dbCertificates = await prisma.verityCertificate.findMany({
      where: {
        operatorId,
        revokedAt: null,
        expiresAt: { gt: now },
        ...(satelliteNorad ? { satelliteNorad } : {}),
      },
      select: {
        certificateId: true,
        claimsCount: true,
        minTrustLevel: true,
        issuedAt: true,
        expiresAt: true,
      },
    });

    // Generate a unique passport ID
    const passportId = crypto.randomUUID();

    // Build passport data (calls score calculator internally)
    const passportData = buildPassportData({
      passportId,
      label,
      operatorId,
      satelliteNorad: satelliteNorad ?? null,
      satelliteName: satelliteName ?? null,
      jurisdictions,
      attestations: dbAttestations,
      certificates: dbCertificates,
    });

    // Persist in DB
    const expiresAt = new Date(passportData.expiresAt);
    const record = await prisma.verityPassport.create({
      data: {
        passportId,
        organizationId,
        operatorId,
        satelliteNorad: satelliteNorad ?? null,
        satelliteName: satelliteName ?? null,
        label,
        attestationCount: dbAttestations.length,
        certificateCount: dbCertificates.length,
        complianceScore: passportData.complianceScore,
        scoreBreakdown: passportData.scoreBreakdown,
        attestationSummary: passportData.attestations as unknown as Parameters<
          typeof prisma.verityPassport.create
        >[0]["data"]["attestationSummary"],
        jurisdictions,
        isPublic,
        expiresAt,
      },
    });

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://caelex.eu";
    const shareUrl = `${APP_URL}/verity/passport/${record.passportId}`;

    return NextResponse.json(
      { passport: passportData, shareUrl },
      { status: 201 },
    );
  } catch (error) {
    console.error("[passport/generate]", error);
    return NextResponse.json(
      { error: "Failed to generate passport" },
      { status: 500 },
    );
  }
}
