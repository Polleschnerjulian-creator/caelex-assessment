/**
 * ASTRA Tool Definitions
 *
 * Defines all tools available to ASTRA in Anthropic's tool_use format.
 * These tools allow ASTRA to query Caelex data and provide compliance analysis.
 */

import type { AstraToolDefinition } from "./types";

// ─── Compliance Tools ───

export const checkComplianceStatus: AstraToolDefinition = {
  name: "check_compliance_status",
  description:
    "Returns the current compliance score and status across all modules for the user's organization. Use this when the user asks about their overall compliance posture or wants a summary of where they stand.",
  input_schema: {
    type: "object",
    properties: {
      module: {
        type: "string",
        description:
          "Optional: Filter to a specific module. Values: 'authorization', 'registration', 'debris', 'cybersecurity', 'insurance', 'nis2', 'environmental', 'supervision'. Omit for all modules.",
        enum: [
          "authorization",
          "registration",
          "debris",
          "cybersecurity",
          "insurance",
          "nis2",
          "environmental",
          "supervision",
        ],
      },
      includeDetails: {
        type: "boolean",
        description:
          "If true, include detailed breakdown of completed vs pending requirements. Default: false",
      },
    },
    required: [],
  },
};

export const getArticleRequirements: AstraToolDefinition = {
  name: "get_article_requirements",
  description:
    "Returns detailed requirements for a specific EU Space Act article, including implementation guidance, applicable operator types, deadlines, and compliance criteria. Use when the user asks about a specific article's obligations.",
  input_schema: {
    type: "object",
    properties: {
      articleNumber: {
        type: "string",
        description:
          "The EU Space Act article number (e.g., '58', '74', '31'). Can include paragraph references (e.g., '58(2)(a)').",
      },
      operatorType: {
        type: "string",
        description:
          "Optional: Filter requirements to a specific operator type.",
        enum: ["SCO", "LO", "LSO", "ISOS", "CAP", "PDP", "TCO"],
      },
    },
    required: ["articleNumber"],
  },
};

export const runGapAnalysis: AstraToolDefinition = {
  name: "run_gap_analysis",
  description:
    "Compares the user's current compliance status against all applicable requirements, identifying gaps and prioritizing them by urgency and impact. Use when the user wants to know what they're missing or how to prioritize their compliance efforts.",
  input_schema: {
    type: "object",
    properties: {
      module: {
        type: "string",
        description:
          "Optional: Focus gap analysis on a specific module. Omit for comprehensive analysis across all modules.",
        enum: [
          "authorization",
          "registration",
          "debris",
          "cybersecurity",
          "insurance",
          "nis2",
          "environmental",
          "supervision",
        ],
      },
      priorityFilter: {
        type: "string",
        description:
          "Optional: Filter to show only gaps of certain priority levels.",
        enum: ["critical", "high", "medium", "low"],
      },
      includeRecommendations: {
        type: "boolean",
        description:
          "If true, include specific recommendations for addressing each gap. Default: true",
      },
    },
    required: [],
  },
};

export const checkCrossRegulationOverlap: AstraToolDefinition = {
  name: "check_cross_regulation_overlap",
  description:
    "Shows which NIS2 and EU Space Act requirements overlap and can be fulfilled with a single implementation effort. Use when the user wants to optimize their compliance work or understand regulation interactions.",
  input_schema: {
    type: "object",
    properties: {
      sourceRegulation: {
        type: "string",
        description: "The primary regulation to analyze overlaps for.",
        enum: ["NIS2", "EU Space Act", "ISO 27001", "ENISA Space"],
      },
      targetRegulation: {
        type: "string",
        description:
          "Optional: The target regulation to compare against. If omitted, shows all overlaps.",
        enum: ["NIS2", "EU Space Act", "ISO 27001", "ENISA Space"],
      },
      includeEffortEstimates: {
        type: "boolean",
        description:
          "If true, include estimated effort savings from combined implementation. Default: true",
      },
    },
    required: ["sourceRegulation"],
  },
};

