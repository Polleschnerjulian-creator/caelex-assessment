"use client";

import { Zap } from "lucide-react";
import { useAstra } from "./AstraProvider";

interface AstraButtonProps {
  articleId: string;
  articleRef: string;
  title: string;
  severity: string;
  regulationType: string;
}

export default function AstraButton({
  articleId,
  articleRef,
  title,
  severity,
  regulationType,
}: AstraButtonProps) {
  const { openWithArticle } = useAstra();

  return (
    <button
      onClick={() =>
        openWithArticle(articleId, articleRef, title, severity, regulationType)
      }
      className="flex items-center gap-1.5 mt-2 text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors group"
    >
      <Zap
        size={10}
        className="text-cyan-500/60 group-hover:text-cyan-400 transition-colors"
      />
      <span>Use ASTRA</span>
    </button>
  );
}
