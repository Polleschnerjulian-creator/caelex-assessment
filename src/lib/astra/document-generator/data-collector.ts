/**
 * Data Collector for AI Document Generation
 *
 * Gathers assessment data from Prisma for each document type.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  DocumentGenerationType,
  AssessmentDataBundle,
  DebrisDataBundle,
  CybersecurityDataBundle,
  EnvironmentalDataBundle,
  InsuranceDataBundle,
  NIS2DataBundle,
  AuthorizationDataBundle,
} from "./types";

export async function collectAssessmentData(
  userId: string,
  organizationId: string,
  documentType: DocumentGenerationType,
  assessmentId?: string,
): Promise<AssessmentDataBundle> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { name: true, slug: true },
  });

  switch (documentType) {
    case "DEBRIS_MITIGATION_PLAN":
      return {
        type: "DEBRIS_MITIGATION_PLAN",
        data: await collectDebrisData(
          userId,
          organizationId,
          org,
          assessmentId,
        ),
      };
    case "CYBERSECURITY_FRAMEWORK":
      return {
        type: "CYBERSECURITY_FRAMEWORK",
        data: await collectCybersecurityData(userId, org, assessmentId),
      };
    case "ENVIRONMENTAL_FOOTPRINT":
      return {
        type: "ENVIRONMENTAL_FOOTPRINT",
        data: await collectEnvironmentalData(userId, org, assessmentId),
      };
    case "INSURANCE_COMPLIANCE":
      return {
        type: "INSURANCE_COMPLIANCE",
        data: await collectInsuranceData(userId, org, assessmentId),
      };
    case "NIS2_ASSESSMENT":
      return {
        type: "NIS2_ASSESSMENT",
        data: await collectNIS2Data(userId, org, assessmentId),
      };
    case "AUTHORIZATION_APPLICATION":
      return {
        type: "AUTHORIZATION_APPLICATION",
        data: await collectAuthorizationData(userId, organizationId, org),
      };
  }
}

async function collectDebrisData(
  userId: string,
  organizationId: string,
  org: { name: string; slug: string },
  assessmentId?: string,
): Promise<DebrisDataBundle> {
  const where = assessmentId ? { id: assessmentId, userId } : { userId };

  const assessment = await prisma.debrisAssessment.findFirstOrThrow({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      requirements: {
        select: { requirementId: true, status: true, notes: true },
      },
    },
  });

  const spacecraft = await prisma.spacecraft.findMany({
    where: { organizationId },
    select: { name: true, noradId: true, missionType: true },
    take: 20,
  });

  return {
    assessment: {
      id: assessment.id,
      missionName: assessment.missionName,
      orbitType: assessment.orbitType,
      altitudeKm: assessment.altitudeKm,
      satelliteCount: assessment.satelliteCount,
      constellationTier: assessment.constellationTier,
      hasManeuverability: assessment.hasManeuverability,
      hasPropulsion: assessment.hasPropulsion,
      hasPassivationCap: assessment.hasPassivationCap,
      plannedDurationYears: assessment.plannedDurationYears,
      deorbitStrategy: assessment.deorbitStrategy,
      deorbitTimelineYears: assessment.deorbitTimelineYears,
      caServiceProvider: assessment.caServiceProvider,
      complianceScore: assessment.complianceScore,
    },
    requirements: assessment.requirements,
    spacecraft: spacecraft.map((s) => ({
      name: s.name,
      noradId: s.noradId,
      type: s.missionType,
    })),
    organization: org,
  };
}

async function collectCybersecurityData(
  userId: string,
  org: { name: string; slug: string },
  assessmentId?: string,
): Promise<CybersecurityDataBundle> {
  const where = assessmentId ? { id: assessmentId, userId } : { userId };

  const assessment = await prisma.cybersecurityAssessment.findFirstOrThrow({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      requirements: {
        select: { requirementId: true, status: true, notes: true },
      },
    },
  });

  return {
    assessment: {
      id: assessment.id,
      assessmentName: assessment.assessmentName,
      organizationSize: assessment.organizationSize,
      employeeCount: assessment.employeeCount,
      spaceSegmentComplexity: assessment.spaceSegmentComplexity,
      satelliteCount: assessment.satelliteCount,
      dataSensitivityLevel: assessment.dataSensitivityLevel,
      existingCertifications: assessment.existingCertifications,
      hasSecurityTeam: assessment.hasSecurityTeam,
      securityTeamSize: assessment.securityTeamSize,
      hasIncidentResponsePlan: assessment.hasIncidentResponsePlan,
      hasBCP: assessment.hasBCP,
      criticalSupplierCount: assessment.criticalSupplierCount,
      maturityScore: assessment.maturityScore,
      isSimplifiedRegime: assessment.isSimplifiedRegime,
    },
    requirements: assessment.requirements,
    organization: org,
  };
}

async function collectEnvironmentalData(
  userId: string,
  org: { name: string; slug: string },
  assessmentId?: string,
): Promise<EnvironmentalDataBundle> {
  const where = assessmentId ? { id: assessmentId, userId } : { userId };

  const assessment = await prisma.environmentalAssessment.findFirstOrThrow({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      impactResults: {
        select: {
          phase: true,
          gwpKgCO2eq: true,
          odpKgCFC11eq: true,
          percentOfTotal: true,
        },
      },
      supplierRequests: {
        select: { supplierName: true, status: true },
      },
    },
  });

  return {
    assessment: {
      id: assessment.id,
      assessmentName: assessment.assessmentName,
      missionName: assessment.missionName,
      operatorType: assessment.operatorType,
      missionType: assessment.missionType,
      spacecraftMassKg: assessment.spacecraftMassKg,
      spacecraftCount: assessment.spacecraftCount,
      orbitType: assessment.orbitType,
      altitudeKm: assessment.altitudeKm,
      launchVehicle: assessment.launchVehicle,
      launchSharePercent: assessment.launchSharePercent,
      spacecraftPropellant: assessment.spacecraftPropellant,
      propellantMassKg: assessment.propellantMassKg,
      deorbitStrategy: assessment.deorbitStrategy,
      totalGWP: assessment.totalGWP,
      totalODP: assessment.totalODP,
      carbonIntensity: assessment.carbonIntensity,
      efdGrade: assessment.efdGrade,
      complianceScore: assessment.complianceScore,
    },
    impactResults: assessment.impactResults.map((r) => ({
      category: r.phase,
      value: r.gwpKgCO2eq,
      unit: "kg CO2eq",
    })),
    supplierRequests: assessment.supplierRequests,
    organization: org,
  };
}

async function collectInsuranceData(
  userId: string,
  org: { name: string; slug: string },
  assessmentId?: string,
): Promise<InsuranceDataBundle> {
  const where = assessmentId ? { id: assessmentId, userId } : { userId };

  const assessment = await prisma.insuranceAssessment.findFirstOrThrow({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      policies: {
        select: {
          insuranceType: true,
          status: true,
          isRequired: true,
          insurer: true,
          coverageAmount: true,
          premium: true,
        },
      },
    },
  });

  return {
    assessment: {
      id: assessment.id,
      assessmentName: assessment.assessmentName,
      primaryJurisdiction: assessment.primaryJurisdiction,
      operatorType: assessment.operatorType,
      companySize: assessment.companySize,
      orbitRegime: assessment.orbitRegime,
      satelliteCount: assessment.satelliteCount,
      satelliteValueEur: assessment.satelliteValueEur,
      totalMissionValueEur: assessment.totalMissionValueEur,
      calculatedTPL: assessment.calculatedTPL,
      riskLevel: assessment.riskLevel,
      complianceScore: assessment.complianceScore,
    },
    policies: assessment.policies,
    organization: org,
  };
}

async function collectNIS2Data(
  userId: string,
  org: { name: string; slug: string },
  assessmentId?: string,
): Promise<NIS2DataBundle> {
  const where = assessmentId ? { id: assessmentId, userId } : { userId };

  const assessment = await prisma.nIS2Assessment.findFirstOrThrow({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      requirements: {
        select: { requirementId: true, status: true, notes: true },
      },
    },
  });

  return {
    assessment: {
      id: assessment.id,
      assessmentName: assessment.assessmentName,
      entityClassification: assessment.entityClassification,
      classificationReason: assessment.classificationReason,
      sector: assessment.sector,
      organizationSize: assessment.organizationSize,
      employeeCount: assessment.employeeCount,
      existingCertifications: assessment.existingCertifications,
      hasISO27001: assessment.hasISO27001,
      hasExistingCSIRT: assessment.hasExistingCSIRT,
      hasRiskManagement: assessment.hasRiskManagement,
      complianceScore: assessment.complianceScore,
      maturityScore: assessment.maturityScore,
      riskLevel: assessment.riskLevel,
      euSpaceActOverlapCount: assessment.euSpaceActOverlapCount,
    },
    requirements: assessment.requirements,
    organization: org,
  };
}

async function collectAuthorizationData(
  userId: string,
  organizationId: string,
  org: { name: string; slug: string },
): Promise<AuthorizationDataBundle> {
  const [
    debrisAssessment,
    cyberAssessment,
    envAssessment,
    insAssessment,
    nis2Assessment,
    spacecraft,
    documents,
    workflow,
  ] = await Promise.all([
    prisma.debrisAssessment.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        missionName: true,
        orbitType: true,
        altitudeKm: true,
        satelliteCount: true,
        constellationTier: true,
        hasManeuverability: true,
        hasPropulsion: true,
        hasPassivationCap: true,
        plannedDurationYears: true,
        deorbitStrategy: true,
        deorbitTimelineYears: true,
        caServiceProvider: true,
        complianceScore: true,
      },
    }),
    prisma.cybersecurityAssessment.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        assessmentName: true,
        organizationSize: true,
        employeeCount: true,
        spaceSegmentComplexity: true,
        satelliteCount: true,
        dataSensitivityLevel: true,
        existingCertifications: true,
        hasSecurityTeam: true,
        securityTeamSize: true,
        hasIncidentResponsePlan: true,
        hasBCP: true,
        criticalSupplierCount: true,
        maturityScore: true,
        isSimplifiedRegime: true,
      },
    }),
    prisma.environmentalAssessment.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        assessmentName: true,
        missionName: true,
        operatorType: true,
        missionType: true,
        spacecraftMassKg: true,
        spacecraftCount: true,
        orbitType: true,
        altitudeKm: true,
        launchVehicle: true,
        launchSharePercent: true,
        spacecraftPropellant: true,
        propellantMassKg: true,
        deorbitStrategy: true,
        totalGWP: true,
        totalODP: true,
        carbonIntensity: true,
        efdGrade: true,
        complianceScore: true,
      },
    }),
    prisma.insuranceAssessment.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        assessmentName: true,
        primaryJurisdiction: true,
        operatorType: true,
        companySize: true,
        orbitRegime: true,
        satelliteCount: true,
        satelliteValueEur: true,
        totalMissionValueEur: true,
        calculatedTPL: true,
        riskLevel: true,
        complianceScore: true,
      },
    }),
    prisma.nIS2Assessment.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        assessmentName: true,
        entityClassification: true,
        classificationReason: true,
        sector: true,
        organizationSize: true,
        employeeCount: true,
        existingCertifications: true,
        hasISO27001: true,
        hasExistingCSIRT: true,
        hasRiskManagement: true,
        complianceScore: true,
        maturityScore: true,
        riskLevel: true,
        euSpaceActOverlapCount: true,
      },
    }),
    prisma.spacecraft.findMany({
      where: { organizationId },
      select: { name: true, noradId: true, missionType: true, orbitType: true },
      take: 20,
    }),
    prisma.document.findMany({
      where: { userId },
      select: { name: true, category: true, status: true },
      take: 50,
    }),
    prisma.authorizationWorkflow.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { status: true, pathway: true },
    }),
  ]);

  return {
    debrisAssessment,
    cybersecurityAssessment: cyberAssessment,
    environmentalAssessment: envAssessment,
    insuranceAssessment: insAssessment,
    nis2Assessment: nis2Assessment,
    spacecraft: spacecraft.map((s) => ({
      name: s.name,
      noradId: s.noradId,
      type: s.missionType,
      orbitType: s.orbitType,
    })),
    documents,
    workflow: workflow
      ? { status: workflow.status, currentStep: workflow.pathway }
      : null,
    organization: org,
  };
}