export const compareJurisdictions: AstraToolDefinition = {
  name: "compare_jurisdictions",
  description:
    "Provides side-by-side comparison of space law requirements across specified European jurisdictions. Use when the user is evaluating where to apply for authorization or understanding jurisdictional differences.",
  input_schema: {
    type: "object",
    properties: {
      jurisdictions: {
        type: "array",
        items: {
          type: "string",
          enum: ["FR", "UK", "DE", "LU", "NL", "BE", "AT", "DK", "IT", "NO"],
        },
        description:
          "List of jurisdiction codes to compare. Minimum 2, maximum 5.",
      },
      comparisonFactors: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "processingTime",
            "insuranceMinimums",
            "fees",
            "languageRequirements",
            "liabilityRegime",
            "favorabilityScore",
          ],
        },
        description:
          "Optional: Specific factors to compare. Omit for full comparison.",
      },
      missionProfile: {
        type: "object",
        properties: {
          orbitType: { type: "string", enum: ["LEO", "MEO", "GEO", "SSO"] },
          satelliteMassKg: { type: "number" },
          missionDurationYears: { type: "number" },
        },
        description:
          "Optional: Mission parameters to tailor the comparison (e.g., light regime eligibility).",
      },
    },
    required: ["jurisdictions"],
  },
};

export const getDeadlineTimeline: AstraToolDefinition = {
  name: "get_deadline_timeline",
  description:
    "Returns all upcoming compliance deadlines for the user's organization with days remaining and dependencies. Use when the user asks about deadlines, timelines, or what's coming up.",
  input_schema: {
    type: "object",
    properties: {
      daysAhead: {
        type: "number",
        description: "Number of days to look ahead. Default: 90. Maximum: 365.",
      },
      module: {
        type: "string",
        description: "Optional: Filter deadlines to a specific module.",
        enum: [
          "authorization",
          "registration",
          "debris",
          "cybersecurity",
          "insurance",
          "nis2",
          "environmental",
          "supervision",
        ],
      },
      includeCompleted: {
        type: "boolean",
        description:
          "If true, include recently completed deadlines for context. Default: false",
      },
    },
    required: [],
  },
};

// ─── Assessment Tools ───

export const getAssessmentResults: AstraToolDefinition = {
  name: "get_assessment_results",
  description:
    "Returns detailed results of a specific compliance assessment (EU Space Act, NIS2, debris, cybersecurity, insurance, etc.). Use when the user asks about their assessment outcomes or specific assessment details.",
  input_schema: {
    type: "object",
    properties: {
      assessmentType: {
        type: "string",
        description: "The type of assessment to retrieve.",
        enum: [
          "eu_space_act",
          "nis2",
          "debris",
          "cybersecurity",
          "insurance",
          "environmental",
          "space_law",
        ],
      },
      includeAnswers: {
        type: "boolean",
        description:
          "If true, include the user's answers to assessment questions. Default: false",
      },
      includeRecommendations: {
        type: "boolean",
        description:
          "If true, include assessment-specific recommendations. Default: true",
      },
    },
    required: ["assessmentType"],
  },
};

export const getOperatorClassification: AstraToolDefinition = {
  name: "get_operator_classification",
  description:
    "Returns the user's EU Space Act operator type classification and explains what it means for their compliance obligations. Use when discussing operator-specific requirements.",
  input_schema: {
    type: "object",
    properties: {
      includeObligations: {
        type: "boolean",
        description:
          "If true, include detailed list of obligations for the operator type. Default: true",
      },
      includeApplicableArticles: {
        type: "boolean",
        description:
          "If true, list all EU Space Act articles applicable to this operator type. Default: false",
      },
    },
    required: [],
  },
};

