"use client";

import { useState } from "react";
import {
  Send,
  Building2,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Globe,
  Mail,
  Server,
  Package,
  Users,
  ExternalLink,
} from "lucide-react";

interface Report {
  id: string;
  title: string | null;
  reportType: string;
  status: string;
}

interface NCAAuthorityOption {
  value: string;
  label: string;
  country: string;
  portalUrl?: string;
}

interface SubmissionWizardProps {
  report: Report;
  ncaAuthorities: NCAAuthorityOption[];
  onSubmit: (data: {
    reportId: string;
    ncaAuthority: string;
    submissionMethod: string;
    coverLetter?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
}

const SUBMISSION_METHODS = [
  {
    value: "PORTAL",
    label: "Online Portal",
    icon: Globe,
    description: "Submit through the NCA official online portal",
  },
  {
    value: "EMAIL",
    label: "Email",
    icon: Mail,
    description: "Send via official email to the NCA",
  },
  {
    value: "API",
    label: "API Integration",
    icon: Server,
    description: "Automated submission via API (if available)",
  },
  {
    value: "REGISTERED_MAIL",
    label: "Registered Mail",
    icon: Package,
    description: "Physical submission via registered postal mail",
  },
  {
    value: "IN_PERSON",
    label: "In Person",
    icon: Users,
    description: "In-person submission at NCA offices",
  },
];

export function SubmissionWizard({
  report,
  ncaAuthorities,
  onSubmit,
  onCancel,
  isOpen,
}: SubmissionWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedAuthority, setSelectedAuthority] = useState<string | null>(
    null,
  );
  const [submissionMethod, setSubmissionMethod] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedAuthorityInfo = ncaAuthorities.find(
    (a) => a.value === selectedAuthority,
  );

  const handleSubmit = async () => {
    if (!selectedAuthority || !submissionMethod) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit({
        reportId: report.id,
        ncaAuthority: selectedAuthority,
        submissionMethod,
        coverLetter: coverLetter.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return !!selectedAuthority;
      case 2:
        return !!submissionMethod;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-800 border border-navy-700 rounded-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-navy-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Send className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-200">
                  Submit to NCA
                </h3>
                <p className="text-sm text-slate-400">
                  {report.title || report.reportType}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-300"
            >
              Cancel
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    s < step
                      ? "bg-green-500 text-white"
                      : s === step
                        ? "bg-blue-500 text-white"
                        : "bg-navy-700 text-slate-400"
                  }`}
                >
                  {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-12 h-0.5 mx-1 ${
                      s < step ? "bg-green-500" : "bg-navy-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Step 1: Select NCA */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-300">
                Select National Competent Authority
              </h4>
              <div className="grid gap-2 max-h-80 overflow-y-auto">
                {ncaAuthorities.map((authority) => (
                  <button
                    key={authority.value}
                    onClick={() => setSelectedAuthority(authority.value)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      selectedAuthority === authority.value
                        ? "bg-blue-500/10 border-blue-500/50 text-blue-400"
                        : "bg-navy-900 border-navy-600 hover:border-navy-500 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-slate-500" />
                        <div>
                          <div className="font-medium">{authority.label}</div>
                          <div className="text-sm text-slate-500">
                            {authority.country}
                          </div>
                        </div>
                      </div>
                      {authority.portalUrl && (
                        <ExternalLink className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Method */}
          {step === 2 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-300">
                Select Submission Method
              </h4>
              {selectedAuthorityInfo?.portalUrl && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-400">
                    <strong>{selectedAuthorityInfo.label}</strong> has an online
                    portal:
                  </p>
                  <a
                    href={selectedAuthorityInfo.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-300 hover:underline flex items-center gap-1 mt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {selectedAuthorityInfo.portalUrl}
                  </a>
                </div>
              )}
              <div className="grid gap-2">
                {SUBMISSION_METHODS.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.value}
                      onClick={() => setSubmissionMethod(method.value)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        submissionMethod === method.value
                          ? "bg-blue-500/10 border-blue-500/50"
                          : "bg-navy-900 border-navy-600 hover:border-navy-500"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-5 h-5 ${
                            submissionMethod === method.value
                              ? "text-blue-400"
                              : "text-slate-500"
                          }`}
                        />
                        <div>
                          <div
                            className={`font-medium ${
                              submissionMethod === method.value
                                ? "text-blue-400"
                                : "text-slate-300"
                            }`}
                          >
                            {method.label}
                          </div>
                          <div className="text-sm text-slate-500">
                            {method.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-300">
                Review & Submit
              </h4>

              {/* Summary */}
              <div className="bg-navy-900 border border-navy-600 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Report:</span>
                  <span className="text-slate-200">
                    {report.title || report.reportType}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">NCA:</span>
                  <span className="text-slate-200">
                    {selectedAuthorityInfo?.label}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Method:</span>
                  <span className="text-slate-200">
                    {
                      SUBMISSION_METHODS.find(
                        (m) => m.value === submissionMethod,
                      )?.label
                    }
                  </span>
                </div>
              </div>

              {/* Cover Letter */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Cover Letter (Optional)
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Add any notes or cover letter content..."
                  rows={4}
                  className="w-full px-4 py-2 bg-navy-900 border border-navy-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Important Notice */}
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-400">
                    <p className="font-medium">Before submitting:</p>
                    <ul className="list-disc list-inside mt-1 text-yellow-300">
                      <li>Ensure all required documents are attached</li>
                      <li>
                        Verify the report content is complete and accurate
                      </li>
                      <li>Check that you are submitting to the correct NCA</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-navy-700 flex justify-between flex-shrink-0">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : onCancel())}
            disabled={isSubmitting}
            className="px-4 py-2 text-slate-400 hover:text-slate-300 text-sm font-medium flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {step > 1 ? "Back" : "Cancel"}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-navy-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit to NCA
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SubmissionWizard;
