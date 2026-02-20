"use client";

import { useState } from "react";
import { Wrench, ChevronDown, Check } from "lucide-react";
import type { AstraToolCall } from "@/lib/astra/types";

function humanizeToolName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatParamValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

interface AstraToolExecutionCardProps {
  toolCalls: AstraToolCall[];
}

export default function AstraToolExecutionCard({
  toolCalls,
}: AstraToolExecutionCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!toolCalls.length) return null;

  return (
    <div className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.02] transition-colors"
      >
        <Wrench size={12} className="text-cyan-400 flex-shrink-0" />
        <span className="text-caption text-white/45 flex-1">
          Used {toolCalls.length} tool{toolCalls.length !== 1 ? "s" : ""}
        </span>
        <ChevronDown
          size={12}
          className={`text-white/30 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-white/[0.06] px-3 py-2 space-y-1.5">
          {toolCalls.map((call) => (
            <div key={call.id} className="flex items-start gap-2">
              <Check
                size={10}
                className="text-green-400 mt-0.5 flex-shrink-0"
              />
              <div className="min-w-0">
                <span className="text-caption text-white/70 font-medium">
                  {humanizeToolName(call.name)}
                </span>
                {Object.keys(call.input).length > 0 && (
                  <span className="text-micro text-white/30 ml-1.5">
                    (
                    {Object.entries(call.input)
                      .slice(0, 3)
                      .map(([k, v]) => `${k}: ${formatParamValue(v)}`)
                      .join(", ")}
                    {Object.keys(call.input).length > 3 ? ", ..." : ""})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
