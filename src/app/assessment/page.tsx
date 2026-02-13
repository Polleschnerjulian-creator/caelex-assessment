"use client";

import dynamic from "next/dynamic";

const RegulationPicker = dynamic(
  () => import("@/components/assessment/RegulationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[13px] text-white/50">Loading...</p>
        </div>
      </div>
    ),
  },
);

export default function AssessmentPage() {
  return (
    <div className="landing-page text-white">
      <RegulationPicker />
    </div>
  );
}
