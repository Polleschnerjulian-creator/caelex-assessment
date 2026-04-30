"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  ListChecks,
  ShieldCheck,
  Bot,
  FileSearch,
  Workflow,
  Globe,
  Sparkles,
  Settings,
  ScrollText,
  Network,
  Satellite,
  AlertTriangle,
  Orbit,
  ToggleLeft,
  Clock,
  BellRing,
  Pencil,
  FileQuestion,
  Check,
  X,
  FileSearch as FileSearchIcon,
  Loader2,
  Gauge,
  type LucideIcon,
} from "lucide-react";
import type { ServerActionVerb } from "@/lib/comply-v2/actions/palette-verbs.server";
import type { PaletteSearchResult } from "@/lib/comply-v2/compliance-item.server";
import { searchPalette } from "@/app/dashboard/(palette-search)/actions";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/v2/command";
import { Kbd } from "@/components/ui/v2/kbd";

/**
 * Comply v2 Command Palette
 *
 * Cmd-K (or Ctrl-K on Windows/Linux) opens this. It's the universal
 * verb-engine for the Comply workspace — every navigation target,
 * every action, every Astra prompt is reachable from here in two
 * keystrokes.
 *
 * For Phase 0, we register only navigation verbs and meta-actions
 * (toggle UI version, open Astra, jump to settings). Real action
 * verbs (mark-evidence-accepted, snooze-deadline, submit-NCA,
 * generate-document) get wired in Phase 1 once src/lib/actions/
 * exists — every defineAction() entry will auto-register here.
 *
 * The palette lives at the V2Shell level so it's always available
 * regardless of which dashboard sub-route the user is on. Atlas and
 * Pharos do not see this palette.
 */

interface PaletteVerb {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string[];
  group: "navigate" | "create" | "ai" | "settings" | "item";
  run: (router: ReturnType<typeof useRouter>) => void;
}

const VERBS: PaletteVerb[] = [
  // ─── Navigate ───────────────────────────────────────────────────────
  {
    id: "nav-posture",
    label: "Open Compliance Posture",
    hint: "Score, distribution, open work — executive overview",
    icon: Gauge,
    group: "navigate",
    run: (r) => r.push("/dashboard/posture"),
  },
  {
    id: "nav-today",
    label: "Open Today inbox",
    hint: "Tasks that need you this week",
    icon: Inbox,
    group: "navigate",
    run: (r) => r.push("/dashboard/today"),
  },
  {
    id: "nav-triage",
    label: "Open Triage",
    hint: "Incoming compliance signals",
    icon: ListChecks,
    group: "navigate",
    run: (r) => r.push("/dashboard/triage"),
  },
  {
    id: "nav-proposals",
    label: "Open Astra Proposals",
    hint: "Approve, reject, or review proposed actions",
    icon: ShieldCheck,
    group: "navigate",
    run: (r) => r.push("/dashboard/proposals"),
  },
  {
    id: "nav-review-queue",
    label: "Open Review Queue",
    hint: "Astra-flagged items awaiting decision",
    icon: ShieldCheck,
    group: "navigate",
    run: (r) => r.push("/dashboard/review-queue"),
  },
  {
    id: "nav-dashboard",
    label: "Open Dashboard (legacy v1)",
    icon: LayoutDashboard,
    group: "navigate",
    run: (r) => r.push("/dashboard"),
  },
  {
    id: "nav-mission-control",
    label: "Open Mission Control",
    hint: "3D fleet visualization",
    icon: Globe,
    group: "navigate",
    run: (r) => r.push("/dashboard/mission-control"),
  },
  {
    id: "nav-ephemeris",
    label: "Open Ephemeris",
    hint: "Compliance forecast & digital twins",
    icon: Orbit,
    group: "navigate",
    run: (r) => r.push("/dashboard/ephemeris"),
  },
  {
    id: "nav-sentinel",
    label: "Open Sentinel",
    hint: "Telemetry-evidence chain",
    icon: Satellite,
    group: "navigate",
    run: (r) => r.push("/dashboard/sentinel"),
  },
  {
    id: "nav-network",
    label: "Open Compliance Network",
    icon: Network,
    group: "navigate",
    run: (r) => r.push("/dashboard/network"),
  },
  {
    id: "nav-incidents",
    label: "Open Incidents",
    icon: AlertTriangle,
    group: "navigate",
    run: (r) => r.push("/dashboard/incidents"),
  },
  {
    id: "nav-audit-center",
    label: "Open Audit Center",
    icon: ScrollText,
    group: "navigate",
    run: (r) => r.push("/dashboard/audit-center"),
  },
  {
    id: "nav-tracker",
    label: "Open Article Tracker",
    icon: FileSearch,
    group: "navigate",
    run: (r) => r.push("/dashboard/tracker"),
  },
  {
    id: "nav-workflow",
    label: "Open Workflow",
    icon: Workflow,
    group: "navigate",
    run: (r) => r.push("/dashboard/timeline"),
  },

  // ─── AI ─────────────────────────────────────────────────────────────
  {
    id: "ai-astra-v2",
    label: "Ask Astra V2",
    hint: "Action-layer copilot · proposals routed for review",
    icon: Bot,
    group: "ai",
    shortcut: ["⌘", "/"],
    run: (r) => r.push("/dashboard/astra-v2"),
  },
  {
    id: "ai-astra-v1",
    label: "Ask Astra (legacy V1)",
    hint: "47-tool engine in /dashboard/astra",
    icon: Bot,
    group: "ai",
    run: (r) => r.push("/dashboard/astra"),
  },
  {
    id: "ai-generate",
    label: "Generate document",
    hint: "Authorization, NIS2 register, attestation…",
    icon: Sparkles,
    group: "ai",
    run: (r) => r.push("/dashboard/generate"),
  },

  // ─── Settings ───────────────────────────────────────────────────────
  {
    id: "settings-ui-version",
    label: "Switch Comply UI version",
    hint: "v1 (legacy) or v2 (preview)",
    icon: ToggleLeft,
    group: "settings",
    run: (r) => r.push("/dashboard/settings/ui"),
  },
  {
    id: "settings-main",
    label: "Open Settings",
    icon: Settings,
    group: "settings",
    run: (r) => r.push("/dashboard/settings"),
  },
];

