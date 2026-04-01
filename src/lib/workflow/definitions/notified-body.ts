/**
 * Notified Body Workflow Definition
 *
 * Defines the state machine for CRA Notified Body (NB) submission workflows.
 * Applies to Class II (mandatory) and Class I products with third-party type
 * examination conformity route (optional).
 *
 * States:
 * - not_started: NB process not yet initiated
 * - preparing_documents: Gathering mandatory documentation for NB submission
 * - documents_ready: All mandatory documents uploaded and ready
 * - submitted_to_nb: Dossier submitted to the Notified Body
 * - under_review: NB actively reviewing the submission
 * - additional_info_requested: NB has requested supplementary information
 * - approved: NB has approved the product
 * - rejected: NB has rejected the submission
 */

import type { WorkflowDefinition } from "../types";
import { createTransition } from "../engine";
import { logger } from "@/lib/logger";

// ─── NB Required Documents ───

export const NB_REQUIRED_DOCUMENTS = [
  {
    id: "technical_file",
    name: "Technical File (Annex VII)",
    mandatory: true,
  },
  {
    id: "risk_assessment",
    name: "Cybersecurity Risk Assessment",
    mandatory: true,
  },
  { id: "sbom", name: "Software Bill of Materials", mandatory: true },
  {
    id: "test_reports",
    name: "Security Test Reports",
    mandatory: true,
  },
  {
    id: "vulnerability_handling",
    name: "Vulnerability Handling Process",
    mandatory: true,
  },
  {
    id: "update_mechanism",
    name: "Secure Update Mechanism Documentation",
    mandatory: true,
  },
  {
    id: "eu_declaration",
    name: "EU Declaration of Conformity (Draft)",
    mandatory: true,
  },
  {
    id: "user_instructions",
    name: "User Information and Instructions",
    mandatory: false,
  },
  {
    id: "previous_certifications",
    name: "Previous Certifications (ISO/IEC/CC)",
    mandatory: false,
  },
] as const;

export type NBDocumentId = (typeof NB_REQUIRED_DOCUMENTS)[number]["id"];

// ─── NB Workflow State Types ───

export type NBWorkflowState =
  | "not_started"
  | "preparing_documents"
  | "documents_ready"
  | "submitted_to_nb"
  | "under_review"
  | "additional_info_requested"
  | "approved"
  | "rejected";

export interface NBDocumentStatus {
  id: string;
  name: string;
  mandatory: boolean;
  status: "missing" | "uploaded" | "accepted" | "rejected";
  documentId?: string;
  uploadedAt?: string;
}

export interface NBCommunication {
  date: string;
  direction: "outbound" | "inbound";
  subject: string;
  summary: string;
}

export interface NBWorkflowData {
  currentState: NBWorkflowState;
  stateHistory: Array<{
    state: string;
    timestamp: string;
    note?: string;
  }>;
  notifiedBodyName?: string;
  notifiedBodyId?: string;
  submissionDate?: string;
  expectedResponseDate?: string;
  documents: NBDocumentStatus[];
  communications: NBCommunication[];
}

// ─── NB Workflow Context ───

export interface NBWorkflowContext {
  assessmentId: string;
  userId: string;
  allMandatoryUploaded: boolean;
  documentCount: number;
  mandatoryDocumentCount: number;
  uploadedMandatoryCount: number;
}

// ─── Workflow Definition ───

