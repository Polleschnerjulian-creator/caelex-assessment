import { NextRequest } from "next/server";
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
import { UnifiedCalculateSchema } from "@/lib/validations";
import {
  createSuccessResponse,
  createValidationError,
  createErrorResponse,
  createEngineErrorResponse,
  ErrorCode,
} from "@/lib/api-response";
import { ASSESSMENT_MIN_DURATION_MS } from "@/lib/engines/shared.server";
import { EU_MEMBER_STATES } from "@/lib/unified-assessment-types";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  try {
    // ── Rate limit ────────────────────────────────────────────────────────
    // Every /calculate endpoint triggers three heavy engine calls
    // (EU Space Act disk read + classification, NIS2, Space Law). Without
    // rate limiting this is a DoS vector: an authenticated user could
    // trigger hundreds of parallel runs and exhaust Neon connections.
    // Uses the "assessment" tier (10/hour per IP) consistent with the
    // legacy single-framework /api/assessment/calculate endpoint.
    const identifier = getIdentifier(request);
    const rateLimitResult = await checkRateLimit("assessment", identifier);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    const parsed = UnifiedCalculateSchema.safeParse(body);
    if (!parsed.success) {
      return createValidationError(parsed.error);
    }
    // The stricter Zod schema uses narrow enum types in several places; the
    // engine mappers accept the looser Partial<UnifiedAssessmentAnswers>, so
    // we widen back here after validation.
    const answers = parsed.data.answers as unknown as Partial<
      import("@/lib/unified-assessment-types").UnifiedAssessmentAnswers
    >;
    const startedAt = parsed.data.startedAt;

    // Anti-bot: Check minimum time (skip for authenticated users)
    const session = await auth();
    if (!session?.user && startedAt !== undefined) {
      const elapsed = Date.now() - startedAt;
      if (elapsed < ASSESSMENT_MIN_DURATION_MS) {
        return createErrorResponse(
          "Assessment completed too quickly. Please try again.",
          ErrorCode.VALIDATION_ERROR,
          400,
        );
      }
    }

    // Constellation validation: default to "small" if operates constellation but no size set
    if (answers.operatesConstellation === true && !answers.constellationSize) {
      answers.constellationSize = "small";
    }

    // ──────────────────────────────────────────────────────────────────────
    // 1. EU Space Act — real engine calls
    // ──────────────────────────────────────────────────────────────────────

    try {
      const activityTypes = answers.activityTypes || [];
      const isDefenseOnly =
        answers.defenseInvolvement === "full" || answers.isDefenseOnly === true;
      // Previously used dynamic import() inside the request handler, which
      // adds first-request latency and defeats static tree-shaking. Now
      // imported statically at the top of the file.
      const isEU = EU_MEMBER_STATES.includes(
        answers.establishmentCountry as (typeof EU_MEMBER_STATES)[number],
      );
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
          const engineAnswers = mapToAssessmentAnswers(
            answers,
            activityTypes[0],
          );
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
      // 2. NIS2 + National Space Law — run in parallel
      // ──────────────────────────────────────────────────────────────────────
      //
      // Previously these two async engine calls ran sequentially, doubling
      // response time for the common case of EU operators selecting one or
      // two jurisdictions. They are fully independent and can safely run
      // in parallel via Promise.all.

      const nis2Answers = mapToNIS2Answers(answers);
      const spaceLawAnswers = mapToSpaceLawAnswers(answers);

      const [nis2Result, spaceLawResult] = await Promise.all([
        calculateNIS2Compliance(nis2Answers),
        spaceLawAnswers.selectedJurisdictions.length > 0
          ? calculateSpaceLawCompliance(spaceLawAnswers)
          : Promise.resolve(null),
      ]);

      // ──────────────────────────────────────────────────────────────────────
      // 4. Build unified result
      // ──────────────────────────────────────────────────────────────────────

      const result = buildUnifiedResult(
        mergedSpaceActResult,
        nis2Result,
        spaceLawResult,
        answers,
      );

      return createSuccessResponse({ result });
    } catch (engineError) {
      logger.error("Unified assessment engine error", engineError);
      return createEngineErrorResponse(engineError);
    }
  } catch (error) {
    logger.error("Unified assessment calculation error", error);
    return createErrorResponse(
      "Failed to calculate compliance profile",
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
