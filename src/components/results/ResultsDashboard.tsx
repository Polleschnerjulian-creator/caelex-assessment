"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw, FileDown } from "lucide-react";
import Link from "next/link";
import { ComplianceResult } from "@/lib/types";
import { generatePDF } from "@/lib/pdf";
import ComplianceProfile from "./ComplianceProfile";
import ModuleCards from "./ModuleCards";
import ChecklistPreview from "./ChecklistPreview";
import ArticleBreakdown from "./ArticleBreakdown";
import EmailGate from "./EmailGate";
import SaveToDashboardCTA from "@/components/assessment/SaveToDashboardCTA";

interface ResultsDashboardProps {
  result: ComplianceResult;
  onRestart: () => void;
}

export default function ResultsDashboard({
  result,
  onRestart,
}: ResultsDashboardProps) {
  const [isEmailGateOpen, setIsEmailGateOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handleDownloadClick = useCallback(() => {
    setIsEmailGateOpen(true);
  }, []);

  const handleEmailSubmit = useCallback(
    async (
      email: string,
      company?: string,
      role?: string,
      subscribe?: boolean,
    ) => {
      // Store lead locally for future CRM integration
      try {
        const leads = JSON.parse(
          localStorage.getItem("caelex-assessment-leads") || "[]",
        );
        leads.push({
          email,
          company,
          role,
          subscribe,
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem("caelex-assessment-leads", JSON.stringify(leads));
      } catch {
        // localStorage may be unavailable
      }
      setIsEmailGateOpen(false);
      setIsGeneratingPDF(true);
      setPdfError(null);
      try {
        await generatePDF(result);
      } catch (error) {
        console.error("PDF generation failed:", error);
        setPdfError("Failed to generate PDF. Please try again.");
      } finally {
        setIsGeneratingPDF(false);
      }
    },
    [result],
  );

  return (
    <div className="dark-section min-h-screen bg-black text-white py-12 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-12"
        >
          <Link
            href="/"
            className="flex items-center gap-2 text-[13px] text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Home</span>
          </Link>
          <button
            onClick={onRestart}
            className="flex items-center gap-2 text-[13px] text-white/60 hover:text-white transition-colors"
          >
            <RotateCcw size={14} />
            <span>Start over</span>
          </button>
        </motion.div>

        {/* Results title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50 block mb-4">
            Assessment Complete
          </span>
          <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-light tracking-[-0.02em] text-white mb-4">
            Your Compliance Profile
          </h1>
          <p className="text-[15px] text-white/70 max-w-xl mx-auto">
            Based on your answers, here&apos;s how the EU Space Act (COM(2025)
            335) applies to your operations.
          </p>
        </motion.div>

        {/* PDF error message */}
        {pdfError && (
          <div
            role="alert"
            className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center"
          >
            <p className="text-[14px] text-red-400">{pdfError}</p>
          </div>
        )}

        {/* Main content */}
        <div className="space-y-12">
          {/* Compliance Profile */}
          <ComplianceProfile result={result} />

          {/* Save to Dashboard CTA */}
          <SaveToDashboardCTA result={result} />

          {/* Module Cards */}
          <ModuleCards modules={result.moduleStatuses} />

          {/* Checklist Preview */}
          <ChecklistPreview
            checklist={result.checklist}
            onDownloadClick={handleDownloadClick}
          />

          {/* Article Breakdown */}
          <ArticleBreakdown articles={result.applicableArticles} />
        </div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-20 text-center"
        >
          <div className="bg-white/[0.05] border border-white/[0.12] rounded-xl p-10 max-w-2xl mx-auto">
            <h3 className="text-[18px] font-light text-white mb-3">
              Need help with compliance?
            </h3>
            <p className="text-[14px] text-white/70 mb-6">
              Caelex is building comprehensive compliance software for space
              operators. Get notified when we launch.
            </p>
            <button
              onClick={handleDownloadClick}
              className="inline-flex items-center gap-2 bg-white text-black text-[13px] font-medium px-6 py-2.5 rounded-full hover:bg-white/90 transition-all"
            >
              <FileDown size={14} />
              Get the Full Report
            </button>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <div className="mt-12 text-center">
          <p className="text-[12px] text-white/50 max-w-3xl mx-auto leading-relaxed">
            This assessment is based on the EU Space Act proposal (COM(2025)
            335). The regulation is subject to amendments during the legislative
            process. This does not constitute legal advice. For specific
            compliance questions, consult a qualified space law professional.
          </p>
        </div>
      </div>

      {/* Email Gate Modal */}
      <EmailGate
        isOpen={isEmailGateOpen}
        onClose={() => setIsEmailGateOpen(false)}
        onSubmit={handleEmailSubmit}
      />

      {/* Loading overlay for PDF generation */}
      {isGeneratingPDF && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white/[0.08] border border-white/[0.15] rounded-xl p-8 text-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white/80 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[14px] text-white/80">
              Generating your report...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