type Group = "navigate" | "create" | "ai" | "settings" | "item";

const GROUP_LABELS: Record<Group, string> = {
  navigate: "Navigate",
  item: "Item actions",
  create: "Create",
  ai: "Astra & AI",
  settings: "Settings",
};

/**
 * Icon registry for server-action verbs. Server-side palette-verb
 * configs use string icon names (Lucide module isn't tree-shakable
 * across the RSC boundary), so the client maps the string back to
 * the actual icon component here. Add new icons as new actions need
 * them.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  Clock,
  BellRing,
  Pencil,
  ShieldCheck,
  FileQuestion,
  Check,
  X,
};

function iconFor(name: string): LucideIcon {
  return ICON_MAP[name] ?? Sparkles;
}

export interface CommandPaletteProps {
  /**
   * Server-discovered verbs from src/lib/comply-v2/actions/palette-verbs.server.ts.
   * Each defineAction() entry with a paletteVerb config shows up here
   * automatically — Cmd-K stays in sync with the action layer
   * without manual registration.
   */
  serverVerbs?: ServerActionVerb[];
}

export function CommandPalette({ serverVerbs = [] }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<
    PaletteSearchResult[]
  >([]);
  const [isSearching, startSearch] = React.useTransition();

  // ⌘K / Ctrl-K to toggle.
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset search when palette closes — fresh state every open.
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open]);

  // Debounced ComplianceItem search. Triggers on every keystroke
  // after a 200ms quiet period, queries length ≥ 2.
  React.useEffect(() => {
    if (!open) return;
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      startSearch(async () => {
        try {
          const hits = await searchPalette(trimmed);
          setSearchResults(hits);
        } catch {
          setSearchResults([]);
        }
      });
    }, 200);
    return () => clearTimeout(t);
  }, [searchQuery, open]);

  const grouped = React.useMemo(() => {
    const map = new Map<Group, PaletteVerb[]>();
    // Hardcoded navigation / AI / settings verbs.
    for (const v of VERBS) {
      if (!map.has(v.group)) map.set(v.group, []);
      map.get(v.group)!.push(v);
    }
    // Server-discovered action verbs (item-contextual actions).
    // Phase 1: clicking these routes to /dashboard/today where the
    // user can pick an item; Phase 2 will plumb item-context through
    // a global PinnedItem store.
    for (const sv of serverVerbs) {
      const Icon = iconFor(sv.iconName);
      const verb: PaletteVerb = {
        id: `action-${sv.name}`,
        label: sv.label,
        hint: sv.hint
          ? sv.requiresApproval
            ? `${sv.hint} · needs approval`
            : sv.hint
          : sv.requiresApproval
            ? "Needs reviewer approval"
            : undefined,
        icon: Icon,
        group: sv.group,
        run: (r) => {
          // Item-contextual verbs always land on Today first so the
          // user can pick the item to act on.
          if (sv.contextual) {
            r.push(`/dashboard/today?action=${encodeURIComponent(sv.name)}`);
          } else {
            r.push("/dashboard/today");
          }
        },
      };
      if (!map.has(sv.group)) map.set(sv.group, []);
      map.get(sv.group)!.push(verb);
    }
    return map;
  }, [serverVerbs]);

  const runVerb = React.useCallback(
    (verb: PaletteVerb) => {
      setOpen(false);
      // Defer so the dialog's close-animation doesn't fight the route change
      setTimeout(() => verb.run(router), 0);
    },
    [router],
  );

  const openItem = React.useCallback(
    (result: PaletteSearchResult) => {
      setOpen(false);
      setTimeout(
        () =>
          router.push(`/dashboard/items/${result.regulation}/${result.rowId}`),
        0,
      );
    },
    [router],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={searchQuery}
        onValueChange={setSearchQuery}
        placeholder="Search actions, navigate, ask Astra, or find a ComplianceItem…"
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? (
            <span className="inline-flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Searching items…
            </span>
          ) : (
            <span className="text-xs text-slate-400">
              No match. Try a regulation (&ldquo;NIS2&rdquo;), an article
              (&ldquo;Art.32&rdquo;), or a verb (&ldquo;snooze&rdquo;).
            </span>
          )}
        </CommandEmpty>

        {searchResults.length > 0 ? (
          <CommandGroup
            heading={
              isSearching
                ? "ComplianceItems · searching…"
                : `ComplianceItems (${searchResults.length})`
            }
          >
            {searchResults.map((result) => (
              <CommandItem
                key={result.id}
                value={`item-${result.id} ${result.requirementId} ${result.regulation} ${result.snippet ?? ""}`}
                onSelect={() => openItem(result)}
              >
                <FileSearchIcon className="text-emerald-500" />
                <div className="flex min-w-0 flex-col">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {result.requirementId}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                      {result.regulation} · {result.status}
                    </span>
                  </div>
                  {result.snippet ? (
                    <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {result.snippet}
                    </span>
                  ) : null}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {Array.from(grouped.entries()).map(([group, verbs]) => (
          <CommandGroup key={group} heading={GROUP_LABELS[group]}>
            {verbs.map((verb) => {
              const Icon = verb.icon;
              return (
                <CommandItem
                  key={verb.id}
                  value={`${verb.label} ${verb.hint ?? ""} ${group}`}
                  onSelect={() => runVerb(verb)}
                >
                  <Icon className="text-slate-500" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm">{verb.label}</span>
                    {verb.hint ? (
                      <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {verb.hint}
                      </span>
                    ) : null}
                  </div>
                  {verb.shortcut ? (
                    <CommandShortcut>
                      {verb.shortcut.map((s, i) => (
                        <Kbd key={i} className="text-[10px]">
                          {s}
                        </Kbd>
                      ))}
                    </CommandShortcut>
                  ) : null}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span className="flex items-center gap-2">
          Tip: type to filter, press <Kbd>↵</Kbd> to run
        </span>
        <span className="flex items-center gap-1">
          <Kbd>esc</Kbd> close
        </span>
      </div>
    </CommandDialog>
  );
}
