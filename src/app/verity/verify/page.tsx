"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Search,
  FileText,
  Key,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

interface VerificationResultData {
  valid: boolean;
  attestation_id?: string;
  certificate_id?: string;
  issuer_known?: boolean;
  checks: Record<string, boolean | unknown[]>;
  claim?: string;
  claims?: Array<{
    regulation_ref: string;
    claim_statement: string;
    result: boolean;
    trust_level: string;
  }>;
  result?: boolean;
  trust_level?: string;
  issuer?: string;
  issuer_key_id?: string;
  algorithm?: string;
  verified_at?: string;
  errors?: string[];
}

export default function PublicVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-[#0A0F1E] flex items-center justify-center">
          <p className="text-slate-400 dark:text-white/50">Loading...</p>
        </div>
      }
    >
      <VerifyPageContent />
    </Suspense>
  );
}

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const [jsonInput, setJsonInput] = useState("");
  const [idInput, setIdInput] = useState("");
  const [mode, setMode] = useState<"json" | "id">("json");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExplainer, setShowExplainer] = useState(false);

  // Handle URL params
  useEffect(() => {
    const att = searchParams.get("attestation");
    const id = searchParams.get("id");
    if (att) {
      setJsonInput(att);
      setMode("json");
    } else if (id) {
      setIdInput(id);
      setMode("id");
      // Auto-verify if ID is provided via URL (attestation or certificate)
      setAutoVerifyId(id);
    }
  }, [searchParams]);

  // Auto-verify state for URL-provided IDs
  const [autoVerifyId, setAutoVerifyId] = useState<string | null>(null);
  useEffect(() => {
    if (!autoVerifyId) return;
    setAutoVerifyId(null);
    // Trigger verification automatically
    handleVerifyById(autoVerifyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoVerifyId]);

  const handleVerifyById = async (id: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // Try attestation ID first (va_ prefix), then certificate
      if (id.startsWith("va_")) {
        // Look up attestation by attestationId
        const listRes = await fetch(`/api/v1/verity/attestation/list?limit=1`);
        if (listRes.ok) {
          // Verify via the full attestation JSON stored in DB
          const res = await fetch("/api/v1/verity/attestation/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ attestation_id: id }),
          });
          const data = await res.json();
          if (res.ok) {
            setResult(data);
            return;
          }
        }
      }
      // Fall through to certificate verification
      const certRes = await fetch(
        `/api/v1/verity/certificate/${encodeURIComponent(id)}`,
      );
      if (!certRes.ok)
        throw new Error(
          "ID not found — not a valid attestation or certificate ID",
        );
      const certData = await certRes.json();
      const res = await fetch("/api/v1/verity/certificate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificate: certData.certificate }),
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

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (mode === "id") {
        await handleVerifyById(idInput);
        return;
      } else {
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0F1E]">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            <span className="text-body font-semibold text-slate-900 dark:text-white">
              Caelex Verity
            </span>
          </Link>
          <a
            href="/api/v1/verity/public-key"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1.5 text-caption text-slate-400 dark:text-white/50 hover:text-slate-600 dark:hover:text-white/60 transition-colors"
          >
            <Key className="w-3.5 h-3.5" />
            Public Key
          </a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-display-sm font-semibold text-slate-900 dark:text-white mb-2">
            Verify Compliance Attestation
          </h1>
          <p className="text-body text-slate-500 dark:text-white/45">
            Verify the cryptographic integrity of a Caelex compliance
            attestation or certificate. No login required.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/[0.03] rounded-lg w-fit mx-auto mb-6">
          <button
            onClick={() => setMode("json")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-small font-medium transition-colors ${
              mode === "json"
                ? "bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm dark:shadow-none"
                : "text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70"
            }`}
          >
            <FileText className="w-4 h-4" />
            Paste JSON
          </button>
          <button
            onClick={() => setMode("id")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-small font-medium transition-colors ${
              mode === "id"
                ? "bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm dark:shadow-none"
                : "text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70"
            }`}
          >
            <Search className="w-4 h-4" />
            Certificate ID
          </button>
        </div>

        {/* Input */}
        {mode === "json" ? (
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Paste attestation or certificate JSON here..."
            className="w-full h-48 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl px-4 py-3 text-small text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-white/20 focus:border-slate-400 dark:focus:border-white/[0.25] outline-none resize-y mb-4"
          />
        ) : (
          <input
            value={idInput}
            onChange={(e) => setIdInput(e.target.value)}
            placeholder="Enter certificate ID (e.g. vc_1709...)"
            className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl px-4 py-3 text-body text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:border-slate-400 dark:focus:border-white/[0.25] outline-none mb-4"
          />
        )}

        <button
          onClick={handleVerify}
          disabled={
            loading || (mode === "json" ? !jsonInput.trim() : !idInput.trim())
          }
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 dark:disabled:bg-white/10 disabled:text-slate-400 dark:disabled:text-white/50 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-small text-red-400">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-6 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
            {/* Result Header */}
            <div
              className={`p-5 ${
                result.valid
                  ? "bg-emerald-500/[0.08] border-b border-emerald-500/20"
                  : "bg-red-500/[0.08] border-b border-red-500/20"
              }`}
            >
              <div className="flex items-center gap-3">
                {result.valid ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                ) : (
                  <XCircle className="w-7 h-7 text-red-400" />
                )}
                <div>
                  <p className="text-title font-semibold text-slate-900 dark:text-white">
                    {result.valid
                      ? "Verification Passed"
                      : "Verification Failed"}
                  </p>
                  <p className="text-small text-slate-500 dark:text-white/40">
                    {result.valid
                      ? "All cryptographic checks passed. This attestation is authentic."
                      : (result.errors?.[0] ??
                        "One or more integrity checks failed.")}
                  </p>
                </div>
              </div>
            </div>

            {/* Checks */}
            <div className="p-5 space-y-3">
              {Object.entries(result.checks)
                .filter(([key]) => key !== "attestation_details")
                .map(([key, val]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-small text-slate-500 dark:text-white/50 capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    {val === true ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4.5 h-4.5 text-red-400" />
                    )}
                  </div>
                ))}
            </div>

            {/* Claims (for certificates) */}
            {result.claims && result.claims.length > 0 && (
              <div className="border-t border-slate-200 dark:border-white/[0.06] p-5">
                <h3 className="text-body font-medium text-slate-900 dark:text-white mb-3">
                  Claims ({result.claims.length})
                </h3>
                <div className="space-y-2">
                  {result.claims.map((claim, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-slate-100 dark:bg-white/[0.02] rounded-lg p-3"
                    >
                      <div>
                        <p className="text-small text-slate-600 dark:text-white/70">
                          {claim.claim_statement}
                        </p>
                        <p className="text-caption text-slate-400 dark:text-white/50 mt-0.5">
                          {claim.regulation_ref.replace(/_/g, " ")} · Trust:{" "}
                          {claim.trust_level}
                        </p>
                      </div>
                      {claim.result ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="border-t border-slate-200 dark:border-white/[0.06] p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {result.issuer && (
                  <div>
                    <p className="text-caption text-slate-400 dark:text-white/50">
                      Issuer
                    </p>
                    <p className="text-small text-slate-600 dark:text-white/70">
                      {result.issuer}
                    </p>
                  </div>
                )}
                {result.issuer_key_id && (
                  <div>
                    <p className="text-caption text-slate-400 dark:text-white/50">
                      Key ID
                    </p>
                    <p className="text-small text-slate-600 dark:text-white/70 font-mono">
                      {result.issuer_key_id}
                    </p>
                  </div>
                )}
                {result.algorithm && (
                  <div>
                    <p className="text-caption text-slate-400 dark:text-white/50">
                      Algorithm
                    </p>
                    <p className="text-small text-slate-600 dark:text-white/70">
                      {result.algorithm}
                    </p>
                  </div>
                )}
                {result.verified_at && (
                  <div>
                    <p className="text-caption text-slate-400 dark:text-white/50">
                      Verified At
                    </p>
                    <p className="text-small text-slate-600 dark:text-white/70">
                      {new Date(result.verified_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Explainer */}
        <div className="mt-10">
          <button
            onClick={() => setShowExplainer(!showExplainer)}
            className="flex items-center gap-2 text-small text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70 transition-colors mx-auto"
          >
            {showExplainer ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            How does this work?
          </button>

          {showExplainer && (
            <div className="mt-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded-xl p-6 text-small text-slate-500 dark:text-white/50 leading-relaxed space-y-4">
              <p>
                <strong className="text-slate-700 dark:text-white/70">
                  Privacy-Preserving Compliance Attestation
                </strong>{" "}
                allows satellite operators to demonstrate regulatory compliance
                without revealing sensitive operational data.
              </p>
              <p>
                Caelex evaluates compliance data server-side and signs a
                threshold assertion: &quot;The measured value meets the
                regulatory requirement.&quot; The actual measurement value is
                never included in the attestation — only a cryptographic
                commitment (SHA-256 hash) that binds Caelex to the true value
                without revealing it.
              </p>
              <p>
                Each attestation is signed with Ed25519 and includes the
                issuer&apos;s public key ID for verification. You can verify the
                signature using Caelex&apos;s{" "}
                <a
                  href="/api/v1/verity/public-key"
                  className="underline text-slate-600 dark:text-white/60 hover:text-slate-800 dark:hover:text-white/80"
                >
                  public key
                </a>
                .
              </p>
              <p>
                Certificates bundle multiple attestations and can be verified
                completely offline — all embedded attestation signatures are
                checked individually.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-caption text-slate-400 dark:text-white/40">
            Powered by{" "}
            <Link
              href="/"
              className="underline hover:text-slate-600 dark:hover:text-white/40 transition-colors"
            >
              Caelex
            </Link>{" "}
            · Privacy-Preserving Compliance Infrastructure
          </p>
        </div>
      </div>
    </div>
  );
}
