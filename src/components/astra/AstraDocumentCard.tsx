"use client";

import { FileText, Eye, Download, Pencil, AlertTriangle } from "lucide-react";
import type { AstraDocumentMeta } from "@/lib/astra/types";

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

function handlePhase2Click() {
  // In Phase 2, this would trigger actual document actions
  alert("Feature verfuegbar ab Phase 2.");
}

export default function AstraDocumentCard({ meta }: AstraDocumentCardProps) {
  const status = statusLabels[meta.status] || statusLabels.draft;

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
          <span className="text-[10px] text-white/30">Seiten:</span>
          <span className="text-[10px] text-white/60">
            ~{meta.estimatedPages} (geschaetzt)
          </span>
        </div>
        {meta.articlesReferenced.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30">Referenzen:</span>
            <span className="text-[10px] text-white/60">
              {meta.articlesReferenced.join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePhase2Click}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg text-[10px] text-white/60 hover:text-white/80 transition-colors"
        >
          <Eye size={10} />
          Preview
        </button>
        <button
          onClick={handlePhase2Click}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg text-[10px] text-white/60 hover:text-white/80 transition-colors"
        >
          <Download size={10} />
          Download
        </button>
        <button
          onClick={handlePhase2Click}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg text-[10px] text-white/60 hover:text-white/80 transition-colors"
        >
          <Pencil size={10} />
          Edit
        </button>
      </div>

      {/* Framework Mode Notice */}
      <div className="mt-3 flex items-start gap-1.5 text-[9px] text-amber-400/60">
        <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" />
        <span>
          Framework-Modus: Dokument ist ein Placeholder. Echte Generierung ab
          Phase 2.
        </span>
      </div>
    </div>
  );
}
