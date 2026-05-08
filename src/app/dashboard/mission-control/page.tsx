"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const MissionControlView = dynamic(
  () => import("@/components/mission-control/MissionControlView"),
  {
    ssr: false,
    // Sprint UF37 (P2-10) — replace hardcoded bg-white dark:bg-dark-bg
    // with the v2 glass-elevated token (per CLAUDE.md design-system
    // rules). matches the rest of the v2 dashboard chrome.
    loading: () => (
      <div className="glass-elevated h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--text-tertiary)] animate-spin" />
      </div>
    ),
  },
);

export default function MissionControlPage() {
  return <MissionControlView />;
}
