/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * "UBO-resolved" chip for the counterparty detail page (Sprint Z9c).
 *
 * Fetches `/api/trade/parties/[id]/ubo` on mount and renders a compact
 * status chip showing the depth of the resolved ownership chain, with
 * tooltip-style metadata (adapter, confidence, sanctioned/PEP counts).
 *
 * Four visual states (driven by `uboChipStatus`):
 *   blocked    — red, "UBO sanctioned (depth N)"
 *   warning    — amber, "UBO PEP-flagged" OR "UBO low-confidence"
 *   ok         — emerald, "UBO clean (depth N)"
 *   unresolved — slate, "UBO unavailable"
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

"use client";

import { useEffect, useState } from "react";
import { Network } from "lucide-react";
import {
  uboChipStatus,
  type UboResolutionSummary,
} from "@/lib/comply-v2/trade/screening/cross-screening";

interface UboFetchResponse {
  uboSummary: UboResolutionSummary;
}

interface UboResolvedChipProps {
  partyId: string;
}

export function UboResolvedChip({ partyId }: UboResolvedChipProps) {
  const [summary, setSummary] = useState<UboResolutionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/trade/parties/${partyId}/ubo`);
        if (!res.ok) {
          if (!cancelled) setError(true);
          return;
        }
        const data = (await res.json()) as UboFetchResponse;
        if (!cancelled) setSummary(data.uboSummary);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [partyId]);

  if (loading) {
    return (
      <div
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest"
        style={{
          background: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        <Network className="h-3 w-3" />
        UBO…
      </div>
    );
  }

  if (error || !summary) {
    return null;
  }

  const status = uboChipStatus(summary);
  const visual = chipVisualForStatus(status);
  const label = buildChipLabel(summary, status);

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest"
      style={{
        background: visual.bg,
        color: visual.fg,
        boxShadow: `inset 0 0 0 0.5px ${visual.border}`,
      }}
      title={buildChipTitle(summary)}
    >
      <Network className="h-3 w-3" />
      {label}
    </div>
  );
}

function chipVisualForStatus(status: ReturnType<typeof uboChipStatus>): {
  bg: string;
  fg: string;
  border: string;
} {
  switch (status) {
    case "blocked":
      return {
        bg: "rgba(239,68,68,0.12)",
        fg: "rgb(248,113,113)",
        border: "rgba(239,68,68,0.3)",
      };
    case "warning":
      return {
        bg: "rgba(251,191,36,0.12)",
        fg: "rgb(251,191,36)",
        border: "rgba(251,191,36,0.3)",
      };
    case "ok":
      return {
        bg: "rgba(16,185,129,0.12)",
        fg: "rgb(52,211,153)",
        border: "rgba(16,185,129,0.3)",
      };
    case "unresolved":
    default:
      return {
        bg: "rgba(255,255,255,0.04)",
        fg: "rgba(255,255,255,0.45)",
        border: "rgba(255,255,255,0.08)",
      };
  }
}

function buildChipLabel(
  summary: UboResolutionSummary,
  status: ReturnType<typeof uboChipStatus>,
): string {
  if (status === "unresolved") return "UBO unavailable";
  if (status === "blocked") return `UBO sanctioned · depth ${summary.depth}`;
  if (status === "warning") {
    if (summary.pepAncestorCount > 0) {
      return `UBO PEP-flagged · depth ${summary.depth}`;
    }
    return `UBO low confidence · depth ${summary.depth}`;
  }
  return `UBO resolved · depth ${summary.depth}`;
}

function buildChipTitle(summary: UboResolutionSummary): string {
  if (!summary.resolved) {
    return "Orbis has no UBO data on file for this counterparty.";
  }
  const parts = [
    `Adapter: ${summary.adapter}`,
    `Depth: ${summary.depth}`,
    `Nodes: ${summary.nodeCount}`,
    `Confidence: ${(summary.confidence * 100).toFixed(0)}%`,
  ];
  if (summary.sanctionedAncestorCount > 0) {
    parts.push(`Sanctioned ancestors: ${summary.sanctionedAncestorCount}`);
  }
  if (summary.pepAncestorCount > 0) {
    parts.push(`PEP ancestors: ${summary.pepAncestorCount}`);
  }
  if (summary.fetchedAt) {
    parts.push(`Refreshed: ${summary.fetchedAt}`);
  }
  return parts.join("\n");
}
