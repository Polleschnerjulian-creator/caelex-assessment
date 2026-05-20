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

export const generateCybersecurityFramework: AstraToolDefinition = {
  name: "generate_cybersecurity_framework",
  description:
    "Triggers generation of a comprehensive cybersecurity framework document compliant with EU Space Act Art. 27-30 and aligned with NIST CSF/ISO 27001.",
  input_schema: {
    type: "object",
    properties: {
      language: {
        type: "string",
        description: "Document language.",
        enum: ["en", "de", "fr", "es"],
      },
    },
    required: [],
  },
};

export const generateEnvironmentalReport: AstraToolDefinition = {
  name: "generate_environmental_report",
  description:
    "Triggers generation of an Environmental Footprint Declaration (EFD) per EU Space Act Art. 44-46 with lifecycle assessment data.",
  input_schema: {
    type: "object",
    properties: {
      language: {
        type: "string",
        description: "Document language.",
        enum: ["en", "de", "fr", "es"],
      },
    },
    required: [],
  },
};

export const generateInsuranceReport: AstraToolDefinition = {
  name: "generate_insurance_report",
  description:
    "Triggers generation of an insurance compliance report analyzing TPL requirements and coverage status per EU Space Act Art. 47-50.",
  input_schema: {
    type: "object",
    properties: {
      language: {
        type: "string",
        description: "Document language.",
        enum: ["en", "de", "fr", "es"],
      },
    },
    required: [],
  },
};

