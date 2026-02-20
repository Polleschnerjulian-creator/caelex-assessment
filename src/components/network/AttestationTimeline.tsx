"use client";

import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ClipboardCheck,
  FileText,
  Scale,
  Shield,
  Hash,
} from "lucide-react";
import { type Attestation } from "./AttestationCard";

interface AttestationTimelineProps {
  attestations: Attestation[];
}

const TYPE_ICONS: Record<string, typeof ShieldCheck> = {
  COMPLIANCE_DECLARATION: ShieldCheck,
  AUDIT_REPORT: ClipboardCheck,
  NDA_ACKNOWLEDGMENT: FileText,
  INSURANCE_CONFIRMATION: Shield,
  SUPPLIER_CERTIFICATION: CheckCircle2,
  REGULATORY_APPROVAL: Scale,
};

const TYPE_COLORS: Record<string, string> = {
  COMPLIANCE_DECLARATION:
    "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  AUDIT_REPORT: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  NDA_ACKNOWLEDGMENT: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  INSURANCE_CONFIRMATION:
    "bg-purple-500/10 text-purple-500 border-purple-500/30",
  SUPPLIER_CERTIFICATION: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
  REGULATORY_APPROVAL: "bg-red-500/10 text-red-500 border-red-500/30",
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AttestationTimeline({
  attestations,
}: AttestationTimelineProps) {
  const sorted = [...attestations].sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ShieldCheck
          size={32}
          className="text-slate-300 dark:text-white/20 mb-3"
        />
        <p className="text-body text-slate-500 dark:text-white/50">
          No attestations yet.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10" />

      <div className="space-y-0">
        {sorted.map((attestation, index) => {
          const Icon = TYPE_ICONS[attestation.type] || ShieldCheck;
          const colorClasses =
            TYPE_COLORS[attestation.type] ||
            "bg-slate-500/10 text-slate-500 border-slate-500/30";
          const hashPreview = attestation.signatureHash.slice(0, 16);

          return (
            <div key={attestation.id} className="relative flex gap-4 pb-6">
              {/* Node */}
              <div className="relative z-10 flex-shrink-0">
                <div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                    attestation.isRevoked
                      ? "bg-red-500/10 text-red-500 border-red-500/30"
                      : colorClasses
                  }`}
                >
                  {attestation.isRevoked ? (
                    <XCircle size={16} />
                  ) : (
                    <Icon size={16} />
                  )}
                </div>
              </div>

              {/* Content */}
              <div
                className={`flex-1 pb-4 ${
                  index < sorted.length - 1
                    ? "border-b border-slate-100 dark:border-white/5"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4
                    className={`text-body-lg font-medium text-slate-900 dark:text-white ${
                      attestation.isRevoked ? "line-through opacity-60" : ""
                    }`}
                  >
                    {attestation.title}
                  </h4>
                  {attestation.isRevoked && (
                    <span className="text-micro px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium flex-shrink-0">
                      Revoked
                    </span>
                  )}
                </div>

                <p className="text-small text-slate-500 dark:text-white/50 mt-0.5">
                  {attestation.signerName} &middot;{" "}
                  {attestation.signerOrganization}
                </p>

                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-caption text-slate-400 dark:text-white/40">
                    {formatDate(attestation.issuedAt)}
                  </span>
                  <span className="flex items-center gap-1 text-micro text-slate-400 dark:text-white/30 font-mono">
                    <Hash size={10} aria-hidden="true" />
                    {hashPreview}...
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
