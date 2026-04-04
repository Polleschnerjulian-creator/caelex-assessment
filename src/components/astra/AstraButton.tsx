"use client";

import Link from "next/link";
import { Zap } from "lucide-react";

interface AstraButtonProps {
  articleId: string;
  articleRef: string;
  title: string;
  severity: string;
  regulationType: string;
  context?: string;
}

export default function AstraButton({
  articleId,
  articleRef,
  title,
  severity,
  regulationType,
  context,
}: AstraButtonProps) {
  const params = new URLSearchParams({
    article: articleId,
    ref: articleRef,
    title,
    severity,
    regulation: regulationType,
  });
  if (context) {
    params.set("context", context);
  }

  return (
    <Link
      href={`/dashboard/astra?${params.toString()}`}
      className="flex items-center gap-1.5 mt-2 text-micro text-cyan-400 hover:text-cyan-300 transition-colors group"
    >
      <Zap
        size={10}
        className="text-cyan-500/60 group-hover:text-cyan-400 transition-colors"
      />
      <span>Use ASTRA</span>
    </Link>
  );
}