export const generateNIS2Report: AstraToolDefinition = {
  name: "generate_nis2_report",
  description:
    "Triggers generation of a NIS2 compliance assessment report covering entity classification, requirement status, and gap analysis per NIS2 Directive.",
  input_schema: {
    type: "object",
    properties: {
      language: {
        type: "string",
        description: "Document language.",
        enum: ["en", "de", "fr", "es"],
      },
    },
    required: [],
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

// ─── CRA Tools ───

export const getCRAAssessmentStatus: AstraToolDefinition = {
  name: "get_cra_assessment_status",
  description:
    "Get the current CRA compliance status for one or all product assessments. Returns classification, maturity score, requirement completion, and NIS2 overlap for each product.",
  input_schema: {
    type: "object",
    properties: {
      assessmentId: {
        type: "string",
        description:
          "Specific CRA assessment ID. If omitted, returns all assessments for the organization.",
      },
    },
    required: [],
  },
};

export const getCRAProductClassification: AstraToolDefinition = {
  name: "get_cra_product_classification",
  description:
    "Classify a space product under the CRA. Accepts either a product type ID from the taxonomy (e.g., 'obc', 'sdr', 'star_tracker') or rule-engine parameters for custom products. Returns classification (Default/Class I/Class II), conformity route, and full reasoning chain.",
  input_schema: {
    type: "object",
    properties: {
      productTypeId: {
        type: "string",
        description:
          "Space product type ID from taxonomy (e.g., 'obc', 'aocs_flight_sw', 'sdr', 'star_tracker'). Use this for known product types.",
      },
      hasNetworkFunction: {
        type: "boolean",
        description:
          "Product has network connectivity (SpaceWire, CAN, Ethernet, RF)",
      },
      processesAuthData: {
        type: "boolean",
        description: "Product processes authentication/authorization data",
      },
      usedInCriticalInfra: {
        type: "boolean",
        description: "Product is deployed in critical infrastructure",
      },
      performsCryptoOps: {
        type: "boolean",
        description: "Product performs cryptographic operations",
      },
      controlsPhysicalSystem: {
        type: "boolean",
        description: "Product controls physical systems (actuators, thrusters)",
      },
      isSafetyCritical: {
        type: "boolean",
        description: "Product is safety-critical (ECSS classification)",
      },
    },
    required: [],
  },
};

export const getCRARequirementGaps: AstraToolDefinition = {
  name: "get_cra_requirement_gaps",
  description:
    "Analyze CRA compliance gaps for a product assessment. Returns non-compliant and not-assessed requirements grouped by category, with space-specific guidance for each gap.",
  input_schema: {
    type: "object",
    properties: {
      assessmentId: {
        type: "string",
        description: "CRA assessment ID to analyze.",
      },
    },
    required: ["assessmentId"],
  },
};

export const getCRANIS2Overlap: AstraToolDefinition = {
  name: "get_cra_nis2_overlap",
  description:
    "Show the overlap between CRA and NIS2 requirements for a product. Returns which CRA requirements are partially fulfilled by existing NIS2 compliance, with estimated time savings.",
  input_schema: {
    type: "object",
    properties: {
      assessmentId: {
        type: "string",
        description:
          "CRA assessment ID. If omitted, analyzes the most recent assessment.",
      },
    },
    required: [],
  },
};

export const getCRASBOMAnalysis: AstraToolDefinition = {
  name: "get_cra_sbom_analysis",
  description:
    "Get SBOM analysis results for a CRA product assessment. Returns component count, license breakdown, vulnerability tracking status, and CRA requirement compliance (cra-038, cra-039, cra-040).",
  input_schema: {
    type: "object",
    properties: {
      assessmentId: {
        type: "string",
        description: "CRA assessment ID with SBOM data.",
      },
    },
    required: ["assessmentId"],
  },
};

// ─── All Tools Export ───

// ─── NCA Portal Tools ───

export const getNcaSubmissions: AstraToolDefinition = {
  name: "get_nca_submissions",
  description:
    "Returns the user's NCA submissions with optional filtering by authority, status, or date range. Use when the user asks about submission status, pending submissions, or NCA communication history.",
  input_schema: {
    type: "object",
    properties: {
      ncaAuthority: {
        type: "string",
        description:
          "Optional: Filter by NCA authority code (e.g., 'FR_CNES', 'DE_BMWK'). Omit for all authorities.",
      },
      status: {
        type: "string",
        description:
          "Optional: Filter by status. Values: 'DRAFT', 'SUBMITTED', 'RECEIVED', 'UNDER_REVIEW', 'INFORMATION_REQUESTED', 'ACKNOWLEDGED', 'APPROVED', 'REJECTED', 'WITHDRAWN'.",
        enum: [
          "DRAFT",
          "SUBMITTED",
          "RECEIVED",
          "UNDER_REVIEW",
          "INFORMATION_REQUESTED",
          "ACKNOWLEDGED",
          "APPROVED",
          "REJECTED",
          "WITHDRAWN",
        ],
      },
      activeOnly: {
        type: "boolean",
        description:
          "If true, only return non-terminal submissions (excludes APPROVED, REJECTED, WITHDRAWN). Default: false.",
      },
    },
    required: [],
  },
};

export const getSubmissionDetail: AstraToolDefinition = {
  name: "get_submission_detail",
  description:
    "Returns detailed information about a specific NCA submission including its full timeline, correspondence history, and linked package. Use when the user asks about a specific submission or wants details about a particular NCA interaction.",
  input_schema: {
    type: "object",
    properties: {
      submissionId: {
        type: "string",
        description:
          "The ID of the submission to retrieve. If not provided, will try to match by NCA authority.",
      },
      ncaAuthority: {
        type: "string",
        description:
          "Optional: NCA authority code to find the most recent submission for that authority.",
      },
    },
    required: [],
  },
};

export const checkPackageCompleteness: AstraToolDefinition = {
  name: "check_package_completeness",
  description:
    "Analyzes document readiness for submission to a specific NCA. Returns which required documents are available, which are missing, and a completeness percentage. Use when the user asks if they're ready to submit to an NCA.",
  input_schema: {
    type: "object",
    properties: {
      ncaAuthority: {
        type: "string",
        description:
          "The NCA authority to check package completeness for (e.g., 'FR_CNES', 'DE_BMWK').",
      },
    },
    required: ["ncaAuthority"],
  },
};

export const getNcaDeadlines: AstraToolDefinition = {
  name: "get_nca_deadlines",
  description:
    "Returns upcoming deadlines related to NCA submissions including follow-up deadlines, SLA deadlines, and response timeouts. Use when the user asks about upcoming deadlines or what requires their attention.",
  input_schema: {
    type: "object",
    properties: {
      daysAhead: {
        type: "number",
        description: "Number of days to look ahead for deadlines. Default: 30.",
      },
    },
    required: [],
  },
};

// ─── Incident Tools ───

export const reportIncident: AstraToolDefinition = {
  name: "report_incident",
  description:
    "Create a new incident via the Incident Autopilot system. Automatically classifies severity, creates NIS2 Art. 23 reporting phases with deadlines, and notifies the organization. Use when the user reports a cybersecurity incident, spacecraft anomaly, conjunction event, or other operational incident.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description: "Incident category",
        enum: [
          "loss_of_contact",
          "debris_generation",
          "cyber_incident",
          "spacecraft_anomaly",
          "conjunction_event",
          "regulatory_breach",
          "other",
        ],
      },
      title: {
        type: "string",
        description: "Short title describing the incident",
      },
      description: {
        type: "string",
        description: "Detailed description of the incident",
      },
      detectedBy: {
        type: "string",
        description:
          "Who or what detected the incident (e.g. operator name, monitoring system)",
      },
      detectedAt: {
        type: "string",
        description:
          "ISO 8601 timestamp of detection. Defaults to now if not provided.",
      },
      affectedAssets: {
        type: "array",
        description: "List of affected spacecraft or assets",
        items: {
          type: "object",
          properties: {
            assetName: { type: "string", description: "Asset/spacecraft name" },
            cosparId: { type: "string", description: "COSPAR ID if available" },
            noradId: { type: "string", description: "NORAD ID if available" },
          },
          required: ["assetName"],
        },
      },
    },
    required: ["category", "title", "description", "detectedBy"],
  },
};

