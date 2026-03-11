"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Satellite,
  Radio,
  Link,
  Server,
  Building2,
  Check,
  Loader2,
} from "lucide-react";
import { ASSET_CATEGORIES, getAssetTypeConfig } from "@/lib/nexus/types";
import type { CreateAssetInput } from "@/lib/nexus/validations";

interface AddAssetWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAssetInput) => Promise<void>;
}

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  SPACE_SEGMENT: <Satellite size={24} strokeWidth={1.5} />,
  GROUND_SEGMENT: <Radio size={24} strokeWidth={1.5} />,
  LINK_SEGMENT: <Link size={24} strokeWidth={1.5} />,
  SOFTWARE_DATA: <Server size={24} strokeWidth={1.5} />,
  ORGANISATIONAL: <Building2 size={24} strokeWidth={1.5} />,
};

const CRITICALITY_OPTIONS = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
const DATA_CLASSIFICATION_OPTIONS = [
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
] as const;
const OPERATIONAL_STATUS_OPTIONS = [
  "ACTIVE",
  "STANDBY",
  "MAINTENANCE",
  "DECOMMISSIONED",
  "PLANNED",
] as const;

const stepVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as number[] },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -40 : 40,
    opacity: 0,
    transition: { duration: 0.2 },
  }),
};

interface FormState {
  category: string;
  assetType: string;
  name: string;
  description: string;
  criticality: string;
  dataClassification: string;
  operationalStatus: string;
  location: string;
  jurisdiction: string;
}

const initialForm: FormState = {
  category: "",
  assetType: "",
  name: "",
  description: "",
  criticality: "MEDIUM",
  dataClassification: "INTERNAL",
  operationalStatus: "ACTIVE",
  location: "",
  jurisdiction: "",
};

