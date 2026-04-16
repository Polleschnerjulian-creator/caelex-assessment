"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Shield,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  FileSignature,
  AlertTriangle,
  Calendar,
  Fingerprint,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import { ATTESTATION_TYPES, ATTESTATION_CATEGORIES } from "./attestation-types";
import type { AttestationType } from "./attestation-types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateAttestationModal({
  isOpen,
  onClose,
  onCreated,
}: Props) {
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState<AttestationType | null>(
    null,
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [regulationRef, setRegulationRef] = useState("");
  const [regulationName, setRegulationName] = useState("");
  const [claimStatement, setClaimStatement] = useState("");
  const [description, setDescription] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(90);

  const resetForm = () => {
    setStep(0);
    setSelectedType(null);
    setCategoryFilter("all");
    setRegulationRef("");
    setRegulationName("");
    setClaimStatement("");
    setDescription("");
    setExpiresInDays(90);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectType = (type: AttestationType) => {
    setSelectedType(type);
    if (type.id !== "custom") {
      setRegulationRef(type.regulationRef);
      setRegulationName(type.regulationName);
      setClaimStatement(type.claimStatement);
    } else {
      setRegulationRef("");
      setRegulationName("");
      setClaimStatement("");
    }
    setStep(1);
  };

  const canProceedToReview =
    regulationRef.length > 0 &&
    regulationName.length > 0 &&
    claimStatement.length > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/verity/attestation/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          regulation_ref: regulationRef,
          regulation_name: regulationName,
          claim_statement: claimStatement,
          description: description || undefined,
          expires_in_days: expiresInDays,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create attestation");
      }
      onCreated();
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create attestation",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredTypes =
    categoryFilter === "all"
      ? ATTESTATION_TYPES
      : ATTESTATION_TYPES.filter((t) => t.category === categoryFilter);

  const inputClass =
    "w-full px-3 py-2.5 rounded-xl bg-white border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
        role="dialog"
        aria-label="Create Attestation"
        aria-modal="true"
        className="relative w-full max-w-[600px] max-h-[85vh] bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-gray-900">
                Create Attestation
              </h2>
              <p className="text-[11px] text-gray-500">
                {step === 0
                  ? "Select attestation type"
                  : step === 1
                    ? "Configure details"
                    : "Review & sign"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close dialog"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2">
          {["Type", "Details", "Sign"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`w-8 h-px ${i <= step ? "bg-gray-900" : "bg-gray-200"}`}
                />
              )}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${i === step ? "bg-gray-900 text-white" : i < step ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}
              >
                {i < step ? <Check size={10} /> : null}
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Category filter */}
                <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${categoryFilter === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-700"}`}
                  >
                    All
                  </button>
                  {ATTESTATION_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${categoryFilter === cat ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-700"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Type list */}
                <div className="space-y-2">
                  {filteredTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleSelectType(type)}
                      className="w-full text-left px-4 py-3.5 rounded-xl border border-gray-100 hover:border-gray-300 hover:shadow-sm bg-white transition-all duration-150 group flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-medium text-gray-900 group-hover:text-black">
                            {type.name}
                          </span>
                          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            {type.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {type.regulationName}
                        </p>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-gray-300 group-hover:text-gray-900 transition-colors flex-shrink-0"
                      />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                      Regulation Reference *
                    </label>
                    <input
                      type="text"
                      value={regulationRef}
                      onChange={(e) => setRegulationRef(e.target.value)}
                      className={inputClass}
                      placeholder="e.g., NIS2 Art. 21"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                      Regulation Name *
                    </label>
                    <input
                      type="text"
                      value={regulationName}
                      onChange={(e) => setRegulationName(e.target.value)}
                      className={inputClass}
                      placeholder="e.g., NIS2 Directive"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                      Claim Statement *
                    </label>
                    <textarea
                      value={claimStatement}
                      onChange={(e) => setClaimStatement(e.target.value)}
                      className={`${inputClass} h-20 resize-none`}
                      placeholder="What are you attesting to?"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className={`${inputClass} h-16 resize-none`}
                      placeholder="Optional additional details"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                      <Calendar size={12} className="inline mr-1" />
                      Expires in (days)
                    </label>
                    <input
                      type="number"
                      value={expiresInDays}
                      onChange={(e) =>
                        setExpiresInDays(parseInt(e.target.value) || 90)
                      }
                      className={`${inputClass} w-32`}
                      min={1}
                      max={365}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Fingerprint size={16} className="text-gray-600" />
                    <span className="text-[14px] font-semibold text-gray-900">
                      Review & Sign
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        Regulation
                      </span>
                      <p className="text-[13px] text-gray-900 font-medium">
                        {regulationRef} — {regulationName}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        Claim
                      </span>
                      <p className="text-[13px] text-gray-700">
                        {claimStatement}
                      </p>
                    </div>
                    {description && (
                      <div>
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                          Description
                        </span>
                        <p className="text-[12px] text-gray-500">
                          {description}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        Validity
                      </span>
                      <p className="text-[13px] text-gray-700">
                        {expiresInDays} days
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      size={14}
                      className="text-amber-600 mt-0.5 flex-shrink-0"
                    />
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      By signing this attestation, you confirm the accuracy of
                      the above statements. This attestation will be
                      cryptographically signed and timestamped.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-[11px] text-red-600">{error}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => (step === 0 ? handleClose() : setStep(step - 1))}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={14} />
            {step === 0 ? "Cancel" : "Back"}
          </button>

          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !canProceedToReview}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-[12px] font-medium hover:bg-black disabled:opacity-30 transition-all"
            >
              Continue
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-[12px] font-medium hover:bg-black disabled:opacity-50 transition-all"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileSignature size={14} />
              )}
              {submitting ? "Signing..." : "Sign & Create"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
