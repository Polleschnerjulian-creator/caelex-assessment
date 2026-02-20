"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const MissionControlView = dynamic(
  () => import("@/components/mission-control/MissionControlView"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[calc(100vh-64px)] bg-white dark:bg-dark-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-300 dark:text-white/20 animate-spin" />
      </div>
    ),
  },
);

export default function MissionControlPage() {
  return <MissionControlView />;
}
