"use client";

import dynamic from "next/dynamic";

const AssessmentWizard = dynamic(
  () => import("@/components/assessment/AssessmentWizard"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading assessment...</p>
        </div>
      </div>
    ),
  },
);

export default function EUSpaceActAssessmentPage() {
  return (
    <div className="dark-section text-white">
      <AssessmentWizard />
    </div>
  );
}
