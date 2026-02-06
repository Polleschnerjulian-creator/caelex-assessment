// Email Service Types

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  // Tracking metadata
  userId?: string;
  notificationType?: NotificationType;
  entityType?: EntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export type NotificationType =
  | "deadline_reminder"
  | "document_expiry"
  | "incident_alert"
  | "weekly_digest"
  | "authorization_update"
  | "compliance_gap"
  | "scheduled_report";

export type EntityType =
  | "deadline"
  | "document"
  | "incident"
  | "authorization"
  | "summary"
  | "report_archive";

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface DeadlineReminderData {
  recipientName: string;
  deadlineTitle: string;
  dueDate: Date;
  daysRemaining: number;
  priority: string;
  category: string;
  regulatoryRef?: string;
  penaltyInfo?: string;
  description?: string;
  dashboardUrl: string;
}

export interface DocumentExpiryData {
  recipientName: string;
  documentName: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  category: string;
  moduleType?: string;
  regulatoryRef?: string;
  dashboardUrl: string;
}

export interface WeeklyDigestData {
  recipientName: string;
  weekStart: Date;
  weekEnd: Date;
  upcomingDeadlines: Array<{
    title: string;
    dueDate: Date;
    priority: string;
    daysRemaining: number;
  }>;
  expiringDocuments: Array<{
    name: string;
    expiryDate: Date;
    daysUntilExpiry: number;
  }>;
  overdueItems: Array<{
    title: string;
    dueDate: Date;
    type: "deadline" | "document";
  }>;
  complianceStats: {
    completionPercentage: number;
    articlesCompliant: number;
    totalArticles: number;
  };
  dashboardUrl: string;
}

export interface IncidentAlertData {
  recipientName: string;
  incidentNumber: string;
  title: string;
  severity: string;
  category: string;
  detectedAt: Date;
  description: string;
  ncaReportingDeadline?: Date;
  dashboardUrl: string;
}
