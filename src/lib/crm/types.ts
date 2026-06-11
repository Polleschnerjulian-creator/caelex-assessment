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

/** Deutsche Anzeige-Labels (UI-only — die Enum-Werte bleiben englisch). */
export const DEAL_STAGE_LABELS: Record<CrmDealStage, string> = {
  IDENTIFIED: "Identifiziert",
  ENGAGED: "Im Gespräch",
  ASSESSED: "Bedarf geklärt",
  PROPOSAL: "Angebot",
  PROCUREMENT: "Im Einkauf",
  CLOSED_WON: "Gewonnen",
  CLOSED_LOST: "Verloren",
  ONBOARDING: "Onboarding",
  ACTIVE: "Aktiv",
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

/** Deutsche Anzeige-Labels (UI-only — die Enum-Werte bleiben englisch). */
export const LIFECYCLE_STAGE_LABELS: Record<CrmLifecycleStage, string> = {
  SUBSCRIBER: "Abonnent",
  LEAD: "Lead",
  MQL: "Marketing-qualifiziert",
  SQL: "Vertriebs-qualifiziert",
  OPPORTUNITY: "Verkaufschance",
  CUSTOMER: "Kunde",
  EVANGELIST: "Fürsprecher",
  CHURNED: "Abgesprungen",
  DISQUALIFIED: "Passt nicht",
};

// ─── Operator Types ───────────────────────────────────────────────────────────

/** Deutsche Anzeige-Labels (UI-only — die Enum-Werte bleiben englisch). */
export const OPERATOR_TYPE_LABELS: Record<CrmOperatorType, string> = {
  SPACECRAFT_OPERATOR: "Satellitenbetreiber",
  LAUNCH_PROVIDER: "Startanbieter",
  LAUNCH_SITE: "Startplatz",
  IN_SPACE_SERVICE: "In-Orbit-Dienste",
  COLLISION_AVOIDANCE: "Kollisionsvermeidung",
  POSITIONAL_DATA: "Positionsdaten",
  THIRD_COUNTRY: "Drittstaaten-Betreiber",
  GOVERNMENT: "Behörde / Agentur",
  HARDWARE_MANUFACTURER: "Hardware-Hersteller",
  DEFENSE: "Verteidigung",
  INSURANCE: "Versicherung",
  LEGAL_CONSULTING: "Kanzlei / Beratung",
  STARTUP: "Startup",
  OTHER: "Sonstige",
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

/** Deutsche Anzeige-Labels (UI-only — die Enum-Werte bleiben englisch). */
export const ACTIVITY_TYPE_LABELS: Record<CrmActivityType, string> = {
  FORM_SUBMITTED: "Formular ausgefüllt",
  DEMO_REQUESTED: "Demo angefragt",
  CONTACT_FORM: "Kontaktformular",
  NEWSLETTER_SIGNUP: "Newsletter-Anmeldung",
  ASSESSMENT_COMPLETED: "Assessment abgeschlossen",
  MEETING_SCHEDULED: "Meeting geplant",
  MEETING_HELD: "Meeting stattgefunden",
  MEETING_NO_SHOW: "Nicht erschienen",
  MEETING_CANCELLED: "Meeting abgesagt",
  EMAIL_SENT: "E-Mail gesendet",
  EMAIL_RECEIVED: "E-Mail erhalten",
  EMAIL_OPENED: "E-Mail geöffnet",
  EMAIL_CLICKED: "Link geklickt",
  CALL_LOGGED: "Anruf notiert",
  TASK_CREATED: "Aufgabe erstellt",
  TASK_COMPLETED: "Aufgabe erledigt",
  NOTE_ADDED: "Notiz hinzugefügt",
  STAGE_CHANGED: "Phase geändert",
  OWNER_CHANGED: "Zuständigkeit geändert",
  FIELD_CHANGED: "Feld aktualisiert",
  SCORE_CHANGED: "Score aktualisiert",
  LIFECYCLE_CHANGED: "Lebenszyklus geändert",
  SIGNUP: "Registriert",
  LOGIN: "Eingeloggt",
  SUBSCRIPTION_STARTED: "Abo gestartet",
  SUBSCRIPTION_CANCELLED: "Abo gekündigt",
  HEALTH_ALERT: "Health-Warnung",
  FILING_DEADLINE: "Einreichungsfrist",
  REGULATION_RELEVANT: "Regulierung relevant",
  COMPLIANCE_GAP_DETECTED: "Compliance-Lücke erkannt",
  AI_RESEARCH: "KI-Recherche",
  AI_SUGGESTION: "KI-Vorschlag",
  OTHER: "Sonstiges",
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
