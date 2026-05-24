"use client";

/**
 * OnboardingBanner — first-run welcome panel on /trade (U-CRIT-2 MVP).
 *
 * Replaces the bare-bones empty-state block that previously showed
 * just "Erste Items klassifizieren" + a single CTA. The new panel
 * offers four parallel paths so first-time operators don't bounce:
 *
 *   1. Seed sample data — one-click insertion of 3 items + 2 parties
 *      + 1 operation. Lets the operator experience the full data
 *      model before manually entering their own.
 *   2. Open ⌘K palette — discoverability hint for the universal verb
 *      engine landed in Phase 3d.
 *   3. Ask Astra — pre-filled "How do I classify my first item?"
 *      prompt routed via the ?prefill= deep-link from Phase 3a.
 *   4. Open the Help center — glossary + shortcuts side-panel from
 *      Phase 4b. Dispatches the same window event the sidebar uses.
 *
 * Only renders when the calling page passes `hasAnyData={false}` —
 * once the org has even one TradeItem / TradeParty / TradeOperation,
 * the banner disappears.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Database,
  HelpCircle,
  Command,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { seedSampleTradeDataAction } from "@/lib/trade/sample-data-actions";
import { useToast } from "@/components/ui/Toast";

type SeedState =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "seeded";
      counts: { items: number; parties: number; operations: number };
    }
  | { kind: "already-seeded" }
  | { kind: "error"; message: string };

export function OnboardingBanner() {
  const [state, setState] = React.useState<SeedState>({ kind: "idle" });
  const router = useRouter();
  // Toast is mounted at TradeShell level (Phase 5d). Surface seed
  // outcomes top-right in addition to the inline state, so users with
  // the banner scrolled off-screen still see the result.
  const toast = useToast();

  const handleSeed = async () => {
    setState({ kind: "loading" });
    const result = await seedSampleTradeDataAction();
    if (!result.ok) {
      setState({ kind: "error", message: result.error });
      toast.error("Sample-data seed failed", result.error);
      return;
    }
    if (!result.seeded) {
      setState({ kind: "already-seeded" });
      toast.info(
        "Sample data skipped",
        "Your workspace already has Trade data — nothing to seed.",
      );
      return;
    }
    setState({ kind: "seeded", counts: result.counts });
    toast.success(
      "Sample data seeded",
      `${result.counts.items} items · ${result.counts.parties} parties · ${result.counts.operations} operation`,
    );
    // Defer router refresh slightly so the success banner is visible
    // for a beat before the page re-renders with the new data.
    setTimeout(() => router.refresh(), 800);
  };

  const handleOpenHelp = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("caelex-trade:open-help"));
    }
  };

  return (
    <section className="mb-8 overflow-hidden rounded-md border border-trade-border-subtle bg-trade-bg-elevated">
      <header className="border-b border-trade-border-subtle px-6 py-4">
        <h2 className="text-[18px] font-semibold text-trade-text-primary">
          Welcome to Caelex Trade
        </h2>
        <p className="mt-1 max-w-2xl text-[13px] text-trade-text-secondary">
          Your workspace is empty. Pick the entry point that fits — explore with
          seeded sample data, ask Astra, or jump straight into your first
          classification.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-px bg-trade-border-subtle md:grid-cols-2">
        <PathCard
          icon={Database}
          label="Seed sample data"
          description="One-click: 3 items + 2 parties + 1 operation. Clearly labelled '(Sample)' so you can delete it later."
          action={<SeedButton state={state} onSeed={handleSeed} />}
        />
        <PathCard
          icon={Sparkles}
          label="Ask Astra to walk you through"
          description="The AI copilot explains classification, screening, license determination — in plain language."
          action={
            <Link
              href={
                "/trade/astra?prefill=" +
                encodeURIComponent(
                  "I'm new to Caelex Trade. Walk me through classifying my first item — ECCN, USML, EU Annex I, MTCR, and the German Ausfuhrliste in one pass. What information do I need?",
                )
              }
              className="inline-flex items-center gap-2 rounded-md bg-trade-accent px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-trade-accent-strong"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Open Astra
            </Link>
          }
        />
        <PathCard
          icon={Command}
          label="Find anything fast with ⌘K"
          description="Press ⌘K (Ctrl+K on Win/Linux) to open the command palette — 27 verbs covering nav, quick-create, and Astra prompts."
          action={
            <kbd className="rounded-md border border-trade-border-subtle bg-trade-bg-panel px-2 py-1 font-mono text-[11px] text-trade-text-primary">
              ⌘ K
            </kbd>
          }
        />
        <PathCard
          icon={HelpCircle}
          label="Open the help center"
          description="Glossary of compliance acronyms (ECCN, USML, FDPR, BAFA, OFAC, …) + keyboard shortcuts. Press '?' anywhere."
          action={
            <button
              type="button"
              onClick={handleOpenHelp}
              className="inline-flex items-center gap-2 rounded-md border border-trade-border-subtle bg-trade-bg-panel px-4 py-2 text-[12px] font-semibold text-trade-text-primary transition hover:border-trade-accent"
            >
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              Open help
            </button>
          }
        />
      </div>
    </section>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

function PathCard({
  icon: Icon,
  label,
  description,
  action,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 bg-trade-bg-panel p-5">
      <div className="flex items-center gap-2">
        <div
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong"
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </div>
        <h3 className="text-[13px] font-semibold text-trade-text-primary">
          {label}
        </h3>
      </div>
      <p className="flex-1 text-[12px] leading-relaxed text-trade-text-secondary">
        {description}
      </p>
      <div className="flex items-center justify-start">{action}</div>
    </div>
  );
}

function SeedButton({
  state,
  onSeed,
}: {
  state: SeedState;
  onSeed: () => void;
}) {
  if (state.kind === "loading") {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-2 rounded-md bg-trade-accent-soft px-4 py-2 text-[12px] font-semibold text-trade-accent-strong opacity-70"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        Seeding…
      </button>
    );
  }

  if (state.kind === "seeded") {
    return (
      <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        Seeded {state.counts.items} items · {state.counts.parties} parties ·{" "}
        {state.counts.operations} operation
      </span>
    );
  }

  if (state.kind === "already-seeded") {
    return (
      <span className="inline-flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700">
        Already has data — sample seed skipped
      </span>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="inline-flex flex-col gap-1">
        <button
          type="button"
          onClick={onSeed}
          className="inline-flex items-center gap-2 rounded-md bg-trade-accent px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-trade-accent-strong"
        >
          <Database className="h-3.5 w-3.5" aria-hidden="true" />
          Retry seed
        </button>
        <span
          role="alert"
          className="inline-flex items-center gap-1 text-[11px] text-red-700"
        >
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          {state.message}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSeed}
      className="inline-flex items-center gap-2 rounded-md bg-trade-accent px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-trade-accent-strong"
    >
      <Database className="h-3.5 w-3.5" aria-hidden="true" />
      Seed sample data
    </button>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
