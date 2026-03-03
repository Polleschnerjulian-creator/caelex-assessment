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
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center">
          <Shield className="w-5 h-5 text-white/70" />
        </div>
        <div>
          <h3 className="text-subtitle font-semibold text-white">
            Privacy-Preserving Compliance Attestation
          </h3>
          <p className="text-caption text-white/45">
            How Verity protects your operational data
          </p>
        </div>
      </div>

      <p className="text-small text-white/50 leading-relaxed mb-5">
        Caelex attests compliance without revealing operational data. Each
        attestation is cryptographically signed (Ed25519) and tamper-evident.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-small text-white/70">
            <Eye className="w-4 h-4 text-emerald-500 shrink-0" />
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
                className="flex items-center gap-2 text-small text-white/50"
              >
                <FileCheck className="w-3.5 h-3.5 text-emerald-500/70 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-small text-white/70">
            <EyeOff className="w-4 h-4 text-red-400/70 shrink-0" />
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
                className="flex items-center gap-2 text-small text-white/50"
              >
                <EyeOff className="w-3.5 h-3.5 text-red-400/50 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
