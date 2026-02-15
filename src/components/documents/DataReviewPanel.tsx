"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { DocumentGenerationType } from "@/lib/astra/document-generator/types";
import { DOCUMENT_TYPE_META } from "@/lib/astra/document-generator/types";

interface DataReviewPanelProps {
  documentType: DocumentGenerationType;
  language: string;
  onLanguageChange: (language: string) => void;
  onGenerate: () => void;
  onBack: () => void;
}

const ASSESSMENT_TYPE_MAP: Record<DocumentGenerationType, string> = {
  DEBRIS_MITIGATION_PLAN: "debris",
  CYBERSECURITY_FRAMEWORK: "cybersecurity",
  ENVIRONMENTAL_FOOTPRINT: "environmental",
  INSURANCE_COMPLIANCE: "insurance",
  NIS2_ASSESSMENT: "nis2",
  AUTHORIZATION_APPLICATION: "authorization",
};

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Fran\u00e7ais" },
  { code: "es", label: "Espa\u00f1ol" },
];

export function DataReviewPanel({
  documentType,
  language,
  onLanguageChange,
  onGenerate,
  onBack,
}: DataReviewPanelProps) {
  const meta = DOCUMENT_TYPE_META[documentType];
  const [assessmentStatus, setAssessmentStatus] = useState<
    "loading" | "available" | "missing"
  >("loading");

  useEffect(() => {
    // Check if assessment data is available
    const assessmentType = ASSESSMENT_TYPE_MAP[documentType];

    fetch(
      `/api/${assessmentType === "authorization" ? "dashboard/overview" : assessmentType}`,
    )
      .then((res) => {
        setAssessmentStatus(res.ok ? "available" : "missing");
      })
      .catch(() => setAssessmentStatus("missing"));
  }, [documentType]);

  return (
    <div>
      <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
        Review & Configure
      </h2>
      <p className="text-sm text-slate-500 dark:text-white/50 mb-6">
        Review the data that will be used and configure generation settings
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Info */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">
            Document Details
          </h3>

          <div className="space-y-3">
            <div>
              <span className="text-xs text-slate-500 dark:text-white/40">
                Type
              </span>
              <p className="text-sm text-slate-900 dark:text-white">
                {meta.title}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-white/40">
                Description
              </span>
              <p className="text-sm text-slate-600 dark:text-white/60">
                {meta.description}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-white/40">
                Estimated Pages
              </span>
              <p className="text-sm text-slate-900 dark:text-white">
                ~{meta.estimatedPages} pages
              </p>
            </div>

            {/* Assessment Data Status */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/5">
              <span className="text-xs text-slate-500 dark:text-white/40">
                Assessment Data
              </span>
              <div className="flex items-center gap-2 mt-1">
                {assessmentStatus === "loading" && (
                  <>
                    <Loader2
                      size={14}
                      className="animate-spin text-slate-400"
                    />
                    <span className="text-sm text-slate-500 dark:text-white/50">
                      Checking...
                    </span>
                  </>
                )}
                {assessmentStatus === "available" && (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span className="text-sm text-emerald-600 dark:text-emerald-400">
                      Assessment data available
                    </span>
                  </>
                )}
                {assessmentStatus === "missing" && (
                  <>
                    <AlertCircle size={14} className="text-amber-500" />
                    <span className="text-sm text-amber-600 dark:text-amber-400">
                      No assessment found — generation will use defaults
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">
            Generation Settings
          </h3>

          <div className="space-y-4">
            {/* Language Selection */}
            <div>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/40 mb-2">
                <Globe size={12} />
                Document Language
              </label>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => onLanguageChange(lang.code)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      language === lang.code
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-50 dark:bg-white/[0.03] text-slate-600 dark:text-white/50 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Model Info */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
              <p className="text-xs text-slate-500 dark:text-white/40">
                Powered by Claude Sonnet 4.5 — Optimized for regulatory document
                generation with citations and structured output.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={onGenerate}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
        >
          Generate Document
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
