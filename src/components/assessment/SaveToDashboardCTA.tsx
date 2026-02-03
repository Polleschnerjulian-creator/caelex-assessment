"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Loader2, CheckCircle } from "lucide-react";
import { ComplianceResult } from "@/lib/types";

interface SaveToDashboardCTAProps {
  result?: ComplianceResult;
}

export default function SaveToDashboardCTA({
  result,
}: SaveToDashboardCTAProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveToDashboard = async () => {
    if (!result) return;

    setSaving(true);
    setError(null);

    try {
      // Save assessment results to API
      const response = await fetch("/api/tracker/import-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorType: result.operatorType,
          complianceResult: result,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save assessment");
      }

      setSaved(true);

      // Redirect to dashboard with success indicator
      setTimeout(() => {
        router.push("/dashboard?imported=true");
      }, 500);
    } catch (err) {
      console.error("Error saving to dashboard:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="bg-white/[0.04] border border-white/12 rounded-xl p-8 mt-6 text-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  // Logged in state
  if (session?.user) {
    return (
      <div className="bg-white/[0.04] border border-white/12 rounded-xl p-8 mt-6 text-center">
        <LayoutDashboard
          size={24}
          className="text-white/60 mx-auto mb-4"
          strokeWidth={1.5}
        />

        <h3 className="text-[16px] font-medium text-white mb-2">
          {saved ? "Saved!" : "Save to your dashboard"}
        </h3>

        <p className="text-[13px] text-white/60 mb-6">
          {saved
            ? "Redirecting to your compliance dashboard..."
            : "Track your compliance progress and manage all EU Space Act requirements in one place."}
        </p>

        {error && <p className="text-[13px] text-red-400 mb-4">{error}</p>}

        {saved ? (
          <div className="inline-flex items-center gap-2 text-green-400 text-[13px] font-medium">
            <CheckCircle size={16} />
            Assessment imported
          </div>
        ) : (
          <button
            onClick={handleSaveToDashboard}
            disabled={saving || !result}
            className="inline-flex items-center gap-2 bg-white text-black text-[13px] font-medium px-6 py-2.5 rounded-full hover:bg-white/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <LayoutDashboard size={14} />
                Save to Dashboard
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // Not logged in state
  return (
    <div className="bg-white/[0.04] border border-white/12 rounded-xl p-8 mt-6 text-center">
      <LayoutDashboard
        size={24}
        className="text-white/60 mx-auto mb-4"
        strokeWidth={1.5}
      />

      <h3 className="text-[16px] font-medium text-white mb-2">
        Track your compliance progress
      </h3>

      <p className="text-[13px] text-white/60 mb-6">
        Save your results and manage EU Space Act compliance in one dashboard.
      </p>

      <Link
        href="/signup"
        className="inline-block border border-white/[0.15] text-white text-[13px] font-medium px-6 py-2.5 rounded-full hover:bg-white hover:text-black transition-all duration-300"
      >
        Create Free Account →
      </Link>
    </div>
  );
}