export const notifiedBodyWorkflowDefinition: WorkflowDefinition<NBWorkflowContext> =
  {
    id: "notified_body",
    name: "CRA Notified Body Assessment",
    description:
      "Third-party conformity assessment workflow for CRA Class I/II products (Art. 32 CRA)",
    version: "1.0.0",
    initialState: "not_started",

    states: {
      not_started: {
        name: "Nicht gestartet",
        description: "Notified-Body-Prozess wurde noch nicht eingeleitet",
        metadata: {
          color: "#6B7280",
          icon: "Circle",
          phase: "pre_submission",
        },
        transitions: {
          start: createTransition<NBWorkflowContext>("preparing_documents", {
            description: "Notified-Body-Prozess starten",
          }),
        },
      },

      preparing_documents: {
        name: "Dokumente vorbereiten",
        description: "Pflichtdokumente werden zusammengestellt und hochgeladen",
        metadata: {
          color: "#3B82F6",
          icon: "FileText",
          phase: "pre_submission",
        },
        transitions: {
          documents_complete: createTransition<NBWorkflowContext>(
            "documents_ready",
            {
              description: "Alle Pflichtdokumente hochgeladen",
              guard: async (ctx) => ctx.allMandatoryUploaded,
            },
          ),
        },
      },

      documents_ready: {
        name: "Dokumente bereit",
        description:
          "Alle Pflichtdokumente sind vorhanden und bereit zur Einreichung",
        metadata: {
          color: "#22C55E",
          icon: "CheckCircle",
          phase: "pre_submission",
        },
        transitions: {
          submit: createTransition<NBWorkflowContext>("submitted_to_nb", {
            description: "Dossier bei Notified Body einreichen",
          }),
          incomplete: createTransition<NBWorkflowContext>(
            "preparing_documents",
            {
              description:
                "Dokument entfernt oder ungültig — zurück zur Vorbereitung",
            },
          ),
        },
      },

      submitted_to_nb: {
        name: "Eingereicht",
        description: "Dossier wurde an die Notified Body übermittelt",
        metadata: {
          color: "#8B5CF6",
          icon: "Send",
          phase: "submitted",
        },
        transitions: {
          acknowledge: createTransition<NBWorkflowContext>("under_review", {
            description: "Notified Body bestätigt Eingang",
          }),
        },
      },

      under_review: {
        name: "In Prüfung",
        description: "Notified Body prüft das eingereichte Dossier",
        metadata: {
          color: "#F59E0B",
          icon: "Eye",
          phase: "review",
        },
        transitions: {
          request_info: createTransition<NBWorkflowContext>(
            "additional_info_requested",
            {
              description: "Notified Body fordert zusätzliche Informationen an",
            },
          ),
          approve: createTransition<NBWorkflowContext>("approved", {
            description: "Notified Body genehmigt das Produkt",
          }),
          reject: createTransition<NBWorkflowContext>("rejected", {
            description: "Notified Body lehnt die Einreichung ab",
          }),
        },
      },

      additional_info_requested: {
        name: "Nachforderung",
        description: "Notified Body hat ergänzende Informationen angefordert",
        metadata: {
          color: "#F97316",
          icon: "AlertTriangle",
          phase: "review",
        },
        transitions: {
          provide_info: createTransition<NBWorkflowContext>("under_review", {
            description: "Angeforderte Informationen bereitgestellt",
          }),
        },
      },

      approved: {
        name: "Genehmigt",
        description:
          "Notified Body hat das Produkt genehmigt — Konformitätsbewertung bestanden",
        metadata: {
          color: "#22C55E",
          icon: "CheckCircle2",
          phase: "completed",
          isTerminal: true,
        },
        transitions: {},
      },

      rejected: {
        name: "Abgelehnt",
        description: "Notified Body hat die Einreichung abgelehnt",
        metadata: {
          color: "#EF4444",
          icon: "XCircle",
          phase: "completed",
        },
        transitions: {
          resubmit: createTransition<NBWorkflowContext>("preparing_documents", {
            description: "Mängel beheben und erneut einreichen",
          }),
        },
      },
    },

    hooks: {
      beforeTransition: async (ctx) => {
        logger.debug(
          `[NB Workflow ${ctx.assessmentId}] Transition: ${ctx.from} → ${ctx.to}`,
        );
      },
      afterTransition: async (_ctx) => {
        // Could trigger notifications, audit logs, etc.
      },
      onError: async (error, ctx) => {
        logger.error(`[NB Workflow ${ctx.assessmentId}] Error:`, error.message);
      },
    },
  };

// ─── Helper Functions ───

/**
 * Get status display information for a NB workflow state
 */
export function getNBStatusInfo(status: string): {
  label: string;
  color: string;
  icon: string;
  phase: string;
} {
  const state = notifiedBodyWorkflowDefinition.states[status];
  if (!state) {
    return {
      label: status,
      color: "#6B7280",
      icon: "Circle",
      phase: "unknown",
    };
  }

  return {
    label: state.name,
    color: state.metadata?.color ?? "#6B7280",
    icon: state.metadata?.icon ?? "Circle",
    phase: state.metadata?.phase ?? "unknown",
  };
}

/**
 * NB workflow state order for progress indicators
 */
export const NB_STATE_ORDER: string[] = [
  "not_started",
  "preparing_documents",
  "documents_ready",
  "submitted_to_nb",
  "under_review",
  "approved",
];

/**
 * Get progress percentage based on current state
 */
export function getNBProgress(currentState: string): number {
  const index = NB_STATE_ORDER.indexOf(currentState);
  if (index === -1) {
    // additional_info_requested and rejected are at the "under_review" level
    if (currentState === "additional_info_requested") return 80;
    if (currentState === "rejected") return 80;
    return 0;
  }
  return Math.round((index / (NB_STATE_ORDER.length - 1)) * 100);
}

/**
 * Check if the NB workflow is in a terminal state
 */
export function isNBTerminal(status: string): boolean {
  const state = notifiedBodyWorkflowDefinition.states[status];
  return state?.metadata?.isTerminal === true;
}

/**
 * Create initial NB workflow data
 */
export function createInitialNBWorkflowData(): NBWorkflowData {
  return {
    currentState: "not_started",
    stateHistory: [
      {
        state: "not_started",
        timestamp: new Date().toISOString(),
        note: "Workflow initialisiert",
      },
    ],
    documents: NB_REQUIRED_DOCUMENTS.map((doc) => ({
      id: doc.id,
      name: doc.name,
      mandatory: doc.mandatory,
      status: "missing" as const,
    })),
    communications: [],
  };
}

/**
 * Check if a CRA assessment requires the NB workflow
 */
export function requiresNBWorkflow(
  productClassification: string,
  conformityRoute: string,
): boolean {
  if (productClassification === "class_II") return true;
  if (
    productClassification === "class_I" &&
    conformityRoute === "third_party_type_exam"
  )
    return true;
  return false;
}

/**
 * Check if the NB workflow is mandatory (vs. optional)
 */
export function isNBMandatory(productClassification: string): boolean {
  return productClassification === "class_II";
}
