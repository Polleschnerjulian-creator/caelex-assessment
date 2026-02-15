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

    // Execute the appropriate tool handler
    const handler = TOOL_HANDLERS[toolCall.name];
    if (!handler) {
      return {
        toolCallId: toolCall.id,
        success: false,
        error: `Unknown tool: ${toolCall.name}`,
      };
    }

    const result = await handler(toolCall.input, userContext);

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
    const targetModule = input.module as string | undefined;
    const includeDetails = input.includeDetails as boolean | undefined;

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
    const articleNumber = input.articleNumber as string;
    const operatorType = input.operatorType as string | undefined;

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
    const targetModule = input.module as string | undefined;
    const priorityFilter = input.priorityFilter as string | undefined;
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
    const sourceRegulation = input.sourceRegulation as string;
    const targetRegulation = input.targetRegulation as string | undefined;
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
    const jurisdictions = input.jurisdictions as string[];
    const comparisonFactors = input.comparisonFactors as string[] | undefined;

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

      const factors = comparisonFactors || [
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
    const daysAhead = Math.min((input.daysAhead as number) || 90, 365);

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
    const assessmentType = input.assessmentType as string;

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
    const includeApplicableArticles =
      input.includeApplicableArticles as boolean;

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
    const category = input.category as string | undefined;
    const status = input.status as string | undefined;
    const expiringWithinDays = input.expiringWithinDays as number | undefined;

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
    const targetModule = input.module as string;

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
    const reportType = input.reportType as string;
    const language = (input.language as string) || "en";

    // Map report types to document generation types
    const typeMap: Record<string, string> = {
      gap_analysis: "CYBERSECURITY_FRAMEWORK",
      nis2_status: "NIS2_ASSESSMENT",
    };

    const documentType = typeMap[reportType];
    if (documentType) {
      try {
        const { startBackgroundGeneration } =
          await import("./document-generator");
        const documentId = await startBackgroundGeneration({
          userId: userContext.userId,
          organizationId: userContext.organizationId,
          organizationName: userContext.organizationName,
          documentType: documentType as
            | "CYBERSECURITY_FRAMEWORK"
            | "NIS2_ASSESSMENT",
          language,
        });

        return {
          status: "generating",
          documentId,
          reportType,
          language,
          viewUrl: "/dashboard/documents/generate",
          message: `Your ${reportType} report is being generated. You can view it in the Document Studio.`,
          estimatedTime: "30-60 seconds",
        };
      } catch (error) {
        return {
          error: `Failed to start generation: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }

    return {
      status: "generating",
      reportType,
      language,
      viewUrl: "/dashboard/documents/generate",
      message: `Open the Document Studio to generate your ${reportType} report.`,
    };
  },

  generate_authorization_application: async (input, userContext) => {
    const jurisdiction = input.jurisdiction as string;
    const applicationType = input.applicationType as string;

    const jurisdictionProfile = getJurisdictionByCode(jurisdiction);
    if (!jurisdictionProfile) {
      return { error: `Unknown jurisdiction: ${jurisdiction}` };
    }

    try {
      const { startBackgroundGeneration } =
        await import("./document-generator");
      const documentId = await startBackgroundGeneration({
        userId: userContext.userId,
        organizationId: userContext.organizationId,
        organizationName: userContext.organizationName,
        documentType: "AUTHORIZATION_APPLICATION",
      });

      return {
        status: "generating",
        documentId,
        jurisdiction,
        jurisdictionName: jurisdictionProfile.countryName,
        ncaName: jurisdictionProfile.ncaName,
        applicationType,
        viewUrl: "/dashboard/documents/generate",
        message: `Authorization application for ${jurisdictionProfile.ncaName} is being generated. View it in the Document Studio.`,
        estimatedTime: "30-60 seconds",
        notes: [
          `Language requirements: ${jurisdictionProfile.languageRequirements.join(", ")}`,
          `Processing time: ${jurisdictionProfile.processingTimeDays.standard} days`,
        ],
      };
    } catch (error) {
      return {
        error: `Failed to start generation: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },

  generate_debris_mitigation_plan: async (input, userContext) => {
    try {
      const { startBackgroundGeneration } =
        await import("./document-generator");
      const documentId = await startBackgroundGeneration({
        userId: userContext.userId,
        organizationId: userContext.organizationId,
        organizationName: userContext.organizationName,
        documentType: "DEBRIS_MITIGATION_PLAN",
      });

      return {
        status: "generating",
        documentId,
        format: input.format,
        viewUrl: "/dashboard/documents/generate",
        message: `Your debris mitigation plan is being generated. View it in the Document Studio.`,
        estimatedTime: "30-60 seconds",
      };
    } catch (error) {
      return {
        error: `Failed to start generation: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },

  generate_cybersecurity_framework: async (input, userContext) => {
    try {
      const { startBackgroundGeneration } =
        await import("./document-generator");
      const documentId = await startBackgroundGeneration({
        userId: userContext.userId,
        organizationId: userContext.organizationId,
        organizationName: userContext.organizationName,
        documentType: "CYBERSECURITY_FRAMEWORK",
        language: (input.language as string) || "en",
      });

      return {
        status: "generating",
        documentId,
        viewUrl: "/dashboard/documents/generate",
        message:
          "Your cybersecurity framework document is being generated. View it in the Document Studio.",
        estimatedTime: "30-60 seconds",
      };
    } catch (error) {
      return {
        error: `Failed to start generation: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },

  generate_environmental_report: async (input, userContext) => {
    try {
      const { startBackgroundGeneration } =
        await import("./document-generator");
      const documentId = await startBackgroundGeneration({
        userId: userContext.userId,
        organizationId: userContext.organizationId,
        organizationName: userContext.organizationName,
        documentType: "ENVIRONMENTAL_FOOTPRINT",
        language: (input.language as string) || "en",
      });

      return {
        status: "generating",
        documentId,
        viewUrl: "/dashboard/documents/generate",
        message:
          "Your environmental footprint declaration is being generated. View it in the Document Studio.",
        estimatedTime: "30-60 seconds",
      };
    } catch (error) {
      return {
        error: `Failed to start generation: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },

  generate_insurance_report: async (input, userContext) => {
    try {
      const { startBackgroundGeneration } =
        await import("./document-generator");
      const documentId = await startBackgroundGeneration({
        userId: userContext.userId,
        organizationId: userContext.organizationId,
        organizationName: userContext.organizationName,
        documentType: "INSURANCE_COMPLIANCE",
        language: (input.language as string) || "en",
      });

      return {
        status: "generating",
        documentId,
        viewUrl: "/dashboard/documents/generate",
        message:
          "Your insurance compliance report is being generated. View it in the Document Studio.",
        estimatedTime: "30-60 seconds",
      };
    } catch (error) {
      return {
        error: `Failed to start generation: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },

  generate_nis2_report: async (input, userContext) => {
    try {
      const { startBackgroundGeneration } =
        await import("./document-generator");
      const documentId = await startBackgroundGeneration({
        userId: userContext.userId,
        organizationId: userContext.organizationId,
        organizationName: userContext.organizationName,
        documentType: "NIS2_ASSESSMENT",
        language: (input.language as string) || "en",
      });

      return {
        status: "generating",
        documentId,
        viewUrl: "/dashboard/documents/generate",
        message:
          "Your NIS2 compliance assessment is being generated. View it in the Document Studio.",
        estimatedTime: "30-60 seconds",
      };
    } catch (error) {
      return {
        error: `Failed to start generation: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },

  // ─── Knowledge Tools ───

  search_regulation: async (input) => {
    const query = input.query as string;
    const maxResults = Math.min((input.maxResults as number) || 5, 10);

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
    const regulation = input.regulation as string;
    const article = input.article as string;

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
    const sourceRegulation = input.sourceRegulation as string;
    const sourceArticle = input.sourceArticle as string;

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
    const term = input.term as string;
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
    const scenarioType = input.scenarioType as string;
    const scenarioDetails = input.scenarioDetails as Record<string, string>;

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
    const goal = input.goal as string;
    const targetDate = input.targetDate as string | undefined;

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
    const complianceStep = input.complianceStep as string;
    const organizationSize = (input.organizationSize as string) || "sme";

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
    const ncaAuthority = input.ncaAuthority as string | undefined;
    const status = input.status as string | undefined;
    const activeOnly = input.activeOnly as boolean | undefined;

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
        reportTitle: s.report.title,
        correspondenceCount: s._count.correspondence,
        followUpRequired: s.followUpRequired,
        followUpDeadline: s.followUpDeadline?.toISOString() || null,
        slaDeadline: s.slaDeadline?.toISOString() || null,
      })),
    };
  },

  get_submission_detail: async (input, userContext) => {
    const submissionId = input.submissionId as string | undefined;
    const ncaAuthority = input.ncaAuthority as string | undefined;

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
        reportTitle: submission.report.title,
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
    const ncaAuthority = input.ncaAuthority as string;

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
    const daysAhead = (input.daysAhead as number) || 30;
    const now = new Date();
    const futureDate = new Date(
      now.getTime() + daysAhead * 24 * 60 * 60 * 1000,
    );

    const terminalStatuses = ["APPROVED", "REJECTED", "WITHDRAWN"];

    // Query submissions with upcoming deadlines
    const submissions = await prisma.nCASubmission.findMany({
      where: {
        userId: userContext.userId,
        status: { notIn: terminalStatuses as never[] },
        OR: [
          { followUpDeadline: { gte: now, lte: futureDate } },
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
    });

    // Also check for overdue items
    const overdueSubmissions = await prisma.nCASubmission.findMany({
      where: {
        userId: userContext.userId,
        status: { notIn: terminalStatuses as never[] },
        followUpRequired: true,
        followUpDeadline: { lt: now },
      },
      select: {
        id: true,
        ncaAuthority: true,
        ncaAuthorityName: true,
        followUpDeadline: true,
      },
    });

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
};

// ─── Export ───

export { TOOL_HANDLERS };