export const getNis2Classification: AstraToolDefinition = {
  name: "get_nis2_classification",
  description:
    "Returns the user's NIS2 entity classification (essential/important/out-of-scope) and applicable requirements. Use when discussing NIS2 obligations.",
  input_schema: {
    type: "object",
    properties: {
      includeRequirements: {
        type: "boolean",
        description:
          "If true, list all applicable NIS2 Art. 21 requirements. Default: true",
      },
      includeTimelines: {
        type: "boolean",
        description:
          "If true, include implementation and reporting timelines. Default: true",
      },
    },
    required: [],
  },
};

// ─── Document Tools ───

export const listDocuments: AstraToolDefinition = {
  name: "list_documents",
  description:
    "Lists documents in the user's document vault with status, expiry dates, and categorization. Use when the user asks about their documentation or document status.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description: "Optional: Filter to a specific document category.",
        enum: [
          "authorization",
          "insurance",
          "technical",
          "legal",
          "compliance",
          "reports",
        ],
      },
      status: {
        type: "string",
        description: "Optional: Filter by document status.",
        enum: ["valid", "expiring_soon", "expired", "draft", "pending_review"],
      },
      expiringWithinDays: {
        type: "number",
        description:
          "Optional: Show only documents expiring within this many days.",
      },
    },
    required: [],
  },
};

export const checkDocumentCompleteness: AstraToolDefinition = {
  name: "check_document_completeness",
  description:
    "Checks if all required documents exist for a specific compliance module or authorization application. Identifies missing documents.",
  input_schema: {
    type: "object",
    properties: {
      module: {
        type: "string",
        description: "The compliance module or process to check documents for.",
        enum: [
          "authorization_application",
          "registration",
          "debris_mitigation",
          "cybersecurity",
          "insurance",
          "nis2",
          "annual_reporting",
        ],
      },
      jurisdiction: {
        type: "string",
        description:
          "Optional: Jurisdiction-specific document requirements to check.",
        enum: ["FR", "UK", "DE", "LU", "NL", "BE", "AT", "DK", "IT", "NO"],
      },
    },
    required: ["module"],
  },
};

export const generateComplianceReport: AstraToolDefinition = {
  name: "generate_compliance_report",
  description:
    "Triggers generation of a comprehensive compliance report PDF summarizing the user's compliance status across all modules.",
  input_schema: {
    type: "object",
    properties: {
      reportType: {
        type: "string",
        description: "The type of report to generate.",
        enum: [
          "executive_summary",
          "full_compliance",
          "gap_analysis",
          "authorization_status",
          "nis2_status",
        ],
      },
      includeRecommendations: {
        type: "boolean",
        description:
          "Include prioritized recommendations in the report. Default: true",
      },
      language: {
        type: "string",
        description: "Report language.",
        enum: ["en", "de"],
      },
    },
    required: ["reportType"],
  },
};

export const generateAuthorizationApplication: AstraToolDefinition = {
  name: "generate_authorization_application",
  description:
    "Triggers generation of an NCA authorization application document with all required sections and pre-filled data from Caelex.",
  input_schema: {
    type: "object",
    properties: {
      jurisdiction: {
        type: "string",
        description: "Target NCA jurisdiction for the application.",
        enum: ["FR", "UK", "DE", "LU", "NL", "BE", "AT", "DK", "IT", "NO"],
      },
      applicationType: {
        type: "string",
        description: "Type of authorization being requested.",
        enum: ["new", "modification", "renewal", "transfer"],
      },
      includeAnnexes: {
        type: "boolean",
        description:
          "Include technical annexes (debris plan, cybersecurity assessment, etc.). Default: true",
      },
    },
    required: ["jurisdiction", "applicationType"],
  },
};

export const generateDebrisMitigationPlan: AstraToolDefinition = {
  name: "generate_debris_mitigation_plan",
  description:
    "Triggers generation of a debris mitigation plan document compliant with EU Space Act Art. 31-37 and IADC guidelines.",
  input_schema: {
    type: "object",
    properties: {
      format: {
        type: "string",
        description: "Document format/template to use.",
        enum: ["eu_space_act", "iso_24113", "iadc_guidelines", "esa_template"],
      },
      includeCalculations: {
        type: "boolean",
        description:
          "Include orbital lifetime and disposal probability calculations. Default: true",
      },
    },
    required: ["format"],
  },
};