export const getIncidentStatus: AstraToolDefinition = {
  name: "get_incident_status",
  description:
    "Get the full status of a specific incident including workflow state, NIS2 reporting phase countdowns, and available actions. Use when the user asks about an incident's current state or deadlines.",
  input_schema: {
    type: "object",
    properties: {
      incidentId: {
        type: "string",
        description: "The incident ID (cuid)",
      },
      incidentNumber: {
        type: "string",
        description:
          "The incident number (e.g. INC-2026-001). Use this if the user references by number.",
      },
    },
    required: [],
  },
};

export const listActiveIncidentsTool: AstraToolDefinition = {
  name: "list_active_incidents",
  description:
    "List all active (non-closed) incidents with their NIS2 deadline summaries. Use when the user asks about current incidents, what needs attention, or wants an incident overview.",
  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description: "Filter by incident category",
        enum: [
          "loss_of_contact",
          "debris_generation",
          "cyber_incident",
          "spacecraft_anomaly",
          "conjunction_event",
          "regulatory_breach",
          "other",
        ],
      },
      severity: {
        type: "string",
        description: "Filter by severity level",
        enum: ["critical", "high", "medium", "low"],
      },
      limit: {
        type: "number",
        description: "Maximum number of incidents to return. Default: 20.",
      },
    },
    required: [],
  },
};

export const draftNcaNotification: AstraToolDefinition = {
  name: "draft_nca_notification",
  description:
    "Generate an NCA notification draft for a specific NIS2 reporting phase. Creates template-based notification text ready for NCA submission. Use when the user wants to prepare or review a notification draft.",
  input_schema: {
    type: "object",
    properties: {
      incidentId: {
        type: "string",
        description: "The incident ID",
      },
      phase: {
        type: "string",
        description: "The NIS2 reporting phase to draft",
        enum: [
          "early_warning",
          "notification",
          "intermediate_report",
          "final_report",
        ],
      },
    },
    required: ["incidentId", "phase"],
  },
};

export const advanceIncidentWorkflowTool: AstraToolDefinition = {
  name: "advance_incident_workflow",
  description:
    "Advance an incident's workflow to the next state (e.g. triage → investigate → mitigate → resolve → close). Use when the user wants to progress an incident through its lifecycle.",
  input_schema: {
    type: "object",
    properties: {
      incidentId: {
        type: "string",
        description: "The incident ID",
      },
      event: {
        type: "string",
        description: "The workflow event to trigger",
        enum: [
          "triage",
          "investigate",
          "mitigate",
          "resolve",
          "close",
          "reopen",
        ],
      },
      notes: {
        type: "string",
        description: "Optional notes about this workflow transition",
      },
    },
    required: ["incidentId", "event"],
  },
};

// ─── Digital Twin Tools ───

export const queryComplianceTwin: AstraToolDefinition = {
  name: "query_compliance_twin",
  description:
    "Returns the Compliance Digital Twin state — overall score, maturity level, evidence coverage, deadline health, financial risk exposure, and velocity. Use when the user asks about their compliance posture, where they stand, or wants a comprehensive summary.",
  input_schema: {
    type: "object",
    properties: {
      focusArea: {
        type: "string",
        description:
          "Optional: Focus on a specific area. Values: 'score', 'evidence', 'deadlines', 'risk', 'velocity', 'modules'. Omit for full twin state.",
        enum: ["score", "evidence", "deadlines", "risk", "velocity", "modules"],
      },
    },
    required: [],
  },
};

export const runWhatifScenario: AstraToolDefinition = {
  name: "run_whatif_scenario",
  description:
    "Runs a what-if compliance simulation. Supports 4 scenario types: adding a jurisdiction, changing operator type, adding satellites to fleet, or expanding operations. Returns projected score, delta, new requirements, and financial impact.",
  input_schema: {
    type: "object",
    properties: {
      scenarioType: {
        type: "string",
        description: "The type of scenario to simulate.",
        enum: [
          "add_jurisdiction",
          "change_operator_type",
          "add_satellites",
          "expand_operations",
        ],
      },
      parameters: {
        type: "object",
        description:
          "Scenario-specific parameters. For add_jurisdiction: { jurisdictionCode: 'IT' }. For change_operator_type: { newOperatorType: 'ISOS', currentOperatorType: 'SCO' }. For add_satellites: { additionalSatellites: 10, currentFleetSize: 5 }. For expand_operations: { newMemberStates: 3, groundInfra: true, satcom: false }.",
      },
    },
    required: ["scenarioType", "parameters"],
  },
};

export const getEvidenceGaps: AstraToolDefinition = {
  name: "get_evidence_gaps",
  description:
    "Returns a prioritized list of compliance evidence gaps — requirements that are missing evidence, have expired evidence, or are non-compliant. Use when the user wants to know what evidence they need or what's missing.",
  input_schema: {
    type: "object",
    properties: {
      framework: {
        type: "string",
        description: "Optional: Filter to a specific framework.",
        enum: ["debris", "cybersecurity", "nis2"],
      },
      onlyCritical: {
        type: "boolean",
        description:
          "If true, only return critical and high priority gaps. Default: false.",
      },
    },
    required: [],
  },
};

// ─── Ontology Tools ───

