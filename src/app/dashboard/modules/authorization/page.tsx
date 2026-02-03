"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  FileCheck,
  Clock,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
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
} from "lucide-react";
import { ncas, determineNCA, type NCADetermination } from "@/data/ncas";
import {
  authorizationDocuments,
  documentStatusFlow,
  workflowStatusFlow,
} from "@/data/authorization-documents";

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

const documentCategoryIcons: Record<string, React.ElementType> = {
  technical: FileText,
  legal: BookOpen,
  financial: DollarSign,
  environmental: Leaf,
  safety: Shield,
};

export default function AuthorizationPage() {
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

  // Computed NCA determination for form
  const [ncaDetermination, setNcaDetermination] =
    useState<NCADetermination | null>(null);

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
    if (!formOperatorType || (!formIsThirdCountry && !formCountry)) return;

    setCreating(true);
    try {
      const res = await fetch("/api/authorization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorType: formOperatorType,
          establishmentCountry: formCountry,
          launchCountry: formLaunchCountry || null,
          isThirdCountry: formIsThirdCountry,
          targetSubmission: formTargetDate || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setWorkflows((prev) => [data.workflow, ...prev]);
        setSelectedWorkflow(data.workflow);
        setShowNewWorkflowForm(false);
        setActiveStep(1); // Move to documents step
      }
    } catch (error) {
      console.error("Error creating workflow:", error);
    } finally {
      setCreating(false);
    }
  };

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
      await fetch(`/api/authorization/${selectedWorkflow.id}/documents`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, status }),
      });
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
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-white/[0.05] rounded w-1/3" />
          <div className="h-4 bg-white/[0.05] rounded w-1/2" />
          <div className="grid grid-cols-4 gap-4 mt-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-white/[0.04] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60 mb-3">
          MODULE 01
        </p>
        <h1 className="text-[24px] font-medium text-white mb-1">
          Authorization Workflow
        </h1>
        <p className="text-[14px] text-white/70">
          Navigate the EU Space Act authorization process step by step
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => setActiveStep(index)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeStep === index
                    ? "bg-white/[0.05] border border-white/[0.1]"
                    : "hover:bg-white/[0.04]"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono ${
                    activeStep === index
                      ? "bg-white text-black"
                      : activeStep > index
                        ? "bg-green-500/20 text-green-400"
                        : "bg-white/[0.05] text-white/70"
                  }`}
                >
                  {activeStep > index ? <CheckCircle2 size={12} /> : index + 1}
                </div>
                <div className="text-left hidden lg:block">
                  <p
                    className={`text-[13px] font-medium ${activeStep === index ? "text-white" : "text-white/60"}`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[11px] text-white/60">
                    {step.description}
                  </p>
                </div>
              </button>
              {index < STEPS.length - 1 && (
                <ChevronRight size={16} className="text-white/10 mx-1" />
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Existing workflows */}
            {workflows.length > 0 && !showNewWorkflowForm && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/30">
                    Your Authorization Workflows
                  </p>
                  <button
                    onClick={() => setShowNewWorkflowForm(true)}
                    className="flex items-center gap-2 text-[12px] text-white/60 hover:text-white/60 transition-colors"
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
                    className={`w-full bg-white/[0.04] border rounded-xl p-5 text-left hover:bg-white/[0.05] transition-all ${
                      selectedWorkflow?.id === workflow.id
                        ? "border-white/[0.15]"
                        : "border-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Building2 size={18} className="text-white/60" />
                          <span className="text-[15px] font-medium text-white">
                            {workflow.primaryNCAName}
                          </span>
                          <span
                            className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              workflowStatusFlow[
                                workflow.status as keyof typeof workflowStatusFlow
                              ]?.bgColor || "bg-white/[0.04]"
                            } ${
                              workflowStatusFlow[
                                workflow.status as keyof typeof workflowStatusFlow
                              ]?.color || "text-white/70"
                            }`}
                          >
                            {workflowStatusFlow[
                              workflow.status as keyof typeof workflowStatusFlow
                            ]?.label || workflow.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[12px] text-white/70">
                          <span className="flex items-center gap-1.5">
                            <Globe size={12} />
                            {workflow.pathway.replace(/_/g, " ")}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <FileCheck size={12} />
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
                      <ChevronRight size={18} className="text-white/60" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* New workflow form */}
            {(workflows.length === 0 || showNewWorkflowForm) && (
              <div className="space-y-6">
                <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
                  <h2 className="text-[16px] font-medium text-white mb-4">
                    Determine Your Competent Authority
                  </h2>
                  <p className="text-[13px] text-white/60 mb-6">
                    Based on your operator type and establishment, we&apos;ll
                    identify which National Competent Authority (NCA) handles
                    your authorization.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Operator Type */}
                    <div>
                      <label className="block text-[12px] text-white/60 mb-2">
                        Operator Type
                      </label>
                      <select
                        value={formOperatorType}
                        onChange={(e) => setFormOperatorType(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15]"
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
                      <label className="block text-[12px] text-white/60 mb-2">
                        Establishment
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setFormIsThirdCountry(false)}
                          className={`flex-1 py-3 rounded-lg text-[13px] transition-all ${
                            !formIsThirdCountry
                              ? "bg-white/[0.08] text-white border border-white/[0.15]"
                              : "bg-white/[0.04] text-white/60 border border-white/10"
                          }`}
                        >
                          EU Member State
                        </button>
                        <button
                          onClick={() => setFormIsThirdCountry(true)}
                          className={`flex-1 py-3 rounded-lg text-[13px] transition-all ${
                            formIsThirdCountry
                              ? "bg-white/[0.08] text-white border border-white/[0.15]"
                              : "bg-white/[0.04] text-white/60 border border-white/10"
                          }`}
                        >
                          Third Country
                        </button>
                      </div>
                    </div>

                    {/* Country Selection (EU only) */}
                    {!formIsThirdCountry && (
                      <div>
                        <label className="block text-[12px] text-white/60 mb-2">
                          Country of Establishment
                        </label>
                        <select
                          value={formCountry}
                          onChange={(e) => setFormCountry(e.target.value)}
                          className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15]"
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

                    {/* Launch Country (for launch operators) */}
                    {(formOperatorType === "LO" ||
                      formOperatorType === "LSO") &&
                      !formIsThirdCountry && (
                        <div>
                          <label className="block text-[12px] text-white/60 mb-2">
                            Launch Country (if different)
                          </label>
                          <select
                            value={formLaunchCountry}
                            onChange={(e) =>
                              setFormLaunchCountry(e.target.value)
                            }
                            className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15]"
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
                      <label className="block text-[12px] text-white/60 mb-2">
                        Target Submission Date (optional)
                      </label>
                      <input
                        type="date"
                        value={formTargetDate}
                        onChange={(e) => setFormTargetDate(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-white/[0.15]"
                      />
                    </div>
                  </div>
                </div>

                {/* NCA Result */}
                {ncaDetermination && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-white/[0.05]">
                        <Building2 size={24} className="text-white/60" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-[15px] font-medium text-white mb-1">
                          {ncaDetermination.primaryNCA.name}
                        </h3>
                        <p className="text-[13px] text-white/60 mb-4">
                          {ncaDetermination.primaryNCA.country} •{" "}
                          {ncaDetermination.pathway.replace(/_/g, " ")}
                        </p>

                        {/* Requirements */}
                        <div className="mb-4">
                          <p className="text-[11px] uppercase tracking-wider text-white/60 mb-2">
                            Requirements
                          </p>
                          <ul className="space-y-1.5">
                            {ncaDetermination.requirements
                              .slice(0, 5)
                              .map((req, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-[12px] text-white/70"
                                >
                                  <ChevronRight
                                    size={12}
                                    className="mt-0.5 text-white/60"
                                  />
                                  {req}
                                </li>
                              ))}
                          </ul>
                        </div>

                        {/* Timeline & Articles */}
                        <div className="flex items-center gap-6 text-[12px]">
                          <div className="flex items-center gap-2 text-white/70">
                            <Clock size={14} />
                            <span>
                              Est. {ncaDetermination.estimatedTimeline}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-white/70">
                            <FileText size={14} />
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
                              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300"
                            >
                              <ExternalLink size={12} />
                              Website
                            </a>
                          )}
                        </div>

                        {/* Notes */}
                        {ncaDetermination.notes && (
                          <div className="mt-4 p-3 bg-white/[0.04] rounded-lg border border-white/10">
                            <div className="flex items-start gap-2">
                              <Info
                                size={14}
                                className="text-amber-400/60 mt-0.5"
                              />
                              <p className="text-[12px] text-white/60">
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
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <p className="text-[11px] uppercase tracking-wider text-white/60 mb-3">
                            Additional Coordination Required
                          </p>
                          <div className="flex gap-3">
                            {ncaDetermination.secondaryNCAs.map((nca) => (
                              <div
                                key={nca.id}
                                className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] rounded-lg"
                              >
                                <MapPin size={12} className="text-white/70" />
                                <span className="text-[12px] text-white/70">
                                  {nca.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Create Button */}
                    <div className="mt-6 flex justify-end gap-3">
                      {workflows.length > 0 && (
                        <button
                          onClick={() => setShowNewWorkflowForm(false)}
                          className="px-4 py-2 text-[13px] text-white/60 hover:text-white/60 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={createWorkflow}
                        disabled={creating}
                        className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg font-medium text-[13px] hover:bg-white/90 transition-all disabled:opacity-50"
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {!selectedWorkflow ? (
              <div className="bg-white/[0.04] border border-dashed border-white/[0.08] rounded-xl p-12 text-center">
                <AlertCircle size={32} className="mx-auto text-white/60 mb-3" />
                <p className="text-[14px] text-white/60 mb-4">
                  No workflow selected. Start by determining your NCA.
                </p>
                <button
                  onClick={() => setActiveStep(0)}
                  className="text-[13px] text-blue-400 hover:text-blue-300"
                >
                  ← Go to NCA Determination
                </button>
              </div>
            ) : (
              <>
                {/* Progress Overview */}
                <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-[16px] font-medium text-white mb-1">
                        Document Checklist
                      </h2>
                      <p className="text-[13px] text-white/60">
                        {progress.ready} of {progress.total} required documents
                        ready
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[28px] font-mono font-semibold text-white">
                        {progress.percent}%
                      </p>
                    </div>
                  </div>
                  <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.percent}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
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
                        className="bg-white/[0.015] border border-white/10 rounded-xl p-5 hover:border-white/[0.08] transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`p-2.5 rounded-lg ${statusInfo?.bgColor || "bg-white/[0.04]"}`}
                          >
                            <CategoryIcon
                              size={18}
                              className={statusInfo?.color || "text-white/70"}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-[14px] font-medium text-white">
                                    {doc.name}
                                  </h3>
                                  {doc.required && (
                                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded">
                                      Required
                                    </span>
                                  )}
                                </div>
                                {doc.articleRef && (
                                  <span className="text-[11px] font-mono text-white/60">
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
                                className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] focus:outline-none ${statusInfo?.color || "text-white/70"}`}
                              >
                                <option value="not_started">Not Started</option>
                                <option value="in_progress">In Progress</option>
                                <option value="ready">Ready</option>
                                <option value="submitted">Submitted</option>
                              </select>
                            </div>

                            {doc.description && (
                              <p className="text-[12px] text-white/60 mb-3">
                                {doc.description}
                              </p>
                            )}

                            {/* Tips */}
                            {template?.tips &&
                              doc.status !== "ready" &&
                              doc.status !== "submitted" && (
                                <div className="mt-3 p-3 bg-white/[0.04] rounded-lg">
                                  <p className="text-[10px] uppercase tracking-wider text-white/60 mb-2">
                                    Tips
                                  </p>
                                  <ul className="space-y-1">
                                    {template.tips.slice(0, 2).map((tip, i) => (
                                      <li
                                        key={i}
                                        className="text-[11px] text-white/70 flex items-start gap-2"
                                      >
                                        <span className="text-white/10">•</span>
                                        {tip}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Step 3: Timeline */}
        {activeStep === 2 && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Countdown Card */}
            <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/60 mb-1">
                    EU Space Act Enforcement
                  </p>
                  <p className="text-[32px] font-mono font-semibold text-white">
                    {daysUntilEnforcement.toLocaleString()}
                  </p>
                  <p className="text-[13px] text-white/60">
                    days until 01 January 2030
                  </p>
                </div>
                <Calendar size={48} className="text-white/10" />
              </div>
            </div>

            {/* Key Dates Timeline */}
            <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
              <h2 className="text-[16px] font-medium text-white mb-6">
                Key Milestones
              </h2>

              <div className="relative">
                <div className="absolute left-4 top-2 bottom-2 w-px bg-white/[0.08]" />

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
                            ? "bg-blue-500"
                            : milestone.status === "completed"
                              ? "bg-green-500"
                              : "bg-white/[0.1]"
                        }`}
                      />
                      <div>
                        <p className="text-[11px] font-mono text-white/70 mb-1">
                          {milestone.date}
                        </p>
                        <p className="text-[14px] font-medium text-white mb-0.5">
                          {milestone.title}
                        </p>
                        <p className="text-[12px] text-white/60">
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
              <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
                <h2 className="text-[16px] font-medium text-white mb-4">
                  Document Deadlines
                </h2>
                <p className="text-[13px] text-white/60 mb-4">
                  Set individual deadlines for each document to track your
                  progress.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedWorkflow.documents
                    .filter((d) => d.required)
                    .slice(0, 4)
                    .map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-white/[0.04] rounded-lg"
                      >
                        <span className="text-[12px] text-white/60 truncate">
                          {doc.name}
                        </span>
                        <span className="text-[11px] font-mono text-white/70">
                          {doc.dueDate
                            ? new Date(doc.dueDate).toLocaleDateString()
                            : "No deadline set"}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 4: Status Tracking */}
        {activeStep === 3 && (
          <motion.div
            key="status"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {!selectedWorkflow ? (
              <div className="bg-white/[0.04] border border-dashed border-white/[0.08] rounded-xl p-12 text-center">
                <AlertCircle size={32} className="mx-auto text-white/60 mb-3" />
                <p className="text-[14px] text-white/60 mb-4">
                  No workflow selected. Start by determining your NCA.
                </p>
                <button
                  onClick={() => setActiveStep(0)}
                  className="text-[13px] text-blue-400 hover:text-blue-300"
                >
                  ← Go to NCA Determination
                </button>
              </div>
            ) : (
              <>
                {/* Current Status */}
                <div className="bg-white/[0.04] border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-[16px] font-medium text-white mb-1">
                        Application Status
                      </h2>
                      <p className="text-[13px] text-white/60">
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
                        className={`text-[13px] font-medium ${
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
                                  : "bg-white/[0.05]"
                              }`}
                            />
                            {index < arr.length - 1 && (
                              <div
                                className={`w-3 h-3 rounded-full mx-1 ${
                                  isCompleted
                                    ? "bg-green-500"
                                    : isCurrent
                                      ? "bg-blue-500"
                                      : "bg-white/[0.1]"
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
                        <span key={key} className="text-[10px] text-white/60">
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
                      className="bg-white/[0.04] border border-white/10 rounded-xl p-4"
                    >
                      <p className="text-[11px] text-white/60 mb-1">
                        {item.label}
                      </p>
                      <p className="text-[14px] font-mono text-white/60">
                        {item.date
                          ? new Date(item.date).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {selectedWorkflow.status === "in_progress" &&
                    progress.percent === 100 && (
                      <button
                        onClick={async () => {
                          await fetch(
                            `/api/authorization/${selectedWorkflow.id}`,
                            {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "submitted" }),
                            },
                          );
                          fetchData();
                        }}
                        className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg font-medium text-[13px] hover:bg-white/90 transition-all"
                      >
                        <FileCheck size={14} />
                        Mark as Submitted
                      </button>
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
