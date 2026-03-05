"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import { Section, motion, fadeUp } from "./animation-utils";

interface VerifyResult {
  valid: boolean;
  checks: Record<string, boolean>;
  errors?: string[];
}

export default function VerifySection() {
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExplainer, setShowExplainer] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const parsed = JSON.parse(jsonInput);
      const isAttestation = !!parsed.attestation_id;
      const isCertificate = !!parsed.certificate_id;

      if (!isAttestation && !isCertificate) {
        throw new Error("Must be an attestation or certificate JSON");
      }

      const endpoint = isAttestation
        ? "/api/v1/verity/attestation/verify"
        : "/api/v1/verity/certificate/verify";

      const body = isAttestation
        ? { attestation: parsed }
        : { certificate: parsed };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-24 md:py-36 border-t border-white/[0.06]">
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        <Section>
          <motion.p
            variants={fadeUp}
            className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40 mb-4"
          >
            Public Verification
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="font-semibold text-white mb-4 leading-tight"
            style={{ fontSize: "clamp(28px, 5vw, 48px)" }}
          >
            Verify an attestation.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-body-lg text-white/50 mb-10"
          >
            Paste an attestation or certificate JSON to verify its cryptographic
            integrity. No login required.
          </motion.p>
        </Section>

        <Section>
          <motion.div variants={fadeUp}>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='{"attestation_id": "att_...", "signature": "...", ...}'
              className="w-full h-40 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-small text-white font-mono placeholder-white/20 focus:border-white/[0.25] outline-none resize-y mb-4"
            />

            <button
              onClick={handleVerify}
              disabled={loading || !jsonInput.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-white/10 disabled:text-white/30 text-white font-medium py-3 rounded-xl transition-colors mb-4"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
                <p className="text-small text-red-400">{error}</p>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden mb-4">
                <div
                  className={`p-4 ${
                    result.valid
                      ? "bg-emerald-500/[0.08] border-b border-emerald-500/20"
                      : "bg-red-500/[0.08] border-b border-red-500/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.valid ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400" />
                    )}
                    <div>
                      <p className="text-body font-semibold text-white">
                        {result.valid
                          ? "Verification Passed"
                          : "Verification Failed"}
                      </p>
                      <p className="text-small text-white/40">
                        {result.valid
                          ? "All cryptographic checks passed."
                          : (result.errors?.[0] ??
                            "One or more checks failed.")}
                      </p>
                    </div>
                  </div>
                </div>

                {result.checks && (
                  <div className="p-4 space-y-2">
                    {Object.entries(result.checks)
                      .filter(([key]) => key !== "attestation_details")
                      .map(([key, val]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between py-1"
                        >
                          <span className="text-small text-white/50 capitalize">
                            {key.replace(/_/g, " ")}
                          </span>
                          {val ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Explainer */}
            <button
              onClick={() => setShowExplainer(!showExplainer)}
              className="flex items-center gap-2 text-small text-white/40 hover:text-white/70 transition-colors mx-auto mb-4"
            >
              {showExplainer ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              How does this work?
            </button>

            {showExplainer && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 text-small text-white/50 leading-relaxed space-y-3 mb-4">
                <p>
                  Caelex evaluates compliance data and signs a threshold
                  assertion: &quot;The measured value meets the regulatory
                  requirement.&quot; The actual value is never included — only a
                  SHA-256 hash commitment.
                </p>
                <p>
                  Each attestation is signed with Ed25519. You can verify the
                  signature using Caelex&apos;s public key, available at{" "}
                  <a
                    href="/api/v1/verity/public-key"
                    className="underline text-white/60 hover:text-white/80"
                  >
                    /api/v1/verity/public-key
                  </a>
                  .
                </p>
              </div>
            )}

            {/* Link to full page */}
            <Link
              href="/verity/verify"
              className="flex items-center justify-center gap-2 text-body text-white/40 hover:text-white/70 transition-colors"
            >
              Full verification tool
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </Section>
      </div>
    </section>
  );
}