export const queryOntology: AstraToolDefinition = {
  name: "query_ontology",
  description:
    "Query the regulatory knowledge graph for deterministic compliance answers. Capabilities: find obligations for an operator (obligations), detect cross-jurisdictional conflicts (conflicts), identify evidence gaps (evidence_gaps), explore the graph around a node (subgraph), get node details (node_detail), analyze regulatory change impact (impact), search nodes by text (search), compare jurisdictions side-by-side (compare_jurisdictions), get graph statistics (stats).",
  input_schema: {
    type: "object",
    properties: {
      query_type: {
        type: "string",
        enum: [
          "obligations",
          "conflicts",
          "evidence_gaps",
          "subgraph",
          "node_detail",
          "impact",
          "search",
          "compare_jurisdictions",
          "stats",
        ],
        description: "Type of graph query to execute",
      },
      operator_type: {
        type: "string",
        enum: ["SCO", "LO", "LSO", "ISOS", "CAP", "PDP", "TCO"],
        description:
          "Operator type for obligation/conflict/evidence queries. Required for obligations, conflicts, evidence_gaps.",
      },
      jurisdictions: {
        type: "array",
        items: { type: "string" },
        description:
          "Jurisdiction codes (FR, DE, GB, NL, BE, LU, AT, DK, IT, NO). For obligation/conflict queries.",
      },
      domain: {
        type: "string",
        enum: [
          "debris",
          "cybersecurity",
          "spectrum",
          "export_control",
          "insurance",
          "environmental",
          "authorization",
          "registration",
          "supervision",
        ],
        description: "Filter by compliance domain. Optional.",
      },
      include_proposals: {
        type: "boolean",
        description:
          "Include EU Space Act proposal obligations (confidence < 1.0). Default: false — only enacted law.",
      },
      node_code: {
        type: "string",
        description:
          "Node code for subgraph/node_detail queries (e.g., 'IADC-5.3.2', 'FR', 'NIS2')",
      },
      depth: {
        type: "number",
        description: "Subgraph traversal depth (1-3). Default: 1.",
      },
      change_type: {
        type: "string",
        enum: ["amended", "repealed", "new"],
        description:
          "Type of regulatory change for impact analysis. Required for 'impact' query_type.",
      },
      search_query: {
        type: "string",
        description:
          "Free-text search query for 'search' query_type. Searches node codes and labels.",
      },
    },
    required: ["query_type"],
  },
};

// ─── Audit Tools ───

export const auditDocument: AstraToolDefinition = {
  name: "audit_document",
  description:
    "Audits a generated document for regulation coverage, threshold consistency, and section completeness. Returns a structured audit report with an overall score and specific recommendations. Use when the user asks to audit, review, or check a compliance document.",
  input_schema: {
    type: "object",
    properties: {
      documentId: {
        type: "string",
        description:
          "The ID of the NCA document to audit. Use list_documents or get_submission_detail to find document IDs.",
      },
    },
    required: ["documentId"],
  },
};

// ─── Trade Counterparty Screening Tools (Wave A Sprint A7) ───

export const screenTradeParty: AstraToolDefinition = {
  name: "screen_trade_party",
  description:
    "Runs sanctions screening on a TradeParty (counterparty) against OFAC SDN, BIS Entity List, and DDTC Debarred Parties using Jaro-Winkler fuzzy matching. ALSO runs 50%-rule cascade analysis: traverses the beneficial-ownership graph upward and aggregates effective ownership from sanctioned ancestors per 31 CFR § 510 (sum-of-paths, capped at depth 5). Persists a TradeScreeningResult with audit-grade snapshot hash. Returns: decision, hits, top-5 cascade ancestors with effective % ownership, and whether the cascade triggered (≥50% sanctioned ownership = automatic legal sanction even if name doesn't match any list). Use when the user asks 'screen ICEYE Polska', 'check counterparty X against sanctions', or 'is this party indirectly sanctioned via its owners'. Requires an existing TradeParty — use lookup_trade_party first if you only have a name.",
  input_schema: {
    type: "object",
    properties: {
      partyId: {
        type: "string",
        description:
          "ID of an existing TradeParty in the user's organization. Use lookup_trade_party to find party IDs by name.",
      },
    },
    required: ["partyId"],
  },
};

export const lookupTradeParty: AstraToolDefinition = {
  name: "lookup_trade_party",
  description:
    "Looks up TradeParty records (counterparties) in the user's organization by name fragment or country code. Returns matching parties with their id, legalName, country, status, and current screeningStatus. Use this to find the partyId before calling screen_trade_party, or when the user asks 'do we have a counterparty called X?', 'show me all our parties in country Y', or 'which counterparties have potential sanctions matches?'.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Optional name fragment to search for (case-insensitive, partial match). E.g. 'iceye' matches 'ICEYE Polska sp. z o.o.'.",
      },
      countryCode: {
        type: "string",
        description:
          "Optional ISO 3166-1 alpha-2 country code (uppercase) to filter by. E.g. 'DE', 'US', 'CN'.",
      },
      screeningStatus: {
        type: "string",
        description:
          "Optional filter by current screening status. Useful for finding parties that need triage.",
        enum: [
          "NOT_SCREENED",
          "CLEAR",
          "POTENTIAL_MATCH",
          "CONFIRMED_HIT",
          "STALE",
        ],
      },
      limit: {
        type: "number",
        description: "Max number of results to return (default 10, max 50).",
      },
    },
    required: [],
  },
};

