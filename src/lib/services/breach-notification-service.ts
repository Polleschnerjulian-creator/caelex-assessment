/**
 * @deprecated Use incident-response-service.ts instead.
 * This file re-exports for backward compatibility.
 */

export {
  reportBreach,
  getBreachReports,
  getBreachReport,
  updateBreachStatus,
  notifyAuthority,
  notifySubjects,
  getOverdueBreaches,
  processBreachEscalations,
  getBreachStatusLabel,
  getBreachSeverityLabel,
} from "./incident-response-service";

export type {
  ReportBreachInput,
  UpdateBreachStatusInput,
  BreachReportWithReporter,
} from "./incident-response-service";
