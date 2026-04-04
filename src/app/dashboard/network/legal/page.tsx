"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  Plus,
  Loader2,
  AlertCircle,
  X,
  Search,
  ChevronRight,
  ChevronLeft,
  Clock,
  Shield,
  Eye,
  Ban,
  Users,
  FileText,
  Building2,
  Mail,
  Calendar,
  Toggle,
  CheckCircle2,
} from "lucide-react";
import FeatureGate from "@/components/dashboard/FeatureGate";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Engagement Type Options (client-side mirror) ───

const ENGAGEMENT_TYPE_OPTIONS = [
  {
    id: "cra_notified_body",
    name: "CRA Notified Body Submission",
    description: "Review for Class I/II conformity assessment",
  },
  {
    id: "nis2_nca_registration",
    name: "NIS2 NCA Registration",
    description: "Legal support for NIS2 registration",
  },
  {
    id: "jurisdiction_selection",
    name: "Jurisdiktionswahl & Licensing",
    description: "Optimal jurisdiction selection",
  },
  {
    id: "incident_response",
    name: "Incident Response",
    description: "Support during active incidents",
  },
  {
    id: "export_control",
    name: "Export Control (ITAR/EAR)",
    description: "Export control compliance review",
  },
  {
    id: "full_compliance_review",
    name: "Full Compliance Audit",
    description: "Comprehensive review across all modules",
  },
  {
    id: "custom",
    name: "Custom",
    description: "Manually select data scope",
  },
];

// Auto-scope preview (for the review step)
const AUTO_SCOPE_PREVIEW: Record<string, string[]> = {
  cra_notified_body: ["CRA"],
  nis2_nca_registration: ["NIS2"],
  jurisdiction_selection: ["Authorization", "Space Law"],
  incident_response: ["NIS2", "CRA", "Cybersecurity"],
  export_control: ["Export Control"],
  full_compliance_review: ["All Modules"],
  custom: [],
};

const EXPIRY_OPTIONS = [
  { label: "30 Tage", value: 30 },
  { label: "60 Tage", value: 60 },
  { label: "90 Tage", value: 90 },
  { label: "180 Tage", value: 180 },
];

// ─── Types ───

interface Engagement {
  id: string;
  title: string;
  engagementType: string;
  status: string;
  expiresAt: string;
  allowExport: boolean;
  createdAt: string;
  note: string | null;
  scopedModules: string[];
  scopedDataTypes: string[];
  firm: {
    id: string;
    name: string;
    city: string | null;
  };
  _count: {
    attorneys: number;
    accessLogs: number;
    comments: number;
  };
}

