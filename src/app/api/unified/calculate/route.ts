import { NextRequest, NextResponse } from "next/server";
import {
  UnifiedAssessmentAnswers,
  RedactedUnifiedResult,
  EU_MEMBER_STATES,
  ACTIVITY_TYPE_LABELS,
  SERVICE_TYPE_LABELS,
  JURISDICTION_NAMES,
  SpaceLawJurisdiction,
  ActivityType,
} from "@/lib/unified-assessment-types";

// Minimum time (ms) to complete assessment (anti-bot)
const MIN_ASSESSMENT_TIME = 10000; // 10 seconds

// ============================================================================
// EU SPACE ACT CALCULATION
// ============================================================================

function calculateEUSpaceAct(answers: Partial<UnifiedAssessmentAnswers>) {
  const isEU = EU_MEMBER_STATES.includes(
    answers.establishmentCountry as (typeof EU_MEMBER_STATES)[number],
  );
  const isDefenseOnly = answers.isDefenseOnly === true;
  const providesEUServices =
    answers.providesServicesToEU === true || answers.servesEUCustomers === true;

  // Determine if EU Space Act applies
  const applies = !isDefenseOnly && (isEU || providesEUServices);

  if (!applies) {
    return {
      applies: false,
      operatorTypes: [],
      regime: "exempt",
      regimeReason: isDefenseOnly
        ? "Defense-only operations are exempt under Art. 2(3)"
        : "No EU establishment or EU market presence",
      applicableArticleCount: 0,
      moduleCount: 0,
      keyDeadlines: [],
      priorityActions: [],
    };
  }

  const operatorTypes = answers.activityTypes || [];

  // Determine regime (Light vs Standard)
  const isSmallOrMicro =
    answers.entitySize === "micro" || answers.entitySize === "small";
  const isResearch = answers.isResearchInstitution === true;
  const hasSmallConstellation =
    answers.constellationSize === "small" || !answers.operatesConstellation;

  let regime: "standard" | "light" = "standard";
  let regimeReason = "Standard regime applies";

  if ((isSmallOrMicro || isResearch) && hasSmallConstellation) {
    regime = "light";
    regimeReason = isResearch
      ? "Research institution qualifies for Light Regime (Art. 8)"
      : "SME with small/no constellation qualifies for Light Regime (Art. 8)";
  }

  // Calculate applicable articles based on operator types
  let applicableArticleCount = 15; // Base articles (general provisions)

  if (operatorTypes.includes("SCO")) {
    applicableArticleCount += 25; // Chapter III - Spacecraft Operations
  }
  if (operatorTypes.includes("LO") || operatorTypes.includes("LSO")) {
    applicableArticleCount += 12; // Chapter IV - Launch Operations
  }
  if (answers.operatesConstellation) {
    applicableArticleCount += 8; // Chapter V - Constellation provisions
  }
  if (operatorTypes.includes("ISOS")) {
    applicableArticleCount += 10; // In-space servicing
  }
  if (operatorTypes.includes("CAP") || operatorTypes.includes("PDP")) {
    applicableArticleCount += 6; // Data providers
  }

  // Module count
  const moduleCount = Math.min(7, 2 + Math.ceil(operatorTypes.length * 1.5));

  // Key deadlines
  const keyDeadlines = [
    { date: "2027-01-01", description: "EU Space Act entry into force" },
    {
      date: "2030-01-01",
      description: "Full compliance required for existing operators",
    },
  ];

  if (regime === "light") {
    keyDeadlines.push({
      date: "2032-01-01",
      description: "EFD deadline for Light Regime",
    });
  } else {
    keyDeadlines.push({
      date: "2030-01-01",
      description: "EFD compliance deadline",
    });
  }

  // Priority actions
  const priorityActions: string[] = [];

  if (!answers.hasDebrisMitigationPlan) {
    priorityActions.push("Develop debris mitigation plan (Art. 55-60)");
  }
  if (operatorTypes.includes("SCO") && !answers.operatesConstellation) {
    priorityActions.push("Register spacecraft with competent authority");
  }
  if (
    (answers.operatesConstellation && answers.constellationSize === "large") ||
    answers.constellationSize === "mega"
  ) {
    priorityActions.push("Submit constellation management plan");
  }
  if (!isEU && providesEUServices) {
    priorityActions.push("Designate EU representative (Art. 12)");
  }

  return {
    applies: true,
    operatorTypes: operatorTypes.map((t) => ACTIVITY_TYPE_LABELS[t] || t),
    regime,
    regimeReason,
    applicableArticleCount,
    moduleCount,
    keyDeadlines,
    priorityActions: priorityActions.slice(0, 5),
  };
}

