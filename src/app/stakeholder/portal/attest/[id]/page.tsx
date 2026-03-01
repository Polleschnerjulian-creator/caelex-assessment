"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Shield,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Hash,
  FileCheck,
  BadgeCheck,
  Copy,
  Check,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import SignAttestationForm, {
  type AttestationFormData,
} from "@/components/network/SignAttestationForm";
import HashChainVisualizer, {
  type HashChainNode,
} from "@/components/network/HashChainVisualizer";
import AttestationTimeline from "@/components/network/AttestationTimeline";
import { type Attestation as AttestationCardType } from "@/components/network/AttestationCard";
import { type StakeholderEngagement } from "@/components/network/StakeholderCard";

interface AttestationDetail {
  id: string;
  title: string;
  statement: string;
  scope: string;
  scopeSummary?: string;
  status: "PENDING" | "SIGNED" | "EXPIRED" | "REJECTED";
  createdAt: string;
  dueDate?: string;
  signedAt?: string;
  signedBy?: string;
  hash?: string;
  previousHash?: string;
  chainIndex?: number;
  hashChain?: HashChainEntry[];
  timeline?: TimelineEntry[];
  orgName?: string;
}

interface HashChainEntry {
  index: number;
  hash: string;
  previousHash: string;
  timestamp: string;
  action: string;
  actor: string;
}

interface TimelineEntry {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  details?: string;
}