export default function AddAssetWizard({
  isOpen,
  onClose,
  onSubmit,
}: AddAssetWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    setDirection(1);
    setStep((s) => s + 1);
  }

  function back() {
    setDirection(-1);
    setStep((s) => s - 1);
  }

  function reset() {
    setStep(0);
    setDirection(1);
    setForm(initialForm);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateAssetInput = {
        name: form.name,
        assetType: form.assetType,
        description: form.description || undefined,
        criticality: form.criticality as CreateAssetInput["criticality"],
        dataClassification:
          form.dataClassification as CreateAssetInput["dataClassification"],
        operationalStatus:
          form.operationalStatus as CreateAssetInput["operationalStatus"],
        location: form.location || undefined,
        jurisdiction: form.jurisdiction || undefined,
      };
      await onSubmit(payload);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create asset");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCategory = ASSET_CATEGORIES.find((c) => c.id === form.category);
  const selectedTypeConfig = form.assetType
    ? getAssetTypeConfig(form.assetType as never)
    : null;
  const nis2Count = selectedTypeConfig?.defaultNis2Requirements.length ?? 0;

  const canProceedStep0 = Boolean(form.category && form.assetType);
  const canProceedStep1 = Boolean(form.name.trim());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="glass-floating relative w-full max-w-xl rounded-[var(--radius-lg)] border border-[var(--glass-border)] overflow-hidden"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--glass-border)]">
          <div>
            <h2 className="text-heading font-semibold text-white">Add Asset</h2>
            <p className="text-small text-slate-400 mt-0.5">
              Step {step + 1} of 3
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-[var(--glass-border)]">
          {["Category & Type", "Details", "Review"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full text-caption font-semibold transition-colors ${
                  i < step
                    ? "bg-emerald-500 text-white"
                    : i === step
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-white/5 text-slate-500"
                }`}
              >
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span
                className={`text-small ${i === step ? "text-slate-200" : "text-slate-500"}`}
              >
                {label}
              </span>
              {i < 2 && <div className="w-6 h-px bg-[var(--glass-border)]" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-5" style={{ minHeight: 320 }}>
          <AnimatePresence mode="wait" custom={direction}>
            {step === 0 && (
              <motion.div
                key="step0"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <p className="text-body text-slate-400 mb-4">
                  Select the category and type for this asset.
                </p>

                {/* Category cards */}
                <div className="grid grid-cols-1 gap-2 mb-4 sm:grid-cols-2 lg:grid-cols-3">
                  {ASSET_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        update("category", cat.id);
                        update("assetType", "");
                      }}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                        form.category === cat.id
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                          : "border-[var(--glass-border)] bg-white/[0.02] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                      }`}
                    >
                      <span
                        className={
                          form.category === cat.id
                            ? "text-emerald-400"
                            : "text-slate-400"
                        }
                      >
                        {CATEGORY_ICON_MAP[cat.id]}
                      </span>
                      <div>
                        <p className="text-small font-medium text-slate-200">
                          {cat.label}
                        </p>
                        <p className="text-caption text-slate-500 mt-0.5">
                          {cat.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Type dropdown */}
                {selectedCategory && (
                  <div>
                    <label className="block text-small font-medium text-slate-300 mb-1.5">
                      Asset Type
                    </label>
                    <select
                      value={form.assetType}
                      onChange={(e) => update("assetType", e.target.value)}
                      className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-body text-slate-200 focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="">Select type…</option>
                      {selectedCategory.types.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4"
              >
                <div>
                  <label className="block text-small font-medium text-slate-300 mb-1.5">
                    Asset Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="e.g. LEO-SAT-001"
                    className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-body text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-small font-medium text-slate-300 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Optional description…"
                    rows={2}
                    className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-body text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-small font-medium text-slate-300 mb-1.5">
                      Criticality
                    </label>
                    <select
                      value={form.criticality}
                      onChange={(e) => update("criticality", e.target.value)}
                      className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-body text-slate-200 focus:outline-none focus:border-emerald-500/50"
                    >
                      {CRITICALITY_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-small font-medium text-slate-300 mb-1.5">
                      Data Classification
                    </label>
                    <select
                      value={form.dataClassification}
                      onChange={(e) =>
                        update("dataClassification", e.target.value)
                      }
                      className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-body text-slate-200 focus:outline-none focus:border-emerald-500/50"
                    >
                      {DATA_CLASSIFICATION_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-small font-medium text-slate-300 mb-1.5">
                      Operational Status
                    </label>
                    <select
                      value={form.operationalStatus}
                      onChange={(e) =>
                        update("operationalStatus", e.target.value)
                      }
                      className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-body text-slate-200 focus:outline-none focus:border-emerald-500/50"
                    >
                      {OPERATIONAL_STATUS_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-small font-medium text-slate-300 mb-1.5">
                      Jurisdiction (ISO 3166)
                    </label>
                    <input
                      type="text"
                      value={form.jurisdiction}
                      onChange={(e) =>
                        update(
                          "jurisdiction",
                          e.target.value.toUpperCase().slice(0, 2),
                        )
                      }
                      placeholder="DE"
                      maxLength={2}
                      className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-body text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-small font-medium text-slate-300 mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    placeholder="e.g. LEO 550km SSO"
                    className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-body text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-4"
              >
                <div className="rounded-lg border border-[var(--glass-border)] bg-white/[0.02] p-4 space-y-3">
                  <h4 className="text-body font-semibold text-slate-200">
                    Review Summary
                  </h4>
                  {[
                    ["Name", form.name],
                    ["Category", selectedCategory?.label ?? form.category],
                    ["Type", selectedTypeConfig?.label ?? form.assetType],
                    ["Criticality", form.criticality],
                    ["Data Classification", form.dataClassification],
                    ["Operational Status", form.operationalStatus],
                    ["Location", form.location || "—"],
                    ["Jurisdiction", form.jurisdiction || "—"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between text-small"
                    >
                      <span className="text-slate-400">{label}</span>
                      <span className="text-slate-200 font-medium">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                {nis2Count > 0 && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <p className="text-small text-emerald-400">
                      <span className="font-semibold">
                        {nis2Count} NIS2 requirements
                      </span>{" "}
                      will be auto-mapped to this asset upon creation.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <p className="text-small text-red-400">{error}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--glass-border)]">
          <button
            onClick={step === 0 ? handleClose : back}
            className="flex items-center gap-1.5 px-4 py-2 text-body text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            {step === 0 ? (
              "Cancel"
            ) : (
              <>
                <ChevronLeft size={16} />
                Back
              </>
            )}
          </button>
          <button
            onClick={step === 2 ? handleSubmit : next}
            disabled={
              (step === 0 && !canProceedStep0) ||
              (step === 1 && !canProceedStep1) ||
              submitting
            }
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-body font-medium rounded-lg transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating…
              </>
            ) : step === 2 ? (
              "Create Asset"
            ) : (
              <>
                Next
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
