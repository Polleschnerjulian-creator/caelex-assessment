"use client";

import { useRouter } from "next/navigation";
import { FileText, Package, ExternalLink } from "lucide-react";
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

  const router = useRouter();
  const debrisDocs = NCA_DOCUMENT_TYPES.filter((d) => d.category === "debris");
  const cyberDocs = NCA_DOCUMENT_TYPES.filter(
    (d) => d.category === "cybersecurity",
  );
  const generalDocs = NCA_DOCUMENT_TYPES.filter(
    (d) => d.category === "general",
  );
  const safetyDocs = NCA_DOCUMENT_TYPES.filter((d) => d.category === "safety");

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-black/[0.06]">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-emerald-500" />
          <h2 className="text-sm font-semibold text-slate-800">
            NCA Documents
          </h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {completedDocs.size}/{NCA_DOCUMENT_TYPES.length} documents generated
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Category A — Debris */}
        <div>
          <h3 className="text-caption font-semibold uppercase tracking-wider text-slate-400 px-1 mb-2">
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
          <h3 className="text-caption font-semibold uppercase tracking-wider text-slate-400 px-1 mb-2">
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

        {/* Category C — General Compliance */}
        <div>
          <h3 className="text-caption font-semibold uppercase tracking-wider text-slate-400 px-1 mb-2">
            Category C — General Compliance
          </h3>
          <div className="space-y-1">
            {generalDocs.map((meta) => (
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

        {/* Category D — Safety */}
        {safetyDocs.length > 0 && (
          <div>
            <h3 className="text-caption font-semibold uppercase tracking-wider text-slate-400 px-1 mb-2">
              Category D — Safety
            </h3>
            <div className="space-y-1">
              {safetyDocs.map((meta) => (
                <button
                  key={meta.id}
                  onClick={() => router.push("/dashboard/hazards")}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-black/[0.06] hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">
                          {meta.code}
                        </span>
                        <span className="text-sm font-medium text-slate-800">
                          {meta.shortTitle}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {meta.description}
                      </p>
                    </div>
                    <ExternalLink
                      size={14}
                      className="text-slate-400 group-hover:text-emerald-500 transition-colors flex-shrink-0 ml-2"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generate Full Package button */}
      <div className="px-3 py-3 border-t border-black/[0.06]">
        <button
          onClick={onGeneratePackage}
          disabled={isPackageGenerating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          <Package size={14} />
          {isPackageGenerating ? "Generating..." : "Generate Full Package"}
        </button>
      </div>
    </div>
  );
}
