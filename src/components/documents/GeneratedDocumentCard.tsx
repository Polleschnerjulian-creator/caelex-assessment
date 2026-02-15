"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import type { ReportSection } from "@/lib/pdf/types";
import { csrfHeaders } from "@/lib/csrf-client";

interface GeneratedDocumentCardProps {
  id: string;
  title: string;
  documentType: string;
  status: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
  sections?: ReportSection[];
  createdAt: string;
  onDelete?: (id: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  DEBRIS_MITIGATION_PLAN: "Debris Mitigation Plan",
  CYBERSECURITY_FRAMEWORK: "Cybersecurity Framework",
  ENVIRONMENTAL_FOOTPRINT: "Environmental Footprint",
  INSURANCE_COMPLIANCE: "Insurance Compliance",
  NIS2_ASSESSMENT: "NIS2 Assessment",
  AUTHORIZATION_APPLICATION: "Authorization Package",
};

const STATUS_CONFIG = {
  PENDING: {
    icon: Clock,
    label: "Pending",
    color: "text-slate-400 dark:text-white/40",
    bg: "bg-slate-100 dark:bg-white/[0.06]",
  },
  GENERATING: {
    icon: Loader2,
    label: "Generating",
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-500/10",
  },
  COMPLETED: {
    icon: CheckCircle2,
    label: "Completed",
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  FAILED: {
    icon: XCircle,
    label: "Failed",
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-500/10",
  },
};

export function GeneratedDocumentCard({
  id,
  title,
  documentType,
  status,
  sections,
  createdAt,
  onDelete,
}: GeneratedDocumentCardProps) {
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;
  const typeLabel = TYPE_LABELS[documentType] || documentType;

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/documents/generated/${id}`, {
        method: "DELETE",
        headers: { ...csrfHeaders() },
      });
      onDelete?.(id);
    } catch {
      // Error handling
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async () => {
    if (!sections || sections.length === 0) return;
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
    } catch {
      // Error handling
    } finally {
      setDownloading(false);
    }
  };

  const date = new Date(createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 hover:border-slate-300 dark:hover:border-white/15 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/[0.06] flex-shrink-0">
            <FileText size={18} className="text-slate-500 dark:text-white/50" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
              {typeLabel}
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium ${statusConfig.bg} ${statusConfig.color}`}
        >
          <StatusIcon
            size={12}
            className={status === "GENERATING" ? "animate-spin" : ""}
          />
          {statusConfig.label}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
        <span className="text-xs text-slate-400 dark:text-white/30">
          {date}
        </span>

        <div className="flex items-center gap-1">
          {status === "COMPLETED" && (
            <>
              <Link
                href={`/dashboard/documents/generate/${id}`}
                className="p-1.5 rounded-lg text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
                title="View"
              >
                <FileText size={14} />
              </Link>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="p-1.5 rounded-lg text-slate-400 dark:text-white/40 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                title="Download PDF"
              >
                {downloading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
              </button>
            </>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg text-slate-400 dark:text-white/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
            title="Delete"
          >
            {deleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
