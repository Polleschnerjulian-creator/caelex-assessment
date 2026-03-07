"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function DownloadReportButton() {
  const { t } = useLanguage();
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/dashboard/compliance-score/pdf");
      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance-summary-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={generating}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:border-[var(--border-default)] transition-all text-small disabled:opacity-50"
    >
      {generating ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <FileDown size={14} />
      )}
      {generating ? t("common.generating") : t("dashboard.exportPdf")}
    </button>
  );
}
