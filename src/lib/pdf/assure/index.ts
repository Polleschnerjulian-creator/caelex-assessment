/**
 * Caelex Assure PDF Report Templates
 *
 * ReportConfig builders for Assure platform reports:
 * - Executive Summary (one-pager)
 * - Investment Teaser (3-5 pages)
 * - Company Profile (10-15 pages)
 * - Risk Report (standalone risk analysis)
 * - Investor Update (monthly/quarterly)
 *
 * Each builder returns a ReportConfig JSON structure that the
 * client-side PDF renderer (@react-pdf/renderer) consumes.
 */

// Formatting utilities
export {
  formatEUR,
  formatEURCompact,
  formatPercent,
  formatFraction,
  formatDate,
  formatNumber,
  trendIndicator,
  generateReportId,
} from "./format";

// Executive Summary
export {
  buildExecutiveSummaryReport,
  type ExecutiveSummaryData,
} from "./executive-summary";

// Investment Teaser
export {
  buildInvestmentTeaserReport,
  type InvestmentTeaserData,
} from "./investment-teaser";

// Company Profile
export {
  buildCompanyProfileReport,
  type CompanyProfileData,
} from "./company-profile";

// Risk Report
export { buildRiskReport, type RiskReportData } from "./risk-report";

// Investor Update
export {
  buildInvestorUpdateReport,
  type InvestorUpdateData,
} from "./investor-update";