// ============================================================================
// NIS2 CALCULATION
// ============================================================================

function calculateNIS2(answers: Partial<UnifiedAssessmentAnswers>) {
  const isEU = EU_MEMBER_STATES.includes(
    answers.establishmentCountry as (typeof EU_MEMBER_STATES)[number],
  );
  const servesEU = answers.servesEUCustomers === true;

  // NIS2 applies to EU entities or those serving EU critical infrastructure
  const isCritical = answers.servesCriticalInfrastructure === true;
  const isLarge =
    answers.entitySize === "large" || answers.entitySize === "medium";

  // Determine if NIS2 applies
  const applies = (isEU || servesEU) && (isCritical || isLarge);

  if (!applies) {
    return {
      applies: false,
      entityClassification: "out_of_scope",
      classificationReason:
        !isEU && !servesEU
          ? "No EU presence or EU market"
          : "Below size threshold and not critical infrastructure",
      requirementCount: 0,
      complianceGapCount: 0,
      estimatedReadiness: 0,
      priorityActions: [],
    };
  }

  // Determine entity classification
  let entityClassification: "essential" | "important" = "important";
  let classificationReason = "Important entity under NIS2 Annex II";

  if (isCritical || answers.isEssentialServiceProvider === true) {
    entityClassification = "essential";
    classificationReason = "Essential entity - Space sector under NIS2 Annex I";
  } else if (answers.entitySize === "large") {
    entityClassification = "essential";
    classificationReason =
      "Large enterprise in Space sector - Essential entity";
  }

  // Count requirements
  const baseRequirements = 51;
  let requirementCount = baseRequirements;

  if (entityClassification === "essential") {
    requirementCount += 12; // Additional essential entity requirements
  }

  // Calculate compliance gaps based on cybersecurity answers
  const cyberChecks = [
    answers.hasCybersecurityPolicy,
    answers.hasRiskManagement,
    answers.hasIncidentResponsePlan,
    answers.hasBusinessContinuityPlan,
    answers.hasSupplyChainSecurity,
    answers.hasSecurityTraining,
    answers.hasEncryption,
    answers.hasAccessControl,
    answers.hasVulnerabilityManagement,
    answers.conductsPenetrationTesting,
  ];

  const compliantCount = cyberChecks.filter((c) => c === true).length;
  const complianceGapCount = cyberChecks.length - compliantCount;
  const estimatedReadiness = Math.round(
    (compliantCount / cyberChecks.length) * 100,
  );

  // Priority actions
  const priorityActions: string[] = [];

  if (!answers.hasIncidentResponsePlan) {
    priorityActions.push(
      "Establish incident response plan (24h/72h reporting)",
    );
  }
  if (!answers.hasRiskManagement) {
    priorityActions.push("Implement cybersecurity risk management (Art. 21)");
  }
  if (!answers.hasSupplyChainSecurity) {
    priorityActions.push("Assess supply chain security (Art. 21(2)(d))");
  }
  if (!answers.hasBusinessContinuityPlan) {
    priorityActions.push("Develop business continuity plan");
  }
  if (!answers.hasSecurityTraining) {
    priorityActions.push("Implement security awareness training");
  }

  return {
    applies: true,
    entityClassification,
    classificationReason,
    requirementCount,
    complianceGapCount,
    estimatedReadiness,
    priorityActions: priorityActions.slice(0, 5),
  };
}

// ============================================================================
// NATIONAL SPACE LAW CALCULATION
// ============================================================================

interface JurisdictionScore {
  country: SpaceLawJurisdiction;
  name: string;
  score: number;
  pros: string[];
  cons: string[];
}

