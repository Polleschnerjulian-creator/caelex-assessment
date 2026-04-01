"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldAlert,
  FileText,
  CheckCircle2,
  Circle,
  XCircle,
  Clock,
  Send,
  Eye,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
  ArrowRight,
  Building2,
  MessageSquare,
  Upload,
  ExternalLink,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Types ───

interface NBDocumentStatus {
  id: string;
  name: string;
  mandatory: boolean;
  status: "missing" | "uploaded" | "accepted" | "rejected";
  documentId?: string;
  uploadedAt?: string;
}

interface NBCommunication {
  date: string;
  direction: "outbound" | "inbound";
  subject: string;
  summary: string;
}

interface NBWorkflowData {
  currentState: string;
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
  evidenceId?: string;
}

interface NBProgress {
  mandatoryTotal: number;
  mandatoryUploaded: number;
  allMandatoryReady: boolean;
}

interface NotifiedBodyWorkflowProps {
  assessmentId: string;
  productClassification: string;
  conformityRoute: string;
  productName: string;
}

// ─── State Config ───

const STATE_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: typeof Circle;
    description: string;
  }
> = {
  not_started: {
    label: "Nicht gestartet",
    color: "text-[var(--text-tertiary)]",
    bgColor: "bg-[var(--surface-sunken)]",
    icon: Circle,
    description: "NB-Prozess noch nicht eingeleitet",
  },
  preparing_documents: {
    label: "Dokumente vorbereiten",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    icon: FileText,
    description: "Pflichtdokumente zusammenstellen",
  },
  documents_ready: {
    label: "Dokumente bereit",
    color: "text-[var(--accent-success)]",
    bgColor: "bg-[var(--accent-success)]/10",
    icon: CheckCircle2,
    description: "Alle Pflichtdokumente vorhanden",
  },
  submitted_to_nb: {
    label: "Eingereicht",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    icon: Send,
    description: "Dossier an Notified Body übermittelt",
  },
  under_review: {
    label: "In Prüfung",
    color: "text-[var(--accent-warning)]",
    bgColor: "bg-[var(--accent-warning-soft)]",
    icon: Eye,
    description: "Notified Body prüft die Einreichung",
  },
  additional_info_requested: {
    label: "Nachforderung",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    icon: AlertTriangle,
    description: "Ergänzende Informationen angefordert",
  },
  approved: {
    label: "Genehmigt",
    color: "text-[var(--accent-success)]",
    bgColor: "bg-[var(--accent-success)]/10",
    icon: CheckCircle2,
    description: "Konformitätsbewertung bestanden",
  },
  rejected: {
    label: "Abgelehnt",
    color: "text-[var(--accent-danger)]",
    bgColor: "bg-[var(--accent-danger)]/10",
    icon: XCircle,
    description: "Einreichung abgelehnt",
  },
};

// Transition labels (event → German label)
const TRANSITION_LABELS: Record<string, string> = {
  start: "NB-Prozess starten",
  documents_complete: "Als vollständig markieren",
  submit: "An Notified Body einreichen",
  incomplete: "Zurück zur Vorbereitung",
  acknowledge: "Eingangsbestätigung erhalten",
  request_info: "Nachforderung erhalten",
  provide_info: "Informationen bereitgestellt",
  approve: "Genehmigung erhalten",
  reject: "Ablehnung erhalten",
  resubmit: "Erneut einreichen",
};

// States in logical order for progress bar
const STATE_ORDER = [
  "not_started",
  "preparing_documents",
  "documents_ready",
  "submitted_to_nb",
  "under_review",
  "approved",
];

// Transitions available per state
const TRANSITIONS_PER_STATE: Record<string, string[]> = {
  not_started: ["start"],
  preparing_documents: ["documents_complete"],
  documents_ready: ["submit", "incomplete"],
  submitted_to_nb: ["acknowledge"],
  under_review: ["request_info", "approve", "reject"],
  additional_info_requested: ["provide_info"],
  rejected: ["resubmit"],
};

// ─── Document Status Indicators ───

function DocumentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "uploaded":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-medium bg-blue-500/10 text-blue-400">
          <Upload size={10} />
          Hochgeladen
        </span>
      );
    case "accepted":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-medium bg-[var(--accent-success)]/10 text-[var(--accent-success)]">
          <CheckCircle2 size={10} />
          Akzeptiert
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-medium bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]">
          <XCircle size={10} />
          Abgelehnt
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-medium bg-[var(--surface-sunken)] text-[var(--text-tertiary)]">
          <Circle size={10} />
          Fehlt
        </span>
      );
  }
}

// ─── Component ───

