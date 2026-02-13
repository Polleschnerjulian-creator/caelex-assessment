"use client";

import dynamic from "next/dynamic";

const NIS2AssessmentWizard = dynamic(
  () => import("@/components/assessment/NIS2AssessmentWizard"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[13px] text-white/50">
            Loading NIS2 assessment...
          </p>
        </div>
      </div>
    ),
  },
);

export default function NIS2AssessmentPage() {
  return (
    <div className="landing-page text-white">
      <NIS2AssessmentWizard />
    </div>
  );
}
