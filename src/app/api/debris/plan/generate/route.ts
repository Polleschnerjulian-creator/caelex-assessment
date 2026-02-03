import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  debrisRequirements,
  orbitTypeConfig,
} from "@/data/debris-requirements";

interface DebrisMitigationPlan {
  missionOverview: {
    missionName: string;
    operator: string;
    orbitParameters: string;
    missionDuration: string;
    satelliteCount: number;
    constellationTier: string;
  };

  sections: {
    collisionAvoidance: {
      strategy: string;
      serviceProvider: string;
      maneuverCapability: string;
      procedures: string[];
    };

    endOfLifeDisposal: {
      method: string;
      timeline: string;
      propellantBudget: string;
      backupStrategy: string;
    };

    fragmentationAvoidance: {
      designMeasures: string[];
      operationalProcedures: string[];
    };

    passivation: {
      energySources: string[];
      procedures: string[];
      timeline: string;
    };

    complianceVerification: {
      twentyFiveYearCompliance: boolean;
      calculationMethod: string;
      uncertaintyMargin: string;
    };
  };

  requirementsMatrix: {
    id: string;
    title: string;
    articleRef: string;
    status: string;
    notes: string | null;
  }[];

  generatedAt: string;
  complianceScore: number;
}

// POST /api/debris/plan/generate - Generate a Debris Mitigation Plan
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const { assessmentId } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { error: "assessmentId is required" },
        { status: 400 },
      );
    }

    // Get assessment with requirements
    const assessment = await prisma.debrisAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
      include: {
        requirements: true,
        user: {
          select: {
            name: true,
            organization: true,
          },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Get orbit config
    const orbitConfig =
      orbitTypeConfig[assessment.orbitType as keyof typeof orbitTypeConfig];

    // Build requirements matrix
    const requirementsMatrix = assessment.requirements.map((reqStatus) => {
      const reqDef = debrisRequirements.find(
        (r) => r.id === reqStatus.requirementId,
      );
      return {
        id: reqStatus.requirementId,
        title: reqDef?.title || reqStatus.requirementId,
        articleRef: reqDef?.articleRef || "",
        status: reqStatus.status,
        notes: reqStatus.notes,
      };
    });

    // Generate deorbit strategy description
    const deorbitDescriptions: Record<string, string> = {
      active_deorbit: "Active deorbit maneuver using onboard propulsion",
      passive_decay: "Passive atmospheric decay (natural reentry)",
      graveyard_orbit: "Transfer to graveyard/disposal orbit",
      adr_contracted: "Active Debris Removal service contracted",
    };

    // Generate plan
    const plan: DebrisMitigationPlan = {
      missionOverview: {
        missionName: assessment.missionName || "Unnamed Mission",
        operator:
          assessment.user.organization ||
          assessment.user.name ||
          "Unknown Operator",
        orbitParameters: `${orbitConfig?.label || assessment.orbitType}${assessment.altitudeKm ? ` at ${assessment.altitudeKm} km` : ""}`,
        missionDuration: `${assessment.plannedDurationYears} years`,
        satelliteCount: assessment.satelliteCount,
        constellationTier: assessment.constellationTier,
      },

      sections: {
        collisionAvoidance: {
          strategy:
            assessment.hasManeuverability === "full"
              ? "Active collision avoidance with full maneuverability"
              : assessment.hasManeuverability === "limited"
                ? "Limited collision avoidance capability"
                : "No onboard collision avoidance capability - relies on warnings for ground-based decisions",
          serviceProvider:
            assessment.caServiceProvider ||
            "To be determined (EUSST or commercial provider)",
          maneuverCapability: assessment.hasPropulsion
            ? `Propulsion system available with ${assessment.hasManeuverability} maneuverability`
            : "No onboard propulsion",
          procedures: [
            "Monitor conjunction warnings from CA service provider",
            assessment.hasPropulsion
              ? "Execute avoidance maneuvers when probability exceeds threshold"
              : "Coordinate with operators of maneuverable spacecraft",
            "Maintain up-to-date ephemeris data with CA service",
            "Report all executed maneuvers to space surveillance networks",
          ],
        },

        endOfLifeDisposal: {
          method:
            deorbitDescriptions[assessment.deorbitStrategy] ||
            assessment.deorbitStrategy,
          timeline: assessment.deorbitTimelineYears
            ? `Within ${assessment.deorbitTimelineYears} years post-mission`
            : assessment.orbitType === "LEO"
              ? "Within 25 years (5-year target for new missions)"
              : assessment.orbitType === "GEO"
                ? "Transfer to graveyard orbit before propellant depletion"
                : "To be determined based on orbital analysis",
          propellantBudget: assessment.hasPropulsion
            ? "Propellant reserved for end-of-life disposal maneuver"
            : "Natural decay / ADR required",
          backupStrategy:
            assessment.deorbitStrategy === "adr_contracted"
              ? "ADR service contracted as primary or backup"
              : assessment.hasPropulsion
                ? "ADR service as backup if primary disposal fails"
                : "ADR service required if natural decay insufficient",
        },

        fragmentationAvoidance: {
          designMeasures: [
            "Propellant tanks designed to minimize rupture risk",
            "Battery thermal protection to prevent runaway",
            "Pressure vessel design with burst mitigation",
            "No intentional fragmentation planned",
          ],
          operationalProcedures: [
            "Monitor battery health throughout mission",
            "Avoid operations that could cause tank overpressure",
            "Passivation planned before end-of-life",
          ],
        },

        passivation: {
          energySources: [
            assessment.hasPropulsion ? "Propellant tanks" : null,
            "Batteries",
            "Reaction wheels / CMGs",
            "Solar arrays",
          ].filter(Boolean) as string[],
          procedures: assessment.hasPassivationCap
            ? [
                "Deplete remaining propellant (vent or burn)",
                "Discharge batteries to safe level",
                "De-spin momentum wheels",
                "Disconnect solar arrays from charging circuit",
              ]
            : [
                "Limited passivation capability - passive discharge planned",
                "Battery discharge through natural self-discharge",
              ],
          timeline:
            "Passivation to be completed within 30 days of end-of-mission",
        },

        complianceVerification: {
          twentyFiveYearCompliance:
            assessment.orbitType === "LEO"
              ? (assessment.deorbitTimelineYears || 25) <= 25
              : true,
          calculationMethod:
            "Orbital lifetime analysis using [DRAMA/STK/GMAT] with Monte Carlo uncertainty propagation",
          uncertaintyMargin:
            "Conservative assumptions used (1-sigma solar activity, worst-case ballistic coefficient)",
        },
      },

      requirementsMatrix,
      generatedAt: new Date().toISOString(),
      complianceScore: assessment.complianceScore || 0,
    };

    // Update assessment to mark plan as generated
    await prisma.debrisAssessment.update({
      where: { id: assessmentId },
      data: {
        planGenerated: true,
        planGeneratedAt: new Date(),
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "debris_plan_generated",
      entityType: "debris_assessment",
      entityId: assessmentId,
      newValue: {
        complianceScore: assessment.complianceScore,
        requirementsCount: requirementsMatrix.length,
      },
      description: "Generated Debris Mitigation Plan",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Error generating debris plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
