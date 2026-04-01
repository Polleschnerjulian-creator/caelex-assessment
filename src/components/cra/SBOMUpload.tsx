"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileJson2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  Scale,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Types ───

interface SBOMAnalysisResponse {
  format: "cyclonedx" | "spdx" | "unknown";
  specVersion: string;
  componentCount: number;
  licenses: { license: string; count: number }[];
  openSourceCount: number;
  proprietaryCount: number;
  hasKnownVulnerableComponents: boolean;
  vulnerableComponents: string[];
}

interface SBOMComplianceResponse {
  cra038_sbomGenerated: boolean;
  cra038_details: string;
  cra039_licensesCompliant: boolean;
  cra039_unknownLicenses: string[];
  cra039_details: string;
  cra040_vulnerabilityTracking: boolean;
  cra040_trackableComponents: number;
  cra040_untrackedComponents: string[];
  cra040_details: string;
}

interface SBOMUploadResult {
  analysis: SBOMAnalysisResponse;
  compliance: SBOMComplianceResponse;
  requirementUpdates: { requirementId: string; status: string }[];
  maturityScore: number;
}

interface SBOMUploadProps {
  assessmentId: string;
  onAnalysisComplete?: () => void;
}

// ─── Component ───

export default function SBOMUpload({
  assessmentId,
  onAnalysisComplete,
}: SBOMUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SBOMUploadResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showLicenses, setShowLicenses] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);
      setFileName(file.name);

      try {
        const content = await file.text();

        // Validate JSON before sending
        try {
          JSON.parse(content);
        } catch {
          setError(
            "Invalid JSON file. Please upload a valid CycloneDX or SPDX JSON SBOM.",
          );
          setUploading(false);
          return;
        }

        const res = await fetch(`/api/cra/${assessmentId}/sbom`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ sbomContent: content }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Upload failed (${res.status})`);
        }

        const json = await res.json();
        const data = json.data ?? json;
        setResult(data as SBOMUploadResult);
        onAnalysisComplete?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload SBOM");
      } finally {
        setUploading(false);
      }
    },
    [assessmentId, onAnalysisComplete],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload],
  );

  const handleReset = useCallback(() => {
    setResult(null);
    setFileName(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".json")) {
        handleFileUpload(file);
      } else {
        setError("Please drop a .json file.");
      }
    },
    [handleFileUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary-soft)] flex items-center justify-center">
            <Package size={16} className="text-[var(--accent-primary)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              SBOM Upload
            </h3>
            <p className="text-caption text-[var(--text-tertiary)]">
              Upload a CycloneDX or SPDX SBOM for automated compliance
              assessment
            </p>
          </div>
        </div>
        {result && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-caption text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-hover)] rounded-lg transition-colors"
          >
            <RotateCcw size={12} />
            Re-upload
          </button>
        )}
      </div>

      <div className="p-5">
        {/* Upload Zone */}
        {!result && !uploading && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-[var(--border-default)] hover:border-[var(--accent-primary)]/40 rounded-xl p-8 text-center transition-colors cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleInputChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--surface-sunken)] group-hover:bg-[var(--accent-primary-soft)] flex items-center justify-center transition-colors">
                <Upload
                  size={20}
                  className="text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] transition-colors"
                />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">
                  Drop your SBOM file here or{" "}
                  <span className="text-[var(--accent-primary)] font-medium">
                    browse
                  </span>
                </p>
                <p className="text-caption text-[var(--text-tertiary)]">
                  Supports CycloneDX JSON and SPDX JSON formats
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Uploading State */}
        {uploading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2
              size={24}
              className="animate-spin text-[var(--accent-primary)]"
            />
            <div className="text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Analyzing SBOM...
              </p>
              {fileName && (
                <p className="text-caption text-[var(--text-tertiary)] mt-1 flex items-center gap-1.5 justify-center">
                  <FileJson2 size={12} />
                  {fileName}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 rounded-lg p-3 flex items-start gap-2 mt-3"
            >
              <XCircle
                size={14}
                className="text-[var(--accent-danger)] flex-shrink-0 mt-0.5"
              />
              <p className="text-caption text-[var(--accent-danger)]">
                {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Overview */}
            <div className="flex items-center gap-3 p-3 bg-[var(--surface-sunken)] rounded-lg">
              <FileJson2
                size={16}
                className="text-[var(--accent-primary)] flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] font-medium truncate">
                  {fileName}
                </p>
                <p className="text-caption text-[var(--text-tertiary)]">
                  {result.analysis.format.toUpperCase()} v
                  {result.analysis.specVersion} &middot;{" "}
                  {result.analysis.componentCount} components &middot;{" "}
                  {result.analysis.openSourceCount} OSS /{" "}
                  {result.analysis.proprietaryCount} proprietary
                </p>
              </div>
            </div>

            {/* Compliance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* CRA-038 */}
              <ComplianceCard
                label="CRA-038"
                title="SBOM Generated"
                passed={result.compliance.cra038_sbomGenerated}
                details={result.compliance.cra038_details}
              />

              {/* CRA-039 */}
              <ComplianceCard
                label="CRA-039"
                title="License Compliance"
                passed={result.compliance.cra039_licensesCompliant}
                partial={
                  !result.compliance.cra039_licensesCompliant &&
                  result.compliance.cra039_unknownLicenses.length <
                    result.analysis.componentCount
                }
                details={result.compliance.cra039_details}
              />

              {/* CRA-040 */}
              <ComplianceCard
                label="CRA-040"
                title="Vuln Tracking"
                passed={result.compliance.cra040_vulnerabilityTracking}
                partial={
                  !result.compliance.cra040_vulnerabilityTracking &&
                  result.compliance.cra040_trackableComponents > 0
                }
                details={result.compliance.cra040_details}
              />
            </div>

            {/* Vulnerable Components Warning */}
            {result.analysis.hasKnownVulnerableComponents && (
              <div className="bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle
                  size={14}
                  className="text-[var(--accent-danger)] flex-shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-caption font-medium text-[var(--accent-danger)]">
                    Potentially vulnerable components detected
                  </p>
                  <p className="text-caption text-[var(--accent-danger)]/80 mt-0.5">
                    {result.analysis.vulnerableComponents.join(", ")}
                  </p>
                </div>
              </div>
            )}

            {/* License Breakdown (collapsible) */}
            {result.analysis.licenses.length > 0 && (
              <div>
                <button
                  onClick={() => setShowLicenses(!showLicenses)}
                  className="flex items-center gap-2 text-caption text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {showLicenses ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                  <Scale size={12} />
                  License Breakdown ({result.analysis.licenses.length} unique)
                </button>
                <AnimatePresence>
                  {showLicenses && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                        {result.analysis.licenses.map((lic) => (
                          <div
                            key={lic.license}
                            className="flex items-center justify-between px-3 py-1.5 rounded-md bg-[var(--surface-sunken)] text-caption"
                          >
                            <span
                              className={`font-mono ${
                                lic.license === "UNKNOWN"
                                  ? "text-[var(--accent-warning)]"
                                  : "text-[var(--text-secondary)]"
                              }`}
                            >
                              {lic.license}
                            </span>
                            <span className="text-[var(--text-tertiary)]">
                              {lic.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Requirement Updates */}
            {result.requirementUpdates.length > 0 && (
              <div className="border-t border-[var(--border-default)] pt-3">
                <p className="text-caption text-[var(--text-tertiary)] mb-2">
                  Requirement statuses updated:
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.requirementUpdates.map((update) => (
                    <span
                      key={update.requirementId}
                      className={`inline-flex items-center gap-1.5 text-caption px-2.5 py-1 rounded-lg ${
                        update.status === "compliant"
                          ? "bg-[var(--accent-success)]/10 text-[var(--accent-success)]"
                          : "bg-[var(--accent-warning-soft)] text-[var(--accent-warning)]"
                      }`}
                    >
                      {update.status === "compliant" ? (
                        <CheckCircle2 size={10} />
                      ) : (
                        <AlertTriangle size={10} />
                      )}
                      {update.requirementId.toUpperCase()}: {update.status}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Compliance Card Sub-component ───

function ComplianceCard({
  label,
  title,
  passed,
  partial,
  details,
}: {
  label: string;
  title: string;
  passed: boolean;
  partial?: boolean;
  details: string;
}) {
  const status = passed ? "pass" : partial ? "partial" : "fail";

  const statusStyles = {
    pass: {
      icon: CheckCircle2,
      color: "text-[var(--accent-success)]",
      bg: "bg-[var(--accent-success)]/10",
      border: "border-[var(--accent-success)]/20",
      label: "Compliant",
    },
    partial: {
      icon: AlertTriangle,
      color: "text-[var(--accent-warning)]",
      bg: "bg-[var(--accent-warning-soft)]",
      border: "border-[var(--accent-warning)]/20",
      label: "Partial",
    },
    fail: {
      icon: XCircle,
      color: "text-[var(--accent-danger)]",
      bg: "bg-[var(--accent-danger)]/10",
      border: "border-[var(--accent-danger)]/20",
      label: "Non-Compliant",
    },
  };

  const s = statusStyles[status];
  const StatusIcon = s.icon;

  return (
    <div
      className={`${s.bg} border ${s.border} rounded-lg p-3`}
      title={details}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-micro uppercase tracking-wider text-[var(--text-tertiary)]">
          {label}
        </span>
        <StatusIcon size={14} className={s.color} />
      </div>
      <p className="text-caption font-medium text-[var(--text-primary)] mb-1">
        {title}
      </p>
      <span className={`text-micro font-medium ${s.color}`}>{s.label}</span>
    </div>
  );
}
