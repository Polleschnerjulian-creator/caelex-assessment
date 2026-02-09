"use client";

import { Zap } from "lucide-react";
import { useAstra } from "./AstraProvider";

interface AstraBulkButtonProps {
  category: string;
  categoryLabel: string;
  articles: Array<{
    id: string;
    articleRef: string;
    title: string;
    severity: string;
  }>;
  regulationType: string;
}

export default function AstraBulkButton({
  category,
  categoryLabel,
  articles,
  regulationType,
}: AstraBulkButtonProps) {
  const { openWithCategory } = useAstra();

  return (
    <button
      onClick={() =>
        openWithCategory(category, categoryLabel, articles, regulationType)
      }
      className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20 rounded-lg text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-all"
    >
      <Zap size={12} />
      <span>ASTRA: Kategorie generieren</span>
    </button>
  );
}
