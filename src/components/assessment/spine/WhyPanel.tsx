"use client";

/**
 * WhyPanel — the "why we ask this" affordance (CNIL pattern) for the spine
 * wizard (plan: docs/superpowers/plans/2026-06-10-ultimate-assessment-rebuild.md,
 * Task 2.3).
 *
 * Every question in the graph carries a non-empty `why` plus ≥1 citation
 * (dataset integrity tests, Task 1.5). This panel renders BOTH — the plain-
 * language reason and the legal basis with its as-of date. A citation with
 * `verified: false` is rendered honestly as "legal basis pending verification"
 * (honesty invariant 5), never silently presented as settled law.
 */

import { useId, useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import type { FindingSource } from "@/lib/assessment/finding";

interface WhyPanelProps {
  why: string;
  citations: FindingSource[];
}

export default function WhyPanel({ why, citations }: WhyPanelProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="max-w-2xl mx-auto mt-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 text-small text-white/45 hover:text-emerald-400 transition-colors"
      >
        <HelpCircle size={13} aria-hidden="true" />
        <span>Why we ask this</span>
        <ChevronDown
          size={13}
          aria-hidden="true"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          id={panelId}
          className="mt-3 rounded-xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] p-4 text-left"
          style={{
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
          }}
        >
          <p className="text-body text-white/70 leading-relaxed">{why}</p>

          {citations.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
              {citations.map((source, index) => (
                <li
                  key={`${source.citation}-${index}`}
                  className="text-small text-white/45 leading-relaxed"
                >
                  <span className="text-white/60">{source.label}</span>
                  {" — "}
                  {source.citation}
                  <span className="text-white/30"> (as of {source.asOf})</span>
                  {!source.verified && (
                    <span className="text-amber-400/80">
                      {" "}
                      — legal basis pending verification
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
