"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AssurePublicView from "@/components/assure/AssurePublicView";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SharedData = any;

export default function AssurePublicViewPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/assure/share/view/${token}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(
            body.error || `This link is no longer available (${res.status})`,
          );
          return;
        }
        const json = await res.json();
        // Normalize the API response to match component expectations
        setData({
          ...json,
          score: {
            ...json.score,
            computedAt: json.score?.computedAt || new Date().toISOString(),
            recommendations:
              json.score?.recommendations || json.recommendations || [],
            methodology: json.score?.methodology || json.methodology,
            components: json.score?.components || json.components || {},
          },
        });
      } catch {
        setError("Failed to load compliance data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    if (token) load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-body text-slate-600 dark:text-white/60">
            Loading compliance data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-navy-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-display-sm font-bold text-slate-900 dark:text-white mb-2">
            Link Unavailable
          </h1>
          <p className="text-body-lg text-slate-600 dark:text-white/60">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return <AssurePublicView data={data} />;
}