// ─── Status Badge ───

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    pending: {
      label: "Pending",
      bg: "bg-white/10",
      text: "text-white/60",
    },
    active: {
      label: "Active",
      bg: "bg-white/15",
      text: "text-white",
    },
    completed: {
      label: "Completed",
      bg: "bg-white/10",
      text: "text-white/50",
    },
    revoked: {
      label: "Revoked",
      bg: "bg-white/5",
      text: "text-white/40",
    },
  };

  const c = config[status] || config.pending;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium uppercase tracking-wider ${c.bg} ${c.text}`}
    >
      {c.label}
    </span>
  );
}

// ─── Type Badge ───

function TypeBadge({ type }: { type: string }) {
  const found = ENGAGEMENT_TYPE_OPTIONS.find((t) => t.id === type);
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-white/8 text-white/50">
      {found?.name || type}
    </span>
  );
}

// ─── Engagement Card ───

function EngagementCard({
  engagement,
  onView,
  onRevoke,
}: {
  engagement: Engagement;
  onView: (id: string) => void;
  onRevoke: (id: string) => void;
}) {
  const expiryDate = new Date(engagement.expiresAt);
  const isExpired = expiryDate < new Date();
  const daysLeft = Math.ceil(
    (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-elevated rounded-2xl p-5 border border-white/[0.06]"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">
            {engagement.title}
          </h3>
          <p className="text-[12px] text-white/50 mt-0.5">
            {engagement.firm.name}
            {engagement.firm.city && ` — ${engagement.firm.city}`}
          </p>
        </div>
        <StatusBadge status={engagement.status} />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <TypeBadge type={engagement.engagementType} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">
            Attorneys
          </p>
          <p className="text-xs font-medium text-white/70">
            {engagement._count.attorneys}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">
            Access Logs
          </p>
          <p className="text-xs font-medium text-white/70">
            {engagement._count.accessLogs}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">
            Expires
          </p>
          <p
            className={`text-xs font-medium ${isExpired ? "text-white/40" : daysLeft <= 14 ? "text-white/60" : "text-white/70"}`}
          >
            {isExpired ? "Expired" : `${daysLeft}d left`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
        <button
          onClick={() => onView(engagement.id)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium text-white/70 bg-white/[0.06] hover:bg-white/10 transition-colors"
        >
          <Eye size={13} />
          View Details
        </button>
        {engagement.status !== "revoked" && (
          <button
            onClick={() => onRevoke(engagement.id)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium text-white/40 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          >
            <Ban size={13} />
            Revoke
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Create Engagement Modal ───

function CreateEngagementModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [selectedType, setSelectedType] = useState<string | null>(null);
  // Step 2
  const [attorneyEmail, setAttorneyEmail] = useState("");
  const [firmName, setFirmName] = useState("");
  const [expiryDays, setExpiryDays] = useState(90);
  const [allowExport, setAllowExport] = useState(false);
  const [note, setNote] = useState("");

  const reset = () => {
    setStep(1);
    setSelectedType(null);
    setAttorneyEmail("");
    setFirmName("");
    setExpiryDays(90);
    setAllowExport(false);
    setNote("");
    setError(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const canProceedStep1 = selectedType !== null;
  const canProceedStep2 =
    attorneyEmail.trim().length > 0 && firmName.trim().length > 0;

  const autoScopeModules = selectedType
    ? AUTO_SCOPE_PREVIEW[selectedType] || []
    : [];

  const handleSubmit = async () => {
    if (!selectedType) return;
    setSubmitting(true);
    setError(null);

    const expiresAt = new Date(
      Date.now() + expiryDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    const selectedTypeObj = ENGAGEMENT_TYPE_OPTIONS.find(
      (t) => t.id === selectedType,
    );

    try {
      const res = await fetch("/api/legal-engagements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          engagementType: selectedType,
          title: `${selectedTypeObj?.name || selectedType} — ${firmName}`,
          firmName,
          attorneyEmail,
          expiresAt,
          allowExport,
          note: note || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error || json.message || "Failed to create engagement",
        );
      }

      reset();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg glass-floating border-l border-white/[0.08] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 glass-elevated px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">
                  New Engagement
                </h2>
                <p className="text-[12px] text-white/50 mt-0.5">
                  Step {step} of 3
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step indicator */}
            <div className="px-6 pt-4 pb-2">
              <div className="flex gap-1.5">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      s <= step ? "bg-white/40" : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="px-6 py-4">
              {error && (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                  <AlertCircle
                    size={14}
                    className="text-white/50 flex-shrink-0"
                  />
                  <p className="text-xs text-white/60">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto text-white/30 hover:text-white/60"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <AnimatePresence mode="wait">
                {/* Step 1: Engagement Type */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h3 className="text-sm font-medium text-white mb-1">
                      Engagement Type
                    </h3>
                    <p className="text-[12px] text-white/50 mb-4">
                      Welche Art von rechtlicher Zusammenarbeit benötigen Sie?
                    </p>

                    <div className="space-y-2">
                      {ENGAGEMENT_TYPE_OPTIONS.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setSelectedType(type.id)}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${
                            selectedType === type.id
                              ? "bg-white/10 border-white/20"
                              : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                selectedType === type.id
                                  ? "border-white bg-white"
                                  : "border-white/30"
                              }`}
                            >
                              {selectedType === type.id && (
                                <div className="w-1.5 h-1.5 rounded-full bg-black" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">
                                {type.name}
                              </p>
                              <p className="text-[11px] text-white/45 mt-0.5">
                                {type.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Attorney Details */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h3 className="text-sm font-medium text-white mb-1">
                      Invite Attorney
                    </h3>
                    <p className="text-[12px] text-white/50 mb-4">
                      Geben Sie die Kontaktdaten der Kanzlei und des Anwalts an.
                    </p>

                    <div className="space-y-4">
                      {/* Attorney Email */}
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">
                          Attorney Email *
                        </label>
                        <div className="relative">
                          <Mail
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                          />
                          <input
                            type="email"
                            value={attorneyEmail}
                            onChange={(e) => setAttorneyEmail(e.target.value)}
                            placeholder="attorney@kanzlei.de"
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
                          />
                        </div>
                      </div>

                      {/* Firm Name */}
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">
                          Law Firm Name *
                        </label>
                        <div className="relative">
                          <Building2
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                          />
                          <input
                            type="text"
                            value={firmName}
                            onChange={(e) => setFirmName(e.target.value)}
                            placeholder="Kanzlei Name"
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
                          />
                        </div>
                      </div>

                      {/* Expiry */}
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">
                          Access Duration
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {EXPIRY_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setExpiryDays(opt.value)}
                              className={`px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${
                                expiryDays === opt.value
                                  ? "bg-white/15 text-white border border-white/20"
                                  : "bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/[0.08]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Export toggle */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div>
                          <p className="text-sm text-white">
                            Export Permission
                          </p>
                          <p className="text-[11px] text-white/40 mt-0.5">
                            Anwalt darf Daten exportieren
                          </p>
                        </div>
                        <button
                          onClick={() => setAllowExport(!allowExport)}
                          className={`relative w-10 h-5 rounded-full transition-colors ${
                            allowExport ? "bg-white/30" : "bg-white/10"
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                              allowExport ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Note */}
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">
                          Note (optional)
                        </label>
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Zusätzliche Hinweise..."
                          rows={3}
                          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors resize-none"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Review & Confirm */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h3 className="text-sm font-medium text-white mb-1">
                      Review & Confirm
                    </h3>
                    <p className="text-[12px] text-white/50 mb-4">
                      Überprüfen Sie die Engagement-Details.
                    </p>

                    <div className="space-y-3">
                      {/* Summary items */}
                      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3">
                        <div className="flex justify-between">
                          <span className="text-[11px] uppercase tracking-wider text-white/40">
                            Type
                          </span>
                          <span className="text-xs text-white/80 font-medium">
                            {ENGAGEMENT_TYPE_OPTIONS.find(
                              (t) => t.id === selectedType,
                            )?.name || selectedType}
                          </span>
                        </div>
                        <div className="border-t border-white/[0.04]" />
                        <div className="flex justify-between">
                          <span className="text-[11px] uppercase tracking-wider text-white/40">
                            Attorney
                          </span>
                          <span className="text-xs text-white/80">
                            {attorneyEmail}
                          </span>
                        </div>
                        <div className="border-t border-white/[0.04]" />
                        <div className="flex justify-between">
                          <span className="text-[11px] uppercase tracking-wider text-white/40">
                            Firm
                          </span>
                          <span className="text-xs text-white/80">
                            {firmName}
                          </span>
                        </div>
                        <div className="border-t border-white/[0.04]" />
                        <div className="flex justify-between">
                          <span className="text-[11px] uppercase tracking-wider text-white/40">
                            Expiry
                          </span>
                          <span className="text-xs text-white/80">
                            {expiryDays} Tage
                          </span>
                        </div>
                        <div className="border-t border-white/[0.04]" />
                        <div className="flex justify-between">
                          <span className="text-[11px] uppercase tracking-wider text-white/40">
                            Export
                          </span>
                          <span className="text-xs text-white/80">
                            {allowExport ? "Allowed" : "Disabled"}
                          </span>
                        </div>
                      </div>

                      {/* Auto-scope preview */}
                      {autoScopeModules.length > 0 && (
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                          <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">
                            Auto-Scope Modules
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {autoScopeModules.map((mod) => (
                              <span
                                key={mod}
                                className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/[0.06] text-white/60"
                              >
                                {mod}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {note && (
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                          <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">
                            Note
                          </p>
                          <p className="text-xs text-white/60">{note}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 glass-elevated px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
              <button
                onClick={() => {
                  if (step === 1) handleClose();
                  else setStep(step - 1);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium text-white/60 hover:text-white/80 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
              >
                <ChevronLeft size={14} />
                {step === 1 ? "Cancel" : "Back"}
              </button>

              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 1 && !canProceedStep1) ||
                    (step === 2 && !canProceedStep2)
                  }
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium text-white bg-white/15 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[13px] font-medium text-white bg-white/15 hover:bg-white/20 disabled:opacity-50 transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Engagement erstellen
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Page ───

export default function LegalEngagementsPage() {
  const router = useRouter();
  const { organization } = useOrganization();

  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchEngagements = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/legal-engagements");
      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error || json.message || "Failed to load engagements",
        );
      }

      setEngagements(json.data?.engagements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEngagements();
  }, [fetchEngagements]);

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this engagement?")) return;

    try {
      const res = await fetch(`/api/legal-engagements/${id}`, {
        method: "DELETE",
        headers: csrfHeaders(),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to revoke");
      }

      fetchEngagements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    }
  };

  const filteredEngagements = engagements.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.firm.name.toLowerCase().includes(q) ||
      e.engagementType.toLowerCase().includes(q)
    );
  });

  return (
    <FeatureGate module="network">
      <div className="min-h-screen p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08]">
                <Scale size={20} className="text-white/70" strokeWidth={1.5} />
              </div>
              <h1 className="text-xl font-semibold text-white">
                Legal Engagements
              </h1>
            </div>
            <p className="text-sm text-white/50 max-w-lg">
              Verwalten Sie den Zugriff Ihrer Anwaltskanzleien auf Ihre
              Compliance-Daten.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/[0.08] transition-colors"
          >
            <Plus size={15} />
            New Engagement
          </button>
        </div>

        {/* Search */}
        {engagements.length > 0 && (
          <div className="relative mb-6">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search engagements..."
              className="w-full max-w-md bg-white/[0.04] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/15 transition-colors"
            />
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <AlertCircle size={15} className="text-white/50 flex-shrink-0" />
            <p className="text-sm text-white/60 flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-white/30 hover:text-white/60 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={20} className="animate-spin text-white/40" />
              <p className="text-sm text-white/40">Loading engagements...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && engagements.length === 0 && !error && (
          <div className="glass-elevated rounded-2xl p-12 border border-white/[0.06]">
            <div className="text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                <Scale size={24} className="text-white/30" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-medium text-white mb-2">
                Noch keine Legal Engagements
              </h3>
              <p className="text-sm text-white/45 mb-6">
                Laden Sie eine Kanzlei ein, um Compliance-Daten sicher zu
                teilen.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/[0.08] rounded-xl transition-colors"
              >
                <Plus size={14} />
                New Engagement
              </button>
            </div>
          </div>
        )}

        {/* Engagement Grid */}
        {!loading && filteredEngagements.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEngagements.map((eng) => (
              <EngagementCard
                key={eng.id}
                engagement={eng}
                onView={(id) => router.push(`/dashboard/network/legal/${id}`)}
                onRevoke={handleRevoke}
              />
            ))}
          </div>
        )}

        {/* No search results */}
        {!loading &&
          engagements.length > 0 &&
          filteredEngagements.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm text-white/40">
                No engagements match your search.
              </p>
            </div>
          )}

        {/* Create Modal */}
        <CreateEngagementModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchEngagements();
          }}
        />
      </div>
    </FeatureGate>
  );
}
