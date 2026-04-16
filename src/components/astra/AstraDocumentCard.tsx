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
    color: "text-amber-700 bg-amber-50",
  },
  draft: { label: "Draft Generated", color: "text-green-700 bg-green-50" },
  reviewed: { label: "Reviewed", color: "text-blue-700 bg-blue-50" },
  final: { label: "Final", color: "text-gray-900 bg-gray-100" },
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
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 my-2">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 rounded-lg bg-gray-100">
          <FileText size={16} className="text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-body font-medium text-gray-900 truncate">
            {meta.documentTitle}
          </h4>
          <p className="text-caption text-gray-500">
            {meta.articleRef} · EU Space Act
          </p>
        </div>
      </div>

      {/* Status & Info */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-micro text-gray-500">Status:</span>
          <span
            className={`text-micro font-medium px-1.5 py-0.5 rounded ${status.color}`}
          >
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-micro text-gray-500">Pages:</span>
          <span className="text-micro text-gray-600">
            ~{meta.estimatedPages} (estimated)
          </span>
        </div>
        {meta.articlesReferenced.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-micro text-gray-500">References:</span>
            <span className="text-micro text-gray-600">
              {meta.articlesReferenced.join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleView}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-micro text-gray-600 hover:text-gray-800 transition-colors"
        >
          <Eye size={10} />
          View
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading || !documentId}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-micro text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-40"
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
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-micro text-gray-600 hover:text-gray-800 transition-colors"
        >
          <Pencil size={10} />
          Edit
        </button>
      </div>
    </div>
  );
}
