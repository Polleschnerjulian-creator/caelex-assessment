"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Scale,
  Shield,
  ClipboardCheck,
  Package,
  Landmark,
  Lightbulb,
  Rocket,
  Building2,
  FileText,
  Lock,
  Check,
} from "lucide-react";
import { type StakeholderType } from "./StakeholderTypeBadge";

interface InviteStakeholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InviteFormData) => void;
  organizationId: string;
}

export interface InviteFormData {
  type: StakeholderType;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  scope: string;
  contractReference: string;
  ipAllowlist: string;
  mfaRequired: boolean;
}

const STEP_LABELS = [
  "Select Type",
  "Company Details",
  "Scope & Contract",
  "Access Settings",
];

const STAKEHOLDER_TYPES: {
  type: StakeholderType;
  label: string;
  description: string;
  icon: typeof Scale;
  color: string;
}[] = [
  {
    type: "LEGAL_COUNSEL",
    label: "Legal Counsel",
    description: "External legal advisors for regulatory compliance",
    icon: Scale,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    type: "INSURER",
    label: "Insurer",
    description: "Insurance providers for space liability coverage",
    icon: Shield,
    color: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  },
  {
    type: "AUDITOR",
    label: "Auditor",
    description: "Third-party compliance auditors",
    icon: ClipboardCheck,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    type: "SUPPLIER",
    label: "Supplier",
    description: "Component or service suppliers in the supply chain",
    icon: Package,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    type: "NCA",
    label: "NCA",
    description: "National Competent Authority representatives",
    icon: Landmark,
    color: "text-red-400 bg-red-500/10 border-red-500/20",
  },
  {
    type: "CONSULTANT",
    label: "Consultant",
    description: "Regulatory or technical consultants",
    icon: Lightbulb,
    color: "text-lime-400 bg-lime-500/10 border-lime-500/20",
  },
  {
    type: "LAUNCH_PROVIDER",
    label: "Launch Provider",
    description: "Launch service providers for mission integration",
    icon: Rocket,
    color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};

export default function InviteStakeholderModal({
  isOpen,
  onClose,
  onSubmit,
  organizationId,
}: InviteStakeholderModalProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [formData, setFormData] = useState<InviteFormData>({
    type: "LEGAL_COUNSEL",
    companyName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    scope: "",
    contractReference: "",
    ipAllowlist: "",
    mfaRequired: true,
  });

  const updateField = useCallback(
    <K extends keyof InviteFormData>(key: K, value: InviteFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const goNext = () => {
    if (step < 3) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const ipList = formData.ipAllowlist
        .split(/[,\n]/)
        .map((ip) => ip.trim())
        .filter(Boolean);

      const res = await fetch("/api/network/engagements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          type: formData.type,
          companyName: formData.companyName,
          contactName: formData.contactName,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone || undefined,
          scope: formData.scope,
          contractRef: formData.contractReference || undefined,
          ipAllowlist: ipList.length > 0 ? ipList : undefined,
          mfaRequired: formData.mfaRequired,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to create engagement");
        setSubmitting(false);
        return;
      }

      const json = await res.json();
      const token = json.accessToken;

      setCreatedToken(token);
      setDirection(1);
      setStep(4); // success step
      onSubmit(formData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create engagement",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    setCreatedToken(null);
    setError(null);
    setFormData({
      type: "LEGAL_COUNSEL",
      companyName: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      scope: "",
      contractReference: "",
      ipAllowlist: "",
      mfaRequired: true,
    });
    onClose();
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return !!formData.type;
      case 1:
        return !!(
          formData.companyName &&
          formData.contactName &&
          formData.contactEmail
        );
      case 2:
        return !!formData.scope;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const stepIcons = [Scale, Building2, FileText, Lock];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={step === 4 ? handleClose : onClose}
      />

      {/* Modal */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-[--glass-border-subtle] rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[--glass-border-subtle]">
          <h2 className="text-heading font-semibold text-slate-900 dark:text-white">
            Invite Stakeholder
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white/70 hover:bg-slate-100 dark:hover:bg-[--glass-bg-surface] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        {step < 4 && (
          <div className="px-6 py-3 border-b border-slate-200 dark:border-[--glass-border-subtle]">
            <div className="flex items-center gap-2">
              {STEP_LABELS.map((label, i) => {
                const StepIcon = stepIcons[i];
                return (
                  <div key={label} className="flex items-center gap-2">
                    {i > 0 && (
                      <div
                        className={`w-6 h-px ${
                          i <= step
                            ? "bg-emerald-500"
                            : "bg-slate-200 dark:bg-white/10"
                        }`}
                      />
                    )}
                    <div
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-micro font-medium transition-colors ${
                        i === step
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : i < step
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-400 dark:text-white/30"
                      }`}
                    >
                      <StepIcon size={12} />
                      <span className="hidden sm:inline">{label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-5 min-h-[320px] overflow-hidden relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {step === 0 && (
                <div className="space-y-2">
                  <p className="text-body text-slate-600 dark:text-white/60 mb-4">
                    Select the type of stakeholder you want to invite.
                  </p>
                  <div className="grid gap-2">
                    {STAKEHOLDER_TYPES.map((st) => {
                      const Icon = st.icon;
                      const isSelected = formData.type === st.type;
                      return (
                        <button
                          key={st.type}
                          onClick={() => updateField("type", st.type)}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10"
                              : "border-slate-200 dark:border-[--glass-border-subtle] hover:border-slate-300 dark:hover:border-[--glass-border-hover]"
                          }`}
                        >
                          <div className={`p-2 rounded-lg border ${st.color}`}>
                            <Icon size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-body font-medium text-slate-900 dark:text-white">
                              {st.label}
                            </p>
                            <p className="text-caption text-slate-500 dark:text-white/50">
                              {st.description}
                            </p>
                          </div>
                          {isSelected && (
                            <Check
                              size={16}
                              className="text-emerald-500 ml-auto flex-shrink-0"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-body text-slate-600 dark:text-white/60 mb-4">
                    Enter the company and contact details.
                  </p>
                  <div>
                    <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) =>
                        updateField("companyName", e.target.value)
                      }
                      placeholder="e.g. Acme Space Legal GmbH"
                      className="w-full px-3 py-2 text-body bg-white dark:bg-[--glass-bg-elevated] border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) =>
                        updateField("contactName", e.target.value)
                      }
                      placeholder="e.g. Dr. Sarah Mueller"
                      className="w-full px-3 py-2 text-body bg-white dark:bg-[--glass-bg-elevated] border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
                      Contact Email *
                    </label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) =>
                        updateField("contactEmail", e.target.value)
                      }
                      placeholder="sarah@acmelegal.com"
                      className="w-full px-3 py-2 text-body bg-white dark:bg-[--glass-bg-elevated] border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
                      Phone (optional)
                    </label>
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) =>
                        updateField("contactPhone", e.target.value)
                      }
                      placeholder="+49 30 1234 5678"
                      className="w-full px-3 py-2 text-body bg-white dark:bg-[--glass-bg-elevated] border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-body text-slate-600 dark:text-white/60 mb-4">
                    Define the engagement scope and contract reference.
                  </p>
                  <div>
                    <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
                      Engagement Scope *
                    </label>
                    <textarea
                      value={formData.scope}
                      onChange={(e) => updateField("scope", e.target.value)}
                      placeholder="Describe the scope of this stakeholder's engagement..."
                      rows={4}
                      className="w-full px-3 py-2 text-body bg-white dark:bg-[--glass-bg-elevated] border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
                      Contract Reference (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.contractReference}
                      onChange={(e) =>
                        updateField("contractReference", e.target.value)
                      }
                      placeholder="e.g. CTR-2025-0042"
                      className="w-full px-3 py-2 text-body bg-white dark:bg-[--glass-bg-elevated] border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-body text-slate-600 dark:text-white/60 mb-4">
                    Configure access security settings.
                  </p>
                  <div>
                    <label className="block text-caption font-medium text-slate-700 dark:text-white/70 mb-1">
                      IP Allowlist (optional)
                    </label>
                    <textarea
                      value={formData.ipAllowlist}
                      onChange={(e) =>
                        updateField("ipAllowlist", e.target.value)
                      }
                      placeholder="Enter IP addresses or CIDR ranges, one per line..."
                      rows={3}
                      className="w-full px-3 py-2 text-body bg-white dark:bg-[--glass-bg-elevated] border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none font-mono text-small"
                    />
                    <p className="text-micro text-slate-400 dark:text-white/30 mt-1">
                      Leave empty to allow access from any IP address.
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-[--glass-border-subtle] bg-slate-50 dark:bg-[--glass-bg-surface]">
                    <div>
                      <p className="text-body font-medium text-slate-900 dark:text-white">
                        Require MFA
                      </p>
                      <p className="text-caption text-slate-500 dark:text-white/50">
                        Require multi-factor authentication for portal access
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        updateField("mfaRequired", !formData.mfaRequired)
                      }
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        formData.mfaRequired
                          ? "bg-emerald-500"
                          : "bg-slate-300 dark:bg-white/20"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                          formData.mfaRequired
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-emerald-500/10 mb-2">
                    <Check size={24} className="text-emerald-500" />
                  </div>
                  <h3 className="text-heading font-semibold text-slate-900 dark:text-white text-center">
                    Einladung erstellt
                  </h3>
                  <p className="text-body text-slate-600 dark:text-white/60 text-center">
                    Teilen Sie diesen Zugangscode mit dem Stakeholder:
                  </p>
                  <div className="font-mono text-small bg-slate-100 dark:bg-[--glass-bg-surface] p-3 rounded-lg break-all select-all border border-slate-200 dark:border-[--glass-border-subtle]">
                    {createdToken}
                  </div>
                  <button
                    onClick={() => {
                      if (createdToken)
                        navigator.clipboard.writeText(createdToken);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-body font-medium bg-slate-100 dark:bg-[--glass-bg-surface] hover:bg-slate-200 dark:hover:bg-[--glass-bg-elevated] border border-slate-200 dark:border-[--glass-border-subtle] rounded-lg text-slate-700 dark:text-white/70 transition-colors"
                  >
                    Kopieren
                  </button>
                  <p className="text-small text-slate-400 dark:text-white/30 text-center">
                    Dieser Code wird nur einmal angezeigt. Speichern Sie ihn
                    sicher.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mb-0 mt-0 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
            <X size={14} className="text-red-500 flex-shrink-0" />
            <p className="text-small text-red-600 dark:text-red-400 flex-1">
              {error}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-[--glass-border-subtle]">
          {step === 4 ? (
            <>
              <div />
              <button
                onClick={handleClose}
                className="flex items-center gap-1.5 px-5 py-2 text-body font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
              >
                Fertig
                <Check size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={step === 0 ? onClose : goBack}
                className="flex items-center gap-1.5 px-4 py-2 text-body font-medium text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                {step > 0 && <ChevronLeft size={14} />}
                {step === 0 ? "Cancel" : "Back"}
              </button>
              {step < 3 ? (
                <button
                  onClick={goNext}
                  disabled={!canProceed()}
                  className="flex items-center gap-1.5 px-5 py-2 text-body font-medium bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Continue
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 text-body font-medium bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {submitting ? "Sending..." : "Send Invitation"}
                  <Check size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
