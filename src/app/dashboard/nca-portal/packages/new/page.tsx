"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Package,
  CheckCircle,
  XCircle,
  Minus,
  Send,
  Loader2,
} from "lucide-react";
import NCAInfoCard from "@/components/nca-portal/NCAInfoCard";
import PackageCompletenessBar from "@/components/nca-portal/PackageCompletenessBar";
import { useOrganization } from "@/components/providers/OrganizationProvider";

// NCA authority data for the picker — mirrors NCA_AUTHORITY_INFO from nca-submission-service
const NCA_OPTIONS = [
  {
    authority: "DE_BMWK",
    name: "Federal Ministry for Economic Affairs and Climate Action",
    country: "Germany",
    description: "German national authority for space activities",
  },
  {
    authority: "DE_DLR",
    name: "German Aerospace Center (DLR)",
    country: "Germany",
    description: "German space agency and research center",
  },
  {
    authority: "FR_CNES",
    name: "Centre National d'Études Spatiales",
    country: "France",
    description: "French space agency",
  },
  {
    authority: "FR_DGAC",
    name: "Direction Générale de l'Aviation Civile",
    country: "France",
    description: "French civil aviation authority with space oversight",
  },
  {
    authority: "IT_ASI",
    name: "Agenzia Spaziale Italiana",
    country: "Italy",
    description: "Italian space agency",
  },
  {
    authority: "ES_AEE",
    name: "Agencia Espacial Española",
    country: "Spain",
    description: "Spanish space agency",
  },
  {
    authority: "NL_NSO",
    name: "Netherlands Space Office",
    country: "Netherlands",
    description: "Dutch space office",
  },
  {
    authority: "BE_BELSPO",
    name: "Belgian Science Policy Office",
    country: "Belgium",
    description: "Belgian federal science policy office",
  },
  {
    authority: "AT_FFG",
    name: "Austrian Research Promotion Agency",
    country: "Austria",
    description: "Austrian space activities authority",
  },
  {
    authority: "PL_POLSA",
    name: "Polish Space Agency",
    country: "Poland",
    description: "Polish space agency",
  },
  {
    authority: "SE_SNSA",
    name: "Swedish National Space Agency",
    country: "Sweden",
    description: "Swedish space agency",
  },
  {
    authority: "DK_DTU",
    name: "DTU Space",
    country: "Denmark",
    description: "Danish national space institute",
  },
  {
    authority: "FI_BF",
    name: "Business Finland",
    country: "Finland",
    description: "Finnish space activities authority",
  },
  {
    authority: "PT_FCT",
    name: "Fundação para a Ciência e a Tecnologia",
    country: "Portugal",
    description: "Portuguese science and technology foundation",
  },
  {
    authority: "IE_EI",
    name: "Enterprise Ireland",
    country: "Ireland",
    description: "Irish enterprise development agency",
  },
  {
    authority: "LU_LSA",
    name: "Luxembourg Space Agency",
    country: "Luxembourg",
    description: "Luxembourg space agency",
  },
  {
    authority: "CZ_CSO",
    name: "Czech Space Office",
    country: "Czech Republic",
    description: "Czech national space office",
  },
  {
    authority: "RO_ROSA",
    name: "Romanian Space Agency",
    country: "Romania",
    description: "Romanian space agency",
  },
  {
    authority: "GR_HSA",
    name: "Hellenic Space Agency",
    country: "Greece",
    description: "Greek space agency",
  },
  {
    authority: "EUSPA",
    name: "EU Agency for the Space Programme",
    country: "EU",
    description: "EU space programme agency",
  },
  {
    authority: "EC_DEFIS",
    name: "European Commission DG DEFIS",
    country: "EU",
    description:
      "European Commission Directorate-General for Defence Industry and Space",
  },
];

interface PackageDocument {
  sourceType: string;
  sourceId: string;
  documentType: string;
  title: string;
  status: "found" | "missing" | "optional";
}

interface AssemblyResult {
  package: { id: string; packageName: string; completenessScore: number };
  documents: PackageDocument[];
  completenessScore: number;
  missingDocuments: string[];
  requiredDocuments: string[];
}

const STEPS = ["Select NCA", "Review Package", "Confirm & Submit"];