// ─── Trade Classification Tools (Sprint B4) ───

export const classifyTradeItem: AstraToolDefinition = {
  name: "classify_trade_item",
  description:
    "Runs the Caelex Property-Trigger Engine to suggest multi-jurisdiction export-control classifications (EU Annex I ECCN, US CCL ECCN, USML, MTCR, DE Anlage AL) for a trade item. Accepts either a tradeItemId (to look up an existing item) or raw item signals. Returns triggered classification rules with suggested codes, confidence tiers, ITAR/MTCR Cat. I flags, and per-rule advisory notes. Use when the user asks to classify an item, check what ECCN or USML category applies, or wants to know if an item is ITAR-controlled.",
  input_schema: {
    type: "object",
    properties: {
      tradeItemId: {
        type: "string",
        description:
          "Optional: ID of an existing TradeItem to classify. If provided, the item's properties are fetched from the database and used as signals.",
      },
      apertureMeters: {
        type: "number",
        description:
          "Optional: Optical aperture in metres (for EO/optical payloads). Threshold: ≥ 0.50 m → USML XV(a)(7)(i). Required for optical sensor classification.",
      },
      rangeKm: {
        type: "number",
        description:
          "Optional: Maximum system range in km. Threshold: ≥ 300 km triggers MTCR analysis. Required for launch vehicle / propulsion classification.",
      },
      payloadKg: {
        type: "number",
        description:
          "Optional: Maximum payload capacity in kg. Threshold: ≥ 500 kg combined with range ≥ 300 km → MTCR Cat. I. Required for launch vehicle classification.",
      },
      isRadHardened: {
        type: "boolean",
        description:
          "Optional: true if the item is radiation-hardened (designed/rated for TID ≥ 5×10⁴ rad(Si)). Triggers 3A001.a.1 and 9A515.d analysis.",
      },
      isMilSpec: {
        type: "boolean",
        description:
          "Optional: true if the item is designed to military specifications. Triggers spacecraft bus USML XV(a)(1) analysis.",
      },
      isAntiJam: {
        type: "boolean",
        description:
          "Optional: true if the item has anti-jamming or anti-spoofing capabilities. Triggers USML XII(d) and XI(c)(2) analysis.",
      },
      description: {
        type: "string",
        description:
          "Optional: Free-text description of the item. Used for keyword-based low-confidence heuristic classification (Hall thruster, SAR, launch vehicle keywords).",
      },
    },
    required: [],
  },
};

export const lookupClassificationCode: AstraToolDefinition = {
  name: "lookup_classification_code",
  description:
    "Looks up details for a specific export-control classification code in one or more jurisdictions. Returns the entry title, description, control reasons, MTCR category, source URL, and all related codes from other jurisdictions via the cross-reference topic. Use when the user asks 'what is ECCN 9A515.a?', 'what does USML XV cover?', or 'show me all codes related to Hall thrusters'.",
  input_schema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description:
          "The classification code to look up. Examples: '9A515.a' (US CCL), 'XV(a)(7)(i)' (USML), '9A004' (EU Annex I or US CCL), '1.A.1' (MTCR).",
      },
      jurisdiction: {
        type: "string",
        description:
          "Optional: Jurisdiction to search in. Values: 'EU_ANNEX_I', 'US_CCL', 'USML', 'MTCR_ANNEX', 'DE_ANLAGE_AL'. If omitted, searches all jurisdictions.",
        enum: ["EU_ANNEX_I", "US_CCL", "USML", "MTCR_ANNEX", "DE_ANLAGE_AL"],
      },
      includeRelated: {
        type: "boolean",
        description:
          "If true, include related codes from all jurisdictions that share the same cross-reference topic. Default: true.",
      },
    },
    required: ["code"],
  },
};

// ─── Mission Domain Tools (Sprint D — first-class Mission entity) ───

