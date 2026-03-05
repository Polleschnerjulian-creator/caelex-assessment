import { describe, it, expect } from "vitest";
import {
  ALL_TOOLS,
  TOOL_BY_NAME,
  TOOL_CATEGORIES,
  checkComplianceStatus,
  getArticleRequirements,
  runGapAnalysis,
  checkCrossRegulationOverlap,
  compareJurisdictions,
  getDeadlineTimeline,
  getAssessmentResults,
  getOperatorClassification,
  getNis2Classification,
  listDocuments,
  checkDocumentCompleteness,
  generateComplianceReport,
  generateAuthorizationApplication,
  generateDebrisMitigationPlan,
  generateCybersecurityFramework,
  generateEnvironmentalReport,
  generateInsuranceReport,
  generateNIS2Report,
  searchRegulation,
  getArticleDetail,
  getCrossReferences,
  explainTerm,
  assessRegulatoryImpact,
  suggestCompliancePath,
  estimateComplianceCostTime,
  getNcaSubmissions,
  getSubmissionDetail,
  checkPackageCompleteness,
  getNcaDeadlines,
  reportIncident,
  getIncidentStatus,
  listActiveIncidentsTool,
  draftNcaNotification,
  advanceIncidentWorkflowTool,
  queryComplianceTwin,
  runWhatifScenario,
  getEvidenceGaps,
} from "./tool-definitions";

// ─── ALL_TOOLS ───

