"use client";

/**
 * Caelex Trade — Command Palette (⌘K / Ctrl-K).
 *
 * U-CRIT-4. Universal verb engine for the Trade workspace. Every nav
 * destination, every quick-create action, every Astra prompt reachable
 * in two keystrokes. Reuses the cmdk-based primitives from Comply V2
 * (`@/components/ui/v2/command`) so we don't reinvent the dialog shell.
 *
 * Scope discipline:
 *   - Trade-only. No coupling to Comply / Atlas / Pharos search.
 *   - All verbs are statically defined (no server search this sprint).
 *     A future sprint can register dynamic verbs (e.g. "Find item by
 *     SKU…", "Find counterparty named…") via a Trade-specific search
 *     server-action — the cmdk primitive supports it out of the box.
 *
 * Keyboard contract:
 *   - ⌘K / Ctrl+K toggles the palette globally inside `/trade/*`.
 *   - ⌘/ also opens (Linear convention).
 *   - Esc / outside-click closes (handled by CommandDialog).
 *
 * Accessibility:
 *   - CommandDialog renders inside a Radix Dialog: focus-trap, aria-modal,
 *     Esc-to-close — all free.
 *   - aria-label "Trade command palette" on the dialog.
 *   - sr-only-friendly: cmdk's CommandInput is a proper <input> with
 *     surrounding aria-live announcements for result counts.
 *   - prefers-reduced-motion respected by Radix Dialog animation.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Package,
  Users,
  Workflow,
  FileCheck,
  FileSignature,
  Layers,
  AlertOctagon,
  Rocket,
  Sparkles,
  ScanSearch,
  Settings,
  UserCog,
  BookOpen,
  ShieldCheck,
  Plus,
  type LucideIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/v2/command";

interface PaletteVerb {
  /** Stable id, used as React key + cmdk `value` (drives fuzzy matching). */
  id: string;
  /** Visible label shown in the row. */
  label: string;
  /** Optional secondary text rendered in muted style after the label. */
  hint?: string;
  icon: LucideIcon;
  /** Logical grouping shown as a section heading inside the palette. */
  group: "navigate" | "create" | "ai" | "settings";
  /** Action when the row is invoked. Receives the router for navigation. */
  run: (router: ReturnType<typeof useRouter>) => void;
}

// ─── Verb registry ────────────────────────────────────────────────────
//
// Order within a group dictates render order. Cmdk does its own fuzzy
// search, so this only matters for the "no input yet" rest-state.

