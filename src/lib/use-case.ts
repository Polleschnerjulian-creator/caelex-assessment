"use client";

/**
 * Sprint UF6 — Use-case persona helper.
 *
 * Stores the user's self-described persona — "How will you use
 * Caelex?" — captured during onboarding. Used to personalize:
 *
 *   - Today inbox welcome copy
 *   - Help drawer Quick Actions ordering
 *   - Default landing page after onboarding
 *
 * # Why localStorage (not Prisma)
 *
 * The first-cut implementation uses localStorage so we can ship the
 * UX without a schema migration. The wizard ALSO POSTs the value to
 * /api/onboarding/profile (server ignores unknown fields per the Zod
 * schema), so when we later add `User.useCase` to the schema, the
 * server picks it up on the next onboarding pass and we read from
 * the server instead of localStorage. localStorage is the bridge,
 * not the destination.
 *
 * # Why not just an enum on User now
 *
 * Adding a non-null Prisma column to a 50k-user table requires a
 * batched-deploy window we currently don't have. localStorage gives
 * the same UI personalization without the migration risk. When we
 * eventually do the migration, the server can backfill from the
 * client by having the next /api/onboarding call read & forward.
 */

import * as React from "react";
import {
  Compass,
  Briefcase,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export type UseCase = "operator" | "consultant" | "auditor" | "investor";

interface UseCaseDefinition {
  code: UseCase;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Where to send them after onboarding. */
  defaultLandingPath: string;
  /** Headline shown in the Today welcome card. */
  welcomeLine: string;
}

export const USE_CASES: UseCaseDefinition[] = [
  {
    code: "operator",
    label: "Space operator",
    description:
      "Satellite, launch, in-orbit servicing, or comms operator. Run missions, file with NCAs.",
    icon: Compass,
    defaultLandingPath: "/dashboard/today",
    welcomeLine:
      "You're an operator — Caelex tracks every regulation that applies to your missions.",
  },
  {
    code: "consultant",
    label: "Consultant or counsel",
    description:
      "Advise space companies on regulatory affairs, export control, or NCA submissions.",
    icon: Briefcase,
    defaultLandingPath: "/dashboard/today",
    welcomeLine:
      "You're a consultant — share data rooms, run assessments per client, prep submissions.",
  },
  {
    code: "auditor",
    label: "Auditor or compliance officer",
    description:
      "Independent or in-house auditor — review evidence, sign off on requirements.",
    icon: ShieldCheck,
    defaultLandingPath: "/dashboard/audit-center",
    welcomeLine:
      "You're an auditor — start with the evidence trail and per-article coverage.",
  },
  {
    code: "investor",
    label: "Investor or analyst",
    description:
      "Conduct space-sector due diligence — scoring, benchmarks, risk register.",
    icon: TrendingUp,
    defaultLandingPath: "/assure/dashboard",
    welcomeLine:
      "You're an investor — Assure gives you RRS scoring, benchmarks, and DD packages.",
  },
];

const LS_KEY = "caelex.useCase";

/**
 * Save the useCase to localStorage. No-op on the server.
 */
export function saveUseCase(useCase: UseCase): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, useCase);
    // Notify any listeners in this tab (storage event only fires
    // cross-tab). Lets the Today page / Help drawer re-render.
    window.dispatchEvent(
      new CustomEvent("caelex:use-case-change", { detail: { useCase } }),
    );
  } catch {
    // Quota / private mode — not fatal, just lose the personalization.
  }
}

/**
 * Read the useCase from localStorage synchronously. Returns null on
 * server or before any save.
 */
export function getStoredUseCase(): UseCase | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(LS_KEY);
    if (!v) return null;
    return isUseCase(v) ? v : null;
  } catch {
    return null;
  }
}

export function isUseCase(value: string): value is UseCase {
  return ["operator", "consultant", "auditor", "investor"].includes(value);
}

export function getUseCaseDefinition(
  useCase: UseCase,
): UseCaseDefinition | null {
  return USE_CASES.find((u) => u.code === useCase) ?? null;
}

/**
 * React hook — subscribe to the useCase. Re-renders on
 * `caelex:use-case-change` events (same tab) and `storage` events
 * (cross-tab).
 */
export function useUseCase(): UseCase | null {
  const [useCase, setUseCase] = React.useState<UseCase | null>(null);

  React.useEffect(() => {
    setUseCase(getStoredUseCase());

    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ useCase: UseCase }>).detail;
      if (detail?.useCase) setUseCase(detail.useCase);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) {
        setUseCase(e.newValue && isUseCase(e.newValue) ? e.newValue : null);
      }
    };

    window.addEventListener("caelex:use-case-change", onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("caelex:use-case-change", onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return useCase;
}
