"use client";

import { useState } from "react";
import {
  Shield,
  Copy,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { csrfHeaders } from "@/lib/csrf-client";

interface Satellite {
  noradId: string;
  name: string;
}

interface Regulation {
  id: string;
  regulation_ref: string;
  regulation_name: string;
}

interface AttestationResult {
  attestation_id: string;
  claim: {
    regulation_name: string;
    claim_statement: string;
    result: boolean;
    threshold_type: string;
    threshold_value: number;
  };
  evidence: {
    trust_level: string;
    source: string;
    sentinel_anchor: unknown | null;
    cross_verification: unknown | null;
  };
  signature: string;
}

export default function AttestationGenerator({
  satellites,
  regulations,
}: {
  satellites: Satellite[];
  regulations: Regulation[];
}) {
  const [selectedSatellite, setSelectedSatellite] = useState("");
  const [selectedRegulation, setSelectedRegulation] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AttestationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullJson, setFullJson] = useState<string>("");

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/v1/verity/attestation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          regulation_ref: selectedRegulation,
          satellite_norad_id: selectedSatellite || undefined,
          expires_in_days: 90,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");

      setResult(data.attestation);
      setFullJson(JSON.stringify(data.attestation, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const copyJson = () => {
    navigator.clipboard.writeText(fullJson);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-small text-white/45 mb-1.5">
            Satellite
          </label>
          <select
            value={selectedSatellite}
            onChange={(e) => setSelectedSatellite(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-body text-white focus:border-white/[0.25] outline-none transition-colors"
          >
            <option value="">All / Organization-wide</option>
            {satellites.map((s) => (
              <option key={s.noradId} value={s.noradId}>
                {s.name} ({s.noradId})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-small text-white/45 mb-1.5">
            Regulation
          </label>
          <select
            value={selectedRegulation}
            onChange={(e) => setSelectedRegulation(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-body text-white focus:border-white/[0.25] outline-none transition-colors"
          >
            <option value="">Select regulation...</option>
            {regulations.map((r) => (
              <option key={r.id} value={r.regulation_ref}>
                {r.regulation_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={!selectedRegulation || loading}
        className="w-full"
      >
        <Shield className="w-4 h-4 mr-2" />
        {loading ? "Generating Attestation..." : "Generate Attestation"}
      </Button>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-small text-red-400">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-body font-medium text-white">
              {result.claim.regulation_name}
            </h4>
            <div className="flex items-center gap-2">
              {result.claim.result ? (
                <Badge
                  variant="default"
                  className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Threshold Met
                </Badge>
              ) : (
                <Badge
                  variant="error"
                  className="bg-red-500/10 text-red-400 border-red-500/20"
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Below Threshold
                </Badge>
              )}
            </div>
          </div>

          <p className="text-small text-white/60">
            {result.claim.claim_statement}
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.03] rounded-lg p-3">
              <p className="text-caption text-white/30 mb-0.5">Trust Level</p>
              <p className="text-body font-medium text-white">
                {result.evidence.trust_level}
              </p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3">
              <p className="text-caption text-white/30 mb-0.5">Source</p>
              <p className="text-body font-medium text-white capitalize">
                {result.evidence.source.replace("_", " ")}
              </p>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3">
              <p className="text-caption text-white/30 mb-0.5">Anchored</p>
              <p className="text-body font-medium text-white">
                {result.evidence.sentinel_anchor ? "Sentinel" : "No"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={copyJson} className="flex-1">
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy JSON
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                window.open(
                  `/verity/verify?attestation=${encodeURIComponent(fullJson)}`,
                  "_blank",
                )
              }
              className="flex-1"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Verify
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
