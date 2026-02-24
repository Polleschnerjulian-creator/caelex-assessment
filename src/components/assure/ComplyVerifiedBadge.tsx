"use client";

import { ShieldCheck } from "lucide-react";

// ─── Types ───

interface ComplyVerifiedBadgeProps {
  label?: string;
}

// ─── Component ───

export default function ComplyVerifiedBadge({
  label = "Verified by Caelex Comply",
}: ComplyVerifiedBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
      <ShieldCheck size={12} className="text-emerald-400 flex-shrink-0" />
      <span className="text-micro font-medium text-emerald-400 whitespace-nowrap">
        {label}
      </span>
    </span>
  );
}
