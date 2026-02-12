import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  calculateDeorbitRequirements,
  type DeorbitCalculation,
} from "@/lib/us-regulatory-engine.server";
import {
  calculateDeorbitDeadline,
  type UsOperatorProfile,
} from "@/data/us-space-regulations";

// GET /api/us-regulatory/deorbit-calculator - Calculate FCC 5-year rule compliance
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const orbitRegime = searchParams.get("orbitRegime") || "LEO";
    const altitudeKm = searchParams.get("altitudeKm")
      ? parseInt(searchParams.get("altitudeKm")!)
      : undefined;
    const launchDateStr = searchParams.get("launchDate");
    const missionDurationYears = searchParams.get("missionDurationYears")
      ? parseInt(searchParams.get("missionDurationYears")!)
      : undefined;
    const plannedDisposalYears = searchParams.get("plannedDisposalYears")
      ? parseInt(searchParams.get("plannedDisposalYears")!)
      : undefined;
    const hasPropulsion = searchParams.get("hasPropulsion") === "true";
    const hasManeuverability =
      searchParams.get("hasManeuverability") === "true";
    const isConstellation = searchParams.get("isConstellation") === "true";
    const satelliteCount = searchParams.get("satelliteCount")
      ? parseInt(searchParams.get("satelliteCount")!)
      : undefined;

    // Validate orbit regime
    const validOrbitRegimes = [
      "LEO",
      "MEO",
      "GEO",
      "HEO",
      "cislunar",
      "deep_space",
    ];
    if (!validOrbitRegimes.includes(orbitRegime)) {
      return NextResponse.json(
        { error: `Invalid orbit regime: ${orbitRegime}` },
        { status: 400 },
      );
    }

    // Parse launch date if provided
    const launchDate = launchDateStr ? new Date(launchDateStr) : undefined;
    if (launchDate && isNaN(launchDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid launch date format. Use ISO 8601 format." },
        { status: 400 },
      );
    }

    // Create profile for calculation
    const profile: UsOperatorProfile = {
      operatorTypes: ["satellite_operator"],
      activityTypes: ["satellite_communications"],
      agencies: ["FCC"],
      isUsEntity: true,
      usNexus: "us_licensed",
      orbitRegime: orbitRegime as UsOperatorProfile["orbitRegime"],
      altitudeKm,
      hasPropulsion,
      hasManeuverability,
      missionDurationYears,
      isConstellation,
      satelliteCount,
      isNGSO: orbitRegime !== "GEO",
    };

    // Calculate deorbit requirements
    const calculation = calculateDeorbitRequirements(
      profile,
      launchDate,
      undefined,
      undefined,
    );

    // Additional deadline calculation if we have dates
    let deadlineInfo = null;
    if (launchDate && missionDurationYears) {
      deadlineInfo = calculateDeorbitDeadline(
        launchDate,
        missionDurationYears,
        orbitRegime === "LEO" ||
          (altitudeKm !== undefined && altitudeKm < 2000),
      );
    }

    // Build response
    const response = {
      input: {
        orbitRegime,
        altitudeKm,
        launchDate: launchDate?.toISOString(),
        missionDurationYears,
        plannedDisposalYears,
        hasPropulsion,
        hasManeuverability,
        isConstellation,
        satelliteCount,
      },
      isLeoSubject: calculation.isLeoSubject,
      applicableRule: calculation.isLeoSubject
        ? "FCC 5-Year Post-Mission Disposal Rule (47 CFR § 25.114(d)(14)(iv))"
        : "25-Year Disposal Guideline (Pre-2024 Standard)",
      requiredDisposalYears: calculation.requiredDisposalYears,
      compliance: {
        status: calculation.currentCompliance,
        isCompliant: calculation.currentCompliance === "compliant",
        warnings: calculation.recommendations,
      },
      timeline: deadlineInfo
        ? {
            endOfMissionDate: deadlineInfo.endOfMissionDate.toISOString(),
            disposalDeadline: deadlineInfo.disposalDeadline.toISOString(),
            yearsRemaining: Math.round(deadlineInfo.yearsRemaining * 10) / 10,
            daysRemaining: calculation.daysUntilDeadline,
          }
        : null,
      guidance: {
        fccRule:
          "Effective September 2024, all LEO satellites must complete disposal within 5 years of end-of-mission",
        leoDefinition: "Low Earth Orbit is defined as altitudes below 2,000 km",
        requirements: [
          "Submit orbital debris mitigation plan with FCC application",
          "Demonstrate active deorbit capability or passive decay compliance",
          "Include casualty risk assessment for reentry",
          "Share orbital data with 18th Space Defense Squadron",
        ],
        exceptions: [
          "Satellites with demonstrated passive decay within 5 years",
          "Small satellites (<180 kg) with limited debris risk",
          "Certain experimental or research missions",
        ],
        penalties: {
          description:
            "Non-compliance may result in license denial, modification, or revocation",
          maxFine: 2382178,
          note: "FCC can impose fines up to $2.38M per violation per day",
        },
      },
      orbitsAct2025: {
        description:
          "The ORBITS Act of 2025 codifies the 5-year rule and requires inter-agency coordination",
        implications: [
          "Uniform debris standards across FCC, FAA, and NOAA",
          "Streamlined compliance for multi-agency licenses",
          "Enhanced coordination with international standards",
        ],
      },
      recommendations: calculation.recommendations,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error calculating deorbit requirements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/us-regulatory/deorbit-calculator - Calculate with full profile
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const {
      orbitRegime = "LEO",
      altitudeKm,
      launchDate,
      missionDurationYears,
      plannedDisposalYears,
      plannedDisposalDate,
      hasPropulsion = false,
      hasManeuverability = false,
      isConstellation = false,
      satelliteCount,
      isSmallSatellite = false,
    } = body;

    // Validate orbit regime
    const validOrbitRegimes = [
      "LEO",
      "MEO",
      "GEO",
      "HEO",
      "cislunar",
      "deep_space",
    ];
    if (!validOrbitRegimes.includes(orbitRegime)) {
      return NextResponse.json(
        { error: `Invalid orbit regime: ${orbitRegime}` },
        { status: 400 },
      );
    }

    // Parse dates
    const parsedLaunchDate = launchDate ? new Date(launchDate) : undefined;
    const parsedDisposalDate = plannedDisposalDate
      ? new Date(plannedDisposalDate)
      : undefined;

    // Create profile
    const profile: UsOperatorProfile = {
      operatorTypes: ["satellite_operator"],
      activityTypes: ["satellite_communications"],
      agencies: ["FCC"],
      isUsEntity: true,
      usNexus: "us_licensed",
      orbitRegime: orbitRegime as UsOperatorProfile["orbitRegime"],
      altitudeKm,
      hasPropulsion,
      hasManeuverability,
      missionDurationYears,
      isConstellation,
      satelliteCount,
      isSmallSatellite,
      isNGSO: orbitRegime !== "GEO",
    };

    // Determine if LEO
    const isLeo =
      orbitRegime === "LEO" || (altitudeKm !== undefined && altitudeKm < 2000);
    const requiredDisposalYears = isLeo ? 5 : 25;

    // Calculate compliance
    const calculation = calculateDeorbitRequirements(
      profile,
      parsedLaunchDate,
      undefined,
      parsedDisposalDate,
    );

    // Calculate timeline if we have dates
    let timeline = null;
    if (parsedLaunchDate && missionDurationYears) {
      const deadlineInfo = calculateDeorbitDeadline(
        parsedLaunchDate,
        missionDurationYears,
        isLeo,
      );

      timeline = {
        launchDate: parsedLaunchDate.toISOString(),
        endOfMissionDate: deadlineInfo.endOfMissionDate.toISOString(),
        disposalDeadline: deadlineInfo.disposalDeadline.toISOString(),
        yearsRemaining: Math.round(deadlineInfo.yearsRemaining * 10) / 10,
        isCompliant: deadlineInfo.compliant,
      };

      // Check if planned disposal meets deadline
      if (parsedDisposalDate) {
        const plannedMeetsDeadline =
          parsedDisposalDate <= deadlineInfo.disposalDeadline;
        timeline = {
          ...timeline,
          plannedDisposalDate: parsedDisposalDate.toISOString(),
          plannedMeetsDeadline,
          daysOverDeadline: plannedMeetsDeadline
            ? 0
            : Math.ceil(
                (parsedDisposalDate.getTime() -
                  deadlineInfo.disposalDeadline.getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
        };
      }
    }

    // Build detailed response
    const response = {
      input: body,
      analysis: {
        isLeoSubject: isLeo,
        requiredDisposalYears,
        applicableRegulation: isLeo
          ? {
              rule: "FCC 5-Year Post-Mission Disposal Rule",
              cfrReference: "47 CFR § 25.114(d)(14)(iv)",
              effectiveDate: "2024-09-29",
            }
          : {
              rule: "25-Year Disposal Guideline",
              cfrReference: "47 CFR § 25.114(d)(14)",
              note: "Pre-2024 standard for non-LEO orbits",
            },
      },
      compliance: {
        status: calculation.currentCompliance,
        isCompliant: calculation.currentCompliance === "compliant",
        riskFactors: [] as string[],
      },
      timeline,
      capabilityAssessment: {
        hasPropulsion,
        hasManeuverability,
        canActivelyDeorbit: hasPropulsion || hasManeuverability,
        relianceOnPassiveDecay: !hasPropulsion && !hasManeuverability,
        smallSatelliteConsiderations: isSmallSatellite
          ? "Small satellites (<180 kg) may qualify for simplified compliance pathways"
          : null,
        constellationConsiderations: isConstellation
          ? `Fleet of ${satelliteCount || "multiple"} satellites requires comprehensive disposal planning`
          : null,
      },
      recommendations: calculation.recommendations,
      nextSteps: [
        isLeo && !hasPropulsion
          ? "Verify passive decay meets 5-year requirement through orbital analysis"
          : null,
        "Submit orbital debris mitigation plan to FCC",
        "Establish SSA data sharing with 18th Space Defense Squadron",
        isConstellation
          ? "Develop fleet-wide disposal coordination plan"
          : null,
        "Include disposal budget in mission planning",
      ].filter(Boolean),
    };

    // Add risk factors
    if (isLeo && !hasPropulsion && !hasManeuverability) {
      response.compliance.riskFactors.push(
        "No active deorbit capability - reliant on passive decay",
      );
    }
    if (isConstellation && (satelliteCount ?? 0) > 100) {
      response.compliance.riskFactors.push(
        "Large constellation subject to enhanced FCC scrutiny",
      );
    }
    if (plannedDisposalYears && plannedDisposalYears > requiredDisposalYears) {
      response.compliance.riskFactors.push(
        `Planned disposal of ${plannedDisposalYears} years exceeds ${requiredDisposalYears}-year limit`,
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error calculating deorbit requirements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
