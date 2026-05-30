/**
 * ASTRA Tool Executor
 *
 * Implements the execution layer for all ASTRA tools.
 * Calls internal Caelex functions, APIs, and database queries.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import type { AstraToolCall, AstraToolResult, AstraUserContext } from "./types";
import { logAuditEvent } from "@/lib/audit";
import {
  getArticleByNumber,
  getArticlesForOperatorType,
  searchArticles,
  OPERATOR_TYPES,
} from "./regulatory-knowledge/eu-space-act";
import {
  getRequirementsForEntityType,
  NIS2_KEY_REQUIREMENTS,
  INCIDENT_NOTIFICATION_TIMELINE,
  NIS2_PENALTIES,
} from "./regulatory-knowledge/nis2";
import {
  getJurisdictionByCode,
  compareJurisdictions as compareJurisdictionProfiles,
} from "./regulatory-knowledge/jurisdictions";
import {
  getMappingsForRegulation,
  getMappingsForArticle,
  analyzeOverlap,
  CROSS_REGULATION_MAPPINGS,
} from "./regulatory-knowledge/cross-regulation-map";
import {
  getTermByAbbreviation,
  searchTerms,
} from "./regulatory-knowledge/glossary";
import type { IncidentCategory } from "@/lib/services/incident-response-service";
import type { SpaceProductSegment } from "@/lib/cra-types";
import {
  getObligationsForOperator,
  getSubgraph,
  getNodeDetail,
  propagateChange,
} from "@/lib/ontology";

// ─── Input Validation Helpers ───

/**
 * Safely extract and validate a string input field.
 * Returns the value if valid, defaultValue if missing/invalid.
 */
function getString(
  input: Record<string, unknown>,
  key: string,
  defaultValue?: string,
): string | undefined {
  const value = input[key];
  if (typeof value === "string" && value.length <= 10000) return value.trim();
  return defaultValue;
}

function getBoolean(
  input: Record<string, unknown>,
  key: string,
  defaultValue = false,
): boolean {
  const value = input[key];
  if (typeof value === "boolean") return value;
  return defaultValue;
}

function getNumber(
  input: Record<string, unknown>,
  key: string,
  defaultValue?: number,
): number | undefined {
  const value = input[key];
  if (typeof value === "number" && isFinite(value)) return value;
  return defaultValue;
}

function getStringEnum<T extends string>(
  input: Record<string, unknown>,
  key: string,
  validValues: readonly T[],
  defaultValue?: T,
): T | undefined {
  const value = getString(input, key);
  if (value && (validValues as readonly string[]).includes(value))
    return value as T;
  return defaultValue;
}

function getStringArray(input: Record<string, unknown>, key: string): string[] {
  const value = input[key];
  if (Array.isArray(value))
    return value
      .filter((v): v is string => typeof v === "string")
      .slice(0, 100);
  return [];
}

/**
 * Decode a base64 string into a Uint8Array. Tolerates the `data:` URI
 * prefix so the Astra tool can be called with a full
 * `data:application/pdf;base64,...` blob or a bare payload.
 *
 * Caps the decoded size at 8 MB to keep the cold-path memory budget
 * predictable on Vercel Functions — the Z4b tool description tells
 * operators to crop before upload.
 */
function decodeBase64(input: string): Uint8Array {
  const payload = input.startsWith("data:")
    ? input.replace(/^data:[^;]+;base64,/, "")
    : input;
  const buf = Buffer.from(payload, "base64");
  const MAX_BYTES = 8 * 1024 * 1024;
  if (buf.byteLength > MAX_BYTES) {
    throw new Error(
      `Datasheet exceeds 8 MB upload limit (received ${buf.byteLength} bytes).`,
    );
  }
  return new Uint8Array(buf);
}

// ─── Trade-feature helpers (used by predict_license_time) ───

/**
 * Coarse ISO-3166 country code → EAR destination-group bucket.
 * Used by `predict_license_time` to feed the licence-time predictor.
 *
 * Z22 Country-Group Resolver is the authoritative mapper for the full
 * 250-country set; this helper replicates only the high-confidence
 * buckets (E embargoed, EU intra-community, CHINA, RUSSIA, Five-Eyes
 * ALLIED, Group A allies). Unknowns default to "B" (most-favoured-
 * nation broad bucket), which matches the dataset's "default" rows.
 */
export function resolveDestinationGroup(
  countryCode: string,
): "A" | "B" | "D" | "E" | "CHINA" | "RUSSIA" | "EU" | "ALLIED" {
  const cc = countryCode.toUpperCase();
  // Embargoed (Country Group E:1 / E:2)
  if (cc === "CU" || cc === "IR" || cc === "KP" || cc === "SY" || cc === "AF") {
    return "E";
  }
  // Bilateral special cases
  if (cc === "CN" || cc === "HK" || cc === "MO") return "CHINA";
  if (cc === "RU" || cc === "BY") return "RUSSIA";
  // EU + EFTA intra-community
  const EU_PLUS = new Set([
    "AT",
    "BE",
    "BG",
    "HR",
    "CY",
    "CZ",
    "DK",
    "EE",
    "FI",
    "FR",
    "DE",
    "GR",
    "HU",
    "IE",
    "IT",
    "LV",
    "LT",
    "LU",
    "MT",
    "NL",
    "PL",
    "PT",
    "RO",
    "SK",
    "SI",
    "ES",
    "SE",
    "IS",
    "LI",
    "NO",
    "CH",
  ]);
  if (EU_PLUS.has(cc)) return "EU";
  // Five Eyes / NATO partners not in Group A specifically
  if (cc === "AU" || cc === "CA" || cc === "NZ" || cc === "GB") {
    return "ALLIED";
  }
  // Country Group A allies (subset — A:1 NATO allies + key A:5/A:6)
  const A_GROUP = new Set([
    "JP",
    "KR",
    "TW",
    "IL",
    "SG",
    "TR",
    "IN",
    "AR",
    "BR",
  ]);
  if (A_GROUP.has(cc)) return "A";
  // Country Group D — generally restricted
  const D_GROUP = new Set([
    "AZ",
    "BY",
    "BN",
    "ZW",
    "MM",
    "VE",
    "SD",
    "DZ",
    "EG",
    "JO",
    "LB",
    "LY",
    "TN",
    "AE",
    "PK",
  ]);
  if (D_GROUP.has(cc)) return "D";
  // Default to Group B (most-favoured-nation broad bucket)
  return "B";
}

/**
 * Coarse ECCN string → bucket. Matches the prefixes documented in
 * src/lib/trade/license-analytics/historical-times.ts.
 *
 * USML categories (Roman numerals) and 0Y521 / 0Y6XX encryption
 * specials are recognised before the generic 600-series / 9x515 /
 * standard dual-use checks. EAR99 falls out at the bottom.
 */
