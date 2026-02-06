/**
 * PDF Report Types
 */

export type ReportType =
  | "incident"
  | "annual_compliance"
  | "significant_change"
  | "cybersecurity"
  | "debris_event"
  | "conjunction"
  | "anomaly"
  | "eol_update"
  | "insurance"
  | "ownership_transfer"
  | "audit_trail"
  | "compliance_certificate";

export interface ReportMetadata {
  reportId: string;
  reportType: ReportType;
  title: string;
  generatedAt: Date;
  generatedBy: string;
  organization?: string;
  version?: string;
}

export interface ReportHeader {
  title: string;
  subtitle?: string;
  reportNumber?: string;
  date: Date;
  logo?: boolean;
}

export interface ReportFooter {
  pageNumbers: boolean;
  confidentialityNotice?: string;
  disclaimer?: string;
}

export interface ReportSection {
  title: string;
  content: ReportSectionContent[];
}

export type ReportSectionContent =
  | { type: "text"; value: string }
  | { type: "heading"; value: string; level: 1 | 2 | 3 }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "keyValue"; items: Array<{ key: string; value: string }> }
  | { type: "spacer"; height?: number }
  | { type: "divider" }
  | { type: "alert"; severity: "info" | "warning" | "error"; message: string };

export interface ReportConfig {
  metadata: ReportMetadata;
  header: ReportHeader;
  footer: ReportFooter;
  sections: ReportSection[];
}
