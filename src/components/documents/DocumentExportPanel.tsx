"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  ArrowLeft,
  Plus,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { ReportSection } from "@/lib/pdf/types";
import { csrfHeaders } from "@/lib/csrf-client";

interface DocumentExportPanelProps {
  documentId: string;
  title: string;
  sections: ReportSection[];
  onBack: () => void;
  onNewDocument: () => void;
}

export function DocumentExportPanel({
  documentId,
  title,
  sections,
  onBack,
  onNewDocument,
}: DocumentExportPanelProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/documents/generated/${documentId}/pdf`,
        { method: "POST", headers: { ...csrfHeaders() } },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.error || `PDF generation failed (${response.status})`,
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9-_ ]/g, "")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch (err) {
      console.error("PDF download error:", err);
      setError(err instanceof Error ? err.message : "PDF download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
        Export Document
      </h2>
      <p className="text-sm text-slate-500 dark:text-white/50 mb-6">
        Download your generated document as PDF
      </p>

      <div className="max-w-lg mx-auto">
        {/* Document Summary */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <FileText size={20} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/40">
                {sections.length} sections
              </p>
            </div>
          </div>

          {/* Section List */}
          <div className="space-y-1.5 mb-4">
            {sections.map((section, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/50"
              >
                <span className="w-5 h-5 rounded flex items-center justify-center bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-white/30 text-[10px] font-medium">
                  {i + 1}
                </span>
                {section.title}
              </div>
            ))}
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-60"
          >
            {downloading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating PDF...
              </>
            ) : downloaded ? (
              <>
                <CheckCircle2 size={16} />
                Downloaded
              </>
            ) : (
              <>
                <Download size={16} />
                Download PDF
              </>
            )}
          </button>

          {error && (
            <p className="text-xs text-red-500 mt-2 text-center">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Editor
          </button>
          <button
            onClick={onNewDocument}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/[0.06] transition-colors"
          >
            <Plus size={16} />
            New Document
          </button>
        </div>
      </div>
    </div>
  );
}
