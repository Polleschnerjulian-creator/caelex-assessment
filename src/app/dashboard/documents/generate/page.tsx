"use client";

import dynamic from "next/dynamic";
import FeatureGate from "@/components/dashboard/FeatureGate";

const DocumentStudio = dynamic(
  () => import("@/components/documents/DocumentStudio"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-white/50">
            Loading Document Studio...
          </p>
        </div>
      </div>
    ),
  },
);

export default function DocumentGeneratePage() {
  return (
    <FeatureGate module="documents">
      <DocumentStudio />
    </FeatureGate>
  );
}