// ─── Knowledge Tools ───

export const searchRegulation: AstraToolDefinition = {
  name: "search_regulation",
  description:
    "Performs semantic search across all regulatory texts (EU Space Act, NIS2, national laws, IADC guidelines) to find relevant provisions. Use when you need to find specific regulatory text.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Search query - can be a topic, keyword, or natural language question.",
      },
      regulations: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "eu_space_act",
            "nis2",
            "national_laws",
            "iadc",
            "iso_24113",
            "itu",
            "itar_ear",
          ],
        },
        description:
          "Optional: Limit search to specific regulations. Omit to search all.",
      },
      maxResults: {
        type: "number",
        description:
          "Maximum number of results to return. Default: 5. Max: 10.",
      },
    },
    required: ["query"],
  },
};

export const getArticleDetail: AstraToolDefinition = {
  name: "get_article_detail",
  description:
    "Returns full text and interpretation of a specific regulatory article with cross-references and implementation guidance.",
  input_schema: {
    type: "object",
    properties: {
      regulation: {
        type: "string",
        description: "The regulation containing the article.",
        enum: [
          "eu_space_act",
          "nis2",
          "fr_los",
          "uk_sia",
          "de_satdsig",
          "iadc",
          "iso_24113",
        ],
      },
      article: {
        type: "string",
        description:
          "Article reference (e.g., '58', '21(2)(a)', 'Guideline 4').",
      },
      includeInterpretation: {
        type: "boolean",
        description:
          "Include ASTRA's interpretation and practical guidance. Default: true",
      },
    },
    required: ["regulation", "article"],
  },
};

export const getCrossReferences: AstraToolDefinition = {
  name: "get_cross_references",
  description:
    "Returns all cross-references and related provisions for a specific article or requirement across different regulations.",
  input_schema: {
    type: "object",
    properties: {
      sourceRegulation: {
        type: "string",
        description: "The source regulation.",
        enum: ["eu_space_act", "nis2", "iso_27001", "enisa_space"],
      },
      sourceArticle: {
        type: "string",
        description: "The article to find cross-references for.",
      },
    },
    required: ["sourceRegulation", "sourceArticle"],
  },
};

export const explainTerm: AstraToolDefinition = {
  name: "explain_term",
  description:
    "Explains a regulatory or space industry term with definition, regulatory context, and related terms. Use when the user asks about terminology.",
  input_schema: {
    type: "object",
    properties: {
      term: {
        type: "string",
        description:
          "The term or abbreviation to explain (e.g., 'SCO', 'NIS2', 'TPL', 'deorbit').",
      },
      includeExamples: {
        type: "boolean",
        description: "Include practical examples. Default: true",
      },
    },
    required: ["term"],
  },
};

// ─── Advisory Tools ───

export const assessRegulatoryImpact: AstraToolDefinition = {
  name: "assess_regulatory_impact",
  description:
    "Given a scenario change (new orbit, new market, new payload, etc.), calculates the impact on the user's compliance obligations. Use for 'what if' scenarios.",
  input_schema: {
    type: "object",
    properties: {
      scenarioType: {
        type: "string",
        description: "Type of change being assessed.",
        enum: [
          "orbit_change",
          "new_market",
          "constellation_expansion",
          "payload_change",
          "ownership_change",
          "jurisdiction_change",
        ],
      },
      scenarioDetails: {
        type: "object",
        description: "Specific details of the scenario.",
        properties: {
          currentState: { type: "string" },
          proposedChange: { type: "string" },
          timeline: { type: "string" },
        },
      },
      includeActionPlan: {
        type: "boolean",
        description:
          "Include recommended actions to address the regulatory impact. Default: true",
      },
    },
    required: ["scenarioType", "scenarioDetails"],
  },
};

