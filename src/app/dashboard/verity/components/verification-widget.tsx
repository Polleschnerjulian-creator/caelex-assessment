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
        className="w-full h-32 bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-3 text-small text-white font-mono placeholder-white/20 focus:border-white/[0.25] outline-none resize-y"
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
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-small text-red-400">{error}</p>
        </div>
      )}

      {verificationResult && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            {verificationResult.valid ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <div>
                  <p className="text-body font-semibold text-emerald-400">
                    Verification Passed
                  </p>
                  <p className="text-caption text-white/30">
                    All cryptographic checks passed
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-red-400" />
                <div>
                  <p className="text-body font-semibold text-red-400">
                    Verification Failed
                  </p>
                  <p className="text-caption text-white/30">
                    {verificationResult.errors?.[0] ??
                      "One or more checks failed"}
                  </p>
                </div>
              </>
            )}
          </div>

          {verificationResult.claim && (
            <p className="text-small text-white/60">
              {verificationResult.claim}
            </p>
          )}

          <div className="space-y-2">
            {Object.entries(verificationResult.checks)
              .filter(([key]) => key !== "attestation_details")
              .map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-caption text-white/40">
                    {key.replace(/_/g, " ")}
                  </span>
                  {val === true ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : val === false ? (
                    <XCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                </div>
              ))}
          </div>

          {!verificationResult.issuer_known && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-small text-amber-400">
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
