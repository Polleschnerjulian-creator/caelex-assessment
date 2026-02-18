/**
 * Generate 2.0 — Data Collector
 *
 * Gathers assessment data from Prisma for NCA document generation.
 * Reuses patterns from src/lib/astra/document-generator/data-collector.ts
 * but collects both debris AND cybersecurity data in a single bundle.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import type { Generate2DataBundle } from "./types";

export async function collectGenerate2Data(
  userId: string,
  organizationId: string,
): Promise<Generate2DataBundle> {
  const [user, org, debrisAssessment, cyberAssessment, spacecraft] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          operatorType: true,
          establishmentCountry: true,
        },
      }),
      prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { name: true },
      }),
      prisma.debrisAssessment
        .findFirst({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          include: {
            requirements: {
              select: {
                requirementId: true,
                status: true,
                notes: true,
                responses: true,
              },
            },
          },
        })
        .catch(() => null),
      prisma.cybersecurityAssessment
        .findFirst({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          include: {
            requirements: {
              select: {
                requirementId: true,
                status: true,
                notes: true,
                responses: true,
              },
            },
          },
        })
        .catch(() => null),
      prisma.spacecraft.findMany({
        where: { organizationId },
        select: { name: true, noradId: true, missionType: true },
        take: 20,
      }),
    ]);

  return {
    operator: {
      organizationName: org.name,
      operatorType: user.operatorType,
      establishmentCountry: user.establishmentCountry,
      userId: user.id,
    },
    debris: debrisAssessment
      ? {
          assessment: {
            id: debrisAssessment.id,
            missionName: debrisAssessment.missionName,
            orbitType: debrisAssessment.orbitType,
            altitudeKm: debrisAssessment.altitudeKm,
            satelliteCount: debrisAssessment.satelliteCount,
            constellationTier: debrisAssessment.constellationTier,
            hasManeuverability: debrisAssessment.hasManeuverability,
            hasPropulsion: debrisAssessment.hasPropulsion,
            hasPassivationCap: debrisAssessment.hasPassivationCap,
            plannedDurationYears: debrisAssessment.plannedDurationYears,
            deorbitStrategy: debrisAssessment.deorbitStrategy,
            deorbitTimelineYears: debrisAssessment.deorbitTimelineYears,
            caServiceProvider: debrisAssessment.caServiceProvider,
            complianceScore: debrisAssessment.complianceScore,
          },
          requirements: debrisAssessment.requirements.map((r) => ({
            requirementId: r.requirementId,
            status: r.status,
            notes: r.notes,
            responses: (r.responses as Record<string, unknown>) || null,
          })),
        }
      : null,
    cybersecurity: cyberAssessment
      ? {
          assessment: {
            id: cyberAssessment.id,
            assessmentName: cyberAssessment.assessmentName,
            organizationSize: cyberAssessment.organizationSize,
            employeeCount: cyberAssessment.employeeCount,
            spaceSegmentComplexity: cyberAssessment.spaceSegmentComplexity,
            satelliteCount: cyberAssessment.satelliteCount,
            dataSensitivityLevel: cyberAssessment.dataSensitivityLevel,
            existingCertifications: cyberAssessment.existingCertifications,
            hasSecurityTeam: cyberAssessment.hasSecurityTeam,
            securityTeamSize: cyberAssessment.securityTeamSize,
            hasIncidentResponsePlan: cyberAssessment.hasIncidentResponsePlan,
            hasBCP: cyberAssessment.hasBCP,
            criticalSupplierCount: cyberAssessment.criticalSupplierCount,
            maturityScore: cyberAssessment.maturityScore,
            isSimplifiedRegime: cyberAssessment.isSimplifiedRegime,
          },
          requirements: cyberAssessment.requirements.map((r) => ({
            requirementId: r.requirementId,
            status: r.status,
            notes: r.notes,
            responses: (r.responses as Record<string, unknown>) || null,
          })),
        }
      : null,
    spacecraft: spacecraft.map((s) => ({
      name: s.name,
      noradId: s.noradId,
      missionType: s.missionType,
    })),
  };
}
