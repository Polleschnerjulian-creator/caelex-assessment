"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { ComplianceResult } from "@/lib/types";
import { generatePDF } from "@/lib/pdf";
import Button from "@/components/ui/Button";
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
      // In a real implementation, you would send this data to a backend
      console.log("Email submission:", { email, company, role, subscribe });

      // Close the modal
      setIsEmailGateOpen(false);

      // Generate and download PDF
      setIsGeneratingPDF(true);
      try {
        await generatePDF(result);
      } catch (error) {
        console.error("PDF generation failed:", error);
        alert("Failed to generate PDF. Please try again.");
      } finally {
        setIsGeneratingPDF(false);
      }
    },
    [result],
  );

  return (
    <div className="min-h-screen bg-navy-950 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={onRestart}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        </motion.div>

        {/* Results title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Your Assessment Results
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Based on your answers, here&apos;s how the EU Space Act (COM(2025)
            335) applies to your operations.
          </p>
        </motion.div>

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
          className="mt-16 text-center"
        >
          <div className="bg-navy-800 border border-navy-700 rounded-xl p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-white mb-3">
              Need help with compliance?
            </h3>
            <p className="text-slate-400 mb-6">
              Caelex is building comprehensive compliance software for space
              operators. Get notified when we launch.
            </p>
            <Button onClick={handleDownloadClick}>Get the Full Report</Button>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-slate-400 max-w-3xl mx-auto">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-navy-800 rounded-xl p-6 text-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white">Generating your report...</p>
          </div>
        </div>
      )}
    </div>
  );
}