function calculateNationalSpaceLaw(answers: Partial<UnifiedAssessmentAnswers>) {
  const interestedJurisdictions = (answers.interestedJurisdictions ||
    []) as SpaceLawJurisdiction[];

  if (interestedJurisdictions.length === 0) {
    return {
      analyzedCount: 0,
      recommendedJurisdiction: null,
      recommendedJurisdictionName: null,
      recommendationReason: "No jurisdictions selected for comparison",
      topScores: [],
    };
  }

  // Jurisdiction characteristics
  const jurisdictionData: Record<
    SpaceLawJurisdiction,
    {
      processingTime: number; // months
      englishProcess: boolean;
      insuranceMin: number; // millions EUR
      complexity: number; // 1-5
      newSpaceFriendly: boolean;
      euAlignment: number; // 0-100
    }
  > = {
    FR: {
      processingTime: 6,
      englishProcess: false,
      insuranceMin: 60,
      complexity: 4,
      newSpaceFriendly: true,
      euAlignment: 85,
    },
    UK: {
      processingTime: 4,
      englishProcess: true,
      insuranceMin: 60,
      complexity: 3,
      newSpaceFriendly: true,
      euAlignment: 60,
    },
    DE: {
      processingTime: 8,
      englishProcess: false,
      insuranceMin: 50,
      complexity: 4,
      newSpaceFriendly: false,
      euAlignment: 90,
    },
    LU: {
      processingTime: 3,
      englishProcess: true,
      insuranceMin: 20,
      complexity: 2,
      newSpaceFriendly: true,
      euAlignment: 95,
    },
    NL: {
      processingTime: 5,
      englishProcess: true,
      insuranceMin: 50,
      complexity: 3,
      newSpaceFriendly: true,
      euAlignment: 88,
    },
    BE: {
      processingTime: 6,
      englishProcess: false,
      insuranceMin: 40,
      complexity: 3,
      newSpaceFriendly: true,
      euAlignment: 85,
    },
    AT: {
      processingTime: 4,
      englishProcess: false,
      insuranceMin: 30,
      complexity: 2,
      newSpaceFriendly: true,
      euAlignment: 90,
    },
    DK: {
      processingTime: 5,
      englishProcess: true,
      insuranceMin: 40,
      complexity: 3,
      newSpaceFriendly: true,
      euAlignment: 85,
    },
    IT: {
      processingTime: 9,
      englishProcess: false,
      insuranceMin: 50,
      complexity: 4,
      newSpaceFriendly: false,
      euAlignment: 80,
    },
    NO: {
      processingTime: 4,
      englishProcess: true,
      insuranceMin: 30,
      complexity: 2,
      newSpaceFriendly: true,
      euAlignment: 75,
    },
  };

  const scores: JurisdictionScore[] = interestedJurisdictions.map((country) => {
    const data = jurisdictionData[country];
    let score = 50; // Base score
    const pros: string[] = [];
    const cons: string[] = [];

    // Processing time scoring
    if (answers.prefersFastProcessing) {
      if (data.processingTime <= 3) {
        score += 15;
        pros.push("Fast processing (≤3 months)");
      } else if (data.processingTime <= 5) {
        score += 8;
      } else {
        score -= 5;
        cons.push(`Longer processing time (${data.processingTime} months)`);
      }
    }

    // English process scoring
    if (answers.requiresEnglishProcess && data.englishProcess) {
      score += 12;
      pros.push("English-language process available");
    } else if (answers.requiresEnglishProcess && !data.englishProcess) {
      score -= 10;
      cons.push("Local language required");
    }

    // NewSpace friendliness
    if (answers.isStartup && data.newSpaceFriendly) {
      score += 10;
      pros.push("NewSpace-friendly regime");
    }

    // Insurance requirements vs coverage
    const hasAdequateInsurance =
      answers.insuranceCoverage &&
      ["60m_100m", "100m_500m", "over_500m"].includes(
        answers.insuranceCoverage,
      );

    if (data.insuranceMin <= 30) {
      score += 8;
      pros.push(`Lower insurance minimum (€${data.insuranceMin}M)`);
    } else if (data.insuranceMin >= 60 && !hasAdequateInsurance) {
      score -= 5;
      cons.push(`High insurance requirement (€${data.insuranceMin}M)`);
    }

    // Complexity scoring
    if (data.complexity <= 2) {
      score += 10;
      pros.push("Streamlined licensing process");
    } else if (data.complexity >= 4) {
      score -= 5;
      cons.push("Complex regulatory requirements");
    }

    // EU alignment (important for EU Space Act transition)
    if (data.euAlignment >= 90) {
      score += 5;
      pros.push("High EU Space Act alignment");
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    return {
      country,
      name: JURISDICTION_NAMES[country] || country,
      score,
      pros: pros.slice(0, 3),
      cons: cons.slice(0, 2),
    };
  });

  // Sort by score
  scores.sort((a, b) => b.score - a.score);

  const recommended = scores[0];

  return {
    analyzedCount: scores.length,
    recommendedJurisdiction: recommended?.country || null,
    recommendedJurisdictionName: recommended?.name || null,
    recommendationReason: recommended
      ? `${recommended.name} scores highest (${recommended.score}/100) based on your requirements`
      : "No recommendation available",
    topScores: scores.map((s) => ({
      country: s.country,
      name: s.name,
      score: s.score,
    })),
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { answers, startedAt } = body as {
      answers: Partial<UnifiedAssessmentAnswers>;
      startedAt: number;
    };

    // Anti-bot: Check minimum time
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_ASSESSMENT_TIME) {
      return NextResponse.json(
        { error: "Assessment completed too quickly. Please try again." },
        { status: 400 },
      );
    }

    // Validate required fields
    if (!answers.establishmentCountry || !answers.entitySize) {
      return NextResponse.json(
        { error: "Missing required assessment data" },
        { status: 400 },
      );
    }

    // Calculate results for each framework
    const euSpaceAct = calculateEUSpaceAct(answers);
    const nis2 = calculateNIS2(answers);
    const nationalSpaceLaw = calculateNationalSpaceLaw(answers);

    // Calculate overall summary
    const totalRequirements =
      euSpaceAct.applicableArticleCount + nis2.requirementCount;

    const overallRisk = (() => {
      if (!euSpaceAct.applies && !nis2.applies) return "low";
      if (nis2.complianceGapCount >= 7) return "critical";
      if (nis2.complianceGapCount >= 4) return "high";
      if (
        euSpaceAct.regime === "standard" &&
        nis2.entityClassification === "essential"
      )
        return "high";
      return "medium";
    })();

    const estimatedMonths = (() => {
      let months = 0;
      if (euSpaceAct.applies) months += euSpaceAct.regime === "light" ? 6 : 12;
      if (nis2.applies)
        months += nis2.entityClassification === "essential" ? 9 : 6;
      if (nationalSpaceLaw.analyzedCount > 0) months += 3;
      return Math.min(24, months);
    })();

    // Combine immediate actions
    const immediateActions = [
      ...euSpaceAct.priorityActions.slice(0, 2),
      ...nis2.priorityActions.slice(0, 2),
    ].slice(0, 5);

    // Build result
    const result: RedactedUnifiedResult = {
      assessmentId: `unified-${Date.now()}`,
      completedAt: new Date().toISOString(),

      companySummary: {
        name: answers.companyName || null,
        establishment: answers.establishmentCountry || "Unknown",
        isEU: EU_MEMBER_STATES.includes(
          answers.establishmentCountry as (typeof EU_MEMBER_STATES)[number],
        ),
        size: answers.entitySize || "Unknown",
        activities: (answers.activityTypes || []).map(
          (t) => ACTIVITY_TYPE_LABELS[t] || t,
        ),
        primaryService: answers.serviceTypes?.[0]
          ? SERVICE_TYPE_LABELS[
              answers.serviceTypes[0] as keyof typeof SERVICE_TYPE_LABELS
            ] || null
          : null,
      },

      euSpaceAct,
      nis2,
      nationalSpaceLaw,

      overallSummary: {
        totalRequirements,
        overallRisk,
        estimatedMonths,
        immediateActions,
      },
    };

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Unified assessment calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate compliance profile" },
      { status: 500 },
    );
  }
}