export default function NotifiedBodyWorkflow({
  assessmentId,
  productClassification: _productClassification,
  conformityRoute: _conformityRoute,
  productName: _productName,
}: NotifiedBodyWorkflowProps) {
  const [workflow, setWorkflow] = useState<NBWorkflowData | null>(null);
  const [progress, setProgress] = useState<NBProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [applicable, setApplicable] = useState(false);
  const [mandatory, setMandatory] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Expandable sections
  const [expandDocs, setExpandDocs] = useState(true);
  const [expandComms, setExpandComms] = useState(false);
  const [expandHistory, setExpandHistory] = useState(false);

  // Add communication form
  const [showAddComm, setShowAddComm] = useState(false);
  const [commDirection, setCommDirection] = useState<"outbound" | "inbound">(
    "outbound",
  );
  const [commSubject, setCommSubject] = useState("");
  const [commSummary, setCommSummary] = useState("");

  // ─── Fetch ───

  const fetchWorkflow = useCallback(async () => {
    try {
      const res = await fetch(`/api/cra/${assessmentId}/nb-workflow`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Fehler beim Laden (${res.status})`);
      }
      const json = await res.json();
      const data = json.data ?? json;

      setApplicable(data.applicable ?? false);
      setMandatory(data.mandatory ?? false);
      setInitialized(data.initialized ?? false);

      if (data.workflow) {
        setWorkflow(data.workflow);
        setProgress(data.progress ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  // ─── Initialize ───

  const handleInitialize = async () => {
    setActionLoading("initialize");
    setError(null);
    try {
      const res = await fetch(`/api/cra/${assessmentId}/nb-workflow`, {
        method: "POST",
        headers: csrfHeaders(),
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Initialisierung fehlgeschlagen");
      }
      await fetchWorkflow();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Initialisierung fehlgeschlagen",
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Transition ───

  const handleTransition = async (transition: string, note?: string) => {
    setActionLoading(transition);
    setError(null);
    try {
      const res = await fetch(`/api/cra/${assessmentId}/nb-workflow`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({
          transition,
          transitionNote: note,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Transition fehlgeschlagen");
      }
      await fetchWorkflow();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aktion fehlgeschlagen");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Document Status Update ───

  const handleDocumentUpdate = async (
    documentId: string,
    status: "missing" | "uploaded" | "accepted" | "rejected",
  ) => {
    setActionLoading(`doc-${documentId}`);
    setError(null);
    try {
      const res = await fetch(`/api/cra/${assessmentId}/nb-workflow`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({
          documentUpdate: { documentId, status },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Dokumentstatus-Update fehlgeschlagen");
      }
      await fetchWorkflow();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update fehlgeschlagen");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Add Communication ───

  const handleAddCommunication = async () => {
    if (!commSubject.trim() || !commSummary.trim()) return;
    setActionLoading("add-comm");
    setError(null);
    try {
      const res = await fetch(`/api/cra/${assessmentId}/nb-workflow`, {
        method: "PATCH",
        headers: csrfHeaders(),
        body: JSON.stringify({
          communication: {
            direction: commDirection,
            subject: commSubject,
            summary: commSummary,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Kommunikation speichern fehlgeschlagen");
      }
      setCommSubject("");
      setCommSummary("");
      setShowAddComm(false);
      await fetchWorkflow();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Render ───

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-[var(--text-tertiary)] animate-spin" />
          <span className="text-body text-[var(--text-secondary)]">
            Notified-Body-Workflow laden...
          </span>
        </div>
      </div>
    );
  }

  if (!applicable) return null;

  // Not yet initialized: show callout
  if (!initialized || !workflow) {
    return (
      <div className="rounded-xl border border-[var(--accent-warning)]/30 bg-[var(--accent-warning-soft)] p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {mandatory ? (
              <ShieldAlert className="w-5 h-5 text-[var(--accent-danger)]" />
            ) : (
              <Shield className="w-5 h-5 text-[var(--accent-warning)]" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-subtitle font-semibold text-[var(--text-primary)] mb-1">
              {mandatory
                ? "Notified Body erforderlich"
                : "Drittprüfung verfügbar"}
            </h3>
            <p className="text-body text-[var(--text-secondary)] mb-3">
              {mandatory
                ? "Dieses Produkt ist Klasse II — eine Drittprüfung durch eine Notified Body ist verpflichtend (Art. 32(2) CRA). Starten Sie den Notified-Body-Prozess."
                : "Für dieses Klasse-I-Produkt mit Drittprüfungs-Konformitätsroute kann ein Notified-Body-Verfahren eingeleitet werden."}
            </p>
            <button
              onClick={handleInitialize}
              disabled={actionLoading === "initialize"}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-small font-medium transition-colors disabled:opacity-50"
            >
              {actionLoading === "initialize" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ArrowRight size={14} />
              )}
              Notified-Body-Prozess starten
            </button>
            {error && (
              <p className="text-small text-[var(--accent-danger)] mt-2">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentConfig =
    STATE_CONFIG[workflow.currentState] || STATE_CONFIG.not_started;
  const CurrentIcon = currentConfig.icon;
  const availableTransitions =
    TRANSITIONS_PER_STATE[workflow.currentState] || [];

  // Progress bar calculation
  const stateIndex = STATE_ORDER.indexOf(workflow.currentState);
  const progressPercent =
    workflow.currentState === "additional_info_requested"
      ? 80
      : workflow.currentState === "rejected"
        ? 80
        : stateIndex >= 0
          ? Math.round((stateIndex / (STATE_ORDER.length - 1)) * 100)
          : 0;

  return (
    <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[var(--border-primary)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-[var(--text-tertiary)]" />
            <h3 className="text-title font-semibold text-[var(--text-primary)]">
              Notified Body Workflow
            </h3>
            {mandatory && (
              <span className="px-2 py-0.5 rounded-full text-micro font-medium bg-[var(--accent-danger)]/10 text-[var(--accent-danger)]">
                Pflicht
              </span>
            )}
          </div>
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-small font-medium ${currentConfig.bgColor} ${currentConfig.color}`}
          >
            <CurrentIcon size={14} />
            {currentConfig.label}
          </div>
        </div>

        {/* NB Info */}
        {workflow.notifiedBodyName && (
          <p className="text-small text-[var(--text-secondary)] mb-2">
            Notified Body:{" "}
            <span className="font-medium text-[var(--text-primary)]">
              {workflow.notifiedBodyName}
            </span>
            {workflow.notifiedBodyId && (
              <span className="text-[var(--text-tertiary)]">
                {" "}
                (ID: {workflow.notifiedBodyId})
              </span>
            )}
          </p>
        )}

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-micro text-[var(--text-tertiary)] mb-1.5">
            <span>Fortschritt</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-[var(--surface-sunken)] rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                workflow.currentState === "approved"
                  ? "bg-[var(--accent-success)]"
                  : workflow.currentState === "rejected"
                    ? "bg-[var(--accent-danger)]"
                    : "bg-[var(--accent-primary)]"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          {/* State steps */}
          <div className="flex justify-between mt-2">
            {STATE_ORDER.map((state, i) => {
              const isActive = state === workflow.currentState;
              const isPast =
                stateIndex > i ||
                (["additional_info_requested", "rejected"].includes(
                  workflow.currentState,
                ) &&
                  i < 4);
              return (
                <div
                  key={state}
                  className={`text-center flex-1 ${i > 0 ? "border-l border-[var(--border-primary)]" : ""}`}
                >
                  <div
                    className={`text-micro truncate px-1 ${
                      isActive
                        ? "text-[var(--text-primary)] font-medium"
                        : isPast
                          ? "text-[var(--accent-success)]"
                          : "text-[var(--text-tertiary)]"
                    }`}
                  >
                    {STATE_CONFIG[state]?.label.split(" ")[0] || state}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-3 bg-[var(--accent-danger)]/5 border-b border-[var(--accent-danger)]/20">
          <p className="text-small text-[var(--accent-danger)]">{error}</p>
        </div>
      )}

      {/* Document Checklist */}
      <div className="border-b border-[var(--border-primary)]">
        <button
          onClick={() => setExpandDocs(!expandDocs)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--surface-hover)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-[var(--text-tertiary)]" />
            <span className="text-small font-medium text-[var(--text-primary)]">
              Dokumenten-Checkliste
            </span>
            {progress && (
              <span className="text-micro text-[var(--text-tertiary)]">
                ({progress.mandatoryUploaded}/{progress.mandatoryTotal}{" "}
                Pflichtdokumente)
              </span>
            )}
          </div>
          {expandDocs ? (
            <ChevronUp size={14} className="text-[var(--text-tertiary)]" />
          ) : (
            <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
          )}
        </button>
        <AnimatePresence>
          {expandDocs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-4 space-y-2">
                {/* Document progress bar */}
                {progress && (
                  <div className="mb-3">
                    <div className="h-1 bg-[var(--surface-sunken)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-300"
                        style={{
                          width: `${progress.mandatoryTotal > 0 ? (progress.mandatoryUploaded / progress.mandatoryTotal) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {workflow.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--surface-sunken)]/50"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          doc.status === "accepted"
                            ? "bg-[var(--accent-success)]"
                            : doc.status === "uploaded"
                              ? "bg-blue-400"
                              : doc.status === "rejected"
                                ? "bg-[var(--accent-danger)]"
                                : "bg-[var(--text-tertiary)]/30"
                        }`}
                      />
                      <span className="text-small text-[var(--text-primary)] truncate">
                        {doc.name}
                      </span>
                      {doc.mandatory && (
                        <span className="text-micro text-[var(--accent-danger)] flex-shrink-0">
                          *
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <DocumentStatusBadge status={doc.status} />
                      {/* Upload/mark button when in preparing state */}
                      {[
                        "preparing_documents",
                        "documents_ready",
                        "additional_info_requested",
                      ].includes(workflow.currentState) && (
                        <>
                          {doc.status === "missing" ? (
                            <button
                              onClick={() =>
                                handleDocumentUpdate(doc.id, "uploaded")
                              }
                              disabled={actionLoading === `doc-${doc.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-micro font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === `doc-${doc.id}` ? (
                                <Loader2 size={10} className="animate-spin" />
                              ) : (
                                <Upload size={10} />
                              )}
                              Hochladen
                            </button>
                          ) : doc.status === "uploaded" ? (
                            <button
                              onClick={() =>
                                handleDocumentUpdate(doc.id, "missing")
                              }
                              disabled={actionLoading === `doc-${doc.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-micro font-medium bg-[var(--surface-sunken)] text-[var(--text-tertiary)] hover:text-[var(--accent-danger)] transition-colors disabled:opacity-50"
                            >
                              <XCircle size={10} />
                              Entfernen
                            </button>
                          ) : null}
                        </>
                      )}
                      {doc.documentId && (
                        <a
                          href={`/dashboard/documents?highlight=${doc.documentId}`}
                          className="text-[var(--accent-primary)] hover:underline"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                <p className="text-micro text-[var(--text-tertiary)] mt-1">
                  * Pflichtdokumente für die NB-Einreichung
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Communications Log */}
      <div className="border-b border-[var(--border-primary)]">
        <button
          onClick={() => setExpandComms(!expandComms)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--surface-hover)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-[var(--text-tertiary)]" />
            <span className="text-small font-medium text-[var(--text-primary)]">
              Kommunikation
            </span>
            <span className="text-micro text-[var(--text-tertiary)]">
              ({workflow.communications.length})
            </span>
          </div>
          {expandComms ? (
            <ChevronUp size={14} className="text-[var(--text-tertiary)]" />
          ) : (
            <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
          )}
        </button>
        <AnimatePresence>
          {expandComms && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-4 space-y-2">
                {workflow.communications.length === 0 ? (
                  <p className="text-small text-[var(--text-tertiary)] py-2">
                    Noch keine Kommunikation erfasst.
                  </p>
                ) : (
                  workflow.communications
                    .slice()
                    .reverse()
                    .map((comm, i) => (
                      <div
                        key={i}
                        className="py-2 px-3 rounded-lg bg-[var(--surface-sunken)]/50"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-micro font-medium ${
                                comm.direction === "outbound"
                                  ? "text-blue-400"
                                  : "text-[var(--accent-warning)]"
                              }`}
                            >
                              {comm.direction === "outbound"
                                ? "Ausgehend"
                                : "Eingehend"}
                            </span>
                            <span className="text-small font-medium text-[var(--text-primary)]">
                              {comm.subject}
                            </span>
                          </div>
                          <span className="text-micro text-[var(--text-tertiary)]">
                            {new Date(comm.date).toLocaleDateString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-small text-[var(--text-secondary)]">
                          {comm.summary}
                        </p>
                      </div>
                    ))
                )}

                {/* Add communication form */}
                {!showAddComm ? (
                  <button
                    onClick={() => setShowAddComm(true)}
                    className="inline-flex items-center gap-1.5 text-small text-[var(--accent-primary)] hover:underline mt-1"
                  >
                    <Plus size={12} />
                    Kommunikation erfassen
                  </button>
                ) : (
                  <div className="mt-2 space-y-2 p-3 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-primary)]">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCommDirection("outbound")}
                        className={`px-3 py-1 rounded-md text-small font-medium transition-colors ${
                          commDirection === "outbound"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-[var(--surface-sunken)] text-[var(--text-tertiary)]"
                        }`}
                      >
                        Ausgehend
                      </button>
                      <button
                        onClick={() => setCommDirection("inbound")}
                        className={`px-3 py-1 rounded-md text-small font-medium transition-colors ${
                          commDirection === "inbound"
                            ? "bg-[var(--accent-warning-soft)] text-[var(--accent-warning)]"
                            : "bg-[var(--surface-sunken)] text-[var(--text-tertiary)]"
                        }`}
                      >
                        Eingehend
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Betreff"
                      value={commSubject}
                      onChange={(e) => setCommSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-primary)] text-small text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                    />
                    <textarea
                      placeholder="Zusammenfassung"
                      value={commSummary}
                      onChange={(e) => setCommSummary(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-primary)] text-small text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setShowAddComm(false);
                          setCommSubject("");
                          setCommSummary("");
                        }}
                        className="px-3 py-1.5 rounded-md text-small text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={handleAddCommunication}
                        disabled={
                          actionLoading === "add-comm" ||
                          !commSubject.trim() ||
                          !commSummary.trim()
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-small font-medium bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50"
                      >
                        {actionLoading === "add-comm" ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Plus size={12} />
                        )}
                        Speichern
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* State History */}
      <div className="border-b border-[var(--border-primary)]">
        <button
          onClick={() => setExpandHistory(!expandHistory)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--surface-hover)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[var(--text-tertiary)]" />
            <span className="text-small font-medium text-[var(--text-primary)]">
              Verlauf
            </span>
            <span className="text-micro text-[var(--text-tertiary)]">
              ({workflow.stateHistory.length})
            </span>
          </div>
          {expandHistory ? (
            <ChevronUp size={14} className="text-[var(--text-tertiary)]" />
          ) : (
            <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
          )}
        </button>
        <AnimatePresence>
          {expandHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-4 space-y-1">
                {workflow.stateHistory
                  .slice()
                  .reverse()
                  .map((entry, i) => {
                    const config = STATE_CONFIG[entry.state];
                    return (
                      <div key={i} className="flex items-start gap-2 py-1.5">
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            config
                              ? `${config.bgColor}`
                              : "bg-[var(--text-tertiary)]"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-small font-medium text-[var(--text-primary)]">
                              {config?.label || entry.state}
                            </span>
                            <span className="text-micro text-[var(--text-tertiary)]">
                              {new Date(entry.timestamp).toLocaleDateString(
                                "de-DE",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                          {entry.note && (
                            <p className="text-micro text-[var(--text-secondary)]">
                              {entry.note}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      {availableTransitions.length > 0 && (
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            {availableTransitions.map((transition) => {
              const isPrimary =
                transition === "start" ||
                transition === "documents_complete" ||
                transition === "submit" ||
                transition === "provide_info" ||
                transition === "approve" ||
                transition === "resubmit";

              const isDanger =
                transition === "reject" || transition === "incomplete";

              // Disable "documents_complete" if not all mandatory docs uploaded
              const disabled =
                actionLoading !== null ||
                (transition === "documents_complete" &&
                  !!progress &&
                  !progress.allMandatoryReady);

              return (
                <button
                  key={transition}
                  onClick={() => handleTransition(transition)}
                  disabled={disabled}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-small font-medium transition-colors disabled:opacity-50 ${
                    isPrimary
                      ? "bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white"
                      : isDanger
                        ? "bg-[var(--accent-danger)]/10 hover:bg-[var(--accent-danger)]/20 text-[var(--accent-danger)]"
                        : "bg-[var(--surface-sunken)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
                  }`}
                >
                  {actionLoading === transition ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : null}
                  {TRANSITION_LABELS[transition] || transition}
                </button>
              );
            })}
          </div>

          {/* Helper text for documents_complete */}
          {workflow.currentState === "preparing_documents" &&
            progress &&
            !progress.allMandatoryReady && (
              <p className="text-micro text-[var(--text-tertiary)] mt-2">
                Laden Sie alle {progress.mandatoryTotal} Pflichtdokumente hoch,
                um fortzufahren ({progress.mandatoryUploaded}/
                {progress.mandatoryTotal} vorhanden).
              </p>
            )}
        </div>
      )}

      {/* Terminal state message */}
      {workflow.currentState === "approved" && (
        <div className="p-5 bg-[var(--accent-success)]/5 border-t border-[var(--accent-success)]/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[var(--accent-success)]" />
            <span className="text-body font-medium text-[var(--accent-success)]">
              Konformitätsbewertung erfolgreich abgeschlossen
            </span>
          </div>
        </div>
      )}

      {workflow.currentState === "rejected" && (
        <div className="p-5 bg-[var(--accent-danger)]/5 border-t border-[var(--accent-danger)]/20">
          <div className="flex items-center gap-2">
            <XCircle size={16} className="text-[var(--accent-danger)]" />
            <span className="text-body font-medium text-[var(--accent-danger)]">
              Einreichung wurde abgelehnt — Mängel beheben und erneut einreichen
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
