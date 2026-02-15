/**
 * PDF Report Generation Module
 *
 * Provides PDF report templates and generation utilities for NCA reports.
 */

// Types
export type {
  ReportType,
  ReportMetadata,
  ReportHeader,
  ReportFooter,
  ReportSection,
  ReportSectionContent,
  ReportConfig,
} from "./types";

// Base Template
export { BaseReport, styles as baseStyles } from "./templates/base-report";

// NCA Report Templates
export {
  NCAIncidentReport,
  buildNCAIncidentReportConfig,
  type NCAIncidentReportData,
} from "./reports/nca-incident-report";

export {
  NCAAnnualComplianceReport,
  buildNCAAnnualComplianceReportConfig,
  type NCAAnnualComplianceReportData,
} from "./reports/nca-annual-compliance-report";

export {
  NCASignificantChangeReport,
  buildNCASignificantChangeReportConfig,
  getChangeTypeInfo,
  type NCASignificantChangeReportData,
} from "./reports/nca-significant-change-report";

// Module-Specific Report Templates
export {
  DebrisMitigationPlanPDF,
  buildDebrisMitigationPlanConfig,
  type DebrisMitigationPlanData,
} from "./reports/debris-mitigation-plan";

export {
  InsuranceComplianceReportPDF,
  buildInsuranceComplianceReportConfig,
  type InsuranceComplianceReportData,
} from "./reports/insurance-compliance-report";

export {
  AuthorizationApplicationPDF,
  buildAuthorizationApplicationConfig,
  type AuthorizationApplicationData,
} from "./reports/authorization-application";

export {
  ComplianceSummaryPDF,
  buildComplianceSummaryConfig,
  type ComplianceSummaryData,
} from "./reports/compliance-summary";
