"use client";

import { Suspense } from "react";
import AstraFullPage from "@/components/astra/AstraFullPage";

function AstraPageContent() {
  return <AstraFullPage />;
}

export default function AstraPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-64px)] -m-6 lg:-m-8 items-center justify-center bg-dark-bg">
          <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      }
    >
      <AstraPageContent />
    </Suspense>
  );
}