export const listMissions: AstraToolDefinition = {
  name: "list_missions",
  description:
    "Returns the user's mission portfolio — all Mission rows in their primary organization, with status, programPhase (NASA Phase A-F), missionType, primary end-user, primary spacecraft (if any), and phase-roadmap progress. Use when the user asks 'show me my missions', 'what missions are active', 'how is the ICEYE constellation doing', or needs a high-level overview before drilling into a specific mission. Triggers a lazy backfill — orphan Spacecraft without a Mission get a default 1:1 Mission auto-created on this call.",
  input_schema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description:
          "Optional filter by mission status. PLANNED = concept/early planning; ACTIVE = currently operating; PAUSED = on hold (anomaly investigation); COMPLETED = nominal end of mission; CANCELLED = ended early.",
        enum: ["PLANNED", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"],
      },
      missionType: {
        type: "string",
        description:
          "Optional filter by mission type. EARTH_OBSERVATION (SAR / optical / hyperspectral), COMMUNICATIONS, NAVIGATION (PNT), SCIENCE, IOD (in-orbit demonstration), TECH_DEMO, HUMAN_SPACEFLIGHT, OOS_ADR (on-orbit servicing / debris removal), LAUNCH (launchers), OTHER.",
        enum: [
          "EARTH_OBSERVATION",
          "COMMUNICATIONS",
          "NAVIGATION",
          "SCIENCE",
          "IOD",
          "TECH_DEMO",
          "HUMAN_SPACEFLIGHT",
          "OOS_ADR",
          "LAUNCH",
          "OTHER",
        ],
      },
    },
    required: [],
  },
};

export const getMissionDetailTool: AstraToolDefinition = {
  name: "get_mission_detail",
  description:
    "Returns the full detail of a single Mission: name, reference, description, status, programPhase, missionType, primary end-user + country, lifecycle dates, authority references (BAFA/FCC/BNetzA permits), all assigned and historical spacecraft, all phases with milestones, plus cross-domain links (related authorization workflows, documents, incidents, trade operations). Use after list_missions to drill into a specific mission, or when the user asks 'tell me about mission X', 'what's the status of ICEYE-FY26', or 'show me the full picture for this mission'.",
  input_schema: {
    type: "object",
    properties: {
      missionId: {
        type: "string",
        description:
          "ID of an existing Mission in the user's organization. Use list_missions first to find the missionId.",
      },
    },
    required: ["missionId"],
  },
};

export const getMissionTimeline: AstraToolDefinition = {
  name: "get_mission_timeline",
  description:
    "Returns the regulatory phase roadmap for a single Mission — every MissionPhase with its status, progress %, milestones (regulatory + critical), and date window. Use when the user asks about timing, milestones, what's overdue, or the next regulatory checkpoint for a specific mission. Lighter-weight than get_mission_detail (no spacecraft / cross-domain data) — prefer this when only the timeline matters.",
  input_schema: {
    type: "object",
    properties: {
      missionId: {
        type: "string",
        description: "ID of an existing Mission in the user's organization.",
      },
    },
    required: ["missionId"],
  },
};

// ─── Time-Travel (Sprint C2 — partial) ───

export const snapshotAtDate: AstraToolDefinition = {
  name: "snapshot_at_date",
  description:
    "Reconstruct the state of the operator's compliance posture as it WOULD have appeared on a given date. Reads append-only chains (DerivationTrace + AstraProposal + AuditLog) and returns a snapshot view. Useful for auditors asking 'prove your state on 2027-03-15' or for time-travel debugging.",
  input_schema: {
    type: "object",
    properties: {
      asOf: {
        type: "string",
        description:
          "ISO-8601 date or timestamp. Defaults to now. Future dates are clamped to now.",
      },
      scope: {
        type: "string",
        enum: ["operator-profile", "proposals", "audit-chain", "all"],
        description: "Which slice of state to snapshot. Default: 'all'.",
      },
      auditLimit: {
        type: "number",
        description:
          "Max audit entries to return when scope includes audit-chain. Default 50, max 500.",
      },
    },
    required: [],
  },
};

// ─── AI Blocks (Sprint B3) ───

export const createAiBlock: AstraToolDefinition = {
  name: "create_ai_block",
  description:
    "Create a durable, re-runnable prompt block attached to an owner (compliance-item, module, organization, or spacecraft). Used to pin recurring questions like 'Re-generate gap analysis whenever evidence changes' or 'Summarize regulator correspondence weekly'.",
  input_schema: {
    type: "object",
    properties: {
      ownerType: {
        type: "string",
        enum: ["compliance-item", "module", "organization", "spacecraft"],
      },
      ownerId: { type: "string", description: "ID of the owner entity." },
      name: { type: "string", description: "Short label for the block." },
      description: { type: "string" },
      prompt: { type: "string", description: "The LLM prompt to run." },
      triggerType: {
        type: "string",
        enum: ["manual", "evidence-change", "schedule", "regulation-update"],
      },
      schedule: {
        type: "string",
        description: "cron expression (only if triggerType='schedule').",
      },
      regulationRef: {
        type: "string",
        description:
          "Regulation namespace (e.g. 'EU_SPACE_ACT', 'NIS2') to watch when triggerType='regulation-update'.",
      },
      isPinned: { type: "boolean" },
    },
    required: ["ownerType", "ownerId", "name", "prompt", "triggerType"],
  },
};

export const listAiBlocks: AstraToolDefinition = {
  name: "list_ai_blocks",
  description:
    "List AI blocks for the authenticated organization. Optionally filter by owner (e.g. all blocks attached to one ComplianceItem) or onlyPinned=true.",
  input_schema: {
    type: "object",
    properties: {
      ownerType: {
        type: "string",
        enum: ["compliance-item", "module", "organization", "spacecraft"],
      },
      ownerId: { type: "string" },
      onlyPinned: { type: "boolean" },
      limit: { type: "number", description: "Default: 50, max: 100." },
    },
    required: [],
  },
};

