/**
 * CRM Shared Types
 *
 * Types used across the CRM module. Keep free of server-only imports
 * so they can be shared between client components and server code.
 */

import type {
  CrmActivityType,
  CrmActivitySource,
  CrmDealStage,
  CrmDealStatus,
  CrmLifecycleStage,
  CrmOperatorType,
  CrmTaskStatus,
} from "@prisma/client";

// ─── Lead Scoring ─────────────────────────────────────────────────────────────

export interface ScoreSignal {
  /** Stable identifier for the signal (used for deduplication and audit) */
  key: string;
  /** Human-readable label shown in UI */
  label: string;
  /** Points added (can be negative) */
  points: number;
  /** Optional reason — shown in the score breakdown popover */
  reason?: string;
}

export interface ScoreBreakdown {
  /** Total score, clamped 0-100 */
  total: number;
  /** Grade derived from total (A/B/C/D/F) */
  grade: "A" | "B" | "C" | "D" | "F";
  /** Individual signals that contributed */
  signals: ScoreSignal[];
  /** ISO timestamp of last computation */
  computedAt: string;
}

// ─── Pipeline Stages ──────────────────────────────────────────────────────────

export const DEAL_STAGE_ORDER: CrmDealStage[] = [
  "IDENTIFIED",
  "ENGAGED",
  "ASSESSED",
  "PROPOSAL",
  "PROCUREMENT",
  "CLOSED_WON",
  "CLOSED_LOST",
  "ONBOARDING",
  "ACTIVE",
];

export const DEAL_STAGE_LABELS: Record<CrmDealStage, string> = {
  IDENTIFIED: "Identified",
  ENGAGED: "Engaged",
  ASSESSED: "Assessed",
  PROPOSAL: "Proposal",
  PROCUREMENT: "Procurement",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
  ONBOARDING: "Onboarding",
  ACTIVE: "Active",
};

/** Default probability % by stage — used to compute weighted pipeline value. */
export const DEAL_STAGE_PROBABILITY: Record<CrmDealStage, number> = {
  IDENTIFIED: 5,
  ENGAGED: 15,
  ASSESSED: 30,
  PROPOSAL: 50,
  PROCUREMENT: 75,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
  ONBOARDING: 100,
  ACTIVE: 100,
};

/** SLA (days) per stage — deals older than this are flagged stale. */
export const DEAL_STAGE_SLA_DAYS: Record<CrmDealStage, number> = {
  IDENTIFIED: 7,
  ENGAGED: 14,
  ASSESSED: 21,
  PROPOSAL: 14,
  PROCUREMENT: 30,
  CLOSED_WON: 999,
  CLOSED_LOST: 999,
  ONBOARDING: 30,
  ACTIVE: 999,
};

/** Columns shown in the default Kanban board (excludes Won/Lost/Onboarding/Active). */
export const KANBAN_STAGES: CrmDealStage[] = [
  "IDENTIFIED",
  "ENGAGED",
  "ASSESSED",
  "PROPOSAL",
  "PROCUREMENT",
];

// ─── Lifecycle Stages ─────────────────────────────────────────────────────────

export const LIFECYCLE_STAGE_LABELS: Record<CrmLifecycleStage, string> = {
  SUBSCRIBER: "Subscriber",
  LEAD: "Lead",
  MQL: "MQL",
  SQL: "SQL",
  OPPORTUNITY: "Opportunity",
  CUSTOMER: "Customer",
  EVANGELIST: "Evangelist",
  CHURNED: "Churned",
  DISQUALIFIED: "Disqualified",
};

// ─── Operator Types ───────────────────────────────────────────────────────────

export const OPERATOR_TYPE_LABELS: Record<CrmOperatorType, string> = {
  SPACECRAFT_OPERATOR: "Spacecraft Operator",
  LAUNCH_PROVIDER: "Launch Provider",
  LAUNCH_SITE: "Launch Site",
  IN_SPACE_SERVICE: "In-Space Service",
  COLLISION_AVOIDANCE: "Collision Avoidance",
  POSITIONAL_DATA: "Positional Data",
  THIRD_COUNTRY: "Third Country Operator",
  GOVERNMENT: "Government / Agency",
  HARDWARE_MANUFACTURER: "Hardware Manufacturer",
  DEFENSE: "Defense",
  INSURANCE: "Insurance",
  LEGAL_CONSULTING: "Legal / Consulting",
  STARTUP: "Startup",
  OTHER: "Other",
};

// ─── Activity Type Labels + Categories ────────────────────────────────────────

