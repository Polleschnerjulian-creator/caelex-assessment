"use client";

import { useState } from "react";
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface VerificationResultData {
  valid: boolean;
  attestation_id?: string;
  certificate_id?: string;
  issuer_known: boolean;
  checks: Record<string, boolean | unknown[]>;
  claim?: string;
  result?: boolean;
  trust_level?: string;
  errors?: string[];
}

export default function VerificationWidget() {
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);
    setVerificationResult(null);

    try {
      const parsed = JSON.parse(jsonInput);

      // Determine if it's an attestation or certificate
      const isAttestation = !!parsed.attestation_id;
      const isCertificate = !!parsed.certificate_id;

      if (!isAttestation && !isCertificate) {
        throw new Error(
          "Invalid input: must be an attestation or certificate JSON",
        );
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

      setVerificationResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid JSON or verification failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
        placeholder="Paste attestation or certificate JSON here..."
        className="w-full h-32 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-small text-white font-mono placeholder-[var(--text-tertiary)] focus:border-[var(--border-default)] outline-none resize-y"
      />

      <Button
        onClick={handleVerify}
        disabled={!jsonInput.trim() || loading}
        className="w-full"
      >
        <Search className="w-4 h-4 mr-2" />
        {loading ? "Verifying..." : "Verify"}
      </Button>

      {error && (
        <div className="bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 rounded-lg p-3">
          <p className="text-small text-[var(--accent-danger)]">{error}</p>
        </div>
      )}

      {verificationResult && (
        <div className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            {verificationResult.valid ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-[var(--accent-primary)]" />
                <div>
                  <p className="text-body font-semibold text-[var(--accent-primary)]">
                    Verification Passed
                  </p>
                  <p className="text-caption text-[var(--text-tertiary)]">
                    All cryptographic checks passed
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-[var(--accent-danger)]" />
                <div>
                  <p className="text-body font-semibold text-[var(--accent-danger)]">
                    Verification Failed
                  </p>
                  <p className="text-caption text-[var(--text-tertiary)]">
                    {verificationResult.errors?.[0] ??
                      "One or more checks failed"}
                  </p>
                </div>
              </>
            )}
          </div>

          {verificationResult.claim && (
            <p className="text-small text-[var(--text-secondary)]">
              {verificationResult.claim}
            </p>
          )}

          <div className="space-y-2">
            {Object.entries(verificationResult.checks)
              .filter(([key]) => key !== "attestation_details")
              .map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-caption text-[var(--text-tertiary)]">
                    {key.replace(/_/g, " ")}
                  </span>
                  {val === true ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--accent-primary)]" />
                  ) : val === false ? (
                    <XCircle className="w-4 h-4 text-[var(--accent-danger)]" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[var(--accent-warning)]" />
                  )}
                </div>
              ))}
          </div>

          {!verificationResult.issuer_known && (
            <div className="bg-[var(--accent-warning-soft)] border border-[var(--accent-warning)/20] rounded-lg p-3">
              <p className="text-small text-[var(--accent-warning)]">
                Issuer key not found in Caelex keyset. This attestation may be
                self-issued.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
