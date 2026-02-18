"use client";

import { FileText, Package } from "lucide-react";
import { DocumentTypeCard } from "./DocumentTypeCard";
import { NCA_DOCUMENT_TYPES } from "@/lib/generate/types";
import type { NCADocumentType, ReadinessResult } from "@/lib/generate/types";

interface DocumentSelectorPanelProps {
  selectedType: NCADocumentType | null;
  onSelect: (type: NCADocumentType) => void;
  readiness: ReadinessResult[];
  completedDocs: Set<NCADocumentType>;
  onGeneratePackage: () => void;
  isPackageGenerating: boolean;
}

export function DocumentSelectorPanel({
  selectedType,
  onSelect,
  readiness,
  completedDocs,
  onGeneratePackage,
  isPackageGenerating,
}: DocumentSelectorPanelProps) {
  const readinessMap = new Map(readiness.map((r) => [r.documentType, r]));

  const debrisDocs = NCA_DOCUMENT_TYPES.filter((d) => d.category === "debris");
  const cyberDocs = NCA_DOCUMENT_TYPES.filter(
    (d) => d.category === "cybersecurity",
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-navy-700">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-purple-400" />
          <h2 className="text-sm font-semibold text-white">NCA Documents</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {completedDocs.size}/16 documents generated
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Category A — Debris */}
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-1 mb-2">
            Category A — Debris Mitigation
          </h3>
          <div className="space-y-1">
            {debrisDocs.map((meta) => (
              <DocumentTypeCard
                key={meta.id}
                meta={meta}
                readiness={readinessMap.get(meta.id)}
                isSelected={selectedType === meta.id}
                hasDocument={completedDocs.has(meta.id)}
                onClick={() => onSelect(meta.id)}
              />
            ))}
          </div>
        </div>

        {/* Category B — Cybersecurity */}
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-1 mb-2">
            Category B — Cybersecurity
          </h3>
          <div className="space-y-1">
            {cyberDocs.map((meta) => (
              <DocumentTypeCard
                key={meta.id}
                meta={meta}
                readiness={readinessMap.get(meta.id)}
                isSelected={selectedType === meta.id}
                hasDocument={completedDocs.has(meta.id)}
                onClick={() => onSelect(meta.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Generate Full Package button */}
      <div className="px-3 py-3 border-t border-navy-700">
        <button
          onClick={onGeneratePackage}
          disabled={isPackageGenerating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          <Package size={14} />
          {isPackageGenerating ? "Generating..." : "Generate Full Package"}
        </button>
      </div>
    </div>
  );
}