const VERBS: ReadonlyArray<PaletteVerb> = [
  // ─── Navigate ──────────────────────────────────────────────────────
  {
    id: "nav-overview",
    label: "Go to Overview",
    hint: "Welcome dashboard",
    icon: Inbox,
    group: "navigate",
    run: (r) => r.push("/trade"),
  },
  {
    id: "nav-items",
    label: "Go to Items",
    hint: "Trade items + classifications",
    icon: Package,
    group: "navigate",
    run: (r) => r.push("/trade/items"),
  },
  {
    id: "nav-parties",
    label: "Go to Counterparties",
    hint: "Sanctions screening",
    icon: Users,
    group: "navigate",
    run: (r) => r.push("/trade/parties"),
  },
  {
    id: "nav-operations",
    label: "Go to Pipeline",
    hint: "Trade operations lifecycle",
    icon: Workflow,
    group: "navigate",
    run: (r) => r.push("/trade/operations"),
  },
  {
    id: "nav-licenses",
    label: "Go to Licenses",
    hint: "BAFA · BIS · DDTC · EU AGG",
    icon: FileCheck,
    group: "navigate",
    run: (r) => r.push("/trade/licenses"),
  },
  {
    id: "nav-classify",
    label: "Go to Classify (AI)",
    hint: "Upload datasheet for ECCN/USML suggestion",
    icon: ScanSearch,
    group: "navigate",
    run: (r) => r.push("/trade/classify"),
  },
  {
    id: "nav-euc",
    label: "Go to End-Use Certificates",
    hint: "EUCs — §17 AWV / 15 CFR §748.10",
    icon: FileSignature,
    group: "navigate",
    run: (r) => r.push("/trade/euc"),
  },
  {
    id: "nav-reexport",
    label: "Go to Re-Export Consents",
    icon: FileSignature,
    group: "navigate",
    run: (r) => r.push("/trade/reexport-consents"),
  },
  {
    id: "nav-vsd",
    label: "Go to Self-Disclosures (VSD)",
    hint: "OFAC / BIS / DDTC / BAFA",
    icon: AlertOctagon,
    group: "navigate",
    run: (r) => r.push("/trade/vsd"),
  },
  {
    id: "nav-sammelg",
    label: "Go to Sammelgenehmigungen",
    hint: "German BAFA AGG / AGE",
    icon: Layers,
    group: "navigate",
    run: (r) => r.push("/trade/sammelgenehmigungen"),
  },
  {
    id: "nav-france-los",
    label: "Go to France LOS",
    hint: "Loi sur les Opérations Spatiales",
    icon: Rocket,
    group: "navigate",
    run: (r) => r.push("/trade/france-los"),
  },
  {
    id: "nav-uk-ecju",
    label: "Go to UK ECJU",
    hint: "SIEL · OIEL · OGEL",
    icon: FileCheck,
    group: "navigate",
    run: (r) => r.push("/trade/uk-ecju"),
  },
  {
    id: "nav-faa-ast",
    label: "Go to FAA AST",
    hint: "14 CFR Part 450 commercial launch",
    icon: Rocket,
    group: "navigate",
    run: (r) => r.push("/trade/faa-ast"),
  },
  {
    id: "nav-deemed-exports",
    label: "Go to Deemed Exports",
    hint: "Foreign-national access tracking",
    icon: UserCog,
    group: "navigate",
    run: (r) => r.push("/trade/deemed-exports"),
  },
  {
    id: "nav-program",
    label: "Go to Compliance Program",
    hint: "ICP documentation",
    icon: ShieldCheck,
    group: "navigate",
    run: (r) => r.push("/trade/program"),
  },
  {
    id: "nav-training-corpus",
    label: "Go to Training Corpus",
    hint: "BAFA AzG + DDTC CJ precedents",
    icon: BookOpen,
    group: "navigate",
    run: (r) => r.push("/trade/research/training-corpus"),
  },

  // ─── Create ────────────────────────────────────────────────────────
  // Quick-create verbs all land on the relevant list page with a
  // `?new=1` hint that the list page can wire to auto-open the form.
  // For now they just navigate — the list page already exposes a
  // visible "Add new" CTA so the user is at most one click away.
  {
    id: "create-item",
    label: "New trade item",
    icon: Plus,
    group: "create",
    run: (r) => r.push("/trade/items?new=1"),
  },
  {
    id: "create-party",
    label: "New counterparty",
    icon: Plus,
    group: "create",
    run: (r) => r.push("/trade/parties?new=1"),
  },
  {
    id: "create-operation",
    label: "New trade operation",
    icon: Plus,
    group: "create",
    run: (r) => r.push("/trade/operations?new=1"),
  },
  {
    id: "create-license",
    label: "New license record",
    icon: Plus,
    group: "create",
    run: (r) => r.push("/trade/licenses?new=1"),
  },
  {
    id: "create-euc",
    label: "New End-Use Certificate request",
    icon: Plus,
    group: "create",
    run: (r) => r.push("/trade/euc?new=1"),
  },
  {
    id: "create-vsd",
    label: "File voluntary self-disclosure",
    hint: "Time-sensitive — 60–180 day windows",
    icon: Plus,
    group: "create",
    run: (r) => r.push("/trade/vsd?new=1"),
  },

  // ─── AI (Astra) ────────────────────────────────────────────────────
  {
    id: "ai-astra",
    label: "Open Astra Trade",
    hint: "AI compliance copilot",
    icon: Sparkles,
    group: "ai",
    run: (r) => r.push("/trade/astra"),
  },
  {
    id: "ai-astra-classify",
    label: "Ask Astra: How do I classify…?",
    icon: Sparkles,
    group: "ai",
    run: (r) =>
      r.push(
        "/trade/astra?prefill=" +
          encodeURIComponent(
            "How should I classify a new trade item? Walk me through ECCN, USML, EU Annex I, MTCR, and the German Ausfuhrliste.",
          ),
      ),
  },
  {
    id: "ai-astra-screen",
    label: "Ask Astra: How does counterparty screening work?",
    icon: Sparkles,
    group: "ai",
    run: (r) =>
      r.push(
        "/trade/astra?prefill=" +
          encodeURIComponent(
            "How does Caelex screen counterparties? Which sanctions lists are covered, and how does the OFAC 50% Rule cascade work?",
          ),
      ),
  },
  {
    id: "ai-astra-license",
    label: "Ask Astra: Which license do I need?",
    icon: Sparkles,
    group: "ai",
    run: (r) =>
      r.push(
        "/trade/astra?prefill=" +
          encodeURIComponent(
            "I'm exporting a controlled item. Compare my options: BAFA-Einzelgenehmigung vs. AGG vs. BIS vs. DDTC DSP-5 vs. EU general authorization.",
          ),
      ),
  },

  // ─── Settings ──────────────────────────────────────────────────────
  {
    id: "settings",
    label: "Workspace settings",
    icon: Settings,
    group: "settings",
    run: (r) => r.push("/trade/settings"),
  },
];

const GROUP_LABELS: Record<PaletteVerb["group"], string> = {
  navigate: "Navigate",
  create: "Create",
  ai: "Astra AI",
  settings: "Settings",
};

const GROUP_ORDER: ReadonlyArray<PaletteVerb["group"]> = [
  "navigate",
  "create",
  "ai",
  "settings",
];

// ─── Component ────────────────────────────────────────────────────────

export function TradeCommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  // ⌘K (macOS) / Ctrl+K (other) / ⌘/ (Linear convention) toggle.
  // Captured at document level so the shortcut works regardless of which
  // child element has focus — including inside text inputs.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === "k" || e.key === "K" || e.key === "/") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const grouped = React.useMemo(() => {
    const out: Record<PaletteVerb["group"], PaletteVerb[]> = {
      navigate: [],
      create: [],
      ai: [],
      settings: [],
    };
    for (const v of VERBS) out[v.group].push(v);
    return out;
  }, []);

  const handleRun = (verb: PaletteVerb) => {
    setOpen(false);
    // Defer to next tick so the dialog close transition has a chance
    // to start before the route change kicks Next.js into action.
    setTimeout(() => verb.run(router), 0);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      aria-label="Trade command palette"
    >
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>
          No matches. Try &ldquo;screen&rdquo;, &ldquo;license&rdquo;, or
          &ldquo;astra&rdquo;.
        </CommandEmpty>
        {GROUP_ORDER.map((groupKey) => {
          const verbs = grouped[groupKey];
          if (verbs.length === 0) return null;
          return (
            <CommandGroup key={groupKey} heading={GROUP_LABELS[groupKey]}>
              {verbs.map((verb) => {
                const Icon = verb.icon;
                return (
                  <CommandItem
                    key={verb.id}
                    value={`${verb.label} ${verb.hint ?? ""}`}
                    onSelect={() => handleRun(verb)}
                  >
                    <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span>{verb.label}</span>
                    {verb.hint ? (
                      <span className="ml-2 text-[12px] text-trade-text-muted">
                        {verb.hint}
                      </span>
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
