"use client";

import { Shield, Eye, EyeOff, FileCheck } from "lucide-react";

/**
 * Explains Verity's Privacy-Preserving Attestation system.
 *
 * WORDING IS CRITICAL:
 * - "attests" NOT "proves"
 * - "signed" NOT "proof"
 * - "tamper-evident" NOT "zero-knowledge"
 */
export default function AttestationExplainer() {
  return (
    <div className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--surface-sunken)] flex items-center justify-center">
          <Shield className="w-5 h-5 text-[var(--text-secondary)]" />
        </div>
        <div>
          <h3 className="text-subtitle font-semibold text-white">
            Privacy-Preserving Compliance Attestation
          </h3>
          <p className="text-caption text-[var(--text-tertiary)]">
            How Verity protects your operational data
          </p>
        </div>
      </div>

      <p className="text-small text-[var(--text-secondary)] leading-relaxed mb-5">
        Caelex attests compliance without revealing operational data. Each
        attestation is cryptographically signed (Ed25519) and tamper-evident.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-small text-[var(--text-secondary)]">
            <Eye className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
            <span>Verifiers confirm:</span>
          </div>
          <ul className="space-y-1.5 pl-6">
            {[
              "Regulation threshold met",
              "Evidence source and trust level",
              "Cryptographic signature integrity",
              "Issuer identity (Caelex)",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-small text-[var(--text-secondary)]"
              >
                <FileCheck className="w-3.5 h-3.5 text-[var(--accent-primary)]/70 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-small text-[var(--text-secondary)]">
            <EyeOff className="w-4 h-4 text-[var(--accent-danger)]/70 shrink-0" />
            <span>Verifiers do NOT see:</span>
          </div>
          <ul className="space-y-1.5 pl-6">
            {[
              "Actual measurement values",
              "Operational parameters",
              "Sensitive compliance details",
              "Internal trust scores",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-small text-[var(--text-secondary)]"
              >
                <EyeOff className="w-3.5 h-3.5 text-[var(--accent-danger)]/50 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
