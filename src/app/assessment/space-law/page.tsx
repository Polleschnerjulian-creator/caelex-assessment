"use client";

import dynamic from "next/dynamic";

const SpaceLawAssessmentWizard = dynamic(
  () => import("@/components/assessment/SpaceLawAssessmentWizard"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[13px] text-white/50">
            Loading space law assessment...
          </p>
        </div>
      </div>
    ),
  },
);

export default function SpaceLawAssessmentPage() {
  return (
    <div className="landing-page text-white">
      <SpaceLawAssessmentWizard />
    </div>
  );
}
