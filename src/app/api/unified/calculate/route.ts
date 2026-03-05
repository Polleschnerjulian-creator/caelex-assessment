import { NextRequest, NextResponse } from "next/server";
import type { UnifiedAssessmentAnswers } from "@/lib/unified-assessment-types";
import {
  loadSpaceActDataFromDisk,
  calculateCompliance,
} from "@/lib/engine.server";
import { calculateNIS2Compliance } from "@/lib/nis2-engine.server";
import { calculateSpaceLawCompliance } from "@/lib/space-law-engine.server";
import {
  mapToAssessmentAnswers,
  mapToNIS2Answers,
  mapToSpaceLawAnswers,
} from "@/lib/unified-assessment-mappers.server";
import {
  mergeMultiActivityResults,
  buildUnifiedResult,
} from "@/lib/unified-engine-merger.server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

// Minimum time (ms) to complete assessment (anti-bot)
const MIN_ASSESSMENT_TIME = 5000; // 5 seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { answers, startedAt } = body as {
      answers: Partial<UnifiedAssessmentAnswers>;
      startedAt: number;
    };

    // Anti-bot: Check minimum time (skip for authenticated users)
    const session = await auth();
    if (!session?.user) {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_ASSESSMENT_TIME) {
        return NextResponse.json(
          { error: "Assessment completed too quickly. Please try again." },
          { status: 400 },
        );
      }
    }

    // Validate required fields
    if (!answers.establishmentCountry || !answers.entitySize) {
      return NextResponse.json(
        { error: "Missing required assessment data" },
        { status: 400 },
      );
    }

    // Constellation validation: default to "small" if operates constellation but no size set
    if (answers.operatesConstellation === true && !answers.constellationSize) {
      answers.constellationSize = "small";
    }

    // ──────────────────────────────────────────────────────────────────────
    // 1. EU Space Act — real engine calls
    // ──────────────────────────────────────────────────────────────────────

    const activityTypes = answers.activityTypes || [];
    const isDefenseOnly =
      answers.defenseInvolvement === "full" || answers.isDefenseOnly === true;
    const isEU = (
      await import("@/lib/unified-assessment-types")
    ).EU_MEMBER_STATES.includes(answers.establishmentCountry as never);
    const providesEUServices =
      answers.providesServicesToEU === true ||
      answers.servesEUCustomers === true;
    const spaceActApplies = !isDefenseOnly && (isEU || providesEUServices);

    let mergedSpaceActResult = null;

    if (spaceActApplies && activityTypes.length > 0) {
      const data = loadSpaceActDataFromDisk();

      // Filter out activity types that have no engine mapping (CAP → null)
      const mappableTypes = activityTypes.filter((t) => {
        const mapped = mapToAssessmentAnswers(answers, t);
        return mapped.activityType !== null;
      });

      if (mappableTypes.length > 0) {
        // Call calculateCompliance once per activity type
        const perActivityResults = mappableTypes.map((actType) => {
          const engineAnswers = mapToAssessmentAnswers(answers, actType);
          return calculateCompliance(engineAnswers, data);
        });

        mergedSpaceActResult = mergeMultiActivityResults(perActivityResults);
      } else {
        // All activity types are CAP — only general articles apply
        // Use a default mapping to get general articles
        const engineAnswers = mapToAssessmentAnswers(answers, activityTypes[0]);
        // Override to null so only ALL articles match
        engineAnswers.activityType = null;
        const fallbackResult = calculateCompliance(engineAnswers, data);
        mergedSpaceActResult = mergeMultiActivityResults([fallbackResult]);
      }
    }

    // If defense-only, mark as such
    if (isDefenseOnly && mergedSpaceActResult) {
      mergedSpaceActResult = {
        ...mergedSpaceActResult,
        applies: false,
        isDefenseOnly: true,
      };
    } else if (isDefenseOnly) {
      mergedSpaceActResult = {
        applies: false,
        operatorTypes: [],
        regime: "out_of_scope" as const,
        regimeLabel: "Exempt",
        regimeReason: "Defense-only operations are exempt under Art. 2(3)",
        applicableArticles: [],
        applicableCount: 0,
        totalArticles: 0,
        applicablePercentage: 0,
        moduleStatuses: [],
        checklist: [],
        keyDates: [],
        estimatedAuthorizationCost: "N/A",
        authorizationPath: "N/A",
        isDefenseOnly: true,
      };
    }

    // ──────────────────────────────────────────────────────────────────────
    // 2. NIS2 — real engine call
    // ──────────────────────────────────────────────────────────────────────

    const nis2Answers = mapToNIS2Answers(answers);

    // Apply additional NIS2 screening accuracy enhancements
    // If designated by member state, boost classification
    // If provides digital infrastructure, mark for Annex I Sector 8
    // These are handled inside the NIS2 engine via entity classification logic

    const nis2Result = await calculateNIS2Compliance(nis2Answers);

    // ──────────────────────────────────────────────────────────────────────
    // 3. National Space Law — real engine call
    // ──────────────────────────────────────────────────────────────────────

    const spaceLawAnswers = mapToSpaceLawAnswers(answers);
    let spaceLawResult = null;

    if (spaceLawAnswers.selectedJurisdictions.length > 0) {
      spaceLawResult = await calculateSpaceLawCompliance(spaceLawAnswers);
    }

    // ──────────────────────────────────────────────────────────────────────
    // 4. Build unified result
    // ──────────────────────────────────────────────────────────────────────

    const result = buildUnifiedResult(
      mergedSpaceActResult,
      nis2Result,
      spaceLawResult,
      answers,
    );

    return NextResponse.json({ result });
  } catch (error) {
    logger.error("Unified assessment calculation error", error);
    return NextResponse.json(
      { error: "Failed to calculate compliance profile" },
      { status: 500 },
    );
  }
}