export const runAiBlock: AstraToolDefinition = {
  name: "run_ai_block",
  description:
    "Execute an AI block — invokes the underlying LLM with the block's prompt + optional context payload, persists the AIBlockExecution row, returns output. Use when the user asks 'run my gap-analysis block' or after evidence changes that should retrigger a block.",
  input_schema: {
    type: "object",
    properties: {
      blockId: { type: "string" },
      triggerReason: {
        type: "string",
        description:
          "Optional human-readable note for the execution log (e.g. 'Evidence X uploaded').",
      },
    },
    required: ["blockId"],
  },
};

// ─── Background Autofill (Sprint B2) ───

export const suggestFormAutofill: AstraToolDefinition = {
  name: "suggest_form_autofill",
  description:
    "Suggest field values for common operator forms (document-upload, spacecraft-create, incident-create, mission-create) based on filename patterns + OperatorProfile context. Returns ranked AutofillFieldSuggestion[] with reasoning per suggestion. Use when the operator pastes a filename, draft description, or mission brief and asks 'how should I categorize this?'.",
  input_schema: {
    type: "object",
    properties: {
      formType: {
        type: "string",
        enum: [
          "document-upload",
          "spacecraft-create",
          "incident-create",
          "mission-create",
        ],
        description: "Which form to suggest fields for.",
      },
      currentValues: {
        type: "object",
        description:
          "The values the user has already filled in (free-form object — strings, numbers, booleans). Suggestions skip fields that already have values.",
      },
    },
    required: ["formType", "currentValues"],
  },
};

// ─── Capabilities Discovery ───

export const discoverCaelexCapabilities: AstraToolDefinition = {
  name: "discover_caelex_capabilities",
  description:
    "Return Caelex's full capabilities inventory: every Astra tool, every v1 ecosystem API endpoint, every external free data source we pull from, every compliance framework modelled, every country with a real business-registry adapter, plus the trust-layer features (verification tiers, hash-chain, attestations). Use when the user asks 'what can you do?', 'which countries do you cover?', 'which regulations?', or when an external integrator needs an overview.",
  input_schema: {
    type: "object",
    properties: {
      scope: {
        type: "string",
        enum: [
          "summary",
          "countries",
          "frameworks",
          "tools",
          "endpoints",
          "trust",
          "all",
        ],
        description:
          "Limit the inventory section returned. Default: summary (cheap; ideal for chat). Use 'all' for full payload.",
      },
    },
    required: [],
  },
};

// ─── Lineage (Sprint C1) ───

export const queryLineageForSubject: AstraToolDefinition = {
  name: "query_lineage_for_subject",
  description:
    "Reconstruct the provenance subgraph for a subject (compliance item, operator-profile field, Astra proposal, or audit-log entry). Returns the nodes and edges that trace 'where did this value/decision come from?' across DerivationTrace + AstraProposal + AuditLog + Enrichment sources. Use this when the user asks 'why does this item exist?', 'who proposed this?', or 'show the lineage of …'.",
  input_schema: {
    type: "object",
    properties: {
      subjectType: {
        type: "string",
        enum: [
          "compliance-item",
          "operator-profile-field",
          "astra-proposal",
          "audit-log-entry",
        ],
        description: "The kind of subject to trace.",
      },
      subjectId: {
        type: "string",
        description:
          "ID of the subject. For compliance-item: 'REGULATION:CODE'. For operator-profile-field: 'OPERATOR_PROFILE_ID:fieldName'. For astra-proposal / audit-log-entry: row id.",
      },
    },
    required: ["subjectType", "subjectId"],
  },
};

// ─── Day-1 Magic Moment (Sprint Day1) ───

export const runDay1MagicMoment: AstraToolDefinition = {
  name: "run_day1_magic_moment",
  description:
    "Compose the full Day-1 magic moment in one call: external identity enrichment (VIES + GLEIF + country registries) + trilateral auto-discovery (NCAs + counsel) + precision-engine roadmap. Returns a unified Day1Result with a human-readable banner summary and top-3 actions. Use this when an operator finishes onboarding, asks 'what's my situation?', or invokes the welcome banner.",
  input_schema: {
    type: "object",
    properties: {
      persist: {
        type: "boolean",
        description:
          "If true, persist enrichment results to AssureCompanyProfile. Default: false.",
      },
      maxItems: {
        type: "number",
        description: "Cap on roadmap items returned. Default: 25. Max: 100.",
      },
    },
    required: [],
  },
};

// ─── Network Discovery (Sprint A4 — Trilateral Auto-Discovery) ───