export const suggestCompliancePath: AstraToolDefinition = {
  name: "suggest_compliance_path",
  description:
    "Given the user's current status and goals, suggests the optimal compliance path with prioritized steps and timeline.",
  input_schema: {
    type: "object",
    properties: {
      goal: {
        type: "string",
        description: "The user's compliance goal.",
        enum: [
          "full_authorization",
          "nis2_compliance",
          "launch_readiness",
          "market_entry",
          "annual_renewal",
          "constellation_expansion",
        ],
      },
      targetDate: {
        type: "string",
        description: "Target date for achieving the goal (ISO 8601 format).",
      },
      constraints: {
        type: "array",
        items: { type: "string" },
        description:
          "Optional: Any constraints (e.g., 'limited budget', 'no dedicated compliance staff').",
      },
    },
    required: ["goal"],
  },
};

export const estimateComplianceCostTime: AstraToolDefinition = {
  name: "estimate_compliance_cost_time",
  description:
    "Estimates time and typical cost for specific compliance steps based on industry benchmarks.",
  input_schema: {
    type: "object",
    properties: {
      complianceStep: {
        type: "string",
        description: "The compliance step to estimate.",
        enum: [
          "authorization_application",
          "nis2_assessment",
          "debris_assessment",
          "cybersecurity_audit",
          "insurance_procurement",
          "iso_27001_certification",
          "penetration_testing",
        ],
      },
      organizationSize: {
        type: "string",
        description: "Organization size for cost scaling.",
        enum: ["startup", "sme", "large_enterprise"],
      },
      jurisdiction: {
        type: "string",
        description: "Optional: Jurisdiction for region-specific estimates.",
        enum: ["FR", "UK", "DE", "LU", "NL", "BE", "AT", "DK", "IT", "NO"],
      },
    },
    required: ["complianceStep"],
  },
};

// ─── All Tools Export ───

export const ALL_TOOLS: AstraToolDefinition[] = [
  // Compliance Tools
  checkComplianceStatus,
  getArticleRequirements,
  runGapAnalysis,
  checkCrossRegulationOverlap,
  compareJurisdictions,
  getDeadlineTimeline,

  // Assessment Tools
  getAssessmentResults,
  getOperatorClassification,
  getNis2Classification,

  // Document Tools
  listDocuments,
  checkDocumentCompleteness,
  generateComplianceReport,
  generateAuthorizationApplication,
  generateDebrisMitigationPlan,

  // Knowledge Tools
  searchRegulation,
  getArticleDetail,
  getCrossReferences,
  explainTerm,

  // Advisory Tools
  assessRegulatoryImpact,
  suggestCompliancePath,
  estimateComplianceCostTime,
];

// ─── Tool Name Lookup ───

export const TOOL_BY_NAME = ALL_TOOLS.reduce(
  (acc, tool) => {
    acc[tool.name] = tool;
    return acc;
  },
  {} as Record<string, AstraToolDefinition>,
);

// ─── Tool Categories ───

export const TOOL_CATEGORIES = {
  compliance: [
    "check_compliance_status",
    "get_article_requirements",
    "run_gap_analysis",
    "check_cross_regulation_overlap",
    "compare_jurisdictions",
    "get_deadline_timeline",
  ],
  assessment: [
    "get_assessment_results",
    "get_operator_classification",
    "get_nis2_classification",
  ],
  document: [
    "list_documents",
    "check_document_completeness",
    "generate_compliance_report",
    "generate_authorization_application",
    "generate_debris_mitigation_plan",
  ],
  knowledge: [
    "search_regulation",
    "get_article_detail",
    "get_cross_references",
    "explain_term",
  ],
  advisory: [
    "assess_regulatory_impact",
    "suggest_compliance_path",
    "estimate_compliance_cost_time",
  ],
} as const;
