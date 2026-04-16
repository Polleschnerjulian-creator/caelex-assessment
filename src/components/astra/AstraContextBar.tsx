"use client";

import { X, FileText, FolderOpen, Globe } from "lucide-react";
import type { AstraContext } from "@/lib/astra/types";

interface AstraContextBarProps {
  context: AstraContext;
  onDismiss: () => void;
}

export default function AstraContextBar({
  context,
  onDismiss,
}: AstraContextBarProps) {
  if (context.mode === "general") return null;

  let icon: React.ReactNode;
  let label: string;
  let detail: string;

  if (context.mode === "article") {
    icon = <FileText size={12} />;
    label = context.articleRef;
    detail = context.title;
  } else if (context.mode === "category") {
    icon = <FolderOpen size={12} />;
    label = context.categoryLabel;
    detail = `${context.articles.length} articles`;
  } else if (context.mode === "module") {
    icon = <Globe size={12} />;
    label = context.moduleName;
    detail = "Module context";
  } else {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
      <span className="text-gray-500">{icon}</span>
      <span className="text-caption font-medium text-gray-700">{label}</span>
      <span className="text-micro text-gray-400 truncate flex-1">{detail}</span>
      <button
        onClick={onDismiss}
        className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label="Clear context"
      >
        <X size={12} />
      </button>
    </div>
  );
}
