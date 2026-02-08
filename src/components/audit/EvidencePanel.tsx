"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Loader2,
  AlertCircle,
  FileText,
  CheckCircle2,
  Clock,
  X,
  ChevronDown,
  Paperclip,
  Shield,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Types ───

interface EvidenceDocument {
  id: string;
  document: {
    id: string;
    name: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
}

interface Evidence {
  id: string;
  title: string;
  description: string | null;
  evidenceType: string;
  status: string;
  validFrom: string | null;
  validUntil: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  documents: EvidenceDocument[];
  createdAt: string;
  updatedAt: string;
}

interface EvidencePanelProps {
  regulationType: string;
  requirementId: string;
}

const EVIDENCE_TYPES = [
  { value: "DOCUMENT", label: "Document" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "ATTESTATION", label: "Attestation" },
  { value: "POLICY", label: "Policy" },
  { value: "PROCEDURE", label: "Procedure" },
  { value: "TEST_RESULT", label: "Test Result" },
  { value: "LOG_EXTRACT", label: "Log Extract" },
  { value: "SCREENSHOT", label: "Screenshot" },
  { value: "EXTERNAL_REPORT", label: "External Report" },
  { value: "OTHER", label: "Other" },
];

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: "bg-slate-500/10", text: "text-slate-400" },
  SUBMITTED: { bg: "bg-blue-500/10", text: "text-blue-400" },
  ACCEPTED: { bg: "bg-green-500/10", text: "text-green-400" },
  REJECTED: { bg: "bg-red-500/10", text: "text-red-400" },
  EXPIRED: { bg: "bg-amber-500/10", text: "text-amber-400" },
};

export default function EvidencePanel({
  regulationType,
  requirementId,
}: EvidencePanelProps) {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("DOCUMENT");
  const [formDescription, setFormDescription] = useState("");

  const fetchEvidence = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/audit-center/evidence?regulationType=${regulationType}&requirementId=${requirementId}`,
      );
      if (!res.ok) throw new Error("Failed to load evidence");
      const data = await res.json();
      setEvidence(data.evidence || []);
    } catch {
      setError("Failed to load evidence");
    } finally {
      setLoading(false);
    }
  }, [regulationType, requirementId]);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  const handleSubmit = async () => {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/audit-center/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          regulationType,
          requirementId,
          title: formTitle.trim(),
          evidenceType: formType,
          description: formDescription.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create evidence");
      }
      setFormTitle("");
      setFormDescription("");
      setFormType("DOCUMENT");
      setShowAddForm(false);
      await fetchEvidence();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create evidence",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (evidenceId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/audit-center/evidence/${evidenceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await fetchEvidence();
    } catch {
      setError("Failed to update evidence status");
    }
  };

  const handleDelete = async (evidenceId: string) => {
    try {
      const res = await fetch(`/api/audit-center/evidence/${evidenceId}`, {
        method: "DELETE",
        headers: csrfHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchEvidence();
    } catch {
      setError("Failed to delete evidence");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2
          size={12}
          className="animate-spin text-slate-400 dark:text-white/30"
        />
        <span className="text-[10px] text-slate-400 dark:text-white/25">
          Loading evidence...
        </span>
      </div>
    );
  }

  return (
    <div className="pt-3 border-t border-slate-200 dark:border-white/[0.06]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Shield size={12} className="text-blue-400/60" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30">
            Compliance Evidence ({evidence.length})
          </span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 text-[10px] text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
        >
          {showAddForm ? <X size={10} /> : <Plus size={10} />}
          {showAddForm ? "Cancel" : "Add Evidence"}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-2 flex items-center gap-2">
          <AlertCircle size={10} className="text-red-400 flex-shrink-0" />
          <span className="text-[10px] text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={10} className="text-red-400" />
          </button>
        </div>
      )}

      {/* Add Evidence Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3"
          >
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 space-y-2">
              <input
                type="text"
                placeholder="Evidence title (e.g., 'ISO 27001 Certificate 2025')"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
              <div className="flex gap-2">
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-white/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                >
                  {EVIDENCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="flex-1 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !formTitle.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[11px] font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Plus size={10} />
                  )}
                  Add Evidence
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Evidence list */}
      {evidence.length > 0 && (
        <div className="space-y-1.5">
          {evidence.map((ev) => {
            const sc = statusColors[ev.status] || statusColors.DRAFT;
            return (
              <div
                key={ev.id}
                className="flex items-center justify-between bg-slate-50/60 dark:bg-white/[0.015] rounded-lg px-3 py-2 border border-slate-100/80 dark:border-white/[0.04] group"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText
                    size={12}
                    className="text-slate-400 dark:text-white/25 flex-shrink-0"
                  />
                  <span className="text-[11px] text-slate-700 dark:text-white/60 truncate">
                    {ev.title}
                  </span>
                  <span
                    className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${sc.bg} ${sc.text} flex-shrink-0`}
                  >
                    {ev.status}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-white/20 flex-shrink-0">
                    {ev.evidenceType.replace(/_/g, " ")}
                  </span>
                  {ev.documents.length > 0 && (
                    <span className="text-[9px] text-slate-400 dark:text-white/20 flex items-center gap-0.5 flex-shrink-0">
                      <Paperclip size={8} />
                      {ev.documents.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {ev.status === "DRAFT" && (
                    <button
                      onClick={() => handleStatusChange(ev.id, "SUBMITTED")}
                      className="text-[9px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5"
                    >
                      Submit
                    </button>
                  )}
                  {ev.status === "SUBMITTED" && (
                    <button
                      onClick={() => handleStatusChange(ev.id, "ACCEPTED")}
                      className="text-[9px] text-green-400 hover:text-green-300 px-1.5 py-0.5"
                    >
                      Accept
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(ev.id)}
                    className="text-[9px] text-red-400/50 hover:text-red-400 px-1.5 py-0.5"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {evidence.length === 0 && !showAddForm && (
        <p className="text-[10px] text-slate-400 dark:text-white/20 italic">
          No evidence attached yet
        </p>
      )}
    </div>
  );
}