export function resolveEccnBucket(
  eccn: string,
):
  | "0Y_SERIES"
  | "STANDARD_DUAL_USE"
  | "SIX_HUNDRED_SERIES"
  | "9X515"
  | "USML"
  | "EAR99" {
  const e = eccn.trim().toUpperCase();
  if (!e || e === "EAR99") return "EAR99";
  // USML — Roman numeral category (e.g. "XV", "XII(d)", "IV(a)(1)")
  if (/^[IVXLCDM]+(\(|$)/.test(e)) return "USML";
  // 0Y521 / 0Y6XX encryption + advanced
  if (/^0[A-Z]521\b/.test(e) || /^0[A-Z]6/.test(e)) return "0Y_SERIES";
  // 9x515 spacecraft
  if (/^9[A-Z]515/.test(e)) return "9X515";
  // 600-series (defence) — digit 6 in third position
  if (/^[0-9][A-Z]6[0-9]{2}/.test(e)) return "SIX_HUNDRED_SERIES";
  // Standard dual-use ECCN pattern
  if (/^[0-9][A-Z][0-9]{3}/.test(e)) return "STANDARD_DUAL_USE";
  return "EAR99";
}

/**
 * Default licence form type per authority. Used when caller omits
 * `formType` — picks the most-common operator-facing licence.
 */
export function defaultFormTypeFor(authority: string): string {
  switch (authority) {
    case "BIS":
      return "BIS_STANDARD";
    case "DDTC":
      return "DDTC_DSP5";
    case "BAFA":
      return "BAFA_EINZEL";
    case "ECJU":
      return "ECJU_SIEL";
    default:
      return "BIS_STANDARD";
  }
}

/**
 * Validate that the caller-supplied formType is meaningful for the
 * chosen authority (rejects e.g. BIS_STANDARD with authority DDTC).
 */
export function isValidFormTypeForAuthority(
  formType: string,
  authority: string,
): boolean {
  const prefix = formType.split("_")[0];
  return prefix === authority;
}

// ─── Main Executor ───

export async function executeTool(
  toolCall: AstraToolCall,
  userContext: AstraUserContext,
): Promise<AstraToolResult> {
  const startTime = Date.now();

  try {
    // Log tool execution for audit trail
    await logAuditEvent({
      action: "ASTRA_TOOL_CALL",
      entityType: "astra",
      entityId: toolCall.id,
      userId: userContext.userId,
      metadata: {
        organizationId: userContext.organizationId,
        toolName: toolCall.name,
        input: toolCall.input,
      },
    });

    // Execute the appropriate tool handler. If no TOOL_HANDLERS entry
    // exists, fall through to the Action-Layer bridge (Sprint B1) — this
    // lets every defineAction()-registered action run through Astra
    // without any per-tool boilerplate here.
    const handler = TOOL_HANDLERS[toolCall.name];
    let result: unknown;
    if (handler) {
      result = await handler(toolCall.input, userContext);
    } else {
      // Lazy-import the bridge to keep the cold path light for legacy tools.
      const { executeAstraAction } =
        await import("@/lib/comply-v2/actions/astra-bridge.server");
      // The action layer reads userId/organizationId from its own auth
      // gate (defineAction). We just forward an empty ProposalCallOptions —
      // the bridge inserts decisionLog + reproducibility itself when the
      // action is approval-gated.
      const actionResult = await executeAstraAction(
        toolCall.name,
        toolCall.input,
      );
      if (!actionResult.ok) {
        return {
          toolCallId: toolCall.id,
          success: false,
          error: actionResult.error,
        };
      }
      result = actionResult.result;
    }

    // Log successful execution
    await logAuditEvent({
      action: "ASTRA_TOOL_RESULT",
      entityType: "astra",
      entityId: toolCall.id,
      userId: userContext.userId,
      metadata: {
        organizationId: userContext.organizationId,
        toolName: toolCall.name,
        executionTimeMs: Date.now() - startTime,
        success: true,
      },
    });

    return {
      toolCallId: toolCall.id,
      success: true,
      data: result,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Log failed execution
    await logAuditEvent({
      action: "ASTRA_TOOL_ERROR",
      entityType: "astra",
      entityId: toolCall.id,
      userId: userContext.userId,
      metadata: {
        organizationId: userContext.organizationId,
        toolName: toolCall.name,
        error: errorMessage,
        executionTimeMs: Date.now() - startTime,
      },
    });

    return {
      toolCallId: toolCall.id,
      success: false,
      error: errorMessage,
    };
  }
}

// ─── Tool Handler Type ───

type ToolHandler = (
  input: Record<string, unknown>,
  userContext: AstraUserContext,
) => Promise<unknown>;

// ─── Tool Handlers ───

const TOOL_HANDLERS: Record<string, ToolHandler> = {
  // ─── Compliance Tools ───

  check_compliance_status: async (input, userContext) => {
    const targetModule = getStringEnum(input, "module", [
      "debris",
      "cybersecurity",
      "insurance",
      "nis2",
    ] as const);
    const includeDetails = getBoolean(input, "includeDetails");

    // Query user's assessments (assessments are linked to users, not orgs)
    const [
      debrisAssessment,
      cybersecurityAssessment,
      insuranceAssessment,
      nis2Assessment,
    ] = await Promise.all([
      prisma.debrisAssessment.findFirst({
        where: { userId: userContext.userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.cybersecurityAssessment.findFirst({
        where: { userId: userContext.userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.insuranceAssessment.findFirst({
        where: { userId: userContext.userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.nIS2Assessment.findFirst({
        where: { userId: userContext.userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const org = await prisma.organization.findUnique({
      where: { id: userContext.organizationId },
      select: { name: true },
    });

    const modules: Record<string, unknown> = {};

    // Calculate compliance scores for each module
    if (!targetModule || targetModule === "debris") {
      modules.debris = {
        status: debrisAssessment ? "assessed" : "not_started",
        score: debrisAssessment?.complianceScore || 0,
        lastUpdated: debrisAssessment?.updatedAt,
        details:
          includeDetails && debrisAssessment
            ? {
                orbitRegime: debrisAssessment.orbitType,
              }
            : undefined,
      };
    }

    if (!targetModule || targetModule === "cybersecurity") {
      modules.cybersecurity = {
        status: cybersecurityAssessment ? "assessed" : "not_started",
        score: cybersecurityAssessment?.maturityScore || 0,
        lastUpdated: cybersecurityAssessment?.updatedAt,
      };
    }

    if (!targetModule || targetModule === "insurance") {
      modules.insurance = {
        status: insuranceAssessment ? "assessed" : "not_started",
        score: insuranceAssessment?.complianceScore || 0,
        lastUpdated: insuranceAssessment?.updatedAt,
      };
    }

    if (!targetModule || targetModule === "nis2") {
      modules.nis2 = {
        status: nis2Assessment ? "assessed" : "not_started",
        score: nis2Assessment?.complianceScore || 0,
        entityClassification: nis2Assessment?.entityClassification,
        lastUpdated: nis2Assessment?.updatedAt,
      };
    }

    // Calculate overall score
    const moduleValues = Object.values(modules) as Array<
      Record<string, unknown>
    >;
    const scores = moduleValues
      .map((m) => (m.score as number) || 0)
      .filter((s) => s > 0);
    const overallScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    return {
      organizationName: org?.name || userContext.organizationName,
      overallScore,
      modules,
      summary: `${org?.name || "Organization"} has an overall compliance score of ${overallScore}%. ${scores.length} modules have been assessed.`,
    };
  },

  get_article_requirements: async (input) => {
    const articleNumber = getString(input, "articleNumber");
    if (!articleNumber)
      return { found: false, error: "articleNumber is required" };
    const operatorType = getString(input, "operatorType");

    // Extract base article number (e.g., "58" from "58(2)(a)")
    const baseNumber = articleNumber.match(/^\d+/)?.[0] || articleNumber;

    const article = getArticleByNumber(baseNumber);
    if (!article) {
      // Search for matching articles
      const matches = searchArticles(articleNumber);
      if (matches.length > 0) {
        return {
          found: false,
          suggestions: matches.slice(0, 3).map((a) => ({
            number: a.number,
            title: a.title,
          })),
          message: `Article ${articleNumber} not found. Did you mean one of these?`,
        };
      }
      return {
        found: false,
        message: `Article ${articleNumber} not found in the EU Space Act.`,
      };
    }

    // Filter by operator type if specified
    if (
      operatorType &&
      !article.applicableOperatorTypes.includes(operatorType)
    ) {
      return {
        found: true,
        article: {
          number: article.number,
          title: article.title,
        },
        applicable: false,
        message: `Article ${article.number} does not apply to ${operatorType} operators. It applies to: ${article.applicableOperatorTypes.join(", ")}`,
      };
    }

    return {
      found: true,
      applicable: true,
      article: {
        number: article.number,
        title: article.title,
        chapter: article.chapter,
        summary: article.summary,
        keyRequirements: article.keyRequirements,
        applicableOperatorTypes: article.applicableOperatorTypes,
        relatedArticles: article.relatedArticles,
        complianceCriteria: article.complianceCriteria,
        deadlines: article.deadlines,
        penalties: article.penalties,
        lightRegimeApplicable: article.lightRegimeApplicable,
      },
    };
  },

  run_gap_analysis: async (input, userContext) => {
    const targetModule = getStringEnum(input, "module", [
      "debris",
      "cybersecurity",
      "insurance",
      "nis2",
    ] as const);
    const priorityFilter = getStringEnum(input, "priorityFilter", [
      "critical",
      "high",
      "medium",
      "low",
    ] as const);
    const includeRecommendations = input.includeRecommendations !== false;

    // Get current compliance status
    const statusResult = (await TOOL_HANDLERS.check_compliance_status(
      { includeDetails: true },
      userContext,
    )) as Record<string, unknown>;

    if (statusResult.error) {
      return statusResult;
    }

    const gaps: Array<{
      module: string;
      requirement: string;
      priority: string;
      status: string;
      recommendation?: string;
    }> = [];

    // Analyze gaps for each module
    const modules = statusResult.modules as Record<
      string,
      Record<string, unknown>
    >;

    if ((!targetModule || targetModule === "debris") && modules.debris) {
      if (modules.debris.status === "not_started") {
        gaps.push({
          module: "Debris Mitigation",
          requirement: "Complete debris assessment (EU Space Act Art. 31-37)",
          priority: "high",
          status: "not_started",
          recommendation: includeRecommendations
            ? "Run the debris mitigation assessment in Caelex to identify specific requirements for your orbit."
            : undefined,
        });
      } else if ((modules.debris.score as number) < 70) {
        gaps.push({
          module: "Debris Mitigation",
          requirement: "Improve debris mitigation compliance",
          priority: "medium",
          status: "partial",
          recommendation: includeRecommendations
            ? "Review your disposal plan and collision avoidance procedures."
            : undefined,
        });
      }
    }

    if (
      (!targetModule || targetModule === "cybersecurity") &&
      modules.cybersecurity
    ) {
      if (modules.cybersecurity.status === "not_started") {
        gaps.push({
          module: "Cybersecurity",
          requirement:
            "Complete cybersecurity assessment (EU Space Act Art. 74-85, NIS2 Art. 21)",
          priority: "critical",
          status: "not_started",
          recommendation: includeRecommendations
            ? "Run the cybersecurity maturity assessment to establish your baseline."
            : undefined,
        });
      }
    }

    if ((!targetModule || targetModule === "insurance") && modules.insurance) {
      if (modules.insurance.status === "not_started") {
        gaps.push({
          module: "Insurance",
          requirement: "Verify TPL insurance coverage (EU Space Act Art. 58)",
          priority: "critical",
          status: "not_started",
          recommendation: includeRecommendations
            ? "Complete the insurance assessment to verify minimum EUR 60M TPL coverage."
            : undefined,
        });
      }
    }

    if ((!targetModule || targetModule === "nis2") && modules.nis2) {
      if (modules.nis2.status === "not_started") {
        gaps.push({
          module: "NIS2",
          requirement: "Complete NIS2 classification and assessment",
          priority: "high",
          status: "not_started",
          recommendation: includeRecommendations
            ? "Determine your NIS2 entity classification and applicable requirements."
            : undefined,
        });
      }
    }

    // Filter by priority if specified
    const filteredGaps = priorityFilter
      ? gaps.filter((g) => g.priority === priorityFilter)
      : gaps;

    // Sort by priority
    const priorityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    filteredGaps.sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99),
    );

    return {
      totalGaps: filteredGaps.length,
      criticalGaps: filteredGaps.filter((g) => g.priority === "critical")
        .length,
      gaps: filteredGaps,
      overallScore: statusResult.overallScore,
      summary:
        filteredGaps.length === 0
          ? "No compliance gaps identified. Your compliance posture is strong."
          : `Identified ${filteredGaps.length} gaps, including ${filteredGaps.filter((g) => g.priority === "critical").length} critical items requiring immediate attention.`,
    };
  },

  check_cross_regulation_overlap: async (input) => {
    const sourceRegulation = getString(input, "sourceRegulation");
    if (!sourceRegulation) return { error: "sourceRegulation is required" };
    const targetRegulation = getString(input, "targetRegulation");
    const includeEffortEstimates = input.includeEffortEstimates !== false;

    if (targetRegulation) {
      const analysis = analyzeOverlap(sourceRegulation, targetRegulation);
      const mappings = CROSS_REGULATION_MAPPINGS.filter(
        (m) =>
          (m.sourceRegulation === sourceRegulation &&
            m.targetRegulation === targetRegulation) ||
          (m.sourceRegulation === targetRegulation &&
            m.targetRegulation === sourceRegulation),
      );

      return {
        analysis,
        mappings: mappings.map((m) => ({
          sourceArticle: m.sourceArticle,
          targetArticle: m.targetArticle,
          overlapType: m.overlapType,
          description: m.description,
          timeSavings: includeEffortEstimates
            ? m.timeSavingsPercent
            : undefined,
        })),
        summary: `Found ${analysis.totalMappings} overlapping requirements between ${sourceRegulation} and ${targetRegulation}. ${analysis.singleImplementation} can be satisfied with a single implementation (estimated ${analysis.estimatedSavingsPercent}% effort savings).`,
      };
    }

    // Get all overlaps for source regulation
    const mappings = getMappingsForRegulation(sourceRegulation);
    const byTarget: Record<string, typeof mappings> = {};
    mappings.forEach((m) => {
      const target =
        m.sourceRegulation === sourceRegulation
          ? m.targetRegulation
          : m.sourceRegulation;
      if (!byTarget[target]) byTarget[target] = [];
      byTarget[target].push(m);
    });

    return {
      sourceRegulation,
      overlaps: Object.entries(byTarget).map(([target, targetMappings]) => ({
        targetRegulation: target,
        totalMappings: targetMappings.length,
        singleImplementation: targetMappings.filter(
          (m) => m.overlapType === "single_implementation",
        ).length,
      })),
      summary: `${sourceRegulation} has overlapping requirements with ${Object.keys(byTarget).length} other regulations.`,
    };
  },

  compare_jurisdictions: async (input) => {
    const jurisdictions = getStringArray(input, "jurisdictions");
    const comparisonFactors = getStringArray(input, "comparisonFactors");
    const comparisonFactorsOrUndefined =
      comparisonFactors.length > 0 ? comparisonFactors : undefined;

    if (jurisdictions.length < 2) {
      return { error: "At least 2 jurisdictions required for comparison" };
    }

    const profiles = compareJurisdictionProfiles(jurisdictions);
    if (profiles.length !== jurisdictions.length) {
      const missing = jurisdictions.filter(
        (j) => !profiles.find((p) => p.countryCode === j),
      );
      return { error: `Unknown jurisdiction(s): ${missing.join(", ")}` };
    }

    const comparison = profiles.map((p) => {
      const data: Record<string, unknown> = {
        countryCode: p.countryCode,
        countryName: p.countryName,
        ncaName: p.ncaName,
      };

      const factors = comparisonFactorsOrUndefined || [
        "processingTime",
        "insuranceMinimums",
        "fees",
        "languageRequirements",
        "favorabilityScore",
      ];

      if (factors.includes("processingTime")) {
        data.processingTimeDays = p.processingTimeDays;
      }
      if (factors.includes("insuranceMinimums")) {
        data.insuranceMinimums = p.insuranceMinimums;
      }
      if (factors.includes("fees")) {
        data.fees = p.fees;
      }
      if (factors.includes("languageRequirements")) {
        data.languageRequirements = p.languageRequirements;
      }
      if (factors.includes("liabilityRegime")) {
        data.liabilityRegime = p.liabilityRegime;
      }
      if (factors.includes("favorabilityScore")) {
        data.favorabilityScore = p.favorabilityScore;
      }

      return data;
    });

    // Find best option
    const ranked = [...profiles].sort(
      (a, b) => b.favorabilityScore - a.favorabilityScore,
    );

    return {
      comparison,
      recommendation: {
        topChoice: ranked[0].countryCode,
        countryName: ranked[0].countryName,
        reason: `${ranked[0].countryName} has the highest favorability score (${ranked[0].favorabilityScore}/100) with ${ranked[0].processingTimeDays.standard}-day processing time.`,
      },
    };
  },

  get_deadline_timeline: async (input, userContext) => {
    const daysAhead = Math.min(getNumber(input, "daysAhead", 90)!, 365);

    const now = new Date();
    const futureDate = new Date(
      now.getTime() + daysAhead * 24 * 60 * 60 * 1000,
    );

    // Query deadlines by userId
    const deadlines = await prisma.deadline.findMany({
      where: {
        userId: userContext.userId,
        dueDate: {
          gte: now,
          lte: futureDate,
        },
      },
      orderBy: { dueDate: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        priority: true,
        status: true,
        category: true,
      },
    });

    return {
      deadlines: deadlines.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        dueDate: d.dueDate,
        daysRemaining: Math.ceil(
          (d.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        ),
        module: d.category || "general",
        priority: d.priority,
        status: d.status,
      })),
      summary: `${deadlines.length} deadlines in the next ${daysAhead} days.`,
    };
  },

  // ─── Assessment Tools ───

  get_assessment_results: async (input, userContext) => {
    const assessmentType = getStringEnum(input, "assessmentType", [
      "debris",
      "cybersecurity",
      "insurance",
      "nis2",
      "environmental",
    ] as const);
    if (!assessmentType) {
      const raw = getString(input, "assessmentType");
      return {
        error: raw
          ? `Unknown assessment type: ${raw}`
          : "assessmentType is required",
      };
    }

    // Map assessment types to Prisma models
    const assessmentQueries: Record<string, () => Promise<unknown>> = {
      debris: () =>
        prisma.debrisAssessment.findFirst({
          where: { userId: userContext.userId },
          orderBy: { createdAt: "desc" },
        }),
      cybersecurity: () =>
        prisma.cybersecurityAssessment.findFirst({
          where: { userId: userContext.userId },
          orderBy: { createdAt: "desc" },
        }),
      insurance: () =>
        prisma.insuranceAssessment.findFirst({
          where: { userId: userContext.userId },
          orderBy: { createdAt: "desc" },
        }),
      nis2: () =>
        prisma.nIS2Assessment.findFirst({
          where: { userId: userContext.userId },
          orderBy: { createdAt: "desc" },
        }),
      environmental: () =>
        prisma.environmentalAssessment.findFirst({
          where: { userId: userContext.userId },
          orderBy: { createdAt: "desc" },
        }),
    };

    const query = assessmentQueries[assessmentType];
    if (!query) {
      return { error: `Unknown assessment type: ${assessmentType}` };
    }

    const assessment = await query();
    if (!assessment) {
      return {
        found: false,
        message: `No ${assessmentType} assessment found. Complete the assessment to see results.`,
      };
    }

    return {
      found: true,
      assessmentType,
      result: assessment,
    };
  },

  get_operator_classification: async (input, userContext) => {
    const includeObligations = input.includeObligations !== false;
    const includeApplicableArticles = getBoolean(
      input,
      "includeApplicableArticles",
    );

    const operatorType = userContext.operatorType;
    if (!operatorType) {
      return {
        classified: false,
        message:
          "Operator type not yet determined. Complete the EU Space Act assessment to classify your organization.",
      };
    }

    const typeInfo =
      OPERATOR_TYPES[operatorType as keyof typeof OPERATOR_TYPES];
    if (!typeInfo) {
      return {
        classified: true,
        operatorType,
        message: `Unknown operator type: ${operatorType}`,
      };
    }

    const result: Record<string, unknown> = {
      classified: true,
      operatorType,
      name: typeInfo.name,
      definition: typeInfo.definition,
    };

    if (includeObligations) {
      result.keyObligations = typeInfo.keyObligations;
      result.applicableChapters = typeInfo.applicableChapters;
    }

    if (includeApplicableArticles) {
      const articles = getArticlesForOperatorType(operatorType);
      result.applicableArticles = articles.map((a) => ({
        number: a.number,
        title: a.title,
        chapter: a.chapter,
      }));
      result.articleCount = articles.length;
    }

    return result;
  },

  get_nis2_classification: async (input, userContext) => {
    const includeRequirements = input.includeRequirements !== false;
    const includeTimelines = input.includeTimelines !== false;
    // Note: these booleans use !== false pattern (defaulting to true) intentionally

    // Try to get from assessment
    const assessment = await prisma.nIS2Assessment.findFirst({
      where: { userId: userContext.userId },
      orderBy: { createdAt: "desc" },
    });

    const classification =
      assessment?.entityClassification || userContext.nis2Classification;

    if (!classification) {
      return {
        classified: false,
        message:
          "NIS2 classification not yet determined. Complete the NIS2 assessment.",
      };
    }

    const result: Record<string, unknown> = {
      classified: true,
      entityClassification: classification,
      description:
        classification === "essential"
          ? "Essential entity: Large space operator subject to full NIS2 requirements"
          : classification === "important"
            ? "Important entity: Medium space operator subject to NIS2 requirements with lighter supervision"
            : "Out of scope: Does not meet thresholds for NIS2 obligations",
    };

    if (includeRequirements && classification !== "out_of_scope") {
      const requirements = getRequirementsForEntityType(
        classification as "essential" | "important",
      );
      result.requirements = requirements.map((r) => ({
        id: r.id,
        category: r.category,
        title: r.title,
        articleReference: r.articleReference,
      }));
      result.requirementCount = requirements.length;
    }

    if (includeTimelines) {
      result.incidentTimeline = INCIDENT_NOTIFICATION_TIMELINE;
      result.penalties =
        NIS2_PENALTIES[classification as keyof typeof NIS2_PENALTIES];
    }

    return result;
  },

  // ─── Document Tools ───

  list_documents: async (input, userContext) => {
    const category = getString(input, "category");
    const status = getString(input, "status");
    const expiringWithinDays = getNumber(input, "expiringWithinDays");

    const where: Record<string, unknown> = { userId: userContext.userId };
    if (category) where.category = category;
    if (status) where.status = status;
    if (expiringWithinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + expiringWithinDays);
      where.expiryDate = { lte: futureDate, gte: new Date() };
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        category: true,
        status: true,
        expiryDate: true,
        createdAt: true,
        fileSize: true,
      },
    });

    return {
      documents,
      total: documents.length,
    };
  },

  check_document_completeness: async (input, userContext) => {
    const targetModule = getString(input, "module");
    if (!targetModule) return { error: "module is required" };

    // Define required documents per module
    const requiredDocs: Record<string, string[]> = {
      authorization_application: [
        "Technical specification",
        "Debris mitigation plan",
        "Insurance certificate",
        "Cybersecurity assessment",
        "Company registration",
        "Financial statements",
      ],
      debris_mitigation: [
        "Debris mitigation plan",
        "Orbital analysis",
        "Collision avoidance procedures",
        "End-of-life plan",
      ],
      cybersecurity: [
        "Security policy",
        "Risk assessment",
        "Incident response plan",
        "Penetration test report",
      ],
      insurance: ["TPL insurance certificate", "Policy schedule"],
    };

    const required = requiredDocs[targetModule] || [];

    // Check which documents exist
    const existingDocs = await prisma.document.findMany({
      where: {
        userId: userContext.userId,
        status: { not: "EXPIRED" },
      },
      select: { name: true, category: true },
    });

    const existingNames = existingDocs.map((d) => d.name.toLowerCase());
    const missing = required.filter(
      (r) => !existingNames.some((n) => n.includes(r.toLowerCase())),
    );
    const present = required.filter((r) =>
      existingNames.some((n) => n.includes(r.toLowerCase())),
    );

    return {
      module: targetModule,
      required: required.length,
      present: present.length,
      missing,
      complete: missing.length === 0,
      completenessPercent:
        required.length > 0
          ? Math.round((present.length / required.length) * 100)
          : 100,
    };
  },

  generate_compliance_report: async (input, userContext) => {
    const reportType = getString(input, "reportType");
    if (!reportType) return { error: "reportType is required" };

    // Map report types to Generate 2.0 NCA document types
    const typeMap: Record<string, string> = {
      gap_analysis: "CYBER_RISK_ASSESSMENT",
      nis2_status: "INCIDENT_RESPONSE",
    };

    const ncaDocType = typeMap[reportType];
    if (ncaDocType) {
      try {
        const { initGeneration } = await import("@/lib/generate");
        const result = await initGeneration(
          userContext.userId,
          userContext.organizationId,
          ncaDocType as any,
        );

        return {
          status: "initialized",
          documentId: result.documentId,
          reportType,
          viewUrl: "/dashboard/generate",
          message:
            "Your document has been initialized. Open the Document Generator to complete generation.",
          readinessScore: result.readinessScore,
          readinessLevel: result.readinessLevel,
        };
      } catch (error) {
        return {
          error: `Failed to initialize document: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }

    return {
      status: "redirect",
      reportType,
      viewUrl: "/dashboard/generate",
      message: `Open the Document Generator to generate your ${reportType} report.`,
    };
  },

  generate_authorization_application: async (input, userContext) => {
    const jurisdiction = getString(input, "jurisdiction");
    if (!jurisdiction) return { error: "jurisdiction is required" };
    const applicationType = getString(input, "applicationType") || "standard";

    const jurisdictionProfile = getJurisdictionByCode(jurisdiction);
    if (!jurisdictionProfile) {
      return { error: `Unknown jurisdiction: ${jurisdiction}` };
    }

    try {
      const { initGeneration } = await import("@/lib/generate");
      const result = await initGeneration(
        userContext.userId,
        userContext.organizationId,
        "AUTHORIZATION_APPLICATION" as any,
      );

      return {
        status: "initialized",
        documentId: result.documentId,
        jurisdiction,
        jurisdictionName: jurisdictionProfile.countryName,
        ncaName: jurisdictionProfile.ncaName,
        applicationType,
        viewUrl: "/dashboard/generate",
        message:
          "Your document has been initialized. Open the Document Generator to complete generation.",
        readinessScore: result.readinessScore,
        readinessLevel: result.readinessLevel,
        notes: [
          `Language requirements: ${jurisdictionProfile.languageRequirements.join(", ")}`,
          `Processing time: ${jurisdictionProfile.processingTimeDays.standard} days`,
        ],
      };
    } catch (error) {
      return {
        error: `Failed to initialize document: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },

  generate_debris_mitigation_plan: async (input, userContext) => {
    try {
      const { initGeneration } = await import("@/lib/generate");
      const result = await initGeneration(
        userContext.userId,
        userContext.organizationId,
        "DMP" as any,
      );

      return {
        status: "initialized",
        documentId: result.documentId,
        format: input.format,
        viewUrl: "/dashboard/generate",
        message:
          "Your document has been initialized. Open the Document Generator to complete generation.",
        readinessScore: result.readinessScore,
        readinessLevel: result.readinessLevel,
      };
    } catch (error) {
      return {
        error: `Failed to initialize document: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },

  generate_cybersecurity_framework: async (input, userContext) => {
    try {
      const { initGeneration } = await import("@/lib/generate");
      const result = await initGeneration(
        userContext.userId,
        userContext.organizationId,
        "CYBER_POLICY" as any,
      );

      return {
        status: "initialized",
        documentId: result.documentId,
        viewUrl: "/dashboard/generate",
        message:
          "Your document has been initialized. Open the Document Generator to complete generation.",
        readinessScore: result.readinessScore,
        readinessLevel: result.readinessLevel,
      };
    } catch (error) {
      return {
        error: `Failed to initialize document: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },

  generate_environmental_report: async (input, userContext) => {
    try {
      const { initGeneration } = await import("@/lib/generate");
      const result = await initGeneration(
        userContext.userId,
        userContext.organizationId,
        "ENVIRONMENTAL_FOOTPRINT" as any,
      );

      return {
        status: "initialized",
        documentId: result.documentId,
        viewUrl: "/dashboard/generate",
        message:
          "Your document has been initialized. Open the Document Generator to complete generation.",
        readinessScore: result.readinessScore,
        readinessLevel: result.readinessLevel,
      };
    } catch (error) {
      return {
        error: `Failed to initialize document: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },

  generate_insurance_report: async (input, userContext) => {
    try {
      const { initGeneration } = await import("@/lib/generate");
      const result = await initGeneration(
        userContext.userId,
        userContext.organizationId,
        "INSURANCE_COMPLIANCE" as any,
      );

      return {
        status: "initialized",
        documentId: result.documentId,
        viewUrl: "/dashboard/generate",
        message:
          "Your document has been initialized. Open the Document Generator to complete generation.",
        readinessScore: result.readinessScore,
        readinessLevel: result.readinessLevel,
      };
    } catch (error) {
      return {
        error: `Failed to initialize document: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },

  generate_nis2_report: async (input, userContext) => {
    try {
      const { initGeneration } = await import("@/lib/generate");
      const result = await initGeneration(
        userContext.userId,
        userContext.organizationId,
        "INCIDENT_RESPONSE" as any,
      );

      return {
        status: "initialized",
        documentId: result.documentId,
        viewUrl: "/dashboard/generate",
        message:
          "Your document has been initialized. Open the Document Generator to complete generation.",
        readinessScore: result.readinessScore,
        readinessLevel: result.readinessLevel,
      };
    } catch (error) {
      return {
        error: `Failed to initialize document: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },

  // ─── Knowledge Tools ───

  search_regulation: async (input) => {
    const query = getString(input, "query");
    if (!query) return { error: "query is required" };
    const maxResults = Math.min(getNumber(input, "maxResults", 5)!, 10);

    // Search across regulatory knowledge
    const articleMatches = searchArticles(query).slice(0, maxResults);
    const nis2Matches = NIS2_KEY_REQUIREMENTS.filter(
      (r) =>
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.description.toLowerCase().includes(query.toLowerCase()),
    ).slice(0, maxResults);
    const termMatches = searchTerms(query).slice(0, maxResults);

    return {
      query,
      results: {
        euSpaceActArticles: articleMatches.map((a) => ({
          number: a.number,
          title: a.title,
          summary: a.summary,
        })),
        nis2Requirements: nis2Matches.map((r) => ({
          id: r.id,
          title: r.title,
          articleReference: r.articleReference,
        })),
        glossaryTerms: termMatches.map((t) => ({
          abbreviation: t.abbreviation,
          fullName: t.fullName,
        })),
      },
      totalResults:
        articleMatches.length + nis2Matches.length + termMatches.length,
    };
  },

  get_article_detail: async (input) => {
    const regulation = getString(input, "regulation");
    if (!regulation) return { error: "regulation is required" };
    const article = getString(input, "article");
    if (!article) return { error: "article is required" };

    if (regulation === "eu_space_act") {
      const articleData = getArticleByNumber(article);
      if (!articleData) {
        return {
          found: false,
          message: `Article ${article} not found in EU Space Act.`,
        };
      }
      return { found: true, regulation, article: articleData };
    }

    // For other regulations, return placeholder
    return {
      found: true,
      regulation,
      article,
      message: `Detailed article information for ${regulation} Art. ${article} is available in the regulatory knowledge base.`,
    };
  },

  get_cross_references: async (input) => {
    const sourceRegulation = getString(input, "sourceRegulation");
    if (!sourceRegulation) return { error: "sourceRegulation is required" };
    const sourceArticle = getString(input, "sourceArticle");
    if (!sourceArticle) return { error: "sourceArticle is required" };

    const mappings = getMappingsForArticle(sourceArticle);

    return {
      sourceRegulation,
      sourceArticle,
      crossReferences: mappings.map((m) => ({
        targetRegulation: m.targetRegulation,
        targetArticle: m.targetArticle,
        overlapType: m.overlapType,
        description: m.description,
      })),
      total: mappings.length,
    };
  },

  explain_term: async (input) => {
    const term = getString(input, "term");
    if (!term) return { error: "term is required" };
    const includeExamples = input.includeExamples !== false;

    const termData = getTermByAbbreviation(term) || searchTerms(term)[0];

    if (!termData) {
      return {
        found: false,
        message: `Term "${term}" not found in the glossary. Try searching for related terms.`,
        suggestions: searchTerms(term.substring(0, 3))
          .slice(0, 5)
          .map((t) => t.abbreviation),
      };
    }

    return {
      found: true,
      abbreviation: termData.abbreviation,
      fullName: termData.fullName,
      definition: termData.definition,
      regulatoryContext: termData.regulatoryContext,
      relatedTerms: termData.relatedTerms,
      examples: includeExamples ? termData.examples : undefined,
    };
  },

  // ─── Advisory Tools ───

  assess_regulatory_impact: async (input) => {
    const scenarioType = getString(input, "scenarioType");
    if (!scenarioType) return { error: "scenarioType is required" };
    const scenarioDetails = (
      typeof input.scenarioDetails === "object" &&
      input.scenarioDetails !== null &&
      !Array.isArray(input.scenarioDetails)
        ? input.scenarioDetails
        : {}
    ) as Record<string, string>;

    // General guidance based on scenario type
    const impacts: Record<string, string[]> = {
      orbit_change: [
        "May require authorization amendment (EU Space Act Art. 9)",
        "Re-assessment of debris mitigation plan (Art. 31-37)",
        "Potential insurance coverage adjustment",
      ],
      new_market: [
        "Additional NCA authorization may be required",
        "NIS2 re-classification if entering essential services",
        "GDPR considerations for data processing",
      ],
      constellation_expansion: [
        "Constellation-specific requirements trigger (3+ spacecraft)",
        "Enhanced debris mitigation requirements",
        "Increased insurance minimums likely",
      ],
      payload_change: [
        "Authorization amendment required",
        "Technical re-assessment needed",
        "Potential export control implications",
      ],
      ownership_change: [
        "Authorization transfer process (Art. 12)",
        "New entity compliance verification",
        "Insurance policy transfer",
      ],
      jurisdiction_change: [
        "New NCA authorization required",
        "De-registration from current jurisdiction",
        "Re-registration in new jurisdiction",
      ],
    };

    return {
      scenarioType,
      scenarioDetails,
      impacts: impacts[scenarioType] || ["Detailed analysis required"],
      recommendation:
        "Consult with your compliance team to assess full regulatory impact.",
    };
  },

  suggest_compliance_path: async (input) => {
    const goal = getString(input, "goal");
    if (!goal) return { error: "goal is required" };
    const targetDate = getString(input, "targetDate");

    const paths: Record<
      string,
      Array<{ step: number; action: string; duration: string }>
    > = {
      full_authorization: [
        {
          step: 1,
          action: "Complete EU Space Act assessment",
          duration: "1-2 weeks",
        },
        {
          step: 2,
          action: "Run debris mitigation assessment",
          duration: "1 week",
        },
        {
          step: 3,
          action: "Complete cybersecurity assessment",
          duration: "2 weeks",
        },
        { step: 4, action: "Secure insurance coverage", duration: "2-4 weeks" },
        {
          step: 5,
          action: "Prepare authorization application",
          duration: "2-4 weeks",
        },
        { step: 6, action: "Submit to NCA", duration: "N/A" },
        { step: 7, action: "NCA processing", duration: "3-6 months" },
      ],
      nis2_compliance: [
        { step: 1, action: "Complete NIS2 classification", duration: "1 week" },
        {
          step: 2,
          action: "Gap analysis against Art. 21 requirements",
          duration: "2 weeks",
        },
        {
          step: 3,
          action: "Implement security measures",
          duration: "2-6 months",
        },
        {
          step: 4,
          action: "Establish incident reporting procedures",
          duration: "2 weeks",
        },
        { step: 5, action: "Register with CSIRT", duration: "1 week" },
      ],
      launch_readiness: [
        { step: 1, action: "Finalize authorization", duration: "Prerequisite" },
        {
          step: 2,
          action: "Complete registration paperwork",
          duration: "1 week",
        },
        { step: 3, action: "Final insurance confirmation", duration: "1 week" },
        { step: 4, action: "Pre-launch compliance review", duration: "1 week" },
      ],
    };

    return {
      goal,
      targetDate,
      path: paths[goal] || [
        { step: 1, action: "Contact support for custom path", duration: "N/A" },
      ],
      estimatedTotalDuration:
        goal === "full_authorization" ? "6-9 months" : "2-6 months",
    };
  },

  estimate_compliance_cost_time: async (input) => {
    const complianceStep = getString(input, "complianceStep");
    if (!complianceStep) return { error: "complianceStep is required" };
    const organizationSize = getStringEnum(
      input,
      "organizationSize",
      ["startup", "sme", "large_enterprise"] as const,
      "sme",
    )!;

    const estimates: Record<
      string,
      { time: string; cost: { min: number; max: number } }
    > = {
      authorization_application: {
        time: "4-8 weeks",
        cost: { min: 10000, max: 50000 },
      },
      nis2_assessment: { time: "2-4 weeks", cost: { min: 5000, max: 20000 } },
      debris_assessment: { time: "1-2 weeks", cost: { min: 2000, max: 10000 } },
      cybersecurity_audit: {
        time: "2-4 weeks",
        cost: { min: 15000, max: 75000 },
      },
      insurance_procurement: {
        time: "2-6 weeks",
        cost: { min: 50000, max: 500000 },
      },
      iso_27001_certification: {
        time: "6-12 months",
        cost: { min: 30000, max: 150000 },
      },
      penetration_testing: {
        time: "1-2 weeks",
        cost: { min: 10000, max: 50000 },
      },
    };

    const estimate = estimates[complianceStep];
    if (!estimate) {
      return { error: `Unknown compliance step: ${complianceStep}` };
    }

    // Scale by organization size
    const multiplier =
      organizationSize === "startup"
        ? 0.7
        : organizationSize === "large_enterprise"
          ? 1.5
          : 1;

    return {
      complianceStep,
      organizationSize,
      estimatedTime: estimate.time,
      estimatedCost: {
        min: Math.round(estimate.cost.min * multiplier),
        max: Math.round(estimate.cost.max * multiplier),
        currency: "EUR",
      },
      disclaimer:
        "Estimates based on industry benchmarks. Actual costs may vary.",
    };
  },

  // ─── NCA Portal Tools ───

  get_nca_submissions: async (input, userContext) => {
    const ncaAuthority = getString(input, "ncaAuthority");
    const status = getString(input, "status");
    const activeOnly = getBoolean(input, "activeOnly");

    const terminalStatuses = ["APPROVED", "REJECTED", "WITHDRAWN"];

    const where: Record<string, unknown> = { userId: userContext.userId };
    if (ncaAuthority) where.ncaAuthority = ncaAuthority;
    if (status) where.status = status;
    if (activeOnly) where.status = { notIn: terminalStatuses };

    const submissions = await prisma.nCASubmission.findMany({
      where,
      include: {
        report: { select: { title: true, reportType: true } },
        _count: { select: { correspondence: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    return {
      totalFound: submissions.length,
      submissions: submissions.map((s) => ({
        id: s.id,
        ncaAuthority: s.ncaAuthority,
        ncaAuthorityName: s.ncaAuthorityName,
        status: s.status,
        priority: s.priority,
        submittedAt: s.submittedAt.toISOString(),
        ncaReference: s.ncaReference,
        reportTitle: s.report?.title ?? null,
        correspondenceCount: s._count.correspondence,
        followUpRequired: s.followUpRequired,
        followUpDeadline: s.followUpDeadline?.toISOString() || null,
        slaDeadline: s.slaDeadline?.toISOString() || null,
      })),
    };
  },

  get_submission_detail: async (input, userContext) => {
    const submissionId = getString(input, "submissionId");
    const ncaAuthority = getString(input, "ncaAuthority");

    let submission;

    if (submissionId) {
      submission = await prisma.nCASubmission.findFirst({
        where: { id: submissionId, userId: userContext.userId },
        include: {
          report: { select: { title: true, reportType: true, status: true } },
          correspondence: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          package: {
            select: {
              packageName: true,
              completenessScore: true,
              missingDocuments: true,
            },
          },
        },
      });
    } else if (ncaAuthority) {
      submission = await prisma.nCASubmission.findFirst({
        where: {
          ncaAuthority: ncaAuthority as never,
          userId: userContext.userId,
        },
        include: {
          report: { select: { title: true, reportType: true, status: true } },
          correspondence: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          package: {
            select: {
              packageName: true,
              completenessScore: true,
              missingDocuments: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    }

    if (!submission) {
      return { found: false, message: "No matching submission found." };
    }

    // Parse status history
    let statusHistory: Array<{
      status: string;
      timestamp: string;
      notes?: string;
    }> = [];
    try {
      statusHistory = JSON.parse((submission.statusHistory as string) || "[]");
    } catch {
      // ignore
    }

    return {
      found: true,
      submission: {
        id: submission.id,
        ncaAuthority: submission.ncaAuthority,
        ncaAuthorityName: submission.ncaAuthorityName,
        status: submission.status,
        priority: submission.priority,
        submittedAt: submission.submittedAt.toISOString(),
        ncaReference: submission.ncaReference,
        reportTitle: submission.report?.title ?? null,
        followUpRequired: submission.followUpRequired,
        followUpDeadline: submission.followUpDeadline?.toISOString() || null,
        slaDeadline: submission.slaDeadline?.toISOString() || null,
        correspondenceCount: submission.correspondence.length,
        recentCorrespondence: submission.correspondence
          .slice(0, 5)
          .map((c) => ({
            direction: c.direction,
            subject: c.subject,
            date: c.createdAt.toISOString(),
            requiresResponse: c.requiresResponse,
          })),
        statusHistory,
        package: submission.package
          ? {
              name: submission.package.packageName,
              completeness: submission.package.completenessScore,
              missingDocuments: submission.package.missingDocuments,
            }
          : null,
      },
    };
  },

  check_package_completeness: async (input, userContext) => {
    const ncaAuthority = getString(input, "ncaAuthority");
    if (!ncaAuthority) return { error: "ncaAuthority is required" };

    // Check if user has an org membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: userContext.userId },
      select: { organizationId: true },
    });

    if (!membership) {
      return {
        error: "No organization found. Please join an organization first.",
      };
    }

    // Import and use the assemblePackage function
    const { assemblePackage } =
      await import("@/lib/services/nca-portal-service");
    const result = await assemblePackage(
      userContext.userId,
      membership.organizationId,
      ncaAuthority as never,
    );

    return {
      ncaAuthority,
      completenessScore: result.completenessScore,
      totalRequired: result.requiredDocuments.length,
      totalFound:
        result.requiredDocuments.length - result.missingDocuments.length,
      missingDocuments: result.missingDocuments,
      documents: result.documents.map((d) => ({
        type: d.documentType,
        title: d.title,
        status: d.status,
        source: d.sourceType,
      })),
      readyToSubmit: result.completenessScore >= 80,
      recommendation:
        result.completenessScore >= 80
          ? "Your package is substantially complete. You can proceed with submission."
          : `${result.missingDocuments.length} required document(s) missing. Complete these before submitting.`,
    };
  },

  get_nca_deadlines: async (input, userContext) => {
    const daysAhead = getNumber(input, "daysAhead", 30)!;
    const now = new Date();
    const futureDate = new Date(
      now.getTime() + daysAhead * 24 * 60 * 60 * 1000,
    );

    const terminalStatuses = ["APPROVED", "REJECTED", "WITHDRAWN"];

    // Single query for both upcoming and overdue submissions
    const allRelevant = await prisma.nCASubmission.findMany({
      where: {
        userId: userContext.userId,
        status: { notIn: terminalStatuses as never[] },
        OR: [
          { followUpDeadline: { lte: futureDate } },
          { slaDeadline: { gte: now, lte: futureDate } },
        ],
      },
      select: {
        id: true,
        ncaAuthority: true,
        ncaAuthorityName: true,
        status: true,
        followUpDeadline: true,
        slaDeadline: true,
        followUpRequired: true,
      },
      orderBy: { followUpDeadline: "asc" },
      take: 50,
    });

    // Split into upcoming and overdue in JavaScript
    const submissions = allRelevant.filter(
      (s) =>
        (s.followUpDeadline &&
          s.followUpDeadline >= now &&
          s.followUpDeadline <= futureDate) ||
        (s.slaDeadline && s.slaDeadline >= now && s.slaDeadline <= futureDate),
    );
    const overdueSubmissions = allRelevant.filter(
      (s) =>
        s.followUpRequired && s.followUpDeadline && s.followUpDeadline < now,
    );

    // Check correspondence requiring response
    const pendingResponses = await prisma.nCACorrespondence.findMany({
      where: {
        submission: { userId: userContext.userId },
        requiresResponse: true,
        respondedAt: null,
      },
      select: {
        id: true,
        subject: true,
        responseDeadline: true,
        submission: {
          select: { ncaAuthorityName: true },
        },
      },
      orderBy: { responseDeadline: "asc" },
    });

    const deadlines = [];

    for (const sub of submissions) {
      if (sub.followUpDeadline) {
        const daysLeft = Math.ceil(
          (sub.followUpDeadline.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        deadlines.push({
          type: "follow_up",
          ncaAuthority: sub.ncaAuthorityName,
          deadline: sub.followUpDeadline.toISOString(),
          daysLeft,
          submissionId: sub.id,
          urgency:
            daysLeft <= 3 ? "urgent" : daysLeft <= 7 ? "soon" : "upcoming",
        });
      }
      if (sub.slaDeadline) {
        const daysLeft = Math.ceil(
          (sub.slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        deadlines.push({
          type: "sla",
          ncaAuthority: sub.ncaAuthorityName,
          deadline: sub.slaDeadline.toISOString(),
          daysLeft,
          submissionId: sub.id,
          urgency:
            daysLeft <= 3 ? "urgent" : daysLeft <= 7 ? "soon" : "upcoming",
        });
      }
    }

    return {
      upcomingDeadlines: deadlines,
      overdueCount: overdueSubmissions.length,
      overdue: overdueSubmissions.map((s) => ({
        ncaAuthority: s.ncaAuthorityName,
        deadline: s.followUpDeadline?.toISOString(),
        daysOverdue: Math.ceil(
          (now.getTime() - (s.followUpDeadline?.getTime() || now.getTime())) /
            (1000 * 60 * 60 * 24),
        ),
        submissionId: s.id,
      })),
      pendingResponses: pendingResponses.map((r) => ({
        subject: r.subject,
        ncaAuthority: r.submission.ncaAuthorityName,
        responseDeadline: r.responseDeadline?.toISOString() || null,
      })),
      summary:
        overdueSubmissions.length > 0
          ? `You have ${overdueSubmissions.length} overdue follow-up(s) requiring immediate attention.`
          : deadlines.length > 0
            ? `You have ${deadlines.length} upcoming deadline(s) in the next ${daysAhead} days.`
            : "No upcoming NCA deadlines.",
    };
  },
  // ─── Incident Tools ───

  report_incident: async (
    input: Record<string, unknown>,
    userContext: AstraUserContext,
  ) => {
    const { createIncidentWithAutopilot } =
      await import("@/lib/services/incident-autopilot");

    // Find supervision config for this user
    const config = await prisma.supervisionConfig.findUnique({
      where: { userId: userContext.userId },
    });

    if (!config) {
      return {
        error:
          "No supervision configuration found. Please set up supervision first.",
      };
    }

    const category = getString(input, "category");
    if (!category) return { error: "category is required" };
    const title = getString(input, "title");
    if (!title) return { error: "title is required" };
    const description = getString(input, "description");
    if (!description) return { error: "description is required" };
    const detectedBy = getString(input, "detectedBy") || "user_report";
    const detectedAtStr = getString(input, "detectedAt");
    const detectedAt = detectedAtStr ? new Date(detectedAtStr) : undefined;
    // Validate affectedAssets is an array of objects if provided
    const rawAssets = input.affectedAssets;
    const affectedAssets = Array.isArray(rawAssets)
      ? rawAssets
          .filter(
            (a): a is Record<string, unknown> =>
              typeof a === "object" && a !== null,
          )
          .map((a) => ({
            assetName:
              typeof a.assetName === "string" ? a.assetName : "Unknown",
            cosparId: typeof a.cosparId === "string" ? a.cosparId : undefined,
            noradId: typeof a.noradId === "string" ? a.noradId : undefined,
          }))
          .slice(0, 50)
      : undefined;

    const result = await createIncidentWithAutopilot(
      {
        supervisionId: config.id,
        category: category as IncidentCategory,
        title,
        description,
        detectedBy,
        detectedAt,
        affectedAssets,
      },
      userContext.userId,
    );

    if (!result.success) {
      return { error: result.error || "Failed to create incident" };
    }

    return {
      incidentId: result.incidentId,
      incidentNumber: result.incidentNumber,
      severity: result.severity,
      nis2Phases: result.nis2Phases,
      summary: `Incident ${result.incidentNumber} created with severity ${result.severity?.toUpperCase()}. ${result.nis2Phases?.length || 0} NIS2 reporting phases created with deadlines.`,
      dashboardUrl: "/dashboard/incidents",
    };
  },

  get_incident_status: async (
    input: Record<string, unknown>,
    userContext: AstraUserContext,
  ) => {
    const { getIncidentCommandData } =
      await import("@/lib/services/incident-autopilot");

    let incidentId = getString(input, "incidentId");
    const incidentNumber = getString(input, "incidentNumber");

    // Look up by number if needed
    if (!incidentId && incidentNumber) {
      const incident = await prisma.incident.findFirst({
        where: { incidentNumber },
        select: { id: true },
      });
      if (!incident) {
        return {
          error: `Incident ${incidentNumber} not found.`,
        };
      }
      incidentId = incident.id;
    }

    if (!incidentId) {
      return { error: "Please provide either incidentId or incidentNumber." };
    }

    const data = await getIncidentCommandData(incidentId);
    if (!data) {
      return { error: "Incident not found." };
    }

    return {
      ...data,
      summary: `${data.incident.incidentNumber} (${data.incident.severity}) — ${data.workflow.stateName}. ${data.nis2Phases.filter((p) => !p.countdown.isSubmitted).length} phases pending.`,
    };
  },

  list_active_incidents: async (
    input: Record<string, unknown>,
    userContext: AstraUserContext,
  ) => {
    const { listActiveIncidents } =
      await import("@/lib/services/incident-autopilot");

    const config = await prisma.supervisionConfig.findUnique({
      where: { userId: userContext.userId },
    });

    if (!config) {
      return { error: "No supervision configuration found.", incidents: [] };
    }

    const incidents = await listActiveIncidents(config.id, {
      category: getString(input, "category"),
      severity: getString(input, "severity"),
    });

    const limit = getNumber(input, "limit", 20)!;
    const limited = incidents.slice(0, limit);

    const overdueCount = limited.reduce(
      (sum, i) => sum + i.nis2PhasesSummary.overdue,
      0,
    );

    return {
      incidents: limited,
      total: incidents.length,
      overduePhases: overdueCount,
      summary:
        incidents.length === 0
          ? "No active incidents."
          : `${incidents.length} active incident(s). ${overdueCount > 0 ? `${overdueCount} overdue NIS2 phase(s) requiring immediate attention.` : "All deadlines on track."}`,
    };
  },

  draft_nca_notification: async (
    input: Record<string, unknown>,
    userContext: AstraUserContext,
  ) => {
    const { generateNCANotificationDraft } =
      await import("@/lib/services/incident-notification-templates");
    const { decrypt, isEncrypted } = await import("@/lib/encryption");

    const incidentId = getString(input, "incidentId");
    if (!incidentId) return { error: "incidentId is required" };
    const phase = getStringEnum(input, "phase", [
      "early_warning",
      "notification",
      "intermediate_report",
      "final_report",
    ] as const);
    if (!phase)
      return {
        error:
          "phase is required and must be one of: early_warning, notification, intermediate_report, final_report",
      };

    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: { affectedAssets: true },
    });

    if (!incident) {
      return { error: "Incident not found." };
    }

    // Decrypt sensitive fields
    const description =
      incident.description && isEncrypted(incident.description)
        ? await decrypt(incident.description)
        : incident.description;

    const rootCause =
      incident.rootCause && isEncrypted(incident.rootCause)
        ? await decrypt(incident.rootCause)
        : incident.rootCause;

    const impactAssessment =
      incident.impactAssessment && isEncrypted(incident.impactAssessment)
        ? await decrypt(incident.impactAssessment)
        : incident.impactAssessment;

    const lessonsLearned =
      incident.lessonsLearned && isEncrypted(incident.lessonsLearned)
        ? await decrypt(incident.lessonsLearned)
        : incident.lessonsLearned;

    const draft = generateNCANotificationDraft(phase, {
      incidentNumber: incident.incidentNumber,
      category: incident.category,
      severity: incident.severity,
      title: incident.title,
      description: description || "",
      detectedAt: incident.detectedAt.toISOString(),
      detectedBy: incident.detectedBy,
      detectionMethod: incident.detectionMethod,
      rootCause: rootCause || null,
      impactAssessment: impactAssessment || null,
      immediateActions: incident.immediateActions,
      containmentMeasures: incident.containmentMeasures,
      resolutionSteps: incident.resolutionSteps,
      lessonsLearned: lessonsLearned || null,
      affectedAssets: incident.affectedAssets,
      reportedToNCA: incident.reportedToNCA,
      ncaReferenceNumber: incident.ncaReferenceNumber,
      resolvedAt: incident.resolvedAt?.toISOString() || null,
    });

    // Store draft on phase record
    await prisma.incidentNIS2Phase.updateMany({
      where: { incidentId, phase },
      data: { draftContent: draft.content, status: "draft_ready" },
    });

    return {
      title: draft.title,
      content: draft.content,
      legalBasis: draft.legalBasis,
      instructions: `This draft is ready for review and submission to your CSIRT/competent authority. You can submit it via the Incident Command Center at /dashboard/incidents.`,
    };
  },

  advance_incident_workflow: async (
    input: Record<string, unknown>,
    userContext: AstraUserContext,
  ) => {
    const { advanceIncidentWorkflow } =
      await import("@/lib/services/incident-autopilot");

    const incidentId = getString(input, "incidentId");
    if (!incidentId) return { error: "incidentId is required" };
    const event = getString(input, "event");
    if (!event) return { error: "event is required" };
    const notes = getString(input, "notes");

    const result = await advanceIncidentWorkflow(
      incidentId,
      event,
      userContext.userId,
      notes,
    );

    if (!result.success) {
      return { error: result.error || "Failed to advance workflow." };
    }

    return {
      previousState: result.previousState,
      currentState: result.currentState,
      availableTransitions: result.availableTransitions,
      summary: `Workflow advanced from ${result.previousState} to ${result.currentState}. ${result.availableTransitions?.length ? `Next actions: ${result.availableTransitions.map((t) => t.event).join(", ")}` : "No further transitions available."}`,
    };
  },

  // ─── Digital Twin Tools ───

  query_compliance_twin: async (
    input: Record<string, unknown>,
    userContext: AstraUserContext,
  ) => {
    const { getComplianceTwinState } =
      await import("@/lib/services/compliance-twin-service");

    const state = await getComplianceTwinState(userContext.userId);
    const focusArea = getStringEnum(input, "focusArea", [
      "score",
      "evidence",
      "deadlines",
      "risk",
      "velocity",
      "modules",
    ] as const);

    if (focusArea === "score") {
      return {
        overallScore: state.score.overall,
        grade: state.score.grade,
        euSpaceAct: state.score.euSpaceAct,
        nis2: state.score.nis2,
        maturityLevel: state.score.maturityLevel,
        maturityLabel: state.score.maturityLabel,
        summary: `Overall compliance score: ${state.score.overall}/100 (Grade ${state.score.grade}). Maturity Level ${state.score.maturityLevel} — ${state.score.maturityLabel}.`,
      };
    }

    if (focusArea === "evidence") {
      return {
        ...state.evidence,
        summary: `Evidence coverage: ${state.evidence.completePct}% (${state.evidence.accepted}/${state.evidence.total} approved). ${state.evidence.expired} expired items need renewal.`,
      };
    }

    if (focusArea === "deadlines") {
      return {
        ...state.deadlines,
        summary: `Deadline health: ${state.deadlines.healthScore}%. ${state.deadlines.overdue} overdue, ${state.deadlines.dueSoon} due soon, ${state.deadlines.completed} completed out of ${state.deadlines.total}.`,
      };
    }

    if (focusArea === "risk") {
      return {
        ...state.risk,
        summary: `Risk exposure: EUR ${(state.risk.estimatedRiskEur / 1_000_000).toFixed(1)}M (max: EUR ${(state.risk.maxPenaltyExposure / 1_000_000).toFixed(1)}M). Risk-adjusted based on current compliance score.`,
      };
    }

    if (focusArea === "velocity") {
      return {
        ...state.velocity,
        summary: `Compliance velocity: ${state.velocity.thirtyDay > 0 ? "+" : ""}${state.velocity.thirtyDay} pts/month (${state.velocity.trend}). Daily: ${state.velocity.daily}, 7-day: ${state.velocity.sevenDay}.`,
      };
    }

    if (focusArea === "modules") {
      return {
        modules: state.modules,
        summary: `${state.modules.length} compliance modules tracked. Top: ${state.modules
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((m) => `${m.name} (${m.score})`)
          .join(", ")}.`,
      };
    }

    // Full state summary
    return {
      score: state.score,
      evidence: state.evidence,
      deadlines: state.deadlines,
      incidents: state.incidents,
      risk: state.risk,
      velocity: state.velocity,
      requirements: state.requirements,
      alertCount: state.alerts.length,
      topAlerts: state.alerts.slice(0, 3),
      summary: `Compliance score: ${state.score.overall}/100 (Grade ${state.score.grade}, L${state.score.maturityLevel}). Evidence: ${state.evidence.completePct}%. Deadlines: ${state.deadlines.overdue} overdue. Risk: EUR ${(state.risk.estimatedRiskEur / 1_000_000).toFixed(1)}M. Velocity: ${state.velocity.trend} (${state.velocity.thirtyDay > 0 ? "+" : ""}${state.velocity.thirtyDay} pts/mo). ${state.alerts.length} active alert(s).`,
    };
  },

  run_whatif_scenario: async (
    input: Record<string, unknown>,
    userContext: AstraUserContext,
  ) => {
    const { simulateScenario } =
      await import("@/lib/services/whatif-simulation-service");

    const scenarioType = getStringEnum(input, "scenarioType", [
      "add_jurisdiction",
      "change_operator_type",
      "add_satellites",
      "expand_operations",
    ] as const);
    if (!scenarioType)
      return {
        error:
          "scenarioType is required and must be one of: add_jurisdiction, change_operator_type, add_satellites, expand_operations",
      };
    const parameters =
      typeof input.parameters === "object" &&
      input.parameters !== null &&
      !Array.isArray(input.parameters)
        ? (input.parameters as Record<string, unknown>)
        : {};

    const result = await simulateScenario(userContext.userId, {
      scenarioType,
      name: `ASTRA Scenario: ${scenarioType}`,
      parameters,
    });

    return {
      baselineScore: result.baselineScore,
      projectedScore: result.projectedScore,
      scoreDelta: result.scoreDelta,
      newRequirementsCount: result.newRequirements.length,
      newRequirements: result.newRequirements.slice(0, 5),
      financialImpact: result.financialImpact,
      riskLevel: result.riskAssessment.level,
      recommendations: result.recommendations,
      summary: `Scenario "${scenarioType}": Score ${result.baselineScore} → ${result.projectedScore} (${result.scoreDelta >= 0 ? "+" : ""}${result.scoreDelta}). ${result.newRequirements.length} new requirements. Financial impact: EUR ${(result.financialImpact.delta / 1_000_000).toFixed(1)}M. Risk: ${result.riskAssessment.level}.`,
    };
  },

  get_evidence_gaps: async (
    input: Record<string, unknown>,
    userContext: AstraUserContext,
  ) => {
    const { getEvidenceGapAnalysis } =
      await import("@/lib/services/compliance-twin-service");

    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: userContext.userId },
      select: { organizationId: true },
    });

    const gaps = await getEvidenceGapAnalysis(
      userContext.userId,
      orgMember?.organizationId || null,
    );

    let filtered = gaps;
    if (input.framework) {
      filtered = filtered.filter((g) => g.framework === input.framework);
    }
    if (input.onlyCritical) {
      filtered = filtered.filter(
        (g) => g.criticality === "critical" || g.criticality === "high",
      );
    }

    return {
      totalGaps: filtered.length,
      gaps: filtered.slice(0, 15),
      byCriticality: {
        critical: filtered.filter((g) => g.criticality === "critical").length,
        high: filtered.filter((g) => g.criticality === "high").length,
        medium: filtered.filter((g) => g.criticality === "medium").length,
        low: filtered.filter((g) => g.criticality === "low").length,
      },
      summary: `${filtered.length} evidence gap(s) found. ${filtered.filter((g) => g.criticality === "critical").length} critical, ${filtered.filter((g) => g.criticality === "high").length} high priority. ${filtered.filter((g) => g.evidenceExpired).length} with expired evidence.`,
    };
  },

  // ─── Audit Tools ───

  audit_document: async (input: Record<string, unknown>) => {
    const { auditDocument } =
      await import("@/lib/services/document-audit-service.server");

    const documentId = getString(input, "documentId");
    if (!documentId) {
      return { error: "documentId is required" };
    }

    const doc = await prisma.nCADocument.findUnique({
      where: { id: documentId },
      select: { id: true, documentType: true, content: true, title: true },
    });

    if (!doc) {
      return { error: `Document ${documentId} not found` };
    }

    // Parse content into sections
    let sections: Array<{ title: string; content: string }> = [];
    if (typeof doc.content === "string") {
      try {
        const parsed = JSON.parse(doc.content);
        if (Array.isArray(parsed)) {
          sections = parsed;
        } else if (parsed.sections && Array.isArray(parsed.sections)) {
          sections = parsed.sections;
        }
      } catch {
        // Treat entire content as a single section
        sections = [{ title: doc.title || "Document", content: doc.content }];
      }
    }

    const result = auditDocument(sections, doc.documentType);

    return {
      documentId: doc.id,
      documentType: doc.documentType,
      title: doc.title,
      ...result,
      summary: `Audit score: ${result.overallScore}/100. Regulation coverage: ${result.regulationCoverage.score}%, Threshold consistency: ${result.thresholdConsistency.score}%, Section completeness: ${result.sectionCompleteness.score}%. ${result.recommendations.length} recommendation(s).`,
    };
  },

  // ─── Ontology Tools ───

  query_ontology: async (input) => {
    const query_type = getString(input, "query_type");
    if (!query_type) return { error: "query_type is required" };
    const operator_type = getString(input, "operator_type");
    const jurisdictions = getStringArray(input, "jurisdictions");
    const domain = getString(input, "domain");
    const include_proposals = getBoolean(input, "include_proposals");
    const node_code = getString(input, "node_code");
    const depth = getNumber(input, "depth");

    if (query_type === "obligations") {
      if (!operator_type)
        return { error: "operator_type required for obligations query" };
      const results = await getObligationsForOperator({
        operatorType: operator_type,
        jurisdictions: jurisdictions || [],
        domain: domain || undefined,
        includeProposals: include_proposals || false,
      });
      return {
        count: results.length,
        obligations: results.map((r) => ({
          code: r.code,
          label: r.label,
          confidence: r.confidence,
          source: r.source,
          domain: r.domain,
          jurisdictions: r.jurisdictions,
          evidenceRequired: r.evidenceRequired,
          euSpaceActMapping: r.euSpaceActMapping,
        })),
        note: include_proposals
          ? "Results include EU Space Act proposals (confidence < 1.0)"
          : "Results based on enacted law only",
      };
    }

    if (query_type === "subgraph") {
      if (!node_code) return { error: "node_code required for subgraph query" };
      const node = await prisma.ontologyNode.findUnique({
        where: { code: node_code },
      });
      if (!node) return { error: `Node not found: ${node_code}` };
      const result = await getSubgraph({ nodeId: node.id, depth: depth || 1 });
      return {
        center: result.centerNode,
        connectedNodes: result.nodes.length,
        edges: result.edges.length,
        nodes: result.nodes,
        relationships: result.edges,
      };
    }

    if (query_type === "node_detail") {
      if (!node_code)
        return { error: "node_code required for node_detail query" };
      const node = await prisma.ontologyNode.findUnique({
        where: { code: node_code },
      });
      if (!node) return { error: `Node not found: ${node_code}` };
      const detail = await getNodeDetail(node.id);
      return detail;
    }

    if (query_type === "conflicts") {
      if (!operator_type)
        return { error: "operator_type required for conflicts query" };
      if (!jurisdictions || jurisdictions.length < 2)
        return { error: "At least 2 jurisdictions required" };
      const { detectConflicts } = await import("@/lib/ontology/conflicts");
      const conflicts = await detectConflicts({
        jurisdictions,
        operatorType: operator_type,
        domain: domain || undefined,
      });
      return { count: conflicts.length, conflicts };
    }

    if (query_type === "evidence_gaps") {
      if (!operator_type)
        return { error: "operator_type required for evidence_gaps query" };

      // Get all obligations for operator
      const obligations = await getObligationsForOperator({
        operatorType: operator_type,
        jurisdictions: jurisdictions || [],
        domain: domain || undefined,
        includeProposals: false,
      });

      // Find obligations that have evidence requirements
      const gaps = obligations
        .filter((o) => o.evidenceRequired.length > 0)
        .map((o) => ({
          obligation: { code: o.code, label: o.label, domain: o.domain },
          evidenceRequired: o.evidenceRequired,
          jurisdictions: o.jurisdictions,
        }));

      return {
        totalObligations: obligations.length,
        obligationsWithEvidenceReqs: gaps.length,
        gaps,
        note: `${gaps.length} obligations require specific evidence documentation. Review each to ensure evidence is collected and current.`,
      };
    }

    if (query_type === "impact") {
      if (!node_code) return { error: "node_code required for impact query" };
      const change_type = getStringEnum(input, "change_type", [
        "amended",
        "repealed",
        "new",
      ] as const);
      if (!change_type)
        return {
          error:
            "change_type required for impact query (amended, repealed, new)",
        };

      const node = await prisma.ontologyNode.findUnique({
        where: { code: node_code },
      });
      if (!node) return { error: `Node not found: ${node_code}` };

      const result = await propagateChange({
        nodeId: node.id,
        changeType: change_type,
      });
      return {
        changedNode: result.changedNode,
        totalAffected: result.totalAffected,
        affectedNodes: result.affectedNodes.map((n) => ({
          code: n.affectedNode.code,
          label: n.affectedNode.label,
          type: n.affectedNode.type,
          impactLevel: n.impactLevel,
          depth: n.depth,
          path: n.edgePath,
        })),
        note: `If ${node_code} is ${change_type}, ${result.totalAffected} nodes are affected downstream.`,
      };
    }

    if (query_type === "search") {
      const search_query = getString(input, "search_query");
      if (!search_query)
        return { error: "search_query required for search query" };

      const q = search_query.toLowerCase();
      const nodes = await prisma.ontologyNode.findMany({
        where: {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { label: { contains: q, mode: "insensitive" } },
          ],
          validUntil: null,
        },
        take: 20,
        orderBy: { confidence: "desc" },
        select: { code: true, label: true, type: true, confidence: true },
      });

      return {
        count: nodes.length,
        results: nodes,
        query: search_query,
      };
    }

    if (query_type === "compare_jurisdictions") {
      if (!jurisdictions || jurisdictions.length < 2)
        return { error: "At least 2 jurisdictions required for comparison" };
      if (!domain)
        return { error: "domain required for jurisdiction comparison" };

      // Get obligations per jurisdiction
      const comparison: Record<string, any[]> = {};
      for (const j of jurisdictions) {
        const obls = await getObligationsForOperator({
          operatorType: operator_type || "SCO",
          jurisdictions: [j],
          domain,
          includeProposals: include_proposals || false,
        });
        comparison[j] = obls.map((o) => ({
          code: o.code,
          label: o.label,
          confidence: o.confidence,
          evidenceRequired: o.evidenceRequired.map((e) => e.label),
        }));
      }

      // Also detect conflicts
      const { detectConflicts: dc } = await import("@/lib/ontology/conflicts");
      const conflicts = await dc({
        jurisdictions,
        operatorType: operator_type || "SCO",
        domain,
      });

      return {
        domain,
        jurisdictions,
        obligationsByJurisdiction: comparison,
        totalObligations: Object.values(comparison).reduce(
          (sum, arr) => sum + arr.length,
          0,
        ),
        conflicts: conflicts.length > 0 ? conflicts : null,
        note: `Comparison of ${domain} obligations across ${jurisdictions.join(", ")}. ${conflicts.length} conflicts detected.`,
      };
    }

    if (query_type === "stats") {
      const stats = await prisma.ontologyNode.groupBy({
        by: ["type"],
        _count: true,
        where: { validUntil: null },
      });
      const edgeStats = await prisma.ontologyEdge.groupBy({
        by: ["type"],
        _count: true,
        where: { validUntil: null },
      });
      const totalNodes = stats.reduce((s, r) => s + r._count, 0);
      const totalEdges = edgeStats.reduce((s, r) => s + r._count, 0);

      return {
        totalNodes,
        totalEdges,
        nodesByType: Object.fromEntries(stats.map((s) => [s.type, s._count])),
        edgesByType: Object.fromEntries(
          edgeStats.map((s) => [s.type, s._count]),
        ),
      };
    }

    return { error: `Unknown query_type: ${query_type}` };
  },

  // ─── CRA Tools ───

  get_cra_assessment_status: async (input, userContext) => {
    const assessmentId = getString(input, "assessmentId");

    const where = assessmentId
      ? { id: assessmentId, userId: userContext.userId }
      : {
          userId: userContext.userId,
          ...(userContext.organizationId
            ? { organizationId: userContext.organizationId }
            : {}),
        };

    const assessments = await prisma.cRAAssessment.findMany({
      where,
      include: { requirements: true },
      orderBy: { createdAt: "desc" },
      take: assessmentId ? 1 : 10,
    });

    if (assessments.length === 0) {
      return {
        message:
          "Keine CRA-Assessments gefunden. Der Nutzer hat noch kein CRA-Assessment erstellt. Empfehle ihm, unter /dashboard/modules/cra ein neues Assessment anzulegen.",
      };
    }

    const summaries = assessments.map((a) => {
      const reqs = a.requirements;
      const total = reqs.length;
      const compliant = reqs.filter((r) => r.status === "compliant").length;
      const partial = reqs.filter((r) => r.status === "partial").length;
      const nonCompliant = reqs.filter(
        (r) => r.status === "non_compliant",
      ).length;
      const notAssessed = reqs.filter(
        (r) => r.status === "not_assessed",
      ).length;

      return {
        productName: `${a.productName}${a.productVersion ? ` v${a.productVersion}` : ""}`,
        classification: a.productClassification,
        conformityRoute: a.conformityRoute,
        maturityScore: a.maturityScore ?? 0,
        requirements: {
          total,
          compliant,
          partial,
          nonCompliant,
          notAssessed,
        },
        nis2OverlapCount: a.nis2OverlapCount ?? 0,
        assessmentId: a.id,
        isOutOfScope: a.isOutOfScope,
        createdAt: a.createdAt,
      };
    });

    return {
      assessmentCount: assessments.length,
      assessments: summaries,
    };
  },

  get_cra_product_classification: async (input) => {
    const { classifyCRAProduct } = await import("@/lib/cra-engine.server");

    const productTypeId = getString(input, "productTypeId");
    const hasNetworkFunction = getBoolean(input, "hasNetworkFunction", false);
    const processesAuthData = getBoolean(input, "processesAuthData", false);
    const usedInCriticalInfra = getBoolean(input, "usedInCriticalInfra", false);
    const performsCryptoOps = getBoolean(input, "performsCryptoOps", false);
    const controlsPhysicalSystem = getBoolean(
      input,
      "controlsPhysicalSystem",
      false,
    );
    const isSafetyCritical = getBoolean(input, "isSafetyCritical", false);

    const answers = {
      economicOperatorRole: "manufacturer" as const,
      isEUEstablished: true,
      spaceProductTypeId: productTypeId ?? null,
      productName: productTypeId ?? "Custom product",
      hasNetworkFunction,
      processesAuthData,
      usedInCriticalInfra,
      performsCryptoOps,
      controlsPhysicalSystem,
      hasMicrocontroller: null,
      isOSSComponent: null,
      isCommerciallySupplied: true,
      segments: [] as SpaceProductSegment[],
      isSafetyCritical,
      hasRedundancy: null,
      processesClassifiedData: null,
      hasIEC62443: null,
      hasETSIEN303645: null,
      hasCommonCriteria: null,
      hasISO27001: null,
    };

    const result = classifyCRAProduct(answers);

    const classLabels: Record<string, string> = {
      default: "Default (Annex-free)",
      class_I: "Class I (Annex III)",
      class_II: "Class II (Annex IV)",
    };

    const routeLabels: Record<string, string> = {
      self_assessment: "Self-Assessment (Module A)",
      harmonised_standard: "Harmonised Standard (Module A + hEN)",
      third_party_type_exam: "Third-Party Type Examination (Module B+C)",
      full_quality_assurance: "Full Quality Assurance (Module H)",
    };

    return {
      classification:
        classLabels[result.classification] ?? result.classification,
      conformityRoute:
        routeLabels[result.conformityRoute] ?? result.conformityRoute,
      isOutOfScope: result.isOutOfScope,
      outOfScopeReason: result.outOfScopeReason,
      reasoningChain: result.classificationReasoning.map((step) => ({
        criterion: step.criterion,
        legalBasis: step.legalBasis,
        annexRef: step.annexRef,
        satisfied: step.satisfied,
        reasoning: step.reasoning,
      })),
      conflict: result.conflict
        ? {
            taxonomyClass: result.conflict.taxonomyClass,
            ruleEngineClass: result.conflict.ruleEngineClass,
            recommendation: result.conflict.recommendation,
          }
        : null,
    };
  },

  get_cra_requirement_gaps: async (input, userContext) => {
    const assessmentId = getString(input, "assessmentId");
    if (!assessmentId) {
      return { error: "assessmentId ist erforderlich." };
    }

    const assessment = await prisma.cRAAssessment.findFirst({
      where: { id: assessmentId, userId: userContext.userId },
      include: { requirements: true },
    });

    if (!assessment) {
      return {
        error:
          "CRA-Assessment nicht gefunden oder gehört nicht zum aktuellen Nutzer.",
      };
    }

    // Load CRA_REQUIREMENTS for space-specific guidance
    const { CRA_REQUIREMENTS } = await import("@/data/cra-requirements");
    const reqLookup = new Map(CRA_REQUIREMENTS.map((r) => [r.id, r]));

    // Filter gaps: non-compliant or not-assessed
    const gapStatuses = assessment.requirements.filter(
      (r) => r.status === "non_compliant" || r.status === "not_assessed",
    );

    // Group by category
    const grouped: Record<
      string,
      Array<{
        requirementId: string;
        status: string;
        title: string;
        severity: string;
        spaceSpecificGuidance: string;
        articleRef: string;
        implementationTimeWeeks: number;
      }>
    > = {};

    for (const gap of gapStatuses) {
      const reqDef = reqLookup.get(gap.requirementId);
      if (!reqDef) continue;

      const category = reqDef.category;
      if (!grouped[category]) grouped[category] = [];

      grouped[category].push({
        requirementId: gap.requirementId,
        status: gap.status,
        title: reqDef.title,
        severity: reqDef.severity,
        spaceSpecificGuidance: reqDef.spaceSpecificGuidance,
        articleRef: reqDef.articleRef,
        implementationTimeWeeks: reqDef.implementationTimeWeeks,
      });
    }

    const totalReqs = assessment.requirements.length;
    const totalGaps = gapStatuses.length;
    const criticalGaps = gapStatuses.filter((g) => {
      const def = reqLookup.get(g.requirementId);
      return def?.severity === "critical";
    }).length;

    return {
      productName: assessment.productName,
      totalRequirements: totalReqs,
      totalGaps,
      criticalGaps,
      gapsByCategory: grouped,
      assessmentId: assessment.id,
    };
  },

  get_cra_nis2_overlap: async (input, userContext) => {
    const assessmentId = getString(input, "assessmentId");

    // Find assessment (specific or most recent)
    const assessment = assessmentId
      ? await prisma.cRAAssessment.findFirst({
          where: { id: assessmentId, userId: userContext.userId },
        })
      : await prisma.cRAAssessment.findFirst({
          where: { userId: userContext.userId },
          orderBy: { createdAt: "desc" },
        });

    if (!assessment) {
      return {
        error:
          "Kein CRA-Assessment gefunden. Der Nutzer muss zunächst ein CRA-Assessment unter /dashboard/modules/cra erstellen.",
      };
    }

    // Re-run the engine to get NIS2 overlap data
    const { calculateCRACompliance } = await import("@/lib/cra-engine.server");

    const answers = {
      economicOperatorRole:
        (assessment.economicOperatorRole as
          | "manufacturer"
          | "importer"
          | "distributor") ?? "manufacturer",
      isEUEstablished: assessment.isEUEstablished ?? true,
      spaceProductTypeId: assessment.spaceProductTypeId,
      productName: assessment.productName,
      productVersion: assessment.productVersion ?? undefined,
      hasNetworkFunction: assessment.hasNetworkFunction,
      processesAuthData: assessment.processesAuthData,
      usedInCriticalInfra: assessment.usedInCriticalInfra,
      performsCryptoOps: assessment.performsCryptoOps,
      controlsPhysicalSystem: assessment.controlsPhysicalSystem,
      hasMicrocontroller: assessment.hasMicrocontroller,
      isOSSComponent: assessment.isOSSComponent,
      isCommerciallySupplied: assessment.isCommerciallySupplied,
      segments: (assessment.segments?.split(",") ?? []) as Array<
        "space" | "ground" | "link" | "user"
      >,
      isSafetyCritical: assessment.isSafetyCritical,
      hasRedundancy: assessment.hasRedundancy,
      processesClassifiedData: assessment.processesClassifiedData,
      hasIEC62443: assessment.hasIEC62443,
      hasETSIEN303645: assessment.hasETSIEN303645,
      hasCommonCriteria: assessment.hasCommonCriteria,
      hasISO27001: assessment.hasISO27001,
    };

    const result = await calculateCRACompliance(answers);
    const overlap = result.nis2Overlap;

    return {
      productName: assessment.productName,
      assessmentId: assessment.id,
      overlappingRequirementCount: overlap.overlappingRequirementCount,
      estimatedSavingsWeeks: overlap.estimatedSavingsRange,
      overlappingRequirements: overlap.overlappingRequirements
        .slice(0, 20)
        .map((o) => ({
          craRequirementId: o.craRequirementId,
          nis2RequirementId: o.nis2RequirementId,
          relationship: o.relationship,
        })),
      disclaimer: overlap.disclaimer,
    };
  },

  get_cra_sbom_analysis: async (input, userContext) => {
    const assessmentId = getString(input, "assessmentId");
    if (!assessmentId) {
      return { error: "assessmentId ist erforderlich." };
    }

    // Verify assessment belongs to user
    const assessment = await prisma.cRAAssessment.findFirst({
      where: { id: assessmentId, userId: userContext.userId },
      include: {
        requirements: {
          where: {
            requirementId: { in: ["cra-038", "cra-039", "cra-040"] },
          },
        },
      },
    });

    if (!assessment) {
      return {
        error:
          "CRA-Assessment nicht gefunden oder gehört nicht zum aktuellen Nutzer.",
      };
    }

    // Find SBOM evidence in ComplianceEvidence
    let sbomData: Record<string, unknown> | null = null;

    if (userContext.organizationId) {
      const evidence = await prisma.complianceEvidence.findFirst({
        where: {
          organizationId: userContext.organizationId,
          regulationType: "CYBERSECURITY",
          requirementId: `sbom:${assessmentId}`,
        },
        orderBy: { createdAt: "desc" },
      });

      if (evidence?.metadata) {
        const metadata = evidence.metadata as Record<string, unknown>;
        if (metadata.type === "sbom_analysis") {
          sbomData = metadata;
        }
      }
    }

    // Build SBOM requirement statuses
    const sbomReqs = assessment.requirements.map((r) => ({
      requirementId: r.requirementId,
      status: r.status,
      notes: r.notes,
    }));

    if (!sbomData) {
      return {
        productName: assessment.productName,
        assessmentId: assessment.id,
        sbomUploaded: false,
        message:
          "Kein SBOM hochgeladen. Der Nutzer kann unter /dashboard/modules/cra/" +
          assessmentId +
          " ein SBOM (CycloneDX/SPDX) hochladen.",
        sbomRequirements: sbomReqs,
      };
    }

    const analysis = sbomData.analysis as Record<string, unknown> | undefined;
    const compliance = sbomData.compliance as
      | Record<string, unknown>
      | undefined;

    return {
      productName: assessment.productName,
      assessmentId: assessment.id,
      sbomUploaded: true,
      uploadedAt: sbomData.uploadedAt,
      analysis: analysis
        ? {
            format: analysis.format,
            specVersion: analysis.specVersion,
            componentCount: analysis.componentCount,
            openSourceCount: analysis.openSourceCount,
            proprietaryCount: analysis.proprietaryCount,
            licenses: analysis.licenses,
            hasKnownVulnerableComponents: analysis.hasKnownVulnerableComponents,
            vulnerableComponents: analysis.vulnerableComponents,
          }
        : null,
      compliance: compliance
        ? {
            cra038_sbomGenerated: compliance.cra038_sbomGenerated,
            cra038_details: compliance.cra038_details,
            cra039_licensesCompliant: compliance.cra039_licensesCompliant,
            cra039_details: compliance.cra039_details,
            cra040_vulnerabilityTracking:
              compliance.cra040_vulnerabilityTracking,
            cra040_details: compliance.cra040_details,
          }
        : null,
      sbomRequirements: sbomReqs,
    };
  },

  // ─── Trade Classification Tools (Sprint B4) ──────────────────────

  classify_trade_item: async (input, userContext) => {
    // Import the trigger engine (pure — no DB needed for computation)
    const { evaluateTradeItemSubset } =
      await import("@/lib/comply-v2/trade/property-trigger-engine");

    let signals: Parameters<typeof evaluateTradeItemSubset>[0] = {};

    // If tradeItemId provided, fetch item from DB first
    const tradeItemId = getString(input, "tradeItemId");
    if (tradeItemId) {
      const item = await prisma.tradeItem.findFirst({
        where: {
          id: tradeItemId,
          organizationId: userContext.organizationId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          apertureMeters: true,
          rangeKm: true,
          payloadKg: true,
          isRadHardened: true,
          isMilSpec: true,
          isAntiJam: true,
          eccnEU: true,
          eccnUS: true,
          usmlCategory: true,
        },
      });

      if (!item) {
        return {
          error: `Trade item ${tradeItemId} not found in your organization.`,
          tradeItemId,
        };
      }
      signals = item;
    }

    // Override/supplement with any explicitly provided signals
    const rawAperture = getNumber(input, "apertureMeters");
    const rawRange = getNumber(input, "rangeKm");
    const rawPayload = getNumber(input, "payloadKg");
    const rawRadHard = getBoolean(input, "isRadHardened");
    const rawMilSpec = getBoolean(input, "isMilSpec");
    const rawAntiJam = getBoolean(input, "isAntiJam");
    const rawDesc = getString(input, "description");

    if (rawAperture !== null) signals.apertureMeters = rawAperture;
    if (rawRange !== null) signals.rangeKm = rawRange;
    if (rawPayload !== null) signals.payloadKg = rawPayload;
    if (rawRadHard !== null) signals.isRadHardened = rawRadHard;
    if (rawMilSpec !== null) signals.isMilSpec = rawMilSpec;
    if (rawAntiJam !== null) signals.isAntiJam = rawAntiJam;
    if (rawDesc) signals.description = rawDesc;

    const evaluation = evaluateTradeItemSubset(signals);

    return {
      triggeredRuleCount: evaluation.triggeredRuleCount,
      hasItarFlag: evaluation.hasItarFlag,
      hasMtcrCatIFlag: evaluation.hasMtcrCatIFlag,
      requiresHumanReview: evaluation.requiresHumanReview,
      maxConfidence: evaluation.maxConfidence,
      results: evaluation.results.map((r) => ({
        ruleId: r.ruleId,
        reason: r.reason,
        topicSlug: r.topicSlug,
        confidence: r.confidence,
        requiresHumanReview: r.requiresHumanReview,
        advisory: r.advisory,
        suggestedCodes: r.suggestedCodes.map((c) => ({
          jurisdiction: c.jurisdiction,
          code: c.code,
          itar: c.itar,
          mtcrCatI: c.mtcrCatI,
        })),
      })),
      disclaimer:
        "Caelex Trade classification suggestions are informational only. Before any export decision, verify with qualified export-control legal counsel. Violations of EAR/ITAR/AWG can result in criminal penalties.",
    };
  },

  // ─── Trade AI Classification Copilot — Z4b ─────────────────────────
  //
  // Wraps the datasheet extractor (Z4a) + the parametric matcher
  // (Z3c) into one tool. Accepts either base64-encoded PDF bytes or
  // raw datasheet text. Returns a `ClassificationDraft` — never
  // persists, the Z4d UI calls a separate server action for that.
  classify_from_datasheet: async (input, _userContext) => {
    const { extractDatasheet, extractFromText } =
      await import("@/lib/trade/datasheet-extractor");
    const { buildClassificationDraft } =
      await import("@/lib/trade/classification-draft-builder");

    const pdfBase64 = getString(input, "pdfBase64");
    const rawText = getString(input, "rawText");
    const tradeItemId = getString(input, "tradeItemId");

    // Either input must be present — caller-validated, but we re-check
    // here so a malformed Astra call doesn't NPE.
    if (!pdfBase64 && !rawText) {
      return {
        error:
          "Provide either pdfBase64 (base64-encoded PDF bytes) or rawText (datasheet text). Both are missing.",
      };
    }

    const extraction = pdfBase64
      ? await extractDatasheet(decodeBase64(pdfBase64))
      : extractFromText(rawText ?? "");

    if (extraction.parseError) {
      return {
        error: `Failed to parse datasheet: ${extraction.parseError}`,
        parseError: extraction.parseError,
      };
    }

    const draft = buildClassificationDraft(extraction);

    return {
      tradeItemId: tradeItemId ?? null,
      proposals: draft.proposals.map((p) => ({
        canonicalId: p.canonicalId,
        regime: p.regime,
        title: p.title,
        citation: p.citation,
        reasonsForControl: p.reasonsForControl,
        confidence: p.confidence,
        rationale: p.rationale,
        source: p.source,
        evidence: p.evidence.map((e) => ({
          attribute: e.attribute,
          quote: e.quote,
          contextBefore: e.contextBefore,
          contextAfter: e.contextAfter,
          parsedValue: e.parsedValue,
        })),
      })),
      primary: draft.primary
        ? {
            canonicalId: draft.primary.canonicalId,
            confidence: draft.primary.confidence,
            regime: draft.primary.regime,
          }
        : null,
      attributesExtracted: Object.keys(draft.attributes).filter(
        (k) => k !== "parametricAttributes",
      ),
      attributesNeeded: draft.attributesNeeded,
      pageCount: extraction.pageCount,
      summary: draft.summary,
      disclaimer: draft.disclaimer,
    };
  },

  lookup_classification_code: async (input, _userContext) => {
    const {
      findEntry,
      findEntriesAllJurisdictions,
      findRelatedClassifications,
    } = await import("@/lib/comply-v2/trade/classification-lookup");
    const { getTopic } =
      await import("@/lib/comply-v2/trade/classification-lookup");

    const code = getString(input, "code");
    if (!code) {
      return { error: "code is required" };
    }

    const jurisdiction = getString(input, "jurisdiction") as
      | Parameters<typeof findEntry>[1]
      | null;

    const includeRelated = getBoolean(input, "includeRelated") !== false;

    // Fetch the entry (or entries if jurisdiction omitted)
    const entries = jurisdiction
      ? [findEntry(code, jurisdiction)].filter(Boolean)
      : findEntriesAllJurisdictions(code);

    if (entries.length === 0) {
      return {
        found: false,
        code,
        jurisdiction: jurisdiction ?? "all",
        message: `No classification entry found for code '${code}'${jurisdiction ? ` in ${jurisdiction}` : ""}.`,
      };
    }

    const enriched = entries.map((e) => {
      const related = includeRelated ? findRelatedClassifications(e!) : [];
      const topic = e?.crossReferenceTopic
        ? getTopic(e.crossReferenceTopic)
        : null;
      return {
        jurisdiction: e?.jurisdiction,
        code: e?.code,
        title: e?.title,
        description: e?.description,
        controlReasons: e?.controlReasons,
        mtcrCategory: e?.mtcrCategory ?? null,
        sourceUrl: e?.sourceUrl,
        asOfDate: e?.asOfDate,
        notes: e?.notes ?? null,
        crossReferenceTopic: e?.crossReferenceTopic ?? null,
        topicTitle: topic?.title ?? null,
        relatedCodes: related.map((r) => ({
          jurisdiction: r.jurisdiction,
          code: r.code,
          title: r.title,
        })),
      };
    });

    return {
      found: true,
      count: enriched.length,
      entries: enriched,
      disclaimer:
        "Classification data is informational. Consult the official source URL and qualified export-control counsel before making licensing decisions.",
    };
  },

  // ─── Trade Counterparty Screening Tools (Wave A Sprint A7) ────────

  // ─── T-H10 (B3): read-only — no un-gated write or email ───────────
  // The AI is NOT permitted to invoke the mutating screenParty() function
  // from this tool path. Doing so would persist a TradeScreeningResult,
  // mutate screeningStatus, and send a sanctions-hit email with no human
  // approval — an unacceptable autonomous side-effect.
  //
  // This handler now only reads the party's current persisted state from
  // the DB and returns it. To run a fresh screening (which writes a result
  // and may notify reviewers), the user must use the "Screen" action in
  // the counterparty UI (the gated POST /api/trade/parties/[id]/screen
  // route), which keeps a human in the loop.
  screen_trade_party: async (input, userContext) => {
    const partyId = getString(input, "partyId");
    if (!partyId) {
      return {
        error:
          "partyId is required. Use lookup_trade_party first to find the partyId by name.",
      };
    }

    // Org-scope check — also select the current persisted screening state.
    const party = await prisma.tradeParty.findFirst({
      where: { id: partyId, organizationId: userContext.organizationId },
      select: {
        id: true,
        legalName: true,
        screeningStatus: true,
        lastScreenedAt: true,
      },
    });
    if (!party) {
      return {
        error: `TradeParty '${partyId}' not found in your organization.`,
      };
    }

    // Return the current persisted status only — no screenParty() call.
    return {
      partyId: party.id,
      partyName: party.legalName,
      status: party.screeningStatus,
      lastScreenedAt: party.lastScreenedAt?.toISOString() ?? null,
      note: "Read-only: to run a fresh sanctions screening (which records a result and may notify reviewers), use the Screen action in the counterparty page. The assistant cannot run screenings autonomously.",
    };
  },

  lookup_trade_party: async (input, userContext) => {
    const query = getString(input, "query");
    const countryCode = getString(input, "countryCode");
    const screeningStatus = getString(input, "screeningStatus");
    const limitRaw = getNumber(input, "limit");
    const limit = limitRaw
      ? Math.min(50, Math.max(1, Math.floor(limitRaw)))
      : 10;

    const where: Parameters<typeof prisma.tradeParty.findMany>[0]["where"] = {
      organizationId: userContext.organizationId,
    };

    if (countryCode) {
      where.countryCode = countryCode.toUpperCase();
    }

    if (
      screeningStatus &&
      [
        "NOT_SCREENED",
        "CLEAR",
        "POTENTIAL_MATCH",
        "CONFIRMED_HIT",
        "STALE",
      ].includes(screeningStatus)
    ) {
      where.screeningStatus = screeningStatus as
        | "NOT_SCREENED"
        | "CLEAR"
        | "POTENTIAL_MATCH"
        | "CONFIRMED_HIT"
        | "STALE";
    }

    if (query) {
      // Try canonical match first; fall back to legalName contains
      const { canonicalizeName } =
        await import("@/lib/comply-v2/trade/screening/sources/types");
      const canonical = canonicalizeName(query);
      where.OR = [
        { legalName: { contains: query, mode: "insensitive" } },
        { tradeName: { contains: query, mode: "insensitive" } },
        { canonicalName: { contains: canonical } },
      ];
    }

    const parties = await prisma.tradeParty.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      take: limit,
      select: {
        id: true,
        legalName: true,
        tradeName: true,
        countryCode: true,
        status: true,
        screeningStatus: true,
        isUSPerson: true,
        isHighRiskCountry: true,
        lastScreenedAt: true,
        blockedReason: true,
      },
    });

    return {
      count: parties.length,
      filters: { query, countryCode, screeningStatus, limit },
      parties: parties.map((p) => ({
        id: p.id,
        legalName: p.legalName,
        tradeName: p.tradeName,
        country: p.countryCode,
        status: p.status,
        screeningStatus: p.screeningStatus,
        isUSPerson: p.isUSPerson,
        isHighRiskCountry: p.isHighRiskCountry,
        lastScreenedAt: p.lastScreenedAt?.toISOString() ?? null,
        blockedReason: p.blockedReason,
      })),
    };
  },

  // ─── Trade Feature Bridge Tools (Trade Knowledge Update) ────────
  //
  // Each handler is a thin adapter around an existing service in
  // src/lib/trade/ — no business logic lives in this file. Dynamic
  // imports keep the cold-path executor lean.

  check_sanctions_status: async (input, userContext) => {
    const partyName = getString(input, "partyName");
    if (!partyName || partyName.length < 2) {
      return {
        error:
          "partyName is required (min 2 chars). Provide the legal name of the counterparty to screen.",
      };
    }
    const countryCode = getString(input, "countryCode");

    // Look up the party in the operator's organisation.
    const { canonicalizeName } =
      await import("@/lib/comply-v2/trade/screening/sources/types");
    const canonical = canonicalizeName(partyName);

    const matches = await prisma.tradeParty.findMany({
      where: {
        organizationId: userContext.organizationId,
        ...(countryCode ? { countryCode: countryCode.toUpperCase() } : {}),
        OR: [
          { legalName: { contains: partyName, mode: "insensitive" } },
          { tradeName: { contains: partyName, mode: "insensitive" } },
          { canonicalName: { contains: canonical } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        legalName: true,
        tradeName: true,
        countryCode: true,
      },
    });

    if (matches.length === 0) {
      return {
        notFound: true,
        partyName,
        countryCode: countryCode ?? null,
        message: `No TradeParty matching '${partyName}'${countryCode ? ` in ${countryCode}` : ""} exists in your organisation. Create the party first via /trade/parties or use lookup_trade_party with different search terms.`,
        suggestion:
          "If this is a new counterparty, onboard it on /trade/parties; the screening cron will then evaluate it on the next pass.",
      };
    }

    // Pick the best match (top result) and screen it.
    const target = matches[0];
    const { screenParty } =
      await import("@/lib/comply-v2/trade/screening/screen-party.server");

    const result = await screenParty(target.id, {
      systemDecisionUserId: userContext.userId,
    });

    return {
      partyId: result.partyId,
      partyName: target.legalName,
      tradeName: target.tradeName,
      country: target.countryCode,
      decision: result.summary.decision,
      newScreeningStatus: result.party.screeningStatus,
      hitCount: result.summary.hitCount,
      topScore: Number(result.summary.topScore.toFixed(4)),
      listsConsulted: result.summary.listsConsulted,
      snapshotsMissing: result.summary.snapshotsMissing,
      topHits: (
        (result.screeningResult.hits as unknown as Array<{
          list: string;
          entryId: string;
          matchedName: string;
          score: number;
        }>) ?? []
      )
        .slice(0, 5)
        .map((h) => ({
          list: h.list,
          entryId: h.entryId,
          matchedName: h.matchedName,
          score: Number(h.score.toFixed(4)),
        })),
      cascade: result.cascade
        ? {
            triggered: result.summary.cascadeHit,
            aggregateSanctionedOwnership: Number(
              result.cascade.aggregateSanctionedOwnership.toFixed(4),
            ),
            sanctionedAncestorCount: result.summary.sanctionedAncestorCount,
            topAncestors: result.cascade.ancestors.slice(0, 5).map((a) => ({
              name: a.ancestorName,
              country: a.countryCode,
              effectivePercent: Number(a.effectivePercent.toFixed(4)),
              screeningStatus: a.screeningStatus,
              isBlocked: a.isBlocked,
            })),
          }
        : null,
      snapshotHash: result.screeningResult.snapshotHash,
      alternativeMatches:
        matches.length > 1
          ? matches.slice(1).map((m) => ({
              id: m.id,
              legalName: m.legalName,
              country: m.countryCode,
            }))
          : [],
      disclaimer:
        "Sanctions screening result is informational. Confirmed hits require human triage by an export-control officer. Screened against OFAC SDN, BIS Entity List, DDTC Debarred, OpenSanctions consolidated (Z9). 50%-rule cascade per 31 CFR § 510. Snapshot hash documents exact list versions for audit retention (5 yr per § 762.6 / § 122.5).",
    };
  },

  generate_dcs: async (input, userContext) => {
    const operationId = getString(input, "operationId");
    if (!operationId) {
      return {
        error:
          "operationId is required. Provide the TradeOperation ID — find it on /trade/operations.",
      };
    }
    const consigneeNameOverride = getString(input, "consigneeName");

    // Fetch operation + lines so we can derive ECCNs + destination.
    const op = await prisma.tradeOperation.findFirst({
      where: {
        id: operationId,
        organizationId: userContext.organizationId,
      },
      include: {
        lines: {
          include: {
            item: {
              select: { eccnUS: true, eccnEU: true, name: true },
            },
          },
        },
      },
    });

    if (!op) {
      return {
        error: `TradeOperation '${operationId}' not found in your organisation.`,
      };
    }

    // Collect ECCNs from the lines — US CCL preferred (DCS is § 758.6
    // which is a CCL-side rule). Fall back to EU ECCN only if US ECCN
    // is absent for a given item.
    const eccns = Array.from(
      new Set(
        op.lines
          .map((l) => l.item.eccnUS ?? l.item.eccnEU ?? "")
          .filter((e) => e.length > 0),
      ),
    );

    if (eccns.length === 0) {
      return {
        error:
          "Operation has no classified items — assign at least one line item with an ECCN before generating a DCS.",
        operationId: op.id,
        operationReference: op.reference,
        lineCount: op.lines.length,
      };
    }

    const { generateDestinationControlStatement, DCSGeneratorError } =
      await import("@/lib/trade/dcs-generator");

    try {
      const output = generateDestinationControlStatement({
        eccns,
        destinationCountry: op.shipToCountry,
        consigneeName: consigneeNameOverride ?? op.endUserName ?? undefined,
        shipmentReference: op.reference,
      });

      return {
        operationId: op.id,
        operationReference: op.reference,
        statement: output.text,
        variant: output.variant,
        eccns: output.normalizedEccns,
        destinationCountry: output.normalizedDestinationCountry,
        extendedLanguageApplies: output.extendedLanguageApplies,
        extendedLanguageTriggerEccns: output.extendedLanguageTriggerEccns,
        citation: output.citation,
        disclaimer:
          "The Destination Control Statement must appear verbatim on the commercial invoice, bill of lading, or air waybill (15 CFR § 758.6). Placement on the shipping document is the operator's responsibility; Caelex generates the text only.",
      };
    } catch (e) {
      if (e instanceof DCSGeneratorError) {
        return { error: e.message };
      }
      throw e;
    }
  },

  predict_license_time: async (input) => {
    const authority = getStringEnum(input, "authority", [
      "BIS",
      "DDTC",
      "BAFA",
      "ECJU",
    ] as const);
    if (!authority) {
      return { error: "authority is required (BIS / DDTC / BAFA / ECJU)." };
    }
    const destinationCountry = getString(input, "destinationCountry");
    if (!destinationCountry || !/^[A-Z]{2}$/.test(destinationCountry)) {
      return {
        error:
          "destinationCountry is required (ISO 3166-1 alpha-2 uppercase, e.g. 'CN', 'DE').",
      };
    }
    const eccn = getString(input, "eccn");
    if (!eccn) {
      return { error: "eccn is required (ECCN or USML category)." };
    }
    const formTypeRaw = getString(input, "formType");
    const submissionDateRaw = getString(input, "submissionDate");

    // Map destination country → destination group. Coarse heuristic
    // sufficient for the predictor — the underlying dataset is keyed
    // at the group level. Z22 Country-Group Resolver is the
    // authoritative mapper; we replicate the high-confidence buckets
    // here (CHINA / RUSSIA / EU / ALLIED) and default to "B" for
    // unknowns (most-favoured-nation broad bucket).
    const destinationGroup = resolveDestinationGroup(destinationCountry);

    // Map ECCN → bucket. Pattern-based — see historical-times.ts for
    // bucket definitions.
    const eccnBucket = resolveEccnBucket(eccn);

    // Default form type per authority when caller didn't supply one.
    const formType =
      formTypeRaw && isValidFormTypeForAuthority(formTypeRaw, authority)
        ? formTypeRaw
        : defaultFormTypeFor(authority);

    const { predictLicenseTime } =
      await import("@/lib/trade/license-analytics/predictor");

    let submissionDate: Date | undefined;
    if (submissionDateRaw) {
      const parsed = new Date(submissionDateRaw);
      if (!isNaN(parsed.getTime())) {
        submissionDate = parsed;
      }
    }

    const prediction = predictLicenseTime({
      authority: authority as "BIS" | "DDTC" | "BAFA" | "ECJU",
      formType: formType as
        | "BIS_STANDARD"
        | "BIS_RE_EXPORT"
        | "BIS_DEEMED_EXPORT"
        | "DDTC_DSP5"
        | "DDTC_DSP73"
        | "DDTC_DSP61"
        | "DDTC_TAA"
        | "DDTC_MLA"
        | "BAFA_EINZEL"
        | "BAFA_SAMMEL"
        | "BAFA_HOECHSTBETRAG"
        | "ECJU_SIEL"
        | "ECJU_OIEL",
      destinationGroup,
      eccnBucket,
      submissionDate,
    });

    return {
      authority,
      destinationCountry,
      destinationGroup,
      eccn,
      eccnBucket,
      formType,
      p25Days: prediction.p25Days,
      medianDays: prediction.medianDays,
      p75Days: prediction.p75Days,
      expectedApprovalDate: prediction.expectedApprovalDate.toISOString(),
      optimisticDate: prediction.optimisticDate.toISOString(),
      conservativeDate: prediction.conservativeDate.toISOString(),
      confidence: prediction.confidence,
      matchTier: prediction.matchTier,
      dataBasis: prediction.dataBasis,
      industrySampleSize: prediction.industrySampleSize,
      orgCalibrationApplied: prediction.orgCalibrationApplied,
      orgSampleSize: prediction.orgSampleSize,
      disclaimer:
        "Processing-time predictions are informational and based on published agency statistics (BIS Annual Report, DDTC Statistical Report, BAFA Jahresbericht, ECJU SDR). Actual times vary with case complexity, examiner load, and inter-agency review. Operators should not commit firm ship dates against the optimistic end of the band.",
    };
  },

  find_covering_license: async (input, userContext) => {
    const eccn = getString(input, "eccn");
    if (!eccn) {
      return {
        error:
          "eccn is required (ECCN, USML category, or UK control-list entry).",
      };
    }
    const destinationCountry = getString(input, "destinationCountry");
    if (
      !destinationCountry ||
      !/^[A-Z]{2}$/.test(destinationCountry.toUpperCase())
    ) {
      return {
        error:
          "destinationCountry is required (ISO 3166-1 alpha-2 uppercase, e.g. 'AU', 'FR').",
      };
    }
    const endUserName = getString(input, "endUserName");
    const valueEur = getNumber(input, "valueEur");
    const valueGbp = getNumber(input, "valueGbp");
    const authoritiesRaw = getStringArray(input, "authorities");
    const authorities = new Set(
      authoritiesRaw.length > 0 ? authoritiesRaw : ["UK_ECJU", "BAFA_SAG"],
    );

    const normalizedDestination = destinationCountry.toUpperCase();
    const results: Record<string, unknown> = {};

    // UK ECJU side
    if (authorities.has("UK_ECJU")) {
      const { findCoveringLicenses: findUkLicenses } =
        await import("@/lib/trade/uk-ecju/uk-ecju-service");
      const ukLicenses = await findUkLicenses(userContext.organizationId, {
        controlListEntry: eccn,
        destination: normalizedDestination,
        endUser: endUserName ?? null,
        valueGbp:
          typeof valueGbp === "number"
            ? // Convert £ to pence as a bigint, the UK service expects pence
              BigInt(Math.round(valueGbp * 100))
            : null,
      });
      results.ukEcju = {
        count: ukLicenses.length,
        licenses: ukLicenses.slice(0, 10).map((l) => ({
          id: l.id,
          licenseType: l.licenseType,
          ecjuReference: l.ecjuReference,
          status: l.status,
          validFrom: l.validFrom?.toISOString() ?? null,
          validUntil: l.validUntil?.toISOString() ?? null,
          controlListEntries: l.controlListEntries,
          destinationCountries: l.destinationCountries,
          endUserName: l.endUserName,
          capValueGbpPence: l.capValueGbp ? l.capValueGbp.toString() : null,
          drawnDownGbpPence: l.drawnDownValueGbp.toString(),
        })),
      };
    }

    // BAFA Sammelgenehmigung side
    if (authorities.has("BAFA_SAG")) {
      const { findCoveringSammelgenehmigungen } =
        await import("@/lib/trade/sammelgenehmigung/sammelgenehmigung-service");
      const sags = await findCoveringSammelgenehmigungen(
        userContext.organizationId,
        {
          eccn,
          destinationCountry: normalizedDestination,
          valueEur: typeof valueEur === "number" ? valueEur : undefined,
        },
      );
      results.bafaSag = {
        count: sags.length,
        sammelgenehmigungen: sags.slice(0, 10).map((s) => ({
          id: s.id,
          title: s.title,
          bafaReference: s.bafaReference,
          status: s.status,
          validFrom: s.validFrom.toISOString(),
          validUntil: s.validUntil.toISOString(),
          allowedECCNs: s.allowedECCNs,
          allowedDestinations: s.allowedDestinations,
          totalValueCapEur: s.totalValueCapEur,
          drawnDownValueEur: s.drawnDownValueEur,
          remainingCapacityEur: Math.max(
            0,
            s.totalValueCapEur - s.drawnDownValueEur,
          ),
          allowedEndUserCount: s.allowedEndUsers.length,
        })),
      };
    }

    const totalFound =
      ((results.ukEcju as { count?: number } | undefined)?.count ?? 0) +
      ((results.bafaSag as { count?: number } | undefined)?.count ?? 0);

    return {
      query: {
        eccn,
        destinationCountry: normalizedDestination,
        endUserName: endUserName ?? null,
        valueEur: valueEur ?? null,
        valueGbp: valueGbp ?? null,
        authorities: Array.from(authorities),
      },
      totalFound,
      results,
      disclaimer:
        totalFound === 0
          ? "No covering licence found. Operator must file a new individual licence (BIS / DDTC / BAFA Einzel / ECJU SIEL) before shipping — use predict_license_time to forecast lead time."
          : "Covering licence(s) found. Operator should confirm the licence conditions match the actual shipment (end-use, technical specs, end-user undertakings) before invoking it. Caelex records the draw-down via the licences page.",
    };
  },

  evaluate_sham_risk: async (input, userContext) => {
    const operationId = getString(input, "operationId");
    if (!operationId) {
      return {
        error:
          "operationId is required. Find it on /trade/operations or via the operations list.",
      };
    }

    const op = await prisma.tradeOperation.findFirst({
      where: {
        id: operationId,
        organizationId: userContext.organizationId,
      },
      include: {
        counterparty: {
          include: {
            beneficialOwners: { include: { owner: true } },
          },
        },
        lines: { include: { item: true } },
        reexportConsents: true,
      },
    });

    if (!op) {
      return {
        error: `TradeOperation '${operationId}' not found in your organisation.`,
      };
    }

    const { detectShamTransactionRisk } =
      await import("@/lib/trade/ofac-sham-doctrine/detector");

    // Build UBO chain — first level only (Z9b will eventually supply
    // multi-level Orbis chain).
    const uboChain = op.counterparty.beneficialOwners.map((edge) => ({
      id: edge.owner.id,
      name: edge.owner.legalName,
      countryCode: edge.owner.countryCode,
      depth: 1,
      effectivePercent: edge.percent,
    }));

    // Map prior re-export consents → ReexportHistoryEntry.
    const reexportHistory = op.reexportConsents.map((c) => {
      let status: "APPROVED" | "DENIED" | "PENDING" | "REVOKED";
      switch (c.status) {
        case "APPROVED":
          status = "APPROVED";
          break;
        case "DENIED":
          status = "DENIED";
          break;
        case "REVOKED":
          status = "REVOKED";
          break;
        case "EXPIRED":
          status = "APPROVED";
          break;
        case "DRAFTED":
        case "SENT":
        default:
          status = "PENDING";
          break;
      }
      return { id: c.id, status, filedAt: c.createdAt };
    });

    const detectorInput = {
      id: op.id,
      shipToCountry: op.shipToCountry,
      endUseCountry: op.endUseCountry ?? undefined,
      counterparty: {
        id: op.counterparty.id,
        legalName: op.counterparty.legalName,
        countryCode: op.counterparty.countryCode,
        uboChain,
      },
      endUser:
        op.endUserName || op.endUseCountry
          ? {
              name: op.endUserName ?? undefined,
              operatingCountry: op.endUseCountry ?? undefined,
              reexportHistory,
            }
          : undefined,
      lines: op.lines.map((l) => ({
        eccn: l.item.eccnUS ?? l.item.eccnEU ?? "EAR99",
        unitValue: l.unitValue,
        quantity: l.quantity,
        currency: l.unitCurrency,
      })),
    };

    const result = detectShamTransactionRisk(detectorInput);

    return {
      operationId: op.id,
      operationReference: op.reference,
      counterparty: op.counterparty.legalName,
      counterpartyCountry: op.counterparty.countryCode,
      shipToCountry: op.shipToCountry,
      riskScore: result.riskScore,
      recommendation: result.recommendation,
      redFlags: result.redFlags.map((f) => ({
        type: f.type,
        severity: f.severity,
        title: f.title,
        rationale: f.rationale,
        evidence: f.evidence,
        citationCount: f.citations.length,
        citations: f.citations.slice(0, 3).map((c) => ({
          enforcementAction: c.name,
          year: c.year,
          penaltyUsd: c.penaltyUsd,
        })),
      })),
      skippedChecks: result.skippedChecks,
      detectorVersion: result.detectorVersion,
      disclaimer:
        "Sham-transaction detector result is informational. Recommendations follow OFAC's January 2026 enforcement guidance (JY-2026-013, building on 31 CFR § 501.601). Skipped checks reflect missing input data and must be surfaced to the operator — silently treating 'no data' as 'passed' was the failure mode OFAC flagged in the GVA Capital settlement (June 2025).",
    };
  },

  // ─── Mission Domain Tools (Sprint D) ────────────────────────────

  list_missions: async (input, userContext) => {
    const statusFilter = getString(input, "status");
    const missionTypeFilter = getString(input, "missionType");

    const { getMissionsForUser } =
      await import("@/lib/comply-v2/missions.server");
    const all = await getMissionsForUser(userContext.userId);

    const filtered = all.filter((m) => {
      if (statusFilter && m.status !== statusFilter) return false;
      if (missionTypeFilter && m.missionType !== missionTypeFilter)
        return false;
      return true;
    });

    return {
      count: filtered.length,
      totalInOrg: all.length,
      filters: {
        status: statusFilter ?? null,
        missionType: missionTypeFilter ?? null,
      },
      missions: filtered.map((m) => ({
        id: m.id,
        name: m.name,
        reference: m.reference,
        missionType: m.missionType,
        programPhase: m.programPhase,
        status: m.status,
        primaryEndUser: m.primaryEndUser,
        primaryEndUserCountry: m.primaryEndUserCountryCode,
        spacecraftCount: m.spacecraftCount,
        primarySpacecraftName: m.primarySpacecraft?.spacecraftName ?? null,
        plannedStartAt: m.plannedStartAt?.toISOString() ?? null,
        startedAt: m.startedAt?.toISOString() ?? null,
        endedAt: m.endedAt?.toISOString() ?? null,
        phaseCount: m.phaseCount,
        roadmapProgressPct: m.roadmapProgressPct,
        activePhase: m.activePhase
          ? {
              name: m.activePhase.name,
              status: m.activePhase.status,
              progress: m.activePhase.progress,
              endDate: m.activePhase.endDate.toISOString(),
            }
          : null,
      })),
    };
  },

  get_mission_detail: async (input, userContext) => {
    const missionId = getString(input, "missionId");
    if (!missionId) {
      return {
        error:
          "missionId is required. Use list_missions first to find the missionId.",
      };
    }

    const { getMissionDetail } =
      await import("@/lib/comply-v2/missions.server");
    const mission = await getMissionDetail(userContext.userId, missionId);
    if (!mission) {
      return {
        error: `Mission '${missionId}' not found in your organization.`,
      };
    }

    return {
      id: mission.id,
      name: mission.name,
      reference: mission.reference,
      description: mission.description,
      missionType: mission.missionType,
      programPhase: mission.programPhase,
      status: mission.status,
      primaryEndUser: mission.primaryEndUser,
      primaryEndUserCountry: mission.primaryEndUserCountryCode,
      plannedStartAt: mission.plannedStartAt?.toISOString() ?? null,
      startedAt: mission.startedAt?.toISOString() ?? null,
      endedAt: mission.endedAt?.toISOString() ?? null,
      authorityRefs: mission.authorityRefs,
      // Spacecraft
      assignedSpacecraft: mission.assignedSpacecraft.map((s) => ({
        spacecraftId: s.spacecraftId,
        name: s.spacecraftName,
        role: s.role,
        constellationSlot: s.constellationSlot,
        status: s.status,
        cosparId: s.cosparId,
        noradId: s.noradId,
        orbitType: s.orbitType,
        altitudeKm: s.altitudeKm,
        startedAt: s.startedAt.toISOString(),
      })),
      pastSpacecraftCount: mission.pastSpacecraft.length,
      // Phases (summary level)
      phaseCount: mission.phases.length,
      totalMilestones: mission.totalMilestones,
      regulatoryMilestones: mission.regulatoryMilestones,
      roadmapProgressPct: mission.roadmapProgressPct,
      // Cross-domain (counts only — model can call get_mission_timeline /
      // list_documents / list_active_incidents / lookup_trade_party for
      // the actual entries to keep this payload focused)
      relatedCounts: {
        authorizationWorkflows: mission.relatedWorkflows.length,
        documents: mission.relatedDocuments.length,
        incidents: mission.relatedIncidents.length,
        tradeOperations: mission.relatedTradeOperations.length,
      },
      hasUnresolvedIncidents: mission.relatedIncidents.some(
        (i) => i.status !== "resolved" && i.status !== "closed",
      ),
      hasCatchAllHits: mission.relatedTradeOperations.some(
        (o) => o.catchAllAnyHit,
      ),
    };
  },

  get_mission_timeline: async (input, userContext) => {
    const missionId = getString(input, "missionId");
    if (!missionId) {
      return { error: "missionId is required." };
    }

    const { getMissionDetail } =
      await import("@/lib/comply-v2/missions.server");
    const mission = await getMissionDetail(userContext.userId, missionId);
    if (!mission) {
      return {
        error: `Mission '${missionId}' not found in your organization.`,
      };
    }

    return {
      missionId: mission.id,
      missionName: mission.name,
      programPhase: mission.programPhase,
      roadmapProgressPct: mission.roadmapProgressPct,
      phases: mission.phases.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        progress: p.progress,
        startDate: p.startDate.toISOString(),
        endDate: p.endDate.toISOString(),
        description: p.description,
        dependsOn: p.dependsOn,
        milestoneCount: p.milestones.length,
        regulatoryMilestoneCount: p.milestones.filter((m) => m.isRegulatory)
          .length,
        criticalMilestoneCount: p.milestones.filter((m) => m.isCritical).length,
        milestones: p.milestones.map((m) => ({
          id: m.id,
          name: m.name,
          status: m.status,
          targetDate: m.targetDate.toISOString(),
          completedDate: m.completedDate?.toISOString() ?? null,
          isCritical: m.isCritical,
          isRegulatory: m.isRegulatory,
          regulatoryRef: m.regulatoryRef,
        })),
      })),
    };
  },

  // ─── Time-Travel (Sprint C2) ───

  snapshot_at_date: async (input, userContext) => {
    const { snapshotOperatorProfile, snapshotProposals, snapshotAuditChain } =
      await import("@/lib/time-travel/snapshot");
    const asOfStr = getString(input, "asOf");
    const scope = getString(input, "scope", "all");
    const auditLimit = getNumber(input, "auditLimit", 50) ?? 50;

    let asOf: Date | undefined;
    if (asOfStr) {
      const d = new Date(asOfStr);
      if (!isNaN(d.getTime())) asOf = d;
    }

    const out: Record<string, unknown> = {
      asOf: (asOf ?? new Date()).toISOString(),
      scope,
    };

    if (scope === "operator-profile" || scope === "all") {
      out.operatorProfile = await snapshotOperatorProfile(
        userContext.organizationId,
        asOf,
      );
    }
    if (scope === "proposals" || scope === "all") {
      out.proposals = await snapshotProposals(userContext.organizationId, asOf);
    }
    if (scope === "audit-chain" || scope === "all") {
      out.auditChain = await snapshotAuditChain(
        userContext.organizationId,
        asOf,
        auditLimit,
      );
    }

    return out;
  },

  // ─── AI Blocks (Sprint B3) ───

  create_ai_block: async (input, userContext) => {
    const { createAIBlock } = await import("@/lib/ai-blocks/service");
    const ownerType = getString(input, "ownerType");
    const ownerId = getString(input, "ownerId");
    const name = getString(input, "name");
    const prompt = getString(input, "prompt");
    const triggerType = getString(input, "triggerType");

    if (!ownerType || !ownerId || !name || !prompt || !triggerType) {
      return {
        error:
          "Missing required fields: ownerType, ownerId, name, prompt, triggerType",
      };
    }

    const summary = await createAIBlock({
      organizationId: userContext.organizationId,
      ownerType: ownerType as
        | "compliance-item"
        | "module"
        | "organization"
        | "spacecraft",
      ownerId,
      name,
      description: getString(input, "description"),
      prompt,
      triggerType: triggerType as
        | "manual"
        | "evidence-change"
        | "schedule"
        | "regulation-update",
      schedule: getString(input, "schedule"),
      regulationRef: getString(input, "regulationRef"),
      isPinned: getBoolean(input, "isPinned", false),
    });
    return summary;
  },

  list_ai_blocks: async (input, userContext) => {
    const { listAIBlocksForOrg, listAIBlocksForOwner } =
      await import("@/lib/ai-blocks/service");
    const ownerType = getString(input, "ownerType");
    const ownerId = getString(input, "ownerId");
    const limitRaw = getNumber(input, "limit", 50);
    const limit = Math.max(1, Math.min(limitRaw ?? 50, 100));
    const onlyPinned = getBoolean(input, "onlyPinned", false);

    if (ownerType && ownerId) {
      const blocks = await listAIBlocksForOwner(
        userContext.organizationId,
        ownerType as
          | "compliance-item"
          | "module"
          | "organization"
          | "spacecraft",
        ownerId,
      );
      return { blocks: blocks.slice(0, limit), count: blocks.length };
    }
    const blocks = await listAIBlocksForOrg(userContext.organizationId, {
      limit,
      onlyPinned,
    });
    return { blocks, count: blocks.length };
  },

  run_ai_block: async (input, userContext) => {
    const { runAIBlock } = await import("@/lib/ai-blocks/service");
    const blockId = getString(input, "blockId");
    if (!blockId) {
      return { error: "blockId is required", status: "FAILED" };
    }
    const triggerReason = getString(input, "triggerReason");
    const result = await runAIBlock(userContext.organizationId, blockId, {
      triggeredBy: userContext.userId,
      triggerReason,
    });
    return result;
  },

  // ─── Background Autofill (Sprint B2) ───

  suggest_form_autofill: async (input, userContext) => {
    const { suggestFormAutofill } =
      await import("@/lib/autofill/suggest-fields");
    const formType = getString(input, "formType");
    const valid = [
      "document-upload",
      "spacecraft-create",
      "incident-create",
      "mission-create",
    ] as const;
    type ValidFormType = (typeof valid)[number];
    if (!formType || !valid.includes(formType as ValidFormType)) {
      return {
        error: `formType must be one of: ${valid.join(", ")}`,
        suggestions: [],
      };
    }
    const currentValues =
      typeof input.currentValues === "object" && input.currentValues !== null
        ? (input.currentValues as Record<string, unknown>)
        : {};
    const result = await suggestFormAutofill({
      formType: formType as ValidFormType,
      currentValues,
      organizationId: userContext.organizationId,
    });
    return result;
  },

  // ─── Capabilities Discovery ───

  discover_caelex_capabilities: async (input) => {
    const { getCapabilitiesInventory } =
      await import("@/lib/capabilities/inventory");
    const inv = getCapabilitiesInventory();
    const scope = getString(input, "scope", "summary");

    switch (scope) {
      case "all":
        return inv;
      case "countries":
        return {
          summary: {
            implemented: inv.summary.countryAdaptersImplemented,
            total: inv.summary.countryAdaptersTotal,
          },
          countryCoverage: inv.countryCoverage,
        };
      case "frameworks":
        return {
          summary: { count: inv.summary.frameworksCount },
          frameworks: inv.frameworks,
        };
      case "tools":
        return {
          summary: { count: inv.summary.astraToolsCount },
          tools: inv.astraTools,
        };
      case "endpoints":
        return {
          summary: { count: inv.summary.ecosystemEndpointsCount },
          endpoints: inv.ecosystemEndpoints,
        };
      case "trust":
        return { trustLayer: inv.trustLayer };
      case "summary":
      default:
        return {
          generatedAt: inv.generatedAt,
          platformVersion: inv.platformVersion,
          summary: inv.summary,
          externalSources: inv.externalSources.map((s) => s.id),
          frameworks: inv.frameworks.map((f) => f.id),
        };
    }
  },

  // ─── Lineage (Sprint C1) ───

  query_lineage_for_subject: async (input, userContext) => {
    const { buildLineageGraph } =
      await import("@/lib/lineage/build-lineage-graph");

    const subjectTypeRaw = getString(input, "subjectType");
    const subjectId = getString(input, "subjectId");
    const validTypes = [
      "compliance-item",
      "operator-profile-field",
      "astra-proposal",
      "audit-log-entry",
    ] as const;
    type ValidType = (typeof validTypes)[number];

    if (!subjectTypeRaw || !validTypes.includes(subjectTypeRaw as ValidType)) {
      return {
        error: `subjectType must be one of: ${validTypes.join(", ")}`,
        nodes: [],
        edges: [],
      };
    }
    if (!subjectId) {
      return { error: "subjectId is required", nodes: [], edges: [] };
    }

    const result = await buildLineageGraph(userContext.organizationId, {
      type: subjectTypeRaw as ValidType,
      id: subjectId,
    });

    return {
      subject: result.subject,
      nodes: result.nodes,
      edges: result.edges,
      summary: `${result.nodes.length} nodes, ${result.edges.length} edges${result.meta.truncated ? " (truncated)" : ""}`,
      warnings: result.meta.warnings,
    };
  },

  // ─── Day-1 Magic Moment (Sprint Day1) ───

  run_day1_magic_moment: async (input, userContext) => {
    const { runDay1MagicMoment } = await import("@/lib/day1/run-day1");
    const persist = input.persist === true;
    const maxItemsRaw =
      typeof input.maxItems === "number" ? input.maxItems : undefined;
    const maxItems =
      maxItemsRaw === undefined
        ? undefined
        : Math.max(1, Math.min(maxItemsRaw, 100));

    const result = await runDay1MagicMoment({
      organizationId: userContext.organizationId,
      persist,
      maxItems,
    });

    // Trim verbose payload for chat context — return only the banner +
    // top actions + summary stats. Full payload is available via the
    // /api/v1/ecosystem/day1 endpoint when needed.
    return {
      bannerSummary: result.bannerSummary,
      topActions: result.topActions,
      enrichmentStatus: result.enrichment?.status ?? null,
      discoverySummary: result.discovery
        ? {
            authoritiesCount: result.discovery.authorities.length,
            counselCount: result.discovery.counsel.filter(
              (c) => c.matchStrategy !== "stub",
            ).length,
            signalsCount: result.discovery.signals.length,
          }
        : null,
      roadmapSummary: result.roadmap
        ? {
            status: result.roadmap.status,
            itemsGenerated: result.roadmap.stats.itemsGenerated,
            byPriority: result.roadmap.stats.itemsByPriority,
            byRegulation: result.roadmap.stats.itemsByRegulation,
          }
        : null,
      durationMs: result.durationMs,
    };
  },

  // ─── Network Discovery (Sprint A4) ───

  discover_trilateral_network: async (_input, userContext) => {
    const { runTrilateralDiscovery } = await import("@/lib/network-discovery");

    const operator = await prisma.operatorProfile.findUnique({
      where: { organizationId: userContext.organizationId },
      select: {
        euOperatorCode: true,
        operatorType: true,
        establishment: true,
        operatingJurisdictions: true,
      },
    });

    const operatorTypeCode =
      operator?.euOperatorCode ?? operator?.operatorType ?? "";

    if (!operatorTypeCode || !operator?.establishment) {
      return {
        status: "EMPTY",
        message:
          "Need OperatorProfile.operatorType + establishment country before trilateral discovery can run.",
        authorities: [],
        counsel: [],
        signals: [],
      };
    }

    const result = await runTrilateralDiscovery({
      organizationId: userContext.organizationId,
      operatorType: operatorTypeCode,
      establishmentCountry: operator.establishment,
      operatingJurisdictions: operator.operatingJurisdictions ?? [],
    });

    return {
      status: result.meta.inputComplete ? "SUCCESS" : "PARTIAL",
      message:
        result.authorities.length > 0
          ? `Detected ${result.authorities.length} supervising NCA${result.authorities.length === 1 ? "" : "s"} and ${result.counsel.filter((c) => c.matchStrategy !== "stub").length} counsel suggestion${result.counsel.filter((c) => c.matchStrategy !== "stub").length === 1 ? "" : "s"}.`
          : "No supervisory NCAs matched — check operatorType + establishment country.",
      authorities: result.authorities,
      counsel: result.counsel,
      signals: result.signals,
      warnings: result.meta.warnings,
    };
  },

  // ─── Precision Engine / Roadmap Tools (Sprint A3.5) ───

  generate_compliance_roadmap: async (input, userContext) => {
    // Lazy import to avoid pulling precision-engine into the cold path for
    // every other tool call.
    const { runPrecisionEngine } =
      await import("@/lib/comply-v2/precision-engine");

    const domain = getString(input, "domain");
    const includeProposals = getBoolean(input, "includeProposals", false);
    const maxItemsRaw = getNumber(input, "maxItems", 25);
    const maxItems = Math.max(1, Math.min(maxItemsRaw ?? 25, 100));

    // Resolve operator profile.
    const operator = await prisma.operatorProfile.findUnique({
      where: { organizationId: userContext.organizationId },
      select: {
        euOperatorCode: true,
        operatorType: true,
        primaryOrbit: true,
        constellationSize: true,
        missionDurationMonths: true,
        plannedLaunchDate: true,
        operatingJurisdictions: true,
        establishment: true,
      },
    });

    const operatorTypeCode =
      operator?.euOperatorCode ?? operator?.operatorType ?? "";
    const jurisdictions = Array.from(
      new Set(
        [
          ...(operator?.operatingJurisdictions ?? []),
          operator?.establishment,
        ].filter((j): j is string => Boolean(j)),
      ),
    );

    if (!operatorTypeCode) {
      return {
        status: "EMPTY",
        message:
          "No OperatorProfile.operatorType found for this organization. Complete the onboarding wizard or set the operator type first.",
        items: [],
        stats: null,
      };
    }
    if (jurisdictions.length === 0) {
      return {
        status: "EMPTY",
        message:
          "No jurisdictions found on OperatorProfile. Set operatingJurisdictions or establishment before generating a roadmap.",
        items: [],
        stats: null,
      };
    }

    const result = await runPrecisionEngine({
      organizationId: userContext.organizationId,
      applicability: {
        operatorType: operatorTypeCode,
        jurisdictions,
        primaryOrbit: operator?.primaryOrbit ?? undefined,
        constellationSize: operator?.constellationSize ?? undefined,
        missionDurationMonths: operator?.missionDurationMonths ?? undefined,
        plannedLaunchDate: operator?.plannedLaunchDate ?? undefined,
      },
      domain,
      includeProposals,
    });

    const trimmedItems = result.items.slice(0, maxItems).map((it) => ({
      id: it.id,
      title: it.title,
      regulation: it.regulationRef,
      domain: it.domain,
      articleRef: it.articleRef,
      priority: it.priority,
      confidence: it.confidence,
      targetDate: it.targetDate?.toISOString() ?? null,
      startDate: it.startDate?.toISOString() ?? null,
      dependsOn: it.dependsOn,
      jurisdictions: it.jurisdictions,
      evidenceRequired: it.evidenceRequired,
      origin: it.origin,
    }));

    return {
      status: result.status,
      message:
        result.status === "SUCCESS"
          ? `Generated ${result.stats.itemsGenerated} compliance items (showing top ${trimmedItems.length}).`
          : result.status === "EMPTY"
            ? "No applicable obligations found for this operator profile. Either the operator is out-of-scope, or the ontology has no obligations seeded for these jurisdictions yet."
            : "Precision engine reported a problem — see warnings.",
      items: trimmedItems,
      stats: result.stats,
      warnings: result.warnings,
      operator: {
        operatorTypeCode,
        jurisdictions,
        primaryOrbit: operator?.primaryOrbit ?? null,
        constellationSize: operator?.constellationSize ?? null,
        plannedLaunchDate: operator?.plannedLaunchDate?.toISOString() ?? null,
      },
    };
  },
};

// ─── Export ───

export { TOOL_HANDLERS };