export default function AttestationSigningPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const isNewAttestation = id === "new";

  const [attestation, setAttestation] = useState<AttestationDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(!isNewAttestation);
  const [error, setError] = useState<string | null>(null);

  // Signing state
  const [confirmed, setConfirmed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signResult, setSignResult] = useState<{
    hash: string;
    signedAt: string;
  } | null>(null);

  // Hash copy state
  const [copied, setCopied] = useState(false);

  const getToken = () => {
    return (
      localStorage.getItem("stakeholder_token") ||
      sessionStorage.getItem("stakeholder_token")
    );
  };

  const fetchAttestation = useCallback(async () => {
    if (isNewAttestation) return;

    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/stakeholder/attestations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Attestation not found");
        if (res.status === 403) throw new Error("Access denied");
        throw new Error("Failed to load attestation");
      }

      const data = await res.json();
      setAttestation(data);

      if (data.status === "SIGNED") {
        setSigned(true);
        setSignResult({
          hash: data.hash || "",
          signedAt: data.signedAt || "",
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load attestation",
      );
    } finally {
      setLoading(false);
    }
  }, [id, isNewAttestation]);

  useEffect(() => {
    fetchAttestation();
  }, [fetchAttestation]);

  const handleSign = async () => {
    const token = getToken();
    if (!token || !confirmed) return;

    setSigning(true);

    try {
      const res = await fetch("/api/stakeholder/attestations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attestationId: id,
          confirmed: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to sign attestation");
      }

      const result = await res.json();
      setSignResult({
        hash: result.hash || result.attestation?.hash || "",
        signedAt:
          result.signedAt ||
          result.attestation?.signedAt ||
          new Date().toISOString(),
      });
      setSigned(true);

      // Refresh attestation data to get updated chain
      if (!isNewAttestation) {
        await fetchAttestation();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signing failed");
    } finally {
      setSigning(false);
    }
  };

  const handleNewAttestationSubmit = async (data: AttestationFormData) => {
    const token = getToken();
    if (!token) return;

    setSigning(true);
    setError(null);

    try {
      const res = await fetch("/api/stakeholder/attestations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create attestation");
      }

      const result = await res.json();
      setSignResult({
        hash: result.hash || "",
        signedAt: result.signedAt || new Date().toISOString(),
      });
      setSigned(true);

      // Redirect to the new attestation page
      if (result.id) {
        router.replace(`/stakeholder/portal/attest/${result.id}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create attestation",
      );
    } finally {
      setSigning(false);
    }
  };

  const copyHash = async () => {
    if (!signResult?.hash) return;
    try {
      await navigator.clipboard.writeText(signResult.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may not be available
    }
  };

  const statusConfig = {
    PENDING: {
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      label: "Pending Signature",
      icon: Clock,
    },
    SIGNED: {
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      label: "Signed",
      icon: CheckCircle2,
    },
    EXPIRED: {
      color: "text-red-500",
      bg: "bg-red-500/10",
      label: "Expired",
      icon: AlertCircle,
    },
    REJECTED: {
      color: "text-red-500",
      bg: "bg-red-500/10",
      label: "Rejected",
      icon: AlertCircle,
    },
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
          <p className="text-body text-slate-500 dark:text-white/50">
            Loading attestation...
          </p>
        </div>
      </div>
    );
  }

  // Error State (for existing attestations)
  if (!isNewAttestation && (error || !attestation) && !signed) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h2 className="text-title font-semibold text-slate-800 dark:text-white mb-2">
            {error || "Attestation not found"}
          </h2>
          <div className="flex items-center justify-center gap-3 mt-6">
            <a
              href="/stakeholder/portal"
              className="inline-flex items-center gap-2 text-small font-medium text-slate-500 dark:text-white/50 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </a>
            <button
              onClick={fetchAttestation}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-small rounded-lg px-4 py-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // New Attestation Form
  if (isNewAttestation && !signed) {
    return (
      <div>
        {/* Breadcrumb */}
        <div className="mb-6">
          <a
            href="/stakeholder/portal"
            className="inline-flex items-center gap-1.5 text-small text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </a>
        </div>

        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-6">
            <h1 className="text-display-sm font-semibold text-slate-800 dark:text-white mb-2">
              Create New Attestation
            </h1>
            <p className="text-body-lg text-slate-500 dark:text-white/50">
              Submit a new compliance attestation for review and verification.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-body text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          )}

          <GlassCard hover={false} className="p-6">
            <SignAttestationForm
              onSubmit={handleNewAttestationSubmit}
              engagement={{
                id: "",
                companyName: "",
                contactName: "",
                contactEmail: "",
                type: "LEGAL_COUNSEL",
                status: "ACTIVE",
                lastAccessAt: null,
                dataRoomCount: 0,
                attestationCount: 0,
              }}
              attestationTypes={[
                {
                  value: "COMPLIANCE_DECLARATION",
                  label: "Compliance Declaration",
                },
                { value: "AUDIT_REPORT", label: "Audit Report" },
                { value: "NDA_ACKNOWLEDGMENT", label: "NDA Acknowledgment" },
                {
                  value: "INSURANCE_CONFIRMATION",
                  label: "Insurance Confirmation",
                },
                {
                  value: "SUPPLIER_CERTIFICATION",
                  label: "Supplier Certification",
                },
                { value: "REGULATORY_APPROVAL", label: "Regulatory Approval" },
              ]}
            />
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  // Success State (after signing)
  if (signed && signResult) {
    return (
      <div>
        {/* Breadcrumb */}
        <div className="mb-6">
          <a
            href="/stakeholder/portal"
            className="inline-flex items-center gap-1.5 text-small text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </a>
        </div>

        <motion.div
          initial={false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          {/* Success Card */}
          <GlassCard hover={false} highlighted className="p-8 mb-6">
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-6"
              >
                <BadgeCheck className="w-10 h-10 text-emerald-500" />
              </motion.div>
              <h2 className="text-display-sm font-semibold text-slate-800 dark:text-white mb-2">
                Attestation {isNewAttestation ? "Created" : "Signed"}{" "}
                Successfully
              </h2>
              <p className="text-body-lg text-slate-500 dark:text-white/50">
                {attestation?.title || "Your attestation"} has been
                cryptographically signed and recorded on the hash chain.
              </p>
            </div>

            {/* Attestation Details */}
            {attestation && (
              <div className="bg-slate-50 dark:bg-white/[0.02] rounded-xl p-5 mb-6 border border-slate-200 dark:border-white/5">
                <h3 className="text-small font-medium text-slate-500 dark:text-white/50 uppercase tracking-wider mb-3">
                  Attestation Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-caption text-slate-400 dark:text-white/40">
                      Title
                    </p>
                    <p className="text-body text-slate-800 dark:text-white">
                      {attestation.title}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption text-slate-400 dark:text-white/40">
                      Statement
                    </p>
                    <p className="text-body text-slate-600 dark:text-white/70">
                      {attestation.statement}
                    </p>
                  </div>
                  {attestation.scope && (
                    <div>
                      <p className="text-caption text-slate-400 dark:text-white/40">
                        Scope
                      </p>
                      <p className="text-body text-slate-600 dark:text-white/70">
                        {attestation.scope}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Verification Badge */}
            <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-xl p-5 border border-emerald-200 dark:border-emerald-500/20">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-body font-medium text-emerald-800 dark:text-emerald-300 mb-2">
                    Cryptographic Verification
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-caption text-emerald-600/70 dark:text-emerald-400/60 mb-1">
                        Hash
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-small font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-1 rounded break-all">
                          {signResult.hash}
                        </code>
                        <button
                          onClick={copyHash}
                          className="flex-shrink-0 p-1 rounded text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-500/10 transition-colors"
                          title="Copy hash"
                        >
                          {copied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-caption text-emerald-600/70 dark:text-emerald-400/60 mb-1">
                        Signed At
                      </p>
                      <p className="text-small text-emerald-700 dark:text-emerald-300">
                        {new Date(signResult.signedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Hash Chain Visualization */}
          {attestation?.hashChain && attestation.hashChain.length > 0 && (
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <h3 className="text-heading font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Hash Chain
              </h3>
              <GlassCard hover={false} className="p-6">
                <HashChainVisualizer
                  chain={attestation.hashChain.map(
                    (entry, i): HashChainNode => ({
                      id: String(entry.index ?? i),
                      title: entry.action,
                      signatureHash: entry.hash,
                      previousHash: entry.previousHash || null,
                      issuedAt: entry.timestamp,
                      isRevoked: false,
                      signerName: entry.actor,
                    }),
                  )}
                />
              </GlassCard>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <a
              href="/stakeholder/portal"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-200 dark:border-[--glass-border-subtle] text-subtitle font-medium text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-[--glass-bg-surface] transition-colors"
            >
              <span>Back to Dashboard</span>
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  // Existing Attestation View (Pending)
  const status = attestation
    ? statusConfig[attestation.status]
    : statusConfig.PENDING;
  const StatusIcon = status.icon;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <a
          href="/stakeholder/portal"
          className="inline-flex items-center gap-1.5 text-small text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </a>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Attestation Header */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <GlassCard hover={false} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-display-sm font-semibold text-slate-800 dark:text-white mb-1">
                  {attestation!.title}
                </h1>
                {attestation!.orgName && (
                  <p className="text-body text-slate-500 dark:text-white/50">
                    Requested by {attestation!.orgName}
                  </p>
                )}
              </div>
              <span
                className={`flex items-center gap-1.5 text-micro uppercase tracking-wider font-medium px-3 py-1.5 rounded-full ${status.bg} ${status.color}`}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-caption text-slate-400 dark:text-white/40 mb-1">
                  Created
                </p>
                <p className="text-body text-slate-800 dark:text-white">
                  {new Date(attestation!.createdAt).toLocaleDateString()}
                </p>
              </div>
              {attestation!.dueDate && (
                <div>
                  <p className="text-caption text-slate-400 dark:text-white/40 mb-1">
                    Due Date
                  </p>
                  <p className="text-body text-slate-800 dark:text-white">
                    {new Date(attestation!.dueDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Statement */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6"
        >
          <h2 className="text-heading font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            Attestation Statement
          </h2>
          <GlassCard hover={false} className="p-6">
            <p className="text-body-lg text-slate-700 dark:text-white/80 whitespace-pre-wrap leading-relaxed">
              {attestation!.statement}
            </p>
          </GlassCard>
        </motion.div>

        {/* Scope Summary */}
        {(attestation!.scopeSummary || attestation!.scope) && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mb-6"
          >
            <h2 className="text-heading font-semibold text-slate-800 dark:text-white mb-3">
              Scope
            </h2>
            <GlassCard hover={false} className="p-6">
              <p className="text-body text-slate-600 dark:text-white/70 whitespace-pre-wrap">
                {attestation!.scopeSummary || attestation!.scope}
              </p>
            </GlassCard>
          </motion.div>
        )}

        {/* Hash Chain */}
        {attestation!.hashChain && attestation!.hashChain.length > 0 && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mb-6"
          >
            <h2 className="text-heading font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Hash Chain
            </h2>
            <GlassCard hover={false} className="p-6">
              <HashChainVisualizer
                chain={attestation!.hashChain.map(
                  (entry, i): HashChainNode => ({
                    id: String(entry.index ?? i),
                    title: entry.action,
                    signatureHash: entry.hash,
                    previousHash: entry.previousHash || null,
                    issuedAt: entry.timestamp,
                    isRevoked: false,
                    signerName: entry.actor,
                  }),
                )}
              />
            </GlassCard>
          </motion.div>
        )}

        {/* Timeline */}
        {attestation!.timeline && attestation!.timeline.length > 0 && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mb-8"
          >
            <h2 className="text-heading font-semibold text-slate-800 dark:text-white mb-3">
              Activity Timeline
            </h2>
            <GlassCard hover={false} className="p-6">
              <AttestationTimeline
                attestations={attestation!.timeline.map(
                  (entry): AttestationCardType => ({
                    id: entry.id,
                    type: entry.action,
                    title: entry.details || entry.action,
                    signerName: entry.actor,
                    signerTitle: "",
                    signerOrganization: "",
                    issuedAt: entry.timestamp,
                    validUntil: null,
                    signatureHash: "",
                    isRevoked: false,
                    isVerified: true,
                  }),
                )}
              />
            </GlassCard>
          </motion.div>
        )}

        {/* Sign Section (only for PENDING) */}
        {attestation!.status === "PENDING" && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <GlassCard hover={false} highlighted className="p-6">
              <h3 className="text-title font-semibold text-slate-800 dark:text-white mb-4">
                Sign this Attestation
              </h3>

              {error && (
                <div className="mb-4 flex items-center gap-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-small text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-[--glass-border-subtle] bg-slate-50 dark:bg-white/[0.02] cursor-pointer mb-4 hover:border-emerald-500/30 transition-colors">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-slate-300 dark:border-white/20 text-emerald-500 focus:ring-emerald-500/40"
                />
                <div>
                  <p className="text-body font-medium text-slate-800 dark:text-white">
                    I hereby confirm this attestation is accurate and complete
                  </p>
                  <p className="text-small text-slate-500 dark:text-white/40 mt-1">
                    By signing, you acknowledge that the information provided in
                    this attestation is true and correct to the best of your
                    knowledge. This action is cryptographically recorded and
                    cannot be undone.
                  </p>
                </div>
              </label>

              {/* Sign Button */}
              <button
                onClick={handleSign}
                disabled={!confirmed || signing}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-white font-medium text-subtitle rounded-lg px-6 py-3.5 transition-colors"
              >
                {signing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    <span>Sign Attestation</span>
                  </>
                )}
              </button>
            </GlassCard>
          </motion.div>
        )}

        {/* Expired/Rejected message */}
        <AnimatePresence>
          {(attestation!.status === "EXPIRED" ||
            attestation!.status === "REJECTED") && (
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              className="mt-6"
            >
              <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-body text-red-600 dark:text-red-400">
                  {attestation!.status === "EXPIRED"
                    ? "This attestation request has expired. Contact your administrator to request a new one."
                    : "This attestation has been rejected."}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