export const discoverTrilateralNetwork: AstraToolDefinition = {
  name: "discover_trilateral_network",
  description:
    "Auto-detect the operator's supervisory NCAs and likely legal counsel based on their profile (operatorType + establishment country + jurisdictions). Returns AuthoritySuggestions (NCAs with pathway/articles/timeline) and CounselSuggestions (law firms from the stakeholder network or directory). Use this on first sign-up, when the operator asks 'who supervises me?' or 'who should represent me?', and to show the Day-1 magic moment banner. Reads OperatorProfile from the database.",
  input_schema: {
    type: "object",
    properties: {
      includeSecondaryNCAs: {
        type: "boolean",
        description:
          "If true, include cross-jurisdiction NCAs in addition to the primary supervisor. Default: true.",
      },
    },
    required: [],
  },
};

// ─── Precision Engine / Roadmap Tools (Sprint A3.5) ───

export const generateComplianceRoadmap: AstraToolDefinition = {
  name: "generate_compliance_roadmap",
  description:
    "Generate a personalized, dependency-resolved compliance roadmap for the user's organization. Walks the regulatory ontology for the operator's profile (operatorType + jurisdictions + orbit + planned launch) and returns a prioritized list of ComplianceItems with target dates and dependencies. Use this when the user asks 'what do I need to do?', 'what's my roadmap?', or right after onboarding to show next steps. Reads OperatorProfile from the database — no extra parameters needed in the typical case.",
  input_schema: {
    type: "object",
    properties: {
      domain: {
        type: "string",
        description:
          "Optional: focus on a single regulatory domain. Examples: 'AUTHORIZATION', 'CYBERSECURITY', 'DEBRIS', 'SPECTRUM', 'INSURANCE'. Omit to include all domains.",
      },
      includeProposals: {
        type: "boolean",
        description:
          "If true, include lower-confidence (proposal-tier) ontology obligations alongside the shipped ones. Default: false.",
      },
      maxItems: {
        type: "number",
        description:
          "Cap the number of items returned (after dependency-sort). Default: 25. Max: 100.",
      },
    },
    required: [],
  },
};

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
  generateCybersecurityFramework,
  generateEnvironmentalReport,
  generateInsuranceReport,
  generateNIS2Report,

  // Knowledge Tools
  searchRegulation,
  getArticleDetail,
  getCrossReferences,
  explainTerm,

  // Advisory Tools
  assessRegulatoryImpact,
  suggestCompliancePath,
  estimateComplianceCostTime,

  // NCA Portal Tools
  getNcaSubmissions,
  getSubmissionDetail,
  checkPackageCompleteness,
  getNcaDeadlines,

  // Incident Tools
  reportIncident,
  getIncidentStatus,
  listActiveIncidentsTool,
  draftNcaNotification,
  advanceIncidentWorkflowTool,

  // Digital Twin Tools
  queryComplianceTwin,
  runWhatifScenario,
  getEvidenceGaps,

  // Ontology Tools
  queryOntology,

  // Audit Tools
  auditDocument,

  // CRA Tools
  getCRAAssessmentStatus,
  getCRAProductClassification,
  getCRARequirementGaps,
  getCRANIS2Overlap,
  getCRASBOMAnalysis,

  // Trade Classification Tools (Sprint B4)
  classifyTradeItem,
  lookupClassificationCode,

  // Trade Counterparty Screening Tools (Wave A Sprint A7)
  screenTradeParty,
  lookupTradeParty,

  // Mission Domain Tools (Sprint D)
  listMissions,
  getMissionDetailTool,
  getMissionTimeline,

  // Precision Engine / Roadmap Tools (Sprint A3.5)
  generateComplianceRoadmap,

  // Network Discovery (Sprint A4)
  discoverTrilateralNetwork,

  // Day-1 Magic Moment (Sprint Day1)
  runDay1MagicMoment,

  // Lineage (Sprint C1)
  queryLineageForSubject,

  // Capabilities discovery
  discoverCaelexCapabilities,

  // Background Autofill (Sprint B2)
  suggestFormAutofill,

  // AI Blocks (Sprint B3)
  createAiBlock,
  listAiBlocks,
  runAiBlock,

  // Time-Travel (Sprint C2)
  snapshotAtDate,
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
    "generate_cybersecurity_framework",
    "generate_environmental_report",
    "generate_insurance_report",
    "generate_nis2_report",
    "audit_document",
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
  nca_portal: [
    "get_nca_submissions",
    "get_submission_detail",
    "check_package_completeness",
    "get_nca_deadlines",
  ],
  incident: [
    "report_incident",
    "get_incident_status",
    "list_active_incidents",
    "draft_nca_notification",
    "advance_incident_workflow",
  ],
  digital_twin: [
    "query_compliance_twin",
    "run_whatif_scenario",
    "get_evidence_gaps",
  ],
  ontology: ["query_ontology"],
  cra: [
    "get_cra_assessment_status",
    "get_cra_product_classification",
    "get_cra_requirement_gaps",
    "get_cra_nis2_overlap",
    "get_cra_sbom_analysis",
  ],
  trade: [
    "classify_trade_item",
    "lookup_classification_code",
    "screen_trade_party",
    "lookup_trade_party",
  ],
  mission: ["list_missions", "get_mission_detail", "get_mission_timeline"],
} as const;
