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
  const [step, setStep] = useState(0); // 0: type, 1: details, 2: review & sign
  const [selectedType, setSelectedType] = useState<AttestationType | null>(
    null,
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative w-full max-w-[640px] max-h-[85vh] glass-floating rounded-[var(--radius-xl)] border border-[var(--glass-border-medium)] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--separator)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[rgba(74,98,232,0.08)] flex items-center justify-center">
              <Shield className="w-4 h-4 text-[var(--accent-400)]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                Create Attestation
              </h2>
              <p className="text-[11px] text-[var(--text-tertiary)]">
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
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--fill-light)] transition-colors"
          >
            <X size={16} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 border-b border-[var(--separator)] flex items-center gap-2">
          {["Type", "Details", "Sign"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`w-8 h-px ${i <= step ? "bg-[var(--accent-primary)]" : "bg-[var(--fill-medium)]"}`}
                />
              )}
              <div
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium
                  ${
                    i === step
                      ? "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]"
                      : i < step
                        ? "bg-[var(--status-success-bg)] text-[var(--status-success)]"
                        : "bg-[var(--fill-light)] text-[var(--text-disabled)]"
                  }
                `}
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
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                      categoryFilter === "all"
                        ? "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]"
                        : "bg-[var(--fill-light)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    All
                  </button>
                  {ATTESTATION_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                        categoryFilter === cat
                          ? "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]"
                          : "bg-[var(--fill-light)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Type grid */}
                <div className="space-y-2">
                  {filteredTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleSelectType(type)}
                      className="w-full text-left px-4 py-3 glass-inset rounded-[var(--radius-md)] hover:bg-[var(--fill-light)] border border-transparent hover:border-[var(--fill-strong)] transition-all duration-[var(--duration-fast)] group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-[var(--text-primary)]">
                              {type.label}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--fill-light)] text-[var(--text-tertiary)] font-medium">
                              {type.category}
                            </span>
                          </div>
                          {type.id !== "custom" && (
                            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate">
                              {type.regulationName}
                            </p>
                          )}
                        </div>
                        <ChevronRight
                          size={14}
                          className="text-[var(--text-disabled)] group-hover:text-[var(--text-tertiary)] transition-colors"
                        />
                      </div>
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
                className="space-y-4"
              >
                {/* Regulation Ref */}
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
                    Regulation Reference
                  </label>
                  <input
                    type="text"
                    value={regulationRef}
                    onChange={(e) => setRegulationRef(e.target.value)}
                    placeholder="e.g. nis2_art_21"
                    disabled={selectedType?.id !== "custom"}
                    className="w-full px-3 py-2 text-[13px] bg-[var(--fill-light)] border border-[var(--fill-strong)] rounded-[var(--radius-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-60"
                  />
                </div>

                {/* Regulation Name */}
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
                    Regulation Name
                  </label>
                  <input
                    type="text"
                    value={regulationName}
                    onChange={(e) => setRegulationName(e.target.value)}
                    placeholder="e.g. NIS2 Directive Art. 21"
                    disabled={selectedType?.id !== "custom"}
                    className="w-full px-3 py-2 text-[13px] bg-[var(--fill-light)] border border-[var(--fill-strong)] rounded-[var(--radius-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors disabled:opacity-60"
                  />
                </div>

                {/* Claim Statement */}
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
                    Claim Statement
                  </label>
                  <textarea
                    value={claimStatement}
                    onChange={(e) => setClaimStatement(e.target.value)}
                    placeholder="Describe the compliance claim..."
                    rows={3}
                    className="w-full px-3 py-2 text-[13px] bg-[var(--fill-light)] border border-[var(--fill-strong)] rounded-[var(--radius-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors resize-none"
                  />
                </div>

                {/* Description (optional) */}
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
                    Description{" "}
                    <span className="text-[var(--text-disabled)]">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Internal notes or additional context..."
                    rows={2}
                    className="w-full px-3 py-2 text-[13px] bg-[var(--fill-light)] border border-[var(--fill-strong)] rounded-[var(--radius-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-primary)] focus:outline-none transition-colors resize-none"
                  />
                </div>

                {/* Expiry */}
                <div>
                  <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
                    Expires In
                  </label>
                  <div className="flex items-center gap-3">
                    {[30, 90, 180, 365].map((days) => (
                      <button
                        key={days}
                        onClick={() => setExpiresInDays(days)}
                        className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors ${
                          expiresInDays === days
                            ? "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border border-[rgba(74,98,232,0.2)]"
                            : "bg-[var(--fill-light)] text-[var(--text-tertiary)] border border-transparent hover:border-[var(--fill-strong)]"
                        }`}
                      >
                        {days}d
                      </button>
                    ))}
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
                className="space-y-4"
              >
                {/* Review card */}
                <div className="glass-inset rounded-[var(--radius-md)] p-4 space-y-3">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-secondary)]">
                    <FileSignature
                      size={14}
                      className="text-[var(--accent-400)]"
                    />
                    Attestation Summary
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3">
                      <span className="text-[11px] text-[var(--text-tertiary)] w-24 flex-shrink-0 pt-0.5">
                        Regulation
                      </span>
                      <span className="text-[12px] text-[var(--text-primary)] font-medium">
                        {regulationName}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-[11px] text-[var(--text-tertiary)] w-24 flex-shrink-0 pt-0.5">
                        Ref
                      </span>
                      <span className="text-[12px] text-[var(--text-secondary)] font-mono">
                        {regulationRef}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-[11px] text-[var(--text-tertiary)] w-24 flex-shrink-0 pt-0.5">
                        Claim
                      </span>
                      <span className="text-[12px] text-[var(--text-primary)]">
                        {claimStatement}
                      </span>
                    </div>
                    {description && (
                      <div className="flex items-start gap-3">
                        <span className="text-[11px] text-[var(--text-tertiary)] w-24 flex-shrink-0 pt-0.5">
                          Description
                        </span>
                        <span className="text-[12px] text-[var(--text-secondary)]">
                          {description}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <span className="text-[11px] text-[var(--text-tertiary)] w-24 flex-shrink-0 pt-0.5">
                        Expires
                      </span>
                      <span className="text-[12px] text-[var(--text-secondary)]">
                        {expiresInDays} days from now
                      </span>
                    </div>
                  </div>
                </div>

                {/* Trust level warning */}
                <div className="flex items-start gap-3 p-3 bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)] rounded-[var(--radius-md)]">
                  <AlertTriangle
                    size={14}
                    className="text-[var(--status-warning)] flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-[12px] font-medium text-[var(--status-warning)]">
                      Manual Attestation — LOW Trust Level
                    </p>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                      Self-declared attestations carry a LOW trust level
                      (0.50–0.69). They are cryptographically signed but not
                      backed by automated evidence collection.
                    </p>
                  </div>
                </div>

                {/* Crypto details */}
                <div className="glass-inset rounded-[var(--radius-md)] p-4">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-secondary)] mb-3">
                    <Fingerprint
                      size={14}
                      className="text-[var(--accent-400)]"
                    />
                    Cryptographic Signing
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)]" />
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        Ed25519 digital signature
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)]" />
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        SHA-256 value commitment
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--status-success)]" />
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        Publicly verifiable at caelex.eu/verity/verify
                      </span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] rounded-[var(--radius-md)]">
                    <p className="text-[12px] text-[var(--status-danger)]">
                      {error}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--separator)] flex items-center justify-between">
          <button
            onClick={() => (step === 0 ? handleClose() : setStep(step - 1))}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ChevronLeft size={14} />
            {step === 0 ? "Cancel" : "Back"}
          </button>

          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedToReview}
              className="flex items-center gap-1.5 px-5 py-2 bg-[var(--accent-primary)] text-white text-[13px] font-medium rounded-[var(--radius-sm)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Review & Sign
              <ChevronRight size={14} />
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-[var(--accent-primary)] text-white text-[13px] font-medium rounded-[var(--radius-sm)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileSignature size={14} />
              )}
              Sign & Create
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
