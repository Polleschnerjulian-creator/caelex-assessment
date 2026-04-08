"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

interface ResearchResult {
  summary: string;
  icpFit: "strong" | "moderate" | "weak" | "unknown";
  keyInsights: string[];
  suggestedActions: string[];
  complianceGaps: string[];
  error?: string;
}

const ICP_COLORS: Record<ResearchResult["icpFit"], string> = {
  strong: "var(--accent-success)",
  moderate: "var(--accent-info)",
  weak: "var(--accent-warning)",
  unknown: "var(--text-tertiary)",
};

export default function AiResearchCard({
  companyId,
  onComplete,
}: {
  companyId: string;
  onComplete?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);

  const handleResearch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/crm/ai/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({ companyId }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        onComplete?.();
      } else {
        setResult({
          summary: "",
          icpFit: "unknown",
          keyInsights: [],
          suggestedActions: [],
          complianceGaps: [],
          error: "Failed to generate research",
        });
      }
    } catch (err) {
      console.error(err);
      setResult({
        summary: "",
        icpFit: "unknown",
        keyInsights: [],
        suggestedActions: [],
        complianceGaps: [],
        error: "Network error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!result) {
    return (
      <button
        onClick={handleResearch}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-colors disabled:opacity-50"
        style={{
          background: "var(--accent-primary-soft)",
          borderColor: "var(--accent-primary)",
          color: "var(--accent-primary)",
        }}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span className="text-body font-medium">Researching…</span>
          </>
        ) : (
          <>
            <Sparkles size={16} />
            <span className="text-body font-medium">Research with Claude</span>
          </>
        )}
      </button>
    );
  }

  if (result.error) {
    return (
      <div
        className="rounded-xl border p-4"
        style={{
          background: "var(--accent-danger)/10",
          borderColor: "var(--accent-danger)",
        }}
      >
        <div className="flex items-center gap-2 text-[var(--accent-danger)]">
          <AlertCircle size={14} />
          <p className="text-small font-medium">Research failed</p>
        </div>
        <p className="text-caption text-[var(--text-tertiary)] mt-1">
          {result.error === "NOT_CONFIGURED"
            ? "Set ANTHROPIC_API_KEY to enable AI research."
            : result.error}
        </p>
        <button
          onClick={handleResearch}
          className="mt-2 text-caption text-[var(--accent-primary)] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-4 space-y-4"
      style={{
        background: "var(--surface-raised)",
        borderColor: "var(--border-default)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[var(--accent-info)]" />
          <p className="text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            AI Briefing
          </p>
        </div>
        <span
          className="text-caption font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: `${ICP_COLORS[result.icpFit]}15`,
            color: ICP_COLORS[result.icpFit],
          }}
        >
          ICP fit: {result.icpFit}
        </span>
      </div>

      <p className="text-body text-[var(--text-primary)] leading-relaxed">
        {result.summary}
      </p>

      {result.keyInsights.length > 0 && (
        <div>
          <p className="text-caption font-semibold text-[var(--text-tertiary)] mb-1.5">
            Key insights
          </p>
          <ul className="space-y-1">
            {result.keyInsights.map((insight, i) => (
              <li
                key={i}
                className="text-small text-[var(--text-secondary)] pl-4 relative before:content-['·'] before:absolute before:left-0"
              >
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.suggestedActions.length > 0 && (
        <div>
          <p className="text-caption font-semibold text-[var(--text-tertiary)] mb-1.5">
            Suggested actions
          </p>
          <ul className="space-y-1">
            {result.suggestedActions.map((action, i) => (
              <li
                key={i}
                className="text-small text-[var(--text-secondary)] pl-4 relative before:content-['→'] before:absolute before:left-0 before:text-[var(--accent-primary)]"
              >
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.complianceGaps.length > 0 && (
        <div>
          <p className="text-caption font-semibold text-[var(--text-tertiary)] mb-1.5">
            Likely compliance gaps
          </p>
          <ul className="space-y-1">
            {result.complianceGaps.map((gap, i) => (
              <li
                key={i}
                className="text-small text-[var(--text-secondary)] pl-4 relative before:content-['!'] before:absolute before:left-0 before:text-[var(--accent-warning)]"
              >
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => setResult(null)}
        className="text-caption text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
      >
        Regenerate
      </button>
    </div>
  );
}
