"use client";

import { useState, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { ReportSection, ReportSectionContent } from "@/lib/pdf/types";
import { csrfHeaders } from "@/lib/csrf-client";

interface DocumentEditorProps {
  sections: ReportSection[];
  onSectionsChange: (sections: ReportSection[]) => void;
  documentId: string | null;
  onNext: () => void;
  onBack: () => void;
}

/** Safely convert any value to a renderable string */
function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function DocumentEditor({
  sections,
  onSectionsChange,
  documentId,
  onNext,
  onBack,
}: DocumentEditorProps) {
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(async () => {
    if (!documentId) return;
    setSaving(true);
    try {
      await fetch(`/api/documents/generated/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ editedContent: sections }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Error handling
    } finally {
      setSaving(false);
    }
  }, [documentId, sections]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium text-slate-900 dark:text-white">
            Review & Edit
          </h2>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-0.5">
            Review the generated document and make any necessary edits
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? "Saving..." : saved ? "Saved" : "Save Edits"}
        </button>
      </div>

      {/* Section List */}
      <div className="space-y-3 mb-6">
        {sections.map((section, sectionIndex) => (
          <div
            key={sectionIndex}
            className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden"
          >
            {/* Section Header */}
            <button
              onClick={() =>
                setExpandedSection(
                  expandedSection === sectionIndex ? null : sectionIndex,
                )
              }
              className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
            >
              {expandedSection === sectionIndex ? (
                <ChevronDown
                  size={16}
                  className="text-slate-400 dark:text-white/40 flex-shrink-0"
                />
              ) : (
                <ChevronRight
                  size={16}
                  className="text-slate-400 dark:text-white/40 flex-shrink-0"
                />
              )}
              <FileText
                size={14}
                className="text-slate-400 dark:text-white/40 flex-shrink-0"
              />
              <span className="text-sm font-medium text-slate-900 dark:text-white flex-1">
                {str(section.title)}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-white/30">
                {Array.isArray(section.content) ? section.content.length : 0}{" "}
                blocks
              </span>
            </button>

            {/* Section Content */}
            {expandedSection === sectionIndex && (
              <div className="px-5 pb-5 border-t border-slate-100 dark:border-white/5">
                <div className="pt-4 space-y-3">
                  {(Array.isArray(section.content) ? section.content : []).map(
                    (block, blockIndex) => (
                      <SectionContentBlock
                        key={blockIndex}
                        block={block}
                        onChange={(newBlock) => {
                          const newSections = [...sections];
                          const newContent = [
                            ...newSections[sectionIndex].content,
                          ];
                          newContent[blockIndex] = newBlock;
                          newSections[sectionIndex] = {
                            ...newSections[sectionIndex],
                            content: newContent,
                          };
                          onSectionsChange(newSections);
                        }}
                      />
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
        >
          <ArrowLeft size={16} />
          New Document
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
        >
          Export
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Content Block Renderer/Editor ───

function SectionContentBlock({
  block,
  onChange,
}: {
  block: ReportSectionContent;
  onChange: (block: ReportSectionContent) => void;
}) {
  if (!block || typeof block !== "object" || !block.type) {
    return null;
  }

  switch (block.type) {
    case "text":
      return (
        <textarea
          value={str(block.value)}
          onChange={(e) => onChange({ ...block, value: e.target.value })}
          className="w-full bg-transparent text-sm text-slate-700 dark:text-white/70 resize-none border border-transparent hover:border-slate-200 dark:hover:border-white/10 focus:border-emerald-500/30 rounded-lg px-3 py-2 transition-colors outline-none min-h-[60px]"
          rows={Math.max(2, Math.ceil(str(block.value).length / 80))}
        />
      );

    case "heading":
      return (
        <input
          value={str(block.value)}
          onChange={(e) => onChange({ ...block, value: e.target.value })}
          className={`w-full bg-transparent font-medium border border-transparent hover:border-slate-200 dark:hover:border-white/10 focus:border-emerald-500/30 rounded-lg px-3 py-1.5 transition-colors outline-none ${
            block.level === 2
              ? "text-base text-slate-900 dark:text-white"
              : "text-sm text-slate-800 dark:text-white/90"
          }`}
        />
      );

    case "list":
      return (
        <div className="space-y-1 pl-4">
          {(Array.isArray(block.items) ? block.items : []).map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs text-slate-400 dark:text-white/30 mt-1.5 flex-shrink-0">
                {block.ordered ? `${i + 1}.` : "\u2022"}
              </span>
              <input
                value={str(item)}
                onChange={(e) => {
                  const newItems = [...block.items];
                  newItems[i] = e.target.value;
                  onChange({ ...block, items: newItems });
                }}
                className="flex-1 bg-transparent text-sm text-slate-700 dark:text-white/70 border border-transparent hover:border-slate-200 dark:hover:border-white/10 focus:border-emerald-500/30 rounded px-2 py-0.5 transition-colors outline-none"
              />
            </div>
          ))}
        </div>
      );

    case "table":
      return (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/[0.03]">
                {(Array.isArray(block.headers) ? block.headers : []).map(
                  (h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left font-medium text-slate-600 dark:text-white/50 border-b border-slate-200 dark:border-white/10"
                    >
                      {str(h)}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(block.rows) ? block.rows : []).map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-slate-100 dark:border-white/5 last:border-0"
                >
                  {(Array.isArray(row) ? row : []).map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-3 py-2 text-slate-700 dark:text-white/60"
                    >
                      {str(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "keyValue":
      return (
        <div className="space-y-1">
          {(Array.isArray(block.items) ? block.items : []).map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="font-medium text-slate-700 dark:text-white/70 min-w-[120px]">
                {str(item?.key)}:
              </span>
              <span className="text-slate-600 dark:text-white/50">
                {str(item?.value)}
              </span>
            </div>
          ))}
        </div>
      );

    case "alert":
      return (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            block.severity === "warning"
              ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
              : block.severity === "error"
                ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20"
                : "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20"
          }`}
        >
          {str(block.message)}
        </div>
      );

    case "divider":
      return <hr className="border-slate-200 dark:border-white/10" />;

    case "spacer":
      return <div style={{ height: block.height || 10 }} />;

    default:
      return null;
  }
}
