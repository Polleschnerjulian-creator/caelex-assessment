"use client";

import { useRouter } from "next/navigation";
import { FileText, Eye, Download, Pencil, Loader2 } from "lucide-react";
import { useState } from "react";
import type { AstraDocumentMeta } from "@/lib/astra/types";
import { csrfHeaders } from "@/lib/csrf-client";

interface AstraDocumentCardProps {
  meta: AstraDocumentMeta;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  generating: {
    label: "Generating...",
    color: "text-amber-400 bg-amber-500/10",
  },
  draft: { label: "Draft Generated", color: "text-green-400 bg-green-500/10" },
  reviewed: { label: "Reviewed", color: "text-blue-400 bg-blue-500/10" },
  final: { label: "Final", color: "text-emerald-400 bg-emerald-500/10" },
};

export default function AstraDocumentCard({ meta }: AstraDocumentCardProps) {
  const router = useRouter();
  const status = statusLabels[meta.status] || statusLabels.draft;
  const [downloading, setDownloading] = useState(false);

  const documentId = (meta as AstraDocumentMeta & { documentId?: string })
    .documentId;

  const handleView = () => {
    if (documentId) {
      router.push(`/dashboard/documents/generate?view=${documentId}`);
    } else {
      router.push("/dashboard/documents/generate");
    }
  };

  const handleDownload = async () => {
    if (!documentId) return;
    setDownloading(true);
    try {
      const response = await fetch(
        `/api/documents/generated/${documentId}/pdf`,
        { method: "POST", headers: { ...csrfHeaders() } },
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${meta.documentTitle}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      // Silent failure
    } finally {
      setDownloading(false);
    }
  };

  const handleEdit = () => {
    router.push("/dashboard/documents/generate");
  };

  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-lg p-4 my-2">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 rounded-lg bg-cyan-500/10">
          <FileText size={16} className="text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-medium text-white truncate">
            {meta.documentTitle}
          </h4>
          <p className="text-[11px] text-white/40">
            {meta.articleRef} · EU Space Act
          </p>
        </div>
      </div>

      {/* Status & Info */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">Status:</span>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${status.color}`}
          >
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">Pages:</span>
          <span className="text-[10px] text-white/60">
            ~{meta.estimatedPages} (estimated)
          </span>
        </div>
        {meta.articlesReferenced.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30">References:</span>
            <span className="text-[10px] text-white/60">
              {meta.articlesReferenced.join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleView}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg text-[10px] text-white/60 hover:text-white/80 transition-colors"
        >
          <Eye size={10} />
          View
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading || !documentId}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg text-[10px] text-white/60 hover:text-white/80 transition-colors disabled:opacity-40"
        >
          {downloading ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <Download size={10} />
          )}
          Download
        </button>
        <button
          onClick={handleEdit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg text-[10px] text-white/60 hover:text-white/80 transition-colors"
        >
          <Pencil size={10} />
          Edit
        </button>
      </div>
    </div>
  );
}
