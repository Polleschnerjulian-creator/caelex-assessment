"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { SectionRenderer } from "@/components/documents/SectionRenderer";
import type { ReportSection } from "@/lib/pdf/types";

const TYPE_LABELS: Record<string, string> = {
  DEBRIS_MITIGATION_PLAN: "Debris Mitigation Plan",
  CYBERSECURITY_FRAMEWORK: "Cybersecurity Framework",
  ENVIRONMENTAL_FOOTPRINT: "Environmental Footprint",
  INSURANCE_COMPLIANCE: "Insurance Compliance",
  NIS2_ASSESSMENT: "NIS2 Assessment",
  AUTHORIZATION_APPLICATION: "Authorization Package",
};

interface DocumentViewClientProps {
  id: string;
  title: string;
  documentType: string;
  status: string;
  sections: ReportSection[];
  createdAt: string;
  modelUsed: string | null;
}

export function DocumentViewClient({
  title,
  documentType,
  status,
  sections,
  createdAt,
  modelUsed,
}: DocumentViewClientProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const typeLabel = TYPE_LABELS[documentType] || documentType;
  const date = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const handleDownload = async () => {
    if (sections.length === 0) return;
    setDownloading(true);
    try {
      const { generateDocumentPDF } = await import("@/lib/pdf/jspdf-generator");
      const blob = generateDocumentPDF(title, sections);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9-_ ]/g, "")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch {
      // Error handling
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/documents"
            className="p-2 text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/80 hover:bg-slate-100 dark:hover:bg-white/[0.04] rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              {title}
            </h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-sm text-slate-500 dark:text-white/50">
                {typeLabel}
              </span>
              <span className="text-slate-300 dark:text-white/20">|</span>
              <span className="text-sm text-slate-400 dark:text-white/40">
                {date}
              </span>
              {modelUsed && (
                <>
                  <span className="text-slate-300 dark:text-white/20">|</span>
                  <span className="text-xs text-slate-400 dark:text-white/30">
                    {modelUsed}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === "COMPLETED" && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-500">
              <CheckCircle2 size={14} />
              Completed
            </div>
          )}
          {status === "GENERATING" && (
            <div className="flex items-center gap-1.5 text-xs text-amber-500">
              <Clock size={14} />
              Generating
            </div>
          )}
          {status === "FAILED" && (
            <div className="flex items-center gap-1.5 text-xs text-red-500">
              <XCircle size={14} />
              Failed
            </div>
          )}

          {status === "COMPLETED" && sections.length > 0 && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : downloaded ? (
                <CheckCircle2 size={14} />
              ) : (
                <Download size={14} />
              )}
              {downloading
                ? "Generating..."
                : downloaded
                  ? "Downloaded"
                  : "Download PDF"}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {sections.length > 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-6">
          <SectionRenderer sections={sections} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText
            size={40}
            className="text-slate-300 dark:text-white/20 mb-3"
          />
          <p className="text-sm text-slate-500 dark:text-white/50">
            {status === "GENERATING"
              ? "Document is being generated..."
              : status === "FAILED"
                ? "Document generation failed"
                : "No content available"}
          </p>
        </div>
      )}
    </div>
  );
}
