/**
 * Services - Business Logic Layer
 *
 * This module exports all service functions for the application.
 */

// Authorization Service
export {
  buildAuthorizationContext,
  evaluateWorkflowTransitions,
  getAvailableTransitions,
  executeManualTransition,
  submitWorkflowToNCA,
  withdrawWorkflow,
  getWorkflowSummary,
  type WorkflowSummary,
} from "./authorization-service";

// Document Completeness Service
export {
  calculateCompletenessReport,
  isWorkflowReadyForSubmission,
  getPrioritizedActions,
  getMissingDocumentTypes,
  estimateCompletionTime,
  type DocumentGap,
  type CompletedDocument,
  type SubmissionBlocker,
  type CompletenessReport,
  type GapCriticality,
  type CompletionEstimate,
} from "./document-completeness-service";

// Supplier Outreach Service
export {
  sendSupplierOutreach,
  sendBatchOutreach,
  revokePortalToken,
  getOutreachStatus,
  createSupplierRequest,
  type OutreachOptions,
  type OutreachResult,
  type BatchOutreachResult,
  type OutreachStatus,
  type CreateSupplierRequestOptions,
} from "./supplier-outreach-service";

// Incident Response Service
export {
  INCIDENT_CLASSIFICATION,
  calculateSeverity,
  calculateNCADeadline,
  isNCANotificationOverdue,
  generateIncidentNumber,
  createIncident,
  updateIncidentStatus,
  recordNCANotification,
  getIncidentSummary,
  getPendingNCANotifications,
  type IncidentCategory,
  type IncidentSeverity,
  type IncidentStatus,
  type SeverityFactors,
  type CreateIncidentInput,
  type CreateIncidentResult,
  type IncidentSummary,
} from "./incident-response-service";

// Dashboard Analytics Service
export {
  getComplianceOverview,
  getDashboardMetrics,
  getTrendData,
  getDashboardAlerts,
  type ModuleStatus,
  type ComplianceOverview,
  type DashboardMetrics,
  type TrendDataPoint,
  type DashboardAlert,
} from "./dashboard-analytics-service";

// Compliance Scoring Service
export {
  calculateComplianceScore,
  MODULE_WEIGHTS,
  type ComplianceScore,
  type ModuleScore,
  type ScoringFactor,
  type Recommendation,
} from "./compliance-scoring-service";

// Report Generation Service
export {
  generateReport,
  getAvailableReportTypes,
  getReportHistory,
  type GenerateReportType,
  type GenerateIncidentReportOptions,
  type GenerateAnnualComplianceReportOptions,
  type GenerateSignificantChangeReportOptions,
  type GenerateReportOptions,
  type GeneratedReport,
  type ReportGenerationResult,
} from "./report-generation-service";