describe("ALL_TOOLS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(ALL_TOOLS)).toBe(true);
    expect(ALL_TOOLS.length).toBeGreaterThan(0);
  });

  it("every tool has name, description, and input_schema", () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.name).toBeTruthy();
      expect(typeof tool.name).toBe("string");
      expect(tool.description).toBeTruthy();
      expect(typeof tool.description).toBe("string");
      expect(tool.input_schema).toBeDefined();
      expect(tool.input_schema.type).toBe("object");
      expect(typeof tool.input_schema.properties).toBe("object");
    }
  });

  it("all tool names are unique", () => {
    const names = ALL_TOOLS.map((t) => t.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it("all tool names use snake_case", () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("has expected tool count (at least 30)", () => {
    expect(ALL_TOOLS.length).toBeGreaterThanOrEqual(30);
  });

  it("includes core compliance tools", () => {
    const names = ALL_TOOLS.map((t) => t.name);
    expect(names).toContain("check_compliance_status");
    expect(names).toContain("run_gap_analysis");
    expect(names).toContain("get_article_requirements");
  });

  it("includes document tools", () => {
    const names = ALL_TOOLS.map((t) => t.name);
    expect(names).toContain("list_documents");
    expect(names).toContain("generate_compliance_report");
  });

  it("includes knowledge tools", () => {
    const names = ALL_TOOLS.map((t) => t.name);
    expect(names).toContain("search_regulation");
    expect(names).toContain("explain_term");
  });

  it("includes incident tools", () => {
    const names = ALL_TOOLS.map((t) => t.name);
    expect(names).toContain("report_incident");
    expect(names).toContain("get_incident_status");
    expect(names).toContain("list_active_incidents");
  });

  it("includes digital twin tools", () => {
    const names = ALL_TOOLS.map((t) => t.name);
    expect(names).toContain("query_compliance_twin");
    expect(names).toContain("run_whatif_scenario");
    expect(names).toContain("get_evidence_gaps");
  });
});

// ─── TOOL_BY_NAME ───

describe("TOOL_BY_NAME", () => {
  it("is an object keyed by tool names", () => {
    expect(typeof TOOL_BY_NAME).toBe("object");
  });

  it("has same count as ALL_TOOLS", () => {
    expect(Object.keys(TOOL_BY_NAME).length).toBe(ALL_TOOLS.length);
  });

  it("each entry matches the tool definition", () => {
    for (const tool of ALL_TOOLS) {
      expect(TOOL_BY_NAME[tool.name]).toBe(tool);
    }
  });

  it("allows lookup by name", () => {
    const tool = TOOL_BY_NAME["check_compliance_status"];
    expect(tool).toBeDefined();
    expect(tool.name).toBe("check_compliance_status");
  });
});

// ─── TOOL_CATEGORIES ───

describe("TOOL_CATEGORIES", () => {
  it("has expected categories", () => {
    expect(TOOL_CATEGORIES.compliance).toBeDefined();
    expect(TOOL_CATEGORIES.assessment).toBeDefined();
    expect(TOOL_CATEGORIES.document).toBeDefined();
    expect(TOOL_CATEGORIES.knowledge).toBeDefined();
    expect(TOOL_CATEGORIES.advisory).toBeDefined();
    expect(TOOL_CATEGORIES.nca_portal).toBeDefined();
    expect(TOOL_CATEGORIES.incident).toBeDefined();
    expect(TOOL_CATEGORIES.digital_twin).toBeDefined();
  });

  it("all categorized tool names exist in ALL_TOOLS", () => {
    const toolNames = new Set(ALL_TOOLS.map((t) => t.name));
    for (const [, categoryTools] of Object.entries(TOOL_CATEGORIES)) {
      for (const toolName of categoryTools) {
        expect(toolNames.has(toolName)).toBe(true);
      }
    }
  });

  it("compliance category has expected tools", () => {
    expect(TOOL_CATEGORIES.compliance).toContain("check_compliance_status");
    expect(TOOL_CATEGORIES.compliance).toContain("run_gap_analysis");
  });

  it("incident category has expected tools", () => {
    expect(TOOL_CATEGORIES.incident).toContain("report_incident");
    expect(TOOL_CATEGORIES.incident).toContain("get_incident_status");
  });
});

// ─── Individual tool schema validation ───

describe("Individual tool definitions", () => {
  it("checkComplianceStatus has optional module and includeDetails", () => {
    expect(checkComplianceStatus.name).toBe("check_compliance_status");
    expect(checkComplianceStatus.input_schema.properties.module).toBeDefined();
    expect(
      checkComplianceStatus.input_schema.properties.includeDetails,
    ).toBeDefined();
    expect(checkComplianceStatus.input_schema.required).toEqual([]);
  });

  it("getArticleRequirements requires articleNumber", () => {
    expect(getArticleRequirements.name).toBe("get_article_requirements");
    expect(getArticleRequirements.input_schema.required).toContain(
      "articleNumber",
    );
  });

  it("runGapAnalysis has no required fields", () => {
    expect(runGapAnalysis.name).toBe("run_gap_analysis");
    expect(runGapAnalysis.input_schema.required).toEqual([]);
  });

  it("checkCrossRegulationOverlap requires sourceRegulation", () => {
    expect(checkCrossRegulationOverlap.name).toBe(
      "check_cross_regulation_overlap",
    );
    expect(checkCrossRegulationOverlap.input_schema.required).toContain(
      "sourceRegulation",
    );
  });

  it("compareJurisdictions requires jurisdictions array", () => {
    expect(compareJurisdictions.name).toBe("compare_jurisdictions");
    expect(compareJurisdictions.input_schema.required).toContain(
      "jurisdictions",
    );
  });

  it("getDeadlineTimeline has no required fields", () => {
    expect(getDeadlineTimeline.name).toBe("get_deadline_timeline");
    expect(getDeadlineTimeline.input_schema.required).toEqual([]);
  });

  it("getAssessmentResults requires assessmentType", () => {
    expect(getAssessmentResults.name).toBe("get_assessment_results");
    expect(getAssessmentResults.input_schema.required).toContain(
      "assessmentType",
    );
  });

  it("getOperatorClassification has no required fields", () => {
    expect(getOperatorClassification.name).toBe("get_operator_classification");
    expect(getOperatorClassification.input_schema.required).toEqual([]);
  });

  it("getNis2Classification has no required fields", () => {
    expect(getNis2Classification.name).toBe("get_nis2_classification");
    expect(getNis2Classification.input_schema.required).toEqual([]);
  });

  it("listDocuments has no required fields", () => {
    expect(listDocuments.name).toBe("list_documents");
    expect(listDocuments.input_schema.required).toEqual([]);
  });

  it("checkDocumentCompleteness requires module", () => {
    expect(checkDocumentCompleteness.name).toBe("check_document_completeness");
    expect(checkDocumentCompleteness.input_schema.required).toContain("module");
  });

  it("generateComplianceReport requires reportType", () => {
    expect(generateComplianceReport.name).toBe("generate_compliance_report");
    expect(generateComplianceReport.input_schema.required).toContain(
      "reportType",
    );
  });

  it("generateAuthorizationApplication requires jurisdiction and applicationType", () => {
    expect(generateAuthorizationApplication.name).toBe(
      "generate_authorization_application",
    );
    expect(generateAuthorizationApplication.input_schema.required).toContain(
      "jurisdiction",
    );
    expect(generateAuthorizationApplication.input_schema.required).toContain(
      "applicationType",
    );
  });

  it("generateDebrisMitigationPlan requires format", () => {
    expect(generateDebrisMitigationPlan.name).toBe(
      "generate_debris_mitigation_plan",
    );
    expect(generateDebrisMitigationPlan.input_schema.required).toContain(
      "format",
    );
  });

  it("generateCybersecurityFramework has no required fields", () => {
    expect(generateCybersecurityFramework.name).toBe(
      "generate_cybersecurity_framework",
    );
    expect(generateCybersecurityFramework.input_schema.required).toEqual([]);
  });

  it("generateEnvironmentalReport has no required fields", () => {
    expect(generateEnvironmentalReport.name).toBe(
      "generate_environmental_report",
    );
    expect(generateEnvironmentalReport.input_schema.required).toEqual([]);
  });

  it("generateInsuranceReport has no required fields", () => {
    expect(generateInsuranceReport.name).toBe("generate_insurance_report");
    expect(generateInsuranceReport.input_schema.required).toEqual([]);
  });

  it("generateNIS2Report has no required fields", () => {
    expect(generateNIS2Report.name).toBe("generate_nis2_report");
    expect(generateNIS2Report.input_schema.required).toEqual([]);
  });

  it("searchRegulation requires query", () => {
    expect(searchRegulation.name).toBe("search_regulation");
    expect(searchRegulation.input_schema.required).toContain("query");
  });

  it("getArticleDetail requires regulation and article", () => {
    expect(getArticleDetail.name).toBe("get_article_detail");
    expect(getArticleDetail.input_schema.required).toContain("regulation");
    expect(getArticleDetail.input_schema.required).toContain("article");
  });

  it("getCrossReferences requires sourceRegulation and sourceArticle", () => {
    expect(getCrossReferences.name).toBe("get_cross_references");
    expect(getCrossReferences.input_schema.required).toContain(
      "sourceRegulation",
    );
    expect(getCrossReferences.input_schema.required).toContain("sourceArticle");
  });

  it("explainTerm requires term", () => {
    expect(explainTerm.name).toBe("explain_term");
    expect(explainTerm.input_schema.required).toContain("term");
  });

  it("assessRegulatoryImpact requires scenarioType and scenarioDetails", () => {
    expect(assessRegulatoryImpact.name).toBe("assess_regulatory_impact");
    expect(assessRegulatoryImpact.input_schema.required).toContain(
      "scenarioType",
    );
    expect(assessRegulatoryImpact.input_schema.required).toContain(
      "scenarioDetails",
    );
  });

  it("suggestCompliancePath requires goal", () => {
    expect(suggestCompliancePath.name).toBe("suggest_compliance_path");
    expect(suggestCompliancePath.input_schema.required).toContain("goal");
  });

  it("estimateComplianceCostTime requires complianceStep", () => {
    expect(estimateComplianceCostTime.name).toBe(
      "estimate_compliance_cost_time",
    );
    expect(estimateComplianceCostTime.input_schema.required).toContain(
      "complianceStep",
    );
  });

  it("getNcaSubmissions has no required fields", () => {
    expect(getNcaSubmissions.name).toBe("get_nca_submissions");
    expect(getNcaSubmissions.input_schema.required).toEqual([]);
  });

  it("getSubmissionDetail has no required fields", () => {
    expect(getSubmissionDetail.name).toBe("get_submission_detail");
    expect(getSubmissionDetail.input_schema.required).toEqual([]);
  });

  it("checkPackageCompleteness requires ncaAuthority", () => {
    expect(checkPackageCompleteness.name).toBe("check_package_completeness");
    expect(checkPackageCompleteness.input_schema.required).toContain(
      "ncaAuthority",
    );
  });

  it("getNcaDeadlines has no required fields", () => {
    expect(getNcaDeadlines.name).toBe("get_nca_deadlines");
    expect(getNcaDeadlines.input_schema.required).toEqual([]);
  });

  it("reportIncident requires category, title, description, detectedBy", () => {
    expect(reportIncident.name).toBe("report_incident");
    expect(reportIncident.input_schema.required).toContain("category");
    expect(reportIncident.input_schema.required).toContain("title");
    expect(reportIncident.input_schema.required).toContain("description");
    expect(reportIncident.input_schema.required).toContain("detectedBy");
  });

  it("getIncidentStatus has no required fields", () => {
    expect(getIncidentStatus.name).toBe("get_incident_status");
    expect(getIncidentStatus.input_schema.required).toEqual([]);
  });

  it("listActiveIncidentsTool has no required fields", () => {
    expect(listActiveIncidentsTool.name).toBe("list_active_incidents");
    expect(listActiveIncidentsTool.input_schema.required).toEqual([]);
  });

  it("draftNcaNotification requires incidentId and phase", () => {
    expect(draftNcaNotification.name).toBe("draft_nca_notification");
    expect(draftNcaNotification.input_schema.required).toContain("incidentId");
    expect(draftNcaNotification.input_schema.required).toContain("phase");
  });

  it("advanceIncidentWorkflowTool requires incidentId and event", () => {
    expect(advanceIncidentWorkflowTool.name).toBe("advance_incident_workflow");
    expect(advanceIncidentWorkflowTool.input_schema.required).toContain(
      "incidentId",
    );
    expect(advanceIncidentWorkflowTool.input_schema.required).toContain(
      "event",
    );
  });

  it("queryComplianceTwin has no required fields", () => {
    expect(queryComplianceTwin.name).toBe("query_compliance_twin");
    expect(queryComplianceTwin.input_schema.required).toEqual([]);
  });

  it("runWhatifScenario requires scenarioType and parameters", () => {
    expect(runWhatifScenario.name).toBe("run_whatif_scenario");
    expect(runWhatifScenario.input_schema.required).toContain("scenarioType");
    expect(runWhatifScenario.input_schema.required).toContain("parameters");
  });

  it("getEvidenceGaps has no required fields", () => {
    expect(getEvidenceGaps.name).toBe("get_evidence_gaps");
    expect(getEvidenceGaps.input_schema.required).toEqual([]);
  });
});