export type ActivityCategory =
  | "form"
  | "meeting"
  | "communication"
  | "manual"
  | "system"
  | "product"
  | "regulatory"
  | "ai";

export const ACTIVITY_TYPE_LABELS: Record<CrmActivityType, string> = {
  FORM_SUBMITTED: "Form submitted",
  DEMO_REQUESTED: "Demo requested",
  CONTACT_FORM: "Contact form",
  NEWSLETTER_SIGNUP: "Newsletter signup",
  ASSESSMENT_COMPLETED: "Assessment completed",
  MEETING_SCHEDULED: "Meeting scheduled",
  MEETING_HELD: "Meeting held",
  MEETING_NO_SHOW: "No-show",
  MEETING_CANCELLED: "Meeting cancelled",
  EMAIL_SENT: "Email sent",
  EMAIL_RECEIVED: "Email received",
  EMAIL_OPENED: "Email opened",
  EMAIL_CLICKED: "Link clicked",
  CALL_LOGGED: "Call logged",
  NOTE_ADDED: "Note added",
  TASK_CREATED: "Task created",
  TASK_COMPLETED: "Task completed",
  STAGE_CHANGED: "Stage changed",
  OWNER_CHANGED: "Owner changed",
  FIELD_CHANGED: "Field updated",
  SCORE_CHANGED: "Score updated",
  LIFECYCLE_CHANGED: "Lifecycle stage changed",
  SIGNUP: "Signed up",
  LOGIN: "Logged in",
  SUBSCRIPTION_STARTED: "Subscription started",
  SUBSCRIPTION_CANCELLED: "Subscription cancelled",
  HEALTH_ALERT: "Health alert",
  FILING_DEADLINE: "Filing deadline",
  REGULATION_RELEVANT: "Regulation relevant",
  COMPLIANCE_GAP_DETECTED: "Compliance gap detected",
  AI_RESEARCH: "AI research",
  AI_SUGGESTION: "AI suggestion",
  OTHER: "Other",
};

export const ACTIVITY_TYPE_CATEGORY: Record<CrmActivityType, ActivityCategory> =
  {
    FORM_SUBMITTED: "form",
    DEMO_REQUESTED: "form",
    CONTACT_FORM: "form",
    NEWSLETTER_SIGNUP: "form",
    ASSESSMENT_COMPLETED: "form",
    MEETING_SCHEDULED: "meeting",
    MEETING_HELD: "meeting",
    MEETING_NO_SHOW: "meeting",
    MEETING_CANCELLED: "meeting",
    EMAIL_SENT: "communication",
    EMAIL_RECEIVED: "communication",
    EMAIL_OPENED: "communication",
    EMAIL_CLICKED: "communication",
    CALL_LOGGED: "communication",
    NOTE_ADDED: "manual",
    TASK_CREATED: "manual",
    TASK_COMPLETED: "manual",
    STAGE_CHANGED: "system",
    OWNER_CHANGED: "system",
    FIELD_CHANGED: "system",
    SCORE_CHANGED: "system",
    LIFECYCLE_CHANGED: "system",
    SIGNUP: "product",
    LOGIN: "product",
    SUBSCRIPTION_STARTED: "product",
    SUBSCRIPTION_CANCELLED: "product",
    HEALTH_ALERT: "product",
    FILING_DEADLINE: "regulatory",
    REGULATION_RELEVANT: "regulatory",
    COMPLIANCE_GAP_DETECTED: "regulatory",
    AI_RESEARCH: "ai",
    AI_SUGGESTION: "ai",
    OTHER: "system",
  };

// ─── Re-exports of Prisma enums for convenience ────────────────────────────────

export type {
  CrmActivityType,
  CrmActivitySource,
  CrmDealStage,
  CrmDealStatus,
  CrmLifecycleStage,
  CrmOperatorType,
  CrmTaskStatus,
};

// ─── Auto-link Input Shapes ────────────────────────────────────────────────────

export interface AutoLinkInput {
  /** The raw email — used to find/create a contact */
  email: string;
  /** Optional first name */
  firstName?: string;
  /** Optional last name (if you only have a full name, split on the last space) */
  lastName?: string;
  /** Optional company name — used to find/create a company */
  companyName?: string;
  /** Optional company domain — derived from email if not provided */
  companyDomain?: string;
  /** Optional free-form title */
  title?: string;
  /** Optional source tag describing where the contact came from */
  source?:
    | "website"
    | "demo"
    | "contact"
    | "booking"
    | "newsletter"
    | "signup"
    | "manual"
    | "atlas_access";
}
