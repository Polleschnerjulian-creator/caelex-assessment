"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  Building2,
  FileCheck,
  Clock,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Plus,
  Calendar,
  ExternalLink,
  Info,
  Loader2,
  MapPin,
  Globe,
  FileText,
  Shield,
  Leaf,
  DollarSign,
  BookOpen,
  Zap,
  type LucideIcon,
} from "lucide-react";
import EmptyState from "@/components/dashboard/EmptyState";
import { csrfHeaders } from "@/lib/csrf-client";
import { ncas, determineNCA, type NCADetermination } from "@/data/ncas";
import {
  authorizationDocuments,
  documentStatusFlow,
  workflowStatusFlow,
} from "@/data/authorization-documents";
import AstraButton from "@/components/astra/AstraButton";

interface Workflow {
  id: string;
  primaryNCA: string;
  primaryNCAName: string;
  secondaryNCAs: string | null;
  pathway: string;
  operatorType: string | null;
  status: string;
  targetSubmission: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  documents: WorkflowDocument[];
}

interface WorkflowDocument {
  id: string;
  documentType: string;
  name: string;
  description: string | null;
  articleRef: string | null;
  required: boolean;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
}

interface UserProfile {
  operatorType: string | null;
  establishmentCountry: string | null;
  isThirdCountry: boolean;
  organization: string | null;
}

// Stepper steps
const STEPS = [
  {
    id: "nca",
    label: "NCA Determination",
    description: "Identify your competent authority",
  },
  {
    id: "documents",
    label: "Document Checklist",
    description: "Prepare required documents",
  },
  {
    id: "timeline",
    label: "Timeline & Deadlines",
    description: "Key dates and milestones",
  },
  {
    id: "status",
    label: "Status Tracking",
    description: "Monitor your application",
  },
];

const documentCategoryIcons: Record<string, LucideIcon> = {
  technical: FileText,
  legal: BookOpen,
  financial: DollarSign,
  environmental: Leaf,
  safety: Shield,
};

