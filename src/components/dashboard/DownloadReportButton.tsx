"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";

export default function DownloadReportButton() {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      // Fetch compliance score data
      const res = await fetch("/api/dashboard/compliance-score");
      if (!res.ok) throw new Error("Failed to fetch compliance data");
      const scoreData = await res.json();

      // Dynamic import of PDF libraries
      const [{ pdf }, { ComplianceSummaryPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/pdf/reports/compliance-summary"),
      ]);

      const reportData = {
        reportNumber: `CSR-${Date.now().toString(36).toUpperCase()}`,
        reportDate: new Date(),
        organization: "My Organization",
        generatedBy: "Caelex Platform",
        overall: scoreData.overall,
        grade: scoreData.grade,
        status: scoreData.status,
        breakdown: scoreData.breakdown,
        recommendations: scoreData.recommendations || [],
      };

      const blob = await pdf(
        ComplianceSummaryPDF({ data: reportData }),
      ).toBlob();

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance-summary-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={generating}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white/80 hover:bg-white/10 hover:border-white/15 transition-all text-[12px] disabled:opacity-50"
    >
      {generating ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <FileDown size={14} />
      )}
      {generating ? "Generating..." : "Export PDF"}
    </button>
  );
}
