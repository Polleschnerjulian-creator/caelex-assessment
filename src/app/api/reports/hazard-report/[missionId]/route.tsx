/**
 * Hazard Report Generation API
 * POST /api/reports/hazard-report/[missionId] — Generate Hazard Report PDF
 *
 * missionId = spacecraftId
 */

import React from "react";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId } from "@/lib/hub/queries";
import { renderToBuffer } from "@react-pdf/renderer";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  HazardReportPDF,
  type HazardReportData,
  type EphemerisData,
  type ConjunctionData,
  type DebrisData,
} from "@/lib/pdf/reports/hazard-report";
import { logger } from "@/lib/logger";

// ─── Valid values ────────────────────────────────────────────────────────────

const VALID_NCA = ["CNES", "RDI", "MINISTRY_LU", "BELSPO"] as const;
const VALID_LANGUAGES = ["en", "de", "fr"] as const;

// ─── POST: Generate Hazard Report PDF ────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ missionId: string }> },
) {
  try {
    // ─── Auth + Rate Limit + Org Check ───
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rl = await checkRateLimit(
      "document_generation",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);
    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const { missionId } = await params;

    // ─── Parse Body ───
    const body = await request.json();
    const targetNCA = body.targetNCA;
    const language = body.language || "en";
    const milestone: string | null = body.milestone ?? null;

    if (!targetNCA || !VALID_NCA.includes(targetNCA)) {
      return NextResponse.json(
        {
          error:
            "Invalid targetNCA. Must be one of: CNES, RDI, MINISTRY_LU, BELSPO",
        },
        { status: 400 },
      );
    }

    if (!VALID_LANGUAGES.includes(language)) {
      return NextResponse.json(
        { error: "Invalid language. Must be one of: en, de, fr" },
        { status: 400 },
      );
    }

    // ─── Verify Spacecraft Ownership ───
    const spacecraft = await prisma.spacecraft.findFirst({
      where: {
        id: missionId,
        organizationId: orgId,
      },
    });

    if (!spacecraft) {
      return NextResponse.json(
        {
          error: "Spacecraft not found or does not belong to your organization",
        },
        { status: 404 },
      );
    }

    // ─── Fetch All Hazards ───
    const hazardEntries = await prisma.hazardEntry.findMany({
      where: {
        spacecraftId: missionId,
        organizationId: orgId,
      },
      include: {
        mitigations: true,
      },
      orderBy: { hazardId: "asc" },
    });

    // ─── Safety Gate: no hazards = no report ───
    if (hazardEntries.length === 0) {
      return NextResponse.json(
        {
          error:
            "Cannot generate hazard report: no hazards have been recorded for this spacecraft. Run /sync first.",
        },
        { status: 422 },
      );
    }

    const openItems = hazardEntries.filter(
      (h) =>
        h.acceptanceStatus !== "ACCEPTED" && h.mitigationStatus !== "CLOSED",
    );

    if (openItems.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot generate hazard report: unresolved hazards remain",
          openItems: openItems.map((h) => ({
            id: h.id,
            hazardId: h.hazardId,
            title: h.title,
            severity: h.severity,
            mitigationStatus: h.mitigationStatus,
            acceptanceStatus: h.acceptanceStatus,
          })),
          totalOpen: openItems.length,
          totalHazards: hazardEntries.length,
        },
        { status: 422 },
      );
    }

    // ─── Fetch Organization ───
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, slug: true },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // ─── Fetch Ephemeris Data (optional) ───
    let ephemerisData: EphemerisData | null = null;
    if (spacecraft.noradId) {
      const [complianceState, forecast] = await Promise.all([
        prisma.satelliteComplianceState.findFirst({
          where: {
            noradId: spacecraft.noradId,
            operatorId: orgId,
          },
          orderBy: { calculatedAt: "desc" },
        }),
        prisma.ephemerisForecast.findFirst({
          where: {
            noradId: spacecraft.noradId,
            operatorId: orgId,
          },
          orderBy: { calculatedAt: "desc" },
        }),
      ]);

      if (complianceState || forecast) {
        ephemerisData = {
          overallScore: complianceState?.overallScore ?? null,
          horizonDays: complianceState?.horizonDays ?? null,
          horizonRegulation: complianceState?.horizonRegulation ?? null,
          dataFreshness: complianceState?.dataFreshness ?? null,
          forecastHorizonDays: forecast?.horizonDays ?? null,
          f107Used: forecast?.f107Used ?? null,
          modelVersion: forecast?.modelVersion ?? null,
        };
      }
    }

    // ─── Fetch Conjunction Events (optional) ───
    let conjunctions: ConjunctionData[] = [];
    const conjunctionEvents = await prisma.conjunctionEvent.findMany({
      where: {
        spacecraftId: missionId,
        organizationId: orgId,
      },
      orderBy: { tca: "desc" },
      take: 50,
    });

    if (conjunctionEvents.length > 0) {
      conjunctions = conjunctionEvents.map((c) => ({
        id: c.id,
        conjunctionId: c.conjunctionId,
        threatObjectName: c.threatObjectName,
        threatObjectType: c.threatObjectType,
        riskTier: c.riskTier,
        status: c.status,
        peakPc: c.peakPc,
        latestPc: c.latestPc,
        latestMissDistance: c.latestMissDistance,
        tca: c.tca.toISOString(),
        decision: c.decision,
      }));
    }

    // ─── Fetch Debris Assessment (optional) ───
    let debrisData: DebrisData | null = null;
    const debrisAssessment = await prisma.debrisAssessment.findFirst({
      where: {
        organizationId: orgId,
      },
      orderBy: { createdAt: "desc" },
    });

    if (debrisAssessment) {
      debrisData = {
        missionName: debrisAssessment.missionName,
        orbitType: debrisAssessment.orbitType,
        complianceScore: debrisAssessment.complianceScore,
        deorbitStrategy: debrisAssessment.deorbitStrategy,
        deorbitTimelineYears: debrisAssessment.deorbitTimelineYears,
        hasPassivationCap: debrisAssessment.hasPassivationCap,
      };
    }

    // ─── Build Report Data ───
    const reportNumber = `HAZ-${spacecraft.name.replace(/\s+/g, "-").toUpperCase().slice(0, 12)}-${Date.now().toString(36).toUpperCase()}`;

    const reportData: HazardReportData = {
      reportNumber,
      reportDate: new Date(),
      version: "1.0",
      generatedBy: session.user.name || session.user.email || "System",
      targetNCA,
      language,
      spacecraft: {
        id: spacecraft.id,
        name: spacecraft.name,
        noradId: spacecraft.noradId,
        cosparId: spacecraft.cosparId,
        missionType: spacecraft.missionType,
        orbitType: spacecraft.orbitType,
        altitudeKm: spacecraft.altitudeKm,
        inclinationDeg: spacecraft.inclinationDeg,
        launchDate: spacecraft.launchDate?.toISOString() ?? null,
        endOfLifeDate: spacecraft.endOfLifeDate?.toISOString() ?? null,
        status: spacecraft.status,
        description: spacecraft.description,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      hazards: hazardEntries.map((h) => ({
        id: h.id,
        hazardId: h.hazardId,
        hazardType: h.hazardType,
        title: h.title,
        description: h.description,
        severity: h.severity,
        likelihood: h.likelihood,
        riskIndex: h.riskIndex,
        mitigationStatus: h.mitigationStatus,
        residualRisk: h.residualRisk,
        regulatoryRefs: h.regulatoryRefs,
        fmecaNotes: h.fmecaNotes ?? null,
        acceptanceStatus: h.acceptanceStatus,
        acceptedBy: h.acceptedBy,
        acceptedAt: h.acceptedAt?.toISOString() ?? null,
        verityAttestationId: h.verityAttestationId,
        mitigations: h.mitigations.map((m) => ({
          id: m.id,
          type: m.type,
          description: m.description,
          implementedAt: m.implementedAt?.toISOString() ?? null,
          verifiedBy: m.verifiedBy,
        })),
      })),
      ephemeris: ephemerisData,
      conjunctions,
      debris: debrisData,
    };

    // ─── Generate PDF ───
    const pdfElement = (
      <HazardReportPDF data={reportData} />
    ) as unknown as Parameters<typeof renderToBuffer>[0];
    const pdfBuffer = await renderToBuffer(pdfElement);

    // ─── Compute Hash + Version Number ───
    const pdfHash = crypto
      .createHash("sha256")
      .update(Buffer.from(pdfBuffer))
      .digest("hex");

    const lastVersion = await prisma.hazardReportVersion.findFirst({
      where: { spacecraftId: missionId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const version = (lastVersion?.version ?? 0) + 1;

    // ─── Report-Level Verity Attestation ───
    const reportAttestation = await prisma.verityAttestation.create({
      data: {
        attestationId: `hazard_report_${missionId}_v${version}_${Date.now()}`,
        operatorId: orgId,
        organizationId: orgId,
        satelliteNorad: spacecraft.noradId,
        regulationRef: "fsoa_hazard_report",
        dataPoint: "hazard_report_integrity",
        thresholdType: "report_hash_verified",
        thresholdValue: 1,
        result: true,
        claimStatement: `CNES/FSOA Hazard Report v${version} for ${spacecraft.name} generated and signed. SHA-256: ${pdfHash}. Contains ${hazardEntries.length} hazards, all accepted/closed. Target NCA: ${targetNCA}.`,
        valueCommitment: pdfHash,
        evidenceSource: "hazard_report_generation",
        trustScore: 1.0,
        trustLevel: "VERIFIED",
        collectedAt: new Date(),
        issuerKeyId: "hazard_report_system",
        issuerPublicKey: "hazard_report_system_key",
        signature: "pending_verity_signing",
        fullAttestation: {
          reportVersion: version,
          spacecraftId: missionId,
          spacecraftName: spacecraft.name,
          targetNCA,
          language,
          pdfHash,
          hazardCount: hazardEntries.length,
          hazardIds: hazardEntries.map((h) => h.hazardId),
          generatedBy: session.user.id,
          generatedAt: new Date().toISOString(),
        },
        description: `Hazard Report v${version} attestation for ${spacecraft.name}`,
        entityId: missionId,
        expiresAt: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years for regulatory reports
      },
    });

    // ─── Store HazardReportVersion ───
    const reportVersion = await prisma.hazardReportVersion.create({
      data: {
        organizationId: orgId,
        spacecraftId: missionId,
        version,
        targetNCA,
        language,
        milestone,
        fileHash: pdfHash,
        fileSize: pdfBuffer.byteLength,
        pdfData: Buffer.from(pdfBuffer),
        verityAttestationId: reportAttestation.id,
        reportSignature: pdfHash,
        hazardSnapshotIds: hazardEntries.map((h) => h.id),
        generatedBy: session.user.id,
      },
    });

    // ─── Audit Log ───
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId: session.user.id,
      action: "hazard_report_pdf_generated",
      entityType: "spacecraft",
      entityId: missionId,
      newValue: {
        reportNumber,
        targetNCA,
        language,
        hazardCount: hazardEntries.length,
        acceptedCount: hazardEntries.filter(
          (h) => h.acceptanceStatus === "ACCEPTED",
        ).length,
        closedCount: hazardEntries.filter(
          (h) => h.mitigationStatus === "CLOSED",
        ).length,
      },
      description: `Generated Hazard Report PDF for ${spacecraft.name} (${targetNCA})`,
      ipAddress,
      userAgent,
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "report_generated",
      entityType: "hazard_report",
      entityId: reportVersion.id,
      description: `Generated CNES/FSOA Hazard Report v${version} for ${spacecraft.name} (${targetNCA})`,
      newValue: {
        version,
        targetNCA,
        language,
        pdfHash,
        hazardCount: hazardEntries.length,
        attestationId: reportAttestation.attestationId,
      },
      organizationId: orgId,
    });

    // ─── Return PDF ───
    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Hazard-Report-${reportNumber}.pdf"`,
      "Cache-Control": "no-store",
    });
    headers.set("X-Report-Version", String(version));
    headers.set("X-Report-Hash", pdfHash);
    headers.set("X-Verity-Attestation", reportAttestation.attestationId);

    return new NextResponse(new Uint8Array(pdfBuffer), { headers });
  } catch (error) {
    logger.error("Failed to generate hazard report PDF", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const maxDuration = 60;