function AuthorizationPageContent() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null,
  );

  // New workflow form state
  const [showNewWorkflowForm, setShowNewWorkflowForm] = useState(false);
  const [formOperatorType, setFormOperatorType] = useState("");
  const [formCountry, setFormCountry] = useState("");
  const [formIsThirdCountry, setFormIsThirdCountry] = useState(false);
  const [formLaunchCountry, setFormLaunchCountry] = useState("");
  const [formTargetDate, setFormTargetDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  // Computed NCA determination for form
  const [ncaDetermination, setNcaDetermination] =
    useState<NCADetermination | null>(null);
  // Removed PDF download in favor of AI Document Studio

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formOperatorType && (formIsThirdCountry || formCountry)) {
      const determination = determineNCA(
        formOperatorType,
        formCountry || null,
        formLaunchCountry || null,
        formIsThirdCountry,
      );
      setNcaDetermination(determination);
    } else {
      setNcaDetermination(null);
    }
  }, [formOperatorType, formCountry, formIsThirdCountry, formLaunchCountry]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/authorization");
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows);
        setUserProfile(data.user);

        // Auto-select if only one workflow
        if (data.workflows.length === 1) {
          setSelectedWorkflow(data.workflows[0]);
        }

        // Pre-fill form with user profile if available
        if (data.user) {
          setFormOperatorType(data.user.operatorType || "");
          setFormCountry(data.user.establishmentCountry || "");
          setFormIsThirdCountry(data.user.isThirdCountry || false);
        }
      }
    } catch (error) {
      console.error("Error fetching authorization data:", error);
    } finally {
      setLoading(false);
    }
  };

  const createWorkflow = async () => {
    if (!formOperatorType) {
      setFormError("Bitte wählen Sie einen Operator-Typ.");
      return;
    }
    if (!formIsThirdCountry && !formCountry) {
      setFormError("Bitte wählen Sie ein Niederlassungsland.");
      return;
    }
    setFormError(null);

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/authorization", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          operatorType: formOperatorType,
          establishmentCountry: formCountry,
          launchCountry: formLaunchCountry || null,
          isThirdCountry: formIsThirdCountry,
          targetSubmission: formTargetDate || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        setCreateError(errData?.error || `Request failed (${res.status})`);
        return;
      }
      const data = await res.json();
      setWorkflows((prev) => [data.workflow, ...prev]);
      setSelectedWorkflow(data.workflow);
      setShowNewWorkflowForm(false);
      setActiveStep(1); // Move to documents step
    } catch (error) {
      console.error("Error creating workflow:", error);
    } finally {
      setCreating(false);
    }
  };

  // PDF download removed — use AI Document Studio instead

  const updateDocumentStatus = async (documentId: string, status: string) => {
    if (!selectedWorkflow) return;

    // Optimistic update
    setSelectedWorkflow((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        documents: prev.documents.map((doc) =>
          doc.id === documentId ? { ...doc, status } : doc,
        ),
      };
    });

    try {
      const res = await fetch(
        `/api/authorization/${selectedWorkflow.id}/documents`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ documentId, status }),
        },
      );
      if (!res.ok) {
        // Revert optimistic update
        fetchData();
        const errData = await res.json().catch(() => ({}));
        console.error("Document update failed:", errData);
        return;
      }
    } catch (error) {
      console.error("Error updating document:", error);
      // Revert on error
      fetchData();
    }
  };

  // Calculate document progress
  const getDocumentProgress = () => {
    if (!selectedWorkflow) return { total: 0, ready: 0, percent: 0 };
    const required = selectedWorkflow.documents.filter((d) => d.required);
    const ready = required.filter(
      (d) =>
        d.status === "ready" ||
        d.status === "submitted" ||
        d.status === "approved",
    );
    return {
      total: required.length,
      ready: ready.length,
      percent:
        required.length > 0
          ? Math.round((ready.length / required.length) * 100)
          : 0,
    };
  };

  const progress = getDocumentProgress();

  // Days until enforcement
  const daysUntilEnforcement = Math.ceil(
    (new Date("2030-01-01").getTime() - Date.now()) / 86400000,
  );

  if (loading) {
    return (
      <div className="" role="status" aria-live="polite">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--surface-sunken)] rounded w-1/3" />
          <div className="h-4 bg-[var(--surface-sunken)] rounded w-1/2" />
          <div className="grid grid-cols-4 gap-4 mt-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-[var(--surface-sunken)] rounded-xl"
              />
            ))}
          </div>
        </div>
        <span className="sr-only">Loading authorization workflow...</span>
      </div>
    );
  }

  return (
    <div className="max-w-[1360px]">
      {/* Header */}
      <div className="mb-8">
        <p className="text-caption uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-3">
          MODULE 01
        </p>
        <h1 className="text-display-sm font-medium text-[var(--text-primary)] mb-1">
          Authorization Workflow
        </h1>
        <p className="text-body-lg text-[var(--text-secondary)]">
          Navigate the EU Space Act authorization process step by step
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <div
          className="flex items-center gap-2"
          role="tablist"
          aria-label="Authorization workflow steps"
        >
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                role="tab"
                aria-selected={activeStep === index}
                aria-controls={`tabpanel-${step.id}`}
                id={`tab-${step.id}`}
                onClick={() => setActiveStep(index)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeStep === index
                    ? "bg-[var(--surface-sunken)] border border-[var(--border-default)]"
                    : "hover:bg-[var(--surface-sunken)]"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-caption ${
                    activeStep === index
                      ? "bg-[var(--text-primary)] text-white"
                      : activeStep > index
                        ? "bg-[var(--accent-success-soft)] text-[var(--accent-success)]"
                        : "bg-[var(--surface-sunken)] text-[var(--text-secondary)]"
                  }`}
                >
                  {activeStep > index ? (
                    <CheckCircle2 size={12} aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="text-left hidden lg:block">
                  <p
                    className={`text-body font-medium ${activeStep === index ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
                  >
                    {step.label}
                  </p>
                  <p className="text-caption text-[var(--text-secondary)]">
                    {step.description}
                  </p>
                </div>
              </button>
              {index < STEPS.length - 1 && (
                <ChevronRight
                  size={16}
                  className="text-[var(--text-tertiary)] mx-1"
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {/* Step 1: NCA Determination */}
        {activeStep === 0 && (
          <motion.div
            key="nca"
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Existing workflows */}
            {workflows.length > 0 && !showNewWorkflowForm && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-caption uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                    Your Authorization Workflows
                  </p>
                  <button
                    onClick={() => setShowNewWorkflowForm(true)}
                    className="flex items-center gap-2 text-small text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    <Plus size={14} />
                    New Workflow
                  </button>
                </div>

                {workflows.map((workflow) => (
                  <button
                    key={workflow.id}
                    onClick={() => {
                      setSelectedWorkflow(workflow);
                      setActiveStep(1);
                    }}
                    className={`w-full bg-[var(--surface-sunken)] border rounded-xl p-5 text-left hover:bg-[var(--surface-sunken)] transition-all ${
                      selectedWorkflow?.id === workflow.id
                        ? "border-[var(--border-default)]"
                        : "border-[var(--border-default)]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Building2
                            size={18}
                            className="text-[var(--text-secondary)]"
                            aria-hidden="true"
                          />
                          <span className="text-subtitle font-medium text-[var(--text-primary)]">
                            {workflow.primaryNCAName}
                          </span>
                          <span
                            className={`text-micro uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              workflowStatusFlow[
                                workflow.status as keyof typeof workflowStatusFlow
                              ]?.bgColor || "bg-[var(--surface-sunken)]"
                            } ${
                              workflowStatusFlow[
                                workflow.status as keyof typeof workflowStatusFlow
                              ]?.color || "text-[var(--text-secondary)]"
                            }`}
                          >
                            {workflowStatusFlow[
                              workflow.status as keyof typeof workflowStatusFlow
                            ]?.label || workflow.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-small text-[var(--text-secondary)]">
                          <span className="flex items-center gap-1.5">
                            <Globe size={12} aria-hidden="true" />
                            {workflow.pathway.replace(/_/g, " ")}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <FileCheck size={12} aria-hidden="true" />
                            {
                              workflow.documents.filter(
                                (d) =>
                                  d.status === "ready" ||
                                  d.status === "submitted",
                              ).length
                            }
                            /{workflow.documents.length} documents ready
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={18}
                        className="text-[var(--text-secondary)]"
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state when no workflows exist */}
            {workflows.length === 0 && !showNewWorkflowForm && (
              <EmptyState
                icon={<Shield size={28} />}
                title="Start your authorization journey"
                description="Begin the NCA authorization process for your space operations."
                actionLabel="Start Authorization"
                onAction={() => setShowNewWorkflowForm(true)}
              />
            )}

            {/* New workflow form */}
            {showNewWorkflowForm && (
              <div className="space-y-6">
                <div className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl p-6">
                  <h2 className="text-title font-medium text-[var(--text-primary)] mb-4">
                    Determine Your Competent Authority
                  </h2>
                  <p className="text-body text-[var(--text-secondary)] mb-6">
                    Based on your operator type and establishment, we&apos;ll
                    identify which National Competent Authority (NCA) handles
                    your authorization.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Operator Type */}
                    <div>
                      <label className="block text-small text-[var(--text-secondary)] mb-2">
                        Operator Type
                      </label>
                      <select
                        value={formOperatorType}
                        onChange={(e) => setFormOperatorType(e.target.value)}
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      >
                        <option value="">Select operator type...</option>
                        <option value="SCO">Spacecraft Operator</option>
                        <option value="LO">Launch Operator</option>
                        <option value="LSO">Launch Site Operator</option>
                        <option value="ISOS">In-Space Services Provider</option>
                        <option value="PDP">Primary Data Provider</option>
                      </select>
                    </div>

                    {/* Third Country Toggle */}
                    <div>
                      <label className="block text-small text-[var(--text-secondary)] mb-2">
                        Establishment
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setFormIsThirdCountry(false)}
                          className={`flex-1 py-3 rounded-lg text-body transition-all ${
                            !formIsThirdCountry
                              ? "bg-[var(--surface-sunken)] text-[var(--text-primary)] border border-[var(--border-default)]"
                              : "bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-default)]"
                          }`}
                        >
                          EU Member State
                        </button>
                        <button
                          onClick={() => setFormIsThirdCountry(true)}
                          className={`flex-1 py-3 rounded-lg text-body transition-all ${
                            formIsThirdCountry
                              ? "bg-[var(--surface-sunken)] text-[var(--text-primary)] border border-[var(--border-default)]"
                              : "bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-default)]"
                          }`}
                        >
                          Third Country
                        </button>
                      </div>
                    </div>

                    {/* Country Selection (EU only) */}
                    {!formIsThirdCountry && (
                      <div>
                        <label className="block text-small text-[var(--text-secondary)] mb-2">
                          Country of Establishment
                        </label>
                        <select
                          value={formCountry}
                          onChange={(e) => setFormCountry(e.target.value)}
                          className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                        >
                          <option value="">Select country...</option>
                          {ncas.map((nca) => (
                            <option key={nca.id} value={nca.countryCode}>
                              {nca.country}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Launch Country (for launch operators only) */}
                    {formOperatorType === "LO" && !formIsThirdCountry && (
                      <div>
                        <label className="block text-small text-[var(--text-secondary)] mb-2">
                          Launch Country (if different)
                        </label>
                        <select
                          value={formLaunchCountry}
                          onChange={(e) => setFormLaunchCountry(e.target.value)}
                          className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                        >
                          <option value="">Same as establishment</option>
                          {ncas.map((nca) => (
                            <option key={nca.id} value={nca.countryCode}>
                              {nca.country}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Target Date */}
                    <div>
                      <label className="block text-small text-[var(--text-secondary)] mb-2">
                        Target Submission Date (optional)
                      </label>
                      <input
                        type="date"
                        value={formTargetDate}
                        onChange={(e) => setFormTargetDate(e.target.value)}
                        className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-3 text-body-lg focus:outline-none focus:border-[var(--border-default)]"
                      />
                    </div>
                  </div>
                  {formError && (
                    <p className="text-small text-red-500 mt-2">{formError}</p>
                  )}
                </div>

                {/* NCA Result */}
                {ncaDetermination && (
                  <motion.div
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-[var(--surface-sunken)]">
                        <Building2
                          size={24}
                          className="text-[var(--text-secondary)]"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-subtitle font-medium text-[var(--text-primary)] mb-1">
                          {ncaDetermination.primaryNCA.name}
                        </h3>
                        <p className="text-body text-[var(--text-secondary)] mb-4">
                          {ncaDetermination.primaryNCA.country} •{" "}
                          {ncaDetermination.pathway.replace(/_/g, " ")}
                        </p>

                        {/* Requirements */}
                        <div className="mb-4">
                          <p className="text-caption uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                            Requirements
                          </p>
                          <ul className="space-y-1.5">
                            {ncaDetermination.requirements.map((req, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-small text-[var(--text-secondary)]"
                              >
                                <ChevronRight
                                  size={12}
                                  className="mt-0.5 text-[var(--text-secondary)]"
                                  aria-hidden="true"
                                />
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Timeline & Articles */}
                        <div className="flex items-center gap-6 text-small">
                          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                            <Clock size={14} aria-hidden="true" />
                            <span>
                              Est. {ncaDetermination.estimatedTimeline}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                            <FileText size={14} aria-hidden="true" />
                            <span>
                              Art.{" "}
                              {ncaDetermination.relevantArticles.join(", ")}
                            </span>
                          </div>
                          {ncaDetermination.primaryNCA.website && (
                            <a
                              href={ncaDetermination.primaryNCA.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]"
                            >
                              <ExternalLink size={12} aria-hidden="true" />
                              Website
                            </a>
                          )}
                        </div>

                        {/* Notes */}
                        {ncaDetermination.notes && (
                          <div className="mt-4 p-3 bg-[var(--surface-sunken)] rounded-lg border border-[var(--border-default)]">
                            <div className="flex items-start gap-2">
                              <Info
                                size={14}
                                className="text-[var(--accent-warning)]/60 mt-0.5"
                                aria-hidden="true"
                              />
                              <p className="text-small text-[var(--text-secondary)]">
                                {ncaDetermination.notes}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Secondary NCAs */}
                    {ncaDetermination.secondaryNCAs &&
                      ncaDetermination.secondaryNCAs.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                          <p className="text-caption uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                            Additional Coordination Required
                          </p>
                          <div className="flex gap-3">
                            {ncaDetermination.secondaryNCAs.map((nca) => (
                              <div
                                key={nca.id}
                                className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-sunken)] rounded-lg"
                              >
                                <MapPin
                                  size={12}
                                  className="text-[var(--text-secondary)]"
                                  aria-hidden="true"
                                />
                                <span className="text-small text-[var(--text-secondary)]">
                                  {nca.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Create Button */}
                    {createError && (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 text-[var(--accent-danger)] text-body mt-6">
                        <AlertTriangle size={14} className="flex-shrink-0" />
                        {createError}
                      </div>
                    )}
                    <div className="mt-6 flex justify-end gap-3">
                      {workflows.length > 0 && (
                        <button
                          onClick={() => setShowNewWorkflowForm(false)}
                          className="px-4 py-2 text-body text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={createWorkflow}
                        disabled={creating}
                        className="flex items-center gap-2 bg-[var(--text-primary)] text-white px-5 py-2.5 rounded-lg font-medium text-body hover:bg-[var(--text-primary)] transition-all disabled:opacity-50"
                      >
                        {creating ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Plus size={14} />
                        )}
                        Start Authorization Workflow
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Document Checklist */}
        {activeStep === 1 && (
          <motion.div
            key="documents"
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {!selectedWorkflow ? (
              <div className="bg-[var(--surface-sunken)] border border-dashed border-[var(--border-default)] rounded-xl p-12 text-center">
                <AlertCircle
                  size={32}
                  className="mx-auto text-[var(--text-secondary)] mb-3"
                  aria-hidden="true"
                />
                <p className="text-body-lg text-[var(--text-secondary)] mb-4">
                  No workflow selected. Start by determining your NCA.
                </p>
                <button
                  onClick={() => setActiveStep(0)}
                  className="text-body text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]"
                >
                  ← Go to NCA Determination
                </button>
              </div>
            ) : (
              <>
                {/* Progress Overview */}
                <div className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-title font-medium text-[var(--text-primary)] mb-1">
                        Document Checklist
                      </h2>
                      <p className="text-body text-[var(--text-secondary)]">
                        {progress.ready} of {progress.total} required documents
                        ready
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[28px] font-semibold text-[var(--text-primary)]">
                        {progress.percent}%
                      </p>
                    </div>
                  </div>
                  <div className="h-2 bg-[var(--surface-sunken)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.percent}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-info)] rounded-full"
                      role="progressbar"
                      aria-valuenow={progress.percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Document completion progress"
                    />
                  </div>
                </div>

                {/* Document List */}
                <div className="space-y-3">
                  {selectedWorkflow.documents.map((doc) => {
                    const template = authorizationDocuments.find(
                      (t) => t.type === doc.documentType,
                    );
                    const CategoryIcon = template
                      ? documentCategoryIcons[template.category]
                      : FileText;
                    const statusInfo =
                      documentStatusFlow[
                        doc.status as keyof typeof documentStatusFlow
                      ];

                    return (
                      <div
                        key={doc.id}
                        className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-5 hover:border-[var(--border-default)] transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`p-2.5 rounded-lg ${statusInfo?.bgColor || "bg-[var(--surface-sunken)]"}`}
                          >
                            <CategoryIcon
                              size={18}
                              className={
                                statusInfo?.color ||
                                "text-[var(--text-secondary)]"
                              }
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-body-lg font-medium text-[var(--text-primary)]">
                                    {doc.name}
                                  </h3>
                                  {doc.required && (
                                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-[var(--accent-danger)]/10 text-[var(--accent-danger)] rounded">
                                      Required
                                    </span>
                                  )}
                                </div>
                                {doc.articleRef && (
                                  <span className="text-caption font-mono text-[var(--text-secondary)]">
                                    {doc.articleRef}
                                  </span>
                                )}
                              </div>

                              {/* Status Selector */}
                              <select
                                value={doc.status}
                                onChange={(e) =>
                                  updateDocumentStatus(doc.id, e.target.value)
                                }
                                aria-label={`Status for ${doc.name}`}
                                className={`text-caption uppercase tracking-wider px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] focus:outline-none ${statusInfo?.color || "text-[var(--text-secondary)]"}`}
                              >
                                <option value="not_started">Not Started</option>
                                <option value="in_progress">In Progress</option>
                                <option value="ready">Ready</option>
                                <option value="submitted">Submitted</option>
                              </select>
                            </div>

                            {doc.description && (
                              <p className="text-small text-[var(--text-secondary)] mb-3">
                                {doc.description}
                              </p>
                            )}

                            {/* Tips */}
                            {template?.tips &&
                              doc.status !== "ready" &&
                              doc.status !== "submitted" && (
                                <div className="mt-3 p-3 bg-[var(--surface-sunken)] rounded-lg">
                                  <p className="text-micro uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                                    Tips
                                  </p>
                                  <ul className="space-y-1">
                                    {template.tips.slice(0, 2).map((tip, i) => (
                                      <li
                                        key={i}
                                        className="text-caption text-[var(--text-secondary)] flex items-start gap-2"
                                      >
                                        <span className="text-[var(--text-tertiary)]">
                                          •
                                        </span>
                                        {tip}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                            {/* ASTRA AI Agent */}
                            <AstraButton
                              articleId={doc.documentType}
                              context={`Authorization document: ${doc.name}`}
                              articleRef={doc.articleRef || doc.documentType}
                              title={doc.name}
                              severity={doc.required ? "critical" : "major"}
                              regulationType="AUTHORIZATION"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Submit CTA when all documents are ready */}
                {progress.percent === 100 && (
                  <div className="mt-6 p-4 rounded-xl bg-[var(--fill-light)] border border-[var(--separator)]">
                    <p className="text-body font-medium text-[var(--text-primary)]">
                      Alle Dokumente sind bereit.
                    </p>
                    <button
                      onClick={() => setActiveStep(3)}
                      className="mt-2 px-4 py-2 rounded-lg bg-[var(--text-primary)] text-white dark:text-black text-body font-medium"
                    >
                      Zur Einreichung →
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Step 3: Timeline */}
        {activeStep === 2 && (
          <motion.div
            key="timeline"
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Countdown Card */}
            <div className="bg-gradient-to-br from-slate-50/5 to-slate-100/5 border border-[var(--border-default)] rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    EU Space Act Enforcement
                  </p>
                  <p className="text-display font-semibold text-[var(--text-primary)]">
                    {daysUntilEnforcement.toLocaleString()}
                  </p>
                  <p className="text-body text-[var(--text-secondary)]">
                    days until 01 January 2030
                  </p>
                </div>
                <Calendar
                  size={48}
                  className="text-[var(--text-primary)]"
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Key Dates Timeline */}
            <div className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl p-6">
              <h2 className="text-title font-medium text-[var(--text-primary)] mb-6">
                Key Milestones
              </h2>

              <div className="relative">
                <div className="absolute left-4 top-2 bottom-2 w-px bg-[var(--surface-sunken)]" />

                <div className="space-y-6">
                  {[
                    {
                      date: "Now",
                      title: "Begin Preparation",
                      description:
                        "Start gathering documentation and assessing requirements",
                      status: "current",
                    },
                    {
                      date: selectedWorkflow?.targetSubmission
                        ? new Date(
                            selectedWorkflow.targetSubmission,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })
                        : "6-12 months before launch",
                      title: "Submit Authorization Application",
                      description:
                        "Complete application to National Competent Authority",
                      status: "upcoming",
                    },
                    {
                      date: "1 Jan 2030",
                      title: "EU Space Act Enters into Force",
                      description:
                        "All new space activities must be authorized",
                      status: "upcoming",
                    },
                    {
                      date: "31 Dec 2031",
                      title: "Transitional Period Ends",
                      description: "Existing operators must comply",
                      status: "upcoming",
                    },
                  ].map((milestone, i) => (
                    <div key={i} className="relative flex gap-4 pl-8">
                      <div
                        className={`absolute left-2.5 w-3 h-3 rounded-full ${
                          milestone.status === "current"
                            ? "bg-[var(--accent-success-soft)]"
                            : milestone.status === "completed"
                              ? "bg-[var(--accent-success)]"
                              : "bg-[var(--surface-sunken)]"
                        }`}
                      />
                      <div>
                        <p className="text-caption text-[var(--text-secondary)] mb-1">
                          {milestone.date}
                        </p>
                        <p className="text-body-lg font-medium text-[var(--text-primary)] mb-0.5">
                          {milestone.title}
                        </p>
                        <p className="text-small text-[var(--text-secondary)]">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Document Deadlines */}
            {selectedWorkflow && (
              <div className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl p-6">
                <h2 className="text-title font-medium text-[var(--text-primary)] mb-4">
                  Document Deadlines
                </h2>
                <p className="text-body text-[var(--text-secondary)] mb-4">
                  Set individual deadlines for each document to track your
                  progress.
                </p>
                {(() => {
                  const requiredDocs = selectedWorkflow.documents.filter(
                    (d) => d.required,
                  );
                  const visibleDocs = showAllTimeline
                    ? requiredDocs
                    : requiredDocs.slice(0, 4);
                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {visibleDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 bg-[var(--surface-sunken)] rounded-lg"
                          >
                            <span className="text-small text-[var(--text-secondary)] truncate">
                              {doc.name}
                            </span>
                            <span className="text-caption text-[var(--text-secondary)]">
                              {doc.dueDate
                                ? new Date(doc.dueDate).toLocaleDateString()
                                : "No deadline set"}
                            </span>
                          </div>
                        ))}
                      </div>
                      {requiredDocs.length > 4 && (
                        <button
                          onClick={() => setShowAllTimeline(!showAllTimeline)}
                          className="mt-3 text-small text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors"
                        >
                          {showAllTimeline
                            ? "Weniger anzeigen"
                            : `Alle ${requiredDocs.length} anzeigen`}
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 4: Status Tracking */}
        {activeStep === 3 && (
          <motion.div
            key="status"
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {!selectedWorkflow ? (
              <div className="bg-[var(--surface-sunken)] border border-dashed border-[var(--border-default)] rounded-xl p-12 text-center">
                <AlertCircle
                  size={32}
                  className="mx-auto text-[var(--text-secondary)] mb-3"
                  aria-hidden="true"
                />
                <p className="text-body-lg text-[var(--text-secondary)] mb-4">
                  No workflow selected. Start by determining your NCA.
                </p>
                <button
                  onClick={() => setActiveStep(0)}
                  className="text-body text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]"
                >
                  ← Go to NCA Determination
                </button>
              </div>
            ) : (
              <>
                {/* Current Status */}
                <div className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-title font-medium text-[var(--text-primary)] mb-1">
                        Application Status
                      </h2>
                      <p className="text-body text-[var(--text-secondary)]">
                        {selectedWorkflow.primaryNCAName}
                      </p>
                    </div>
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        workflowStatusFlow[
                          selectedWorkflow.status as keyof typeof workflowStatusFlow
                        ]?.bgColor
                      }`}
                    >
                      <span
                        className={`text-body font-medium ${
                          workflowStatusFlow[
                            selectedWorkflow.status as keyof typeof workflowStatusFlow
                          ]?.color
                        }`}
                      >
                        {
                          workflowStatusFlow[
                            selectedWorkflow.status as keyof typeof workflowStatusFlow
                          ]?.label
                        }
                      </span>
                    </div>
                  </div>

                  {/* Status Steps */}
                  <div className="flex items-center gap-2">
                    {Object.entries(workflowStatusFlow)
                      .filter(([key]) => key !== "rejected")
                      .map(([key, value], index, arr) => {
                        const currentStep =
                          workflowStatusFlow[
                            selectedWorkflow.status as keyof typeof workflowStatusFlow
                          ]?.step || 0;
                        const isCompleted = value.step < currentStep;
                        const isCurrent = value.step === currentStep;

                        return (
                          <div key={key} className="flex-1 flex items-center">
                            <div
                              className={`flex-1 h-2 rounded-full ${
                                isCompleted || isCurrent
                                  ? "bg-gradient-to-r from-green-500/50 to-green-500"
                                  : "bg-[var(--surface-sunken)]"
                              }`}
                            />
                            {index < arr.length - 1 && (
                              <div
                                className={`w-3 h-3 rounded-full mx-1 ${
                                  isCompleted
                                    ? "bg-[var(--accent-success)]"
                                    : isCurrent
                                      ? "bg-[var(--accent-success-soft)]"
                                      : "bg-[var(--surface-sunken)]"
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Status Labels */}
                  <div className="flex justify-between mt-2">
                    {Object.entries(workflowStatusFlow)
                      .filter(([key]) => key !== "rejected")
                      .map(([key, value]) => (
                        <span
                          key={key}
                          className="text-micro text-[var(--text-secondary)]"
                        >
                          {value.label}
                        </span>
                      ))}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Started", date: selectedWorkflow.startedAt },
                    {
                      label: "Target Submission",
                      date: selectedWorkflow.targetSubmission,
                    },
                    { label: "Submitted", date: selectedWorkflow.submittedAt },
                    { label: "Approved", date: selectedWorkflow.approvedAt },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl p-4"
                    >
                      <p className="text-caption text-[var(--text-secondary)] mb-1">
                        {item.label}
                      </p>
                      <p className="text-body-lg text-[var(--text-secondary)]">
                        {item.date
                          ? new Date(item.date).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Link
                    href="/dashboard/documents/generate?type=AUTHORIZATION_APPLICATION"
                    className="flex items-center gap-2 bg-[var(--accent-primary-soft)] hover:bg-[var(--accent-success-soft)] border border-[var(--accent-success)/30] text-[var(--accent-primary)] px-5 py-2.5 rounded-lg font-medium text-body transition-all"
                  >
                    <Zap size={14} aria-hidden="true" />
                    Generate with ASTRA
                  </Link>
                  {selectedWorkflow.status === "in_progress" &&
                    progress.percent === 100 && (
                      <button
                        onClick={async () => {
                          setSubmitError(null);
                          const res = await fetch(
                            `/api/authorization/${selectedWorkflow.id}/submit`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                ...csrfHeaders(),
                              },
                            },
                          );
                          if (!res.ok) {
                            const errData = await res.json().catch(() => ({}));
                            const blockers = errData.blockers as
                              | { message: string }[]
                              | undefined;
                            if (blockers && blockers.length > 0) {
                              setSubmitError(
                                blockers.map((b) => b.message).join("; "),
                              );
                            } else {
                              setSubmitError(
                                errData.error ||
                                  `Submission failed (${res.status})`,
                              );
                            }
                            return;
                          }
                          fetchData();
                        }}
                        className="flex items-center gap-2 bg-[var(--text-primary)] text-white px-5 py-2.5 rounded-lg font-medium text-body hover:bg-[var(--text-primary)] transition-all"
                      >
                        <FileCheck size={14} />
                        Mark as Submitted
                      </button>
                    )}
                  {submitError && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 text-[var(--accent-danger)] text-body">
                      <AlertTriangle size={14} className="flex-shrink-0" />
                      {submitError}
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AuthorizationPage() {
  return (
    <FeatureGate module="authorization">
      <AuthorizationPageContent />
    </FeatureGate>
  );
}
