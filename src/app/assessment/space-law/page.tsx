"use client";

import dynamic from "next/dynamic";

const SpaceLawAssessmentWizard = dynamic(
  () => import("@/components/assessment/SpaceLawAssessmentWizard"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading space law assessment...</p>
        </div>
      </div>
    ),
  },
);

export default function SpaceLawAssessmentPage() {
  return (
    <div className="dark-section text-white">
      <SpaceLawAssessmentWizard />
    </div>
  );
}