export default function PackageBuilderPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const [step, setStep] = useState(0);
  const [selectedNCA, setSelectedNCA] = useState<string | null>(null);
  const [isAssembling, setIsAssembling] = useState(false);
  const [assemblyResult, setAssemblyResult] = useState<AssemblyResult | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [submissionMethod, setSubmissionMethod] = useState("PORTAL");

  const handleAssemble = async () => {
    if (!selectedNCA || !organization?.id) return;

    setIsAssembling(true);
    try {
      const res = await fetch("/api/nca-portal/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ncaAuthority: selectedNCA,
          organizationId: organization.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to assemble package");
      const data = await res.json();
      setAssemblyResult(data);
      setStep(1);
    } catch (error) {
      console.error("Failed to assemble package:", error);
    } finally {
      setIsAssembling(false);
    }
  };

  const handleSubmit = async () => {
    if (!assemblyResult) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/nca-portal/packages/${assemblyResult.package.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submissionMethod,
            coverLetter: coverLetter || undefined,
          }),
        },
      );

      if (!res.ok) throw new Error("Failed to submit package");
      const data = await res.json();
      router.push(`/dashboard/nca-portal/submissions/${data.submission.id}`);
    } catch (error) {
      console.error("Failed to submit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (step > 0 ? setStep(step - 1) : router.back())}
          aria-label="Go back"
          className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]:text-white rounded-lg hover:bg-[var(--surface-sunken)] transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Package
              size={20}
              className="text-[var(--accent-primary)]"
              aria-hidden="true"
            />
            Assemble Submission Package
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Build a complete document package for NCA submission
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div
              className={`
                w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0
                ${
                  i < step
                    ? "bg-[var(--accent-primary)] text-white"
                    : i === step
                      ? "bg-[var(--accent-primary)] text-white"
                      : "bg-[var(--surface-sunken)] text-[var(--text-secondary)]"
                }
              `}
            >
              {i < step ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span
              className={`text-xs ${
                i === step
                  ? "text-[var(--text-primary)] font-medium"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px bg-[var(--surface-sunken)]" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select NCA */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            Select Target Authority
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {NCA_OPTIONS.map((nca) => (
              <NCAInfoCard
                key={nca.authority}
                authority={nca.authority}
                name={nca.name}
                country={nca.country}
                description={nca.description}
                selected={selectedNCA === nca.authority}
                onClick={() => setSelectedNCA(nca.authority)}
              />
            ))}
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={handleAssemble}
              disabled={!selectedNCA || isAssembling}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isAssembling ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Assembling...
                </>
              ) : (
                <>
                  Assemble Package
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review Package */}
      {step === 1 && assemblyResult && (
        <div className="space-y-4">
          <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
              {assemblyResult.package.packageName}
            </h3>
            <PackageCompletenessBar
              score={assemblyResult.completenessScore}
              size="lg"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-2">
              {assemblyResult.requiredDocuments.length -
                assemblyResult.missingDocuments.length}{" "}
              of {assemblyResult.requiredDocuments.length} required documents
              found
            </p>
          </div>

          <div className="space-y-2">
            {assemblyResult.documents
              .sort((a, b) => {
                const order = { missing: 0, found: 1, optional: 2 };
                return order[a.status] - order[b.status];
              })
              .map((doc, i) => (
                <div
                  key={`${doc.documentType}-${i}`}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border
                    ${
                      doc.status === "found"
                        ? "border-[var(--accent-primary)/20] bg-[var(--accent-success-soft)]0/[0.02]"
                        : doc.status === "missing"
                          ? "border-[var(--accent-danger)]/20 bg-[var(--accent-danger)]/[0.02]"
                          : "border-[var(--border-default)]"
                    }
                  `}
                >
                  {doc.status === "found" ? (
                    <CheckCircle
                      size={16}
                      className="text-[var(--accent-primary)] flex-shrink-0"
                    />
                  ) : doc.status === "missing" ? (
                    <XCircle
                      size={16}
                      className="text-[var(--accent-danger)] flex-shrink-0"
                    />
                  ) : (
                    <Minus
                      size={16}
                      className="text-[var(--text-tertiary)] flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] truncate">
                      {doc.title}
                    </p>
                    <p className="text-micro text-[var(--text-tertiary)]">
                      {doc.sourceType === "vault"
                        ? "From document vault"
                        : doc.sourceType === "generated"
                          ? "AI generated"
                          : doc.sourceType === "assessment"
                            ? "From assessment"
                            : doc.status === "optional"
                              ? "Optional"
                              : "Required — not found"}
                    </p>
                  </div>
                  {doc.status === "missing" && (
                    <span className="text-micro px-2 py-0.5 rounded bg-[var(--accent-danger)]/10 text-[var(--accent-danger)] font-medium">
                      MISSING
                    </span>
                  )}
                  {doc.status === "optional" && (
                    <span className="text-micro px-2 py-0.5 rounded bg-[var(--surface-sunken)] text-[var(--text-tertiary)] font-medium">
                      OPTIONAL
                    </span>
                  )}
                </div>
              ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setStep(0)}
              className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors"
            >
              Continue
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Submit */}
      {step === 2 && assemblyResult && (
        <div className="space-y-4">
          <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
              Submission Details
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Submission Method
                </label>
                <select
                  value={submissionMethod}
                  onChange={(e) => setSubmissionMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)]"
                >
                  <option value="PORTAL">Online Portal</option>
                  <option value="EMAIL">Email</option>
                  <option value="API">API Integration</option>
                  <option value="REGISTERED_MAIL">Registered Mail</option>
                  <option value="IN_PERSON">In Person</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Cover Letter (Optional)
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Optional cover letter for your submission..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">
              Summary
            </h3>
            <div className="text-xs text-[var(--text-secondary)] space-y-1">
              <p>Package: {assemblyResult.package.packageName}</p>
              <p>
                Documents:{" "}
                {
                  assemblyResult.documents.filter((d) => d.status === "found")
                    .length
                }{" "}
                included
              </p>
              <p>Completeness: {assemblyResult.completenessScore}%</p>
              <p>Method: {submissionMethod}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Submit to NCA
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
