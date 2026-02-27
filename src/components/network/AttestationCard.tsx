"use client";

import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Clock,
  Hash,
  User,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

export interface Attestation {
  id: string;
  type: string;
  title: string;
  signerName: string;
  signerTitle: string;
  signerOrganization: string;
  issuedAt: string;
  validUntil: string | null;
  signatureHash: string;
  isRevoked: boolean;
  isVerified: boolean;
}

interface AttestationCardProps {
  attestation: Attestation;
  onVerify: (id: string) => void;
  onRevoke: (id: string) => void;
}

const ATTESTATION_TYPE_COLORS: Record<string, string> = {
  COMPLIANCE_DECLARATION:
    "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  AUDIT_REPORT:
    "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  NDA_ACKNOWLEDGMENT:
    "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20",
  INSURANCE_CONFIRMATION:
    "text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  SUPPLIER_CERTIFICATION:
    "text-lime-600 dark:text-lime-400 bg-lime-500/10 border-lime-500/20",
  REGULATORY_APPROVAL:
    "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTypeName(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export default function AttestationCard({
  attestation,
  onVerify,
  onRevoke,
}: AttestationCardProps) {
  const typeColor =
    ATTESTATION_TYPE_COLORS[attestation.type] ||
    "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20";
  const hashPreview = attestation.signatureHash.slice(0, 16);

  return (
    <GlassCard hover>
      <div
        className={`p-4 space-y-3 ${attestation.isRevoked ? "opacity-60" : ""}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <span
            className={`text-micro px-2 py-0.5 rounded-full border font-medium ${typeColor}`}
          >
            {formatTypeName(attestation.type)}
          </span>
          <div className="flex items-center gap-1.5">
            {attestation.isRevoked ? (
              <span className="flex items-center gap-1 text-micro text-red-500 dark:text-red-400 font-medium">
                <XCircle size={12} />
                Revoked
              </span>
            ) : attestation.isVerified ? (
              <span className="flex items-center gap-1 text-micro text-green-500 dark:text-green-400 font-medium">
                <CheckCircle2 size={12} />
                Verified
              </span>
            ) : (
              <span className="flex items-center gap-1 text-micro text-amber-500 dark:text-amber-400 font-medium">
                <Clock size={12} />
                Pending
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3
          className={`text-body-lg font-semibold text-slate-900 dark:text-white ${attestation.isRevoked ? "line-through" : ""}`}
        >
          {attestation.title}
        </h3>

        {/* Signer info */}
        <div className="flex items-center gap-2 text-small text-slate-500 dark:text-white/50">
          <User size={12} aria-hidden="true" />
          <span>
            {attestation.signerName}, {attestation.signerTitle} at{" "}
            {attestation.signerOrganization}
          </span>
        </div>

        {/* Dates and hash */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-caption text-slate-500 dark:text-white/50">
            <span className="text-slate-400 dark:text-white/30">Issued:</span>{" "}
            {formatDate(attestation.issuedAt)}
          </div>
          {attestation.validUntil && (
            <div className="text-caption text-slate-500 dark:text-white/50">
              <span className="text-slate-400 dark:text-white/30">
                Valid until:
              </span>{" "}
              {formatDate(attestation.validUntil)}
            </div>
          )}
        </div>

        {/* Hash */}
        <div className="flex items-center gap-1.5 text-micro text-slate-400 dark:text-white/30 font-mono">
          <Hash size={10} aria-hidden="true" />
          {hashPreview}...
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-[--glass-border-subtle]">
          {!attestation.isVerified && !attestation.isRevoked && (
            <button
              onClick={() => onVerify(attestation.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-lg transition-colors"
            >
              <ShieldCheck size={12} aria-hidden="true" />
              Verify
            </button>
          )}
          {!attestation.isRevoked && (
            <button
              onClick={() => onRevoke(attestation.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <XCircle size={12} aria-hidden="true" />
              Revoke
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
