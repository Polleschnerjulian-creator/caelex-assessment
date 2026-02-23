"use client";

import {
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Trash2,
  Plus,
  FileCode,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

export interface DataRoomDocument {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  category: string;
  addedAt: string;
}

interface DataRoomDocumentGridProps {
  documents: DataRoomDocument[];
  onRemove: (documentId: string) => void;
  onAdd: () => void;
  readOnly?: boolean;
}

function getFileIcon(fileType: string) {
  const type = fileType.toLowerCase();
  if (type.includes("pdf") || type.includes("doc"))
    return { icon: FileText, color: "text-red-400" };
  if (type.includes("xls") || type.includes("csv"))
    return { icon: FileSpreadsheet, color: "text-green-400" };
  if (
    type.includes("png") ||
    type.includes("jpg") ||
    type.includes("jpeg") ||
    type.includes("svg")
  )
    return { icon: FileImage, color: "text-rose-400" };
  if (type.includes("json") || type.includes("xml"))
    return { icon: FileCode, color: "text-emerald-400" };
  return { icon: File, color: "text-slate-400" };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const CATEGORY_COLORS: Record<string, string> = {
  COMPLIANCE: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  LEGAL: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  FINANCIAL: "text-zinc-600 dark:text-zinc-400 bg-zinc-500/10",
  TECHNICAL: "text-green-600 dark:text-green-400 bg-green-500/10",
  INSURANCE: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  OTHER: "text-slate-600 dark:text-slate-400 bg-slate-500/10",
};

export default function DataRoomDocumentGrid({
  documents,
  onRemove,
  onAdd,
  readOnly = false,
}: DataRoomDocumentGridProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-title font-semibold text-slate-900 dark:text-white">
          Documents
        </h3>
        {!readOnly && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
          >
            <Plus size={12} />
            Add Document
          </button>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText
            size={32}
            className="text-slate-300 dark:text-white/20 mb-3"
          />
          <p className="text-body text-slate-500 dark:text-white/50">
            No documents in this data room yet.
          </p>
          {!readOnly && (
            <button
              onClick={onAdd}
              className="mt-3 text-caption font-medium text-emerald-500 hover:text-emerald-600 transition-colors"
            >
              Add your first document
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.map((doc) => {
            const { icon: FileIcon, color: iconColor } = getFileIcon(
              doc.fileType,
            );
            const categoryColor =
              CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.OTHER;

            return (
              <GlassCard key={doc.id} hover>
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileIcon
                        size={18}
                        className={`flex-shrink-0 ${iconColor}`}
                      />
                      <div className="min-w-0">
                        <p className="text-body font-medium text-slate-900 dark:text-white truncate">
                          {doc.name}
                        </p>
                        <p className="text-micro text-slate-400 dark:text-white/40">
                          {formatFileSize(doc.fileSize)}
                        </p>
                      </div>
                    </div>
                    {!readOnly && (
                      <button
                        onClick={() => onRemove(doc.id)}
                        className="p-1 rounded text-slate-400 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0"
                        aria-label={`Remove ${doc.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className={`text-micro px-1.5 py-0.5 rounded font-medium ${categoryColor}`}
                    >
                      {doc.category}
                    </span>
                    <span className="text-micro text-slate-400 dark:text-white/40">
                      {formatDate(doc.addedAt)}
                    </span>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
