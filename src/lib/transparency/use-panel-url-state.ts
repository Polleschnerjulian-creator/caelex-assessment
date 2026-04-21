"use client";

/**
 * usePanelUrlState — reads/writes the Transparency Panel's selection
 * state to the URL query string.
 *
 *   ?inspect=<id>     — id of the currently selected question/article/step
 *   ?tab=<mode>       — optional display-mode tab key ("full"|"summary"|"sources")
 *   ?step=<n>         — optional reasoning-step index (1-based)
 *
 * Why URL-driven:
 *   1. Shareable links — a compliance officer can paste `…?inspect=Q123`
 *      to a colleague and land on the same reasoning state.
 *   2. Audit trail — the URL is automatically logged by Next.js + Vercel
 *      Analytics, so review workflows leave natural breadcrumbs.
 *   3. Browser back/forward navigation actually behaves (vs hidden state).
 *
 * Uses router.replace (not push) with scroll=false so the URL updates
 * without adding a history entry or jumping to top — feels like local
 * state to the user.
 */

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type PanelTab = "full" | "summary" | "sources";

export interface PanelUrlState {
  inspect: string | null;
  tab: PanelTab;
  step: number | null;
}

const VALID_TABS: readonly PanelTab[] = ["full", "summary", "sources"] as const;
function parseTab(v: string | null): PanelTab {
  return (VALID_TABS as readonly string[]).includes(v ?? "")
    ? (v as PanelTab)
    : "full";
}

function parseStep(v: string | null): number | null {
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function usePanelUrlState(): PanelUrlState & {
  setInspect: (id: string | null) => void;
  setTab: (tab: PanelTab) => void;
  setStep: (step: number | null) => void;
  clear: () => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const inspect = params.get("inspect");
  const tab = parseTab(params.get("tab"));
  const step = parseStep(params.get("step"));

  const writeParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const setInspect = useCallback(
    (id: string | null) => writeParams({ inspect: id }),
    [writeParams],
  );
  const setTab = useCallback(
    (t: PanelTab) => writeParams({ tab: t === "full" ? null : t }),
    [writeParams],
  );
  const setStep = useCallback(
    (s: number | null) => writeParams({ step: s === null ? null : String(s) }),
    [writeParams],
  );
  const clear = useCallback(
    () => writeParams({ inspect: null, tab: null, step: null }),
    [writeParams],
  );

  return { inspect, tab, step, setInspect, setTab, setStep, clear };
}
