"use client";

import {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  Search,
  Globe2,
  Landmark,
  Map as MapIcon,
  BarChart3,
  Newspaper,
  Ticket,
  Settings,
  FileText,
  Building2,
  ArrowRight,
  ScrollText,
  Gavel,
  Library,
  ShieldCheck,
  Key,
  type LucideIcon,
} from "lucide-react";
import { JURISDICTION_DATA as NATIONAL_DATA } from "@/data/national-space-laws";
// Single source of truth — the barrel aggregates every jurisdiction
// module, so new countries/items (US FCC, NZ OSHAA, EE/RO/HU/…)
// automatically surface in search without having to touch this file.
import { ALL_SOURCES, ALL_AUTHORITIES } from "@/data/legal-sources";
import { slugForTreatyId } from "@/data/treaties";
import { ALL_LANDING_RIGHTS_PROFILES } from "@/data/landing-rights";
// Caselaw + the index pages were previously absent from the palette,
// making the 28-case dataset and 937-source corpus discoverable only
// via deep-link or homepage search.
import { ATLAS_CASES } from "@/data/legal-cases";

// ─── Types ────────────────────────────────────────────────────────────

type ItemGroup =
  | "Navigation"
  | "Treaties"
  | "Sources"
  | "Cases"
  | "Authorities"
  | "Countries"
  | "Landing Rights";

interface Item {
  id: string;
  group: ItemGroup;
  title: string;
  subtitle: string;
  href: string;
  icon: LucideIcon;
  haystack: string; // pre-lowered lookup field
}

// ─── Build the static index once per module load ──────────────────────
// ALL_SOURCES / ALL_AUTHORITIES come from the legal-sources barrel so
// any jurisdiction added there (most recently NZ + US debris rules) is
// instantly searchable — no per-country import list to maintain here.

const NAV_ITEMS: Item[] = [
  {
    id: "nav-search",
    group: "Navigation",
    title: "Search",
    subtitle: "Global Atlas search",
    href: "/atlas",
    icon: Search,
    haystack: "search suche atlas",
  },
  {
    id: "nav-comparator",
    group: "Navigation",
    title: "Comparator",
    subtitle: "Compare jurisdictions side-by-side",
    href: "/atlas/comparator",
    icon: BarChart3,
    haystack: "comparator vergleich",
  },
  // Side-by-side articles is removed from the command palette in lockstep
  // with its removal from the sidebar — the page still ships at
  // /atlas/compare-articles for direct-link access but is no longer
  // surfaced as discoverable nav.
  {
    id: "nav-jurisdictions",
    group: "Navigation",
    title: "Jurisdictions",
    subtitle: "All 19 country profiles",
    href: "/atlas/jurisdictions",
    icon: MapIcon,
    haystack: "jurisdictions länder countries national",
  },
  {
    id: "nav-international",
    group: "Navigation",
    title: "International",
    subtitle: "UN treaties, COPUOS, ITU",
    href: "/atlas/international",
    icon: Globe2,
    haystack: "international un treaty copuos itu unoosa",
  },
  {
    id: "nav-sources",
    group: "Navigation",
    title: "Sources",
    subtitle: "Browse the full statutory corpus",
    href: "/atlas/sources",
    icon: Library,
    haystack: "sources statuten quellen catalogue corpus laws",
  },
  {
    id: "nav-cases",
    group: "Navigation",
    title: "Caselaw",
    subtitle: "Court rulings, settlements, regulator orders",
    href: "/atlas/cases",
    icon: Gavel,
    haystack:
      "cases rechtsprechung caselaw urteile settlements precedent gerichte",
  },
  // Drafting Studio is intentionally not surfaced via the command palette
  // while the surface is being polished pre-release — matches the
  // sidebar's "coming soon" gating. Power-users with the URL can still
  // reach /atlas/drafting directly. AI-Mode drafting tools remain available.
  {
    id: "nav-eu",
    group: "Navigation",
    title: "EU Law",
    subtitle: "EU regulations & directives",
    href: "/atlas/eu",
    icon: Landmark,
    haystack: "eu european union space act nis2 cra dora",
  },
  {
    id: "nav-eu-space-act",
    group: "Navigation",
    title: "EU Space Act — chapter overview",
    subtitle: "COM(2025) 335 chapter structure",
    href: "/atlas/eu-space-act",
    icon: ScrollText,
    haystack: "eu space act space-act com 2025 335 chapter overview deep-dive",
  },
  {
    id: "nav-cra",
    group: "Navigation",
    title: "Cyber Resilience Act",
    subtitle: "Regulation (EU) 2024/2847 — chapter structure & key dates",
    href: "/atlas/cra",
    icon: ShieldCheck,
    haystack:
      "cra cyber resilience act 2024 2847 chapter dates eu cybersecurity",
  },
  {
    id: "nav-api-access",
    group: "Navigation",
    title: "API Access",
    subtitle: "Manage API keys for programmatic Atlas access",
    href: "/atlas/api-access",
    icon: Key,
    haystack: "api access keys integration token developer",
  },
  // Landing Rights index is hidden from the command palette while the
  // surface is being polished pre-release — matches the sidebar's
  // "coming soon" gating. The per-jurisdiction Landing-Rights items
  // generated below are also excluded for the same reason.
  {
    id: "nav-updates",
    group: "Navigation",
    title: "Updates",
    subtitle: "Regulatory feed",
    href: "/atlas/updates",
    icon: Newspaper,
    haystack: "updates regulatory feed",
  },
  {
    id: "nav-settings",
    group: "Navigation",
    title: "Settings",
    subtitle: "Atlas preferences",
    href: "/atlas/settings",
    icon: Settings,
    haystack: "settings einstellungen",
  },
];

const COUNTRY_ITEMS: Item[] = Array.from(NATIONAL_DATA, ([code, data]) => ({
  id: `country-${code}`,
  group: "Countries" as const,
  title: data.countryName,
  subtitle: `${code} · ${data.legislation.name || "No comprehensive law"}`,
  href: `/atlas/jurisdictions/${code.toLowerCase()}`,
  icon: MapIcon,
  haystack:
    `${code} ${data.countryName} ${data.legislation.name}`.toLowerCase(),
}));

// Treaties with dedicated deep-dive pages at /atlas/treaties/[slug].
// Surfaced as their own group so searching "OST" or "liability" jumps
// to the curated hub page, not the generic source-detail view.
const TREATY_ITEMS: Item[] = ALL_SOURCES.flatMap((s) => {
  const slug = slugForTreatyId(s.id);
  if (!slug) return [];
  return [
    {
      id: `treaty-${slug}`,
      group: "Treaties" as const,
      title: s.title_en,
      subtitle: `Deep-dive · ${s.un_reference ?? s.id}`,
      href: `/atlas/treaties/${slug}`,
      icon: ScrollText,
      haystack:
        `${slug} ${s.id} ${s.title_en} ${s.title_local ?? ""} ${s.un_reference ?? ""} treaty deep-dive`.toLowerCase(),
    },
  ];
});

const SOURCE_ITEMS: Item[] = ALL_SOURCES.map((s) => ({
  id: `source-${s.id}`,
  group: "Sources" as const,
  title: s.title_en,
  subtitle: `${s.id} · ${s.jurisdiction}${s.official_reference ? ` · ${s.official_reference}` : ""}`,
  // H15: route to the source-detail page, not the jurisdiction page.
  // Every source in Atlas has its own /atlas/sources/[id] deep-dive
  // with provisions, competent authorities, and related sources.
  href: `/atlas/sources/${s.id}`,
  icon: FileText,
  // Haystack spans metadata + scope + every key provision's section
  // label, title, summary, and compliance-implication text. This turns
  // Cmd+K from 'title search' into 'full legal-text search' while
  // staying on the existing substring ranking — no new infra required.
  haystack:
    `${s.id} ${s.title_en} ${s.title_local ?? ""} ${s.official_reference ?? ""} ${s.un_reference ?? ""} ${s.scope_description ?? ""} ${s.compliance_areas.join(" ")} ${s.key_provisions
      .map(
        (p) =>
          `${p.section} ${p.title} ${p.summary} ${p.complianceImplication ?? ""}`,
      )
      .join(" ")}`.toLowerCase(),
}));

const AUTHORITY_ITEMS: Item[] = ALL_AUTHORITIES.map((a) => ({
  id: `authority-${a.id}`,
  group: "Authorities" as const,
  title: a.name_en,
  subtitle: `${a.abbreviation ?? a.id} · ${a.jurisdiction}`,
  href: `/atlas/jurisdictions/${a.jurisdiction.toLowerCase()}`,
  icon: Building2,
  haystack:
    `${a.id} ${a.name_en} ${a.name_local ?? ""} ${a.abbreviation ?? ""} ${a.space_mandate}`.toLowerCase(),
}));

// Landing-Rights per-jurisdiction palette items are gated behind the
// same release toggle as the sidebar entry — kept in code so re-enabling
// is a one-line flip when the surface ships, but excluded from
// `ALL_ITEMS` below so users can't reach them via Cmd-K. The data file
// import is still needed because the TypeScript narrowing relies on it
// elsewhere in the file (group label).
const _LANDING_RIGHTS_ITEMS_HIDDEN: Item[] = ALL_LANDING_RIGHTS_PROFILES.map(
  (p) => ({
    id: `lr-${p.jurisdiction}`,
    group: "Landing Rights" as const,
    title: `${p.jurisdiction} — Landing Rights`,
    subtitle: `${p.overview.regime_type.replace("_", " ")} regime · ${p.depth} coverage`,
    href: `/atlas/landing-rights/${p.jurisdiction.toLowerCase()}`,
    icon: Ticket,
    haystack:
      `${p.jurisdiction} landing rights market access ${p.overview.regime_type} ${p.overview.summary}`.toLowerCase(),
  }),
);
void _LANDING_RIGHTS_ITEMS_HIDDEN; // Suppress unused-var until release.

// Caselaw — every entry in the 28-case database becomes a palette
// hit so a free-text query like "Cosmos", "Iridium", "FCC Swarm"
// jumps straight to /atlas/cases/[id]. Without this the only way to
// reach a case was via a source-detail backlink or an Astra pill.
const CASE_ITEMS: Item[] = ATLAS_CASES.map((c) => ({
  id: `case-${c.id}`,
  group: "Cases" as const,
  title: c.title,
  subtitle: `${c.id} · ${c.jurisdiction} · ${c.date_decided.slice(0, 4)} · ${c.forum_name}`,
  href: `/atlas/cases/${encodeURIComponent(c.id)}`,
  icon: Gavel,
  haystack:
    `${c.id} ${c.title} ${c.plaintiff} ${c.defendant} ${c.forum_name} ${c.citation ?? ""} ${c.jurisdiction} ${c.industry_significance} ${(c.parties_mentioned ?? []).join(" ")} ${c.compliance_areas.join(" ")}`.toLowerCase(),
}));

const ALL_ITEMS: Item[] = [
  ...NAV_ITEMS,
  ...TREATY_ITEMS,
  ...COUNTRY_ITEMS,
  ...SOURCE_ITEMS,
  ...CASE_ITEMS,
  ...AUTHORITY_ITEMS,
  // Landing-Rights items intentionally excluded — re-enable by adding
  // `..._LANDING_RIGHTS_ITEMS_HIDDEN` here when the surface ships.
];

const GROUP_ORDER: ItemGroup[] = [
  "Navigation",
  "Treaties",
  "Countries",
  "Sources",
  "Cases",
  "Authorities",
  "Landing Rights",
];

// ─── Search helper ────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * When a search matched somewhere in an item's body text (not its
 * title), pull a short snippet centred on the first match so the user
 * sees WHY the item surfaced. Returns null when the match is in the
 * title itself (where the title already makes it obvious).
 */
function extractMatchSnippet(
  item: Item,
  query: string,
  radius = 60,
): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const titleLower = item.title.toLowerCase();
  // First token is the primary search term — enough for snippet anchor.
  const token = q.split(/\s+/)[0];
  if (!token) return null;
  if (titleLower.includes(token)) return null; // match is in title, no snippet needed
  const idx = item.haystack.indexOf(token);
  if (idx === -1) return null;
  const start = Math.max(0, idx - radius);
  const end = Math.min(item.haystack.length, idx + token.length + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < item.haystack.length ? "…" : "";
  return `${prefix}${item.haystack.slice(start, end).trim()}${suffix}`;
}

/**
 * Scoring tiers (descending priority):
 *
 *   Title starts with the token as a whole word      → 1000
 *   Token is a whole word inside the title           →  500
 *   Token is a substring inside the title            →  100 − position
 *   Token is a whole word anywhere in the haystack   →   50
 *   Token is a substring anywhere in the haystack    →   10 − position/10
 *
 * The whole-word boundary test (\bTOKEN\b, Unicode-aware) is what
 * keeps short tokens like "ISO" from matching mid-word ("authorISOn",
 * "provISO", "supervISOr") and pulling irrelevant items to the top.
 * Items that ONLY match mid-word still appear (we don't filter them
 * out — the user might want broad results) but they land at the
 * bottom of the list where they belong.
 */
function search(query: string, limit = 40): Item[] {
  const q = query.trim().toLowerCase();
  if (!q) return NAV_ITEMS; // empty state = show nav

  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: { item: Item; score: number }[] = [];

  for (const item of ALL_ITEMS) {
    let score = 0;
    let allMatch = true;
    const lowerTitle = item.title.toLowerCase();

    for (const token of tokens) {
      const haystackIdx = item.haystack.indexOf(token);
      if (haystackIdx === -1) {
        allMatch = false;
        break;
      }
      const wordRe = new RegExp(`\\b${escapeRegex(token)}\\b`, "i");
      const titleIdx = lowerTitle.indexOf(token);
      const titleWholeWord = wordRe.test(item.title);

      if (titleWholeWord && titleIdx === 0) {
        score += 1000;
      } else if (titleWholeWord) {
        score += 500;
      } else if (titleIdx !== -1) {
        score += 100 - Math.min(titleIdx, 100);
      } else if (wordRe.test(item.haystack)) {
        score += 50;
      } else {
        score += Math.max(0, 10 - Math.floor(haystackIdx / 10));
      }
    }

    if (allMatch) scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}

// ─── Component ────────────────────────────────────────────────────────

/**
 * Modal content for the command palette. Bundle-heavy (imports all
 * legal-source files). Loaded behind a `dynamic()` gate in the
 * lightweight CommandPalette wrapper, so the bundle cost is paid only
 * when the user opens the palette.
 */
export default function CommandPaletteModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  // M12: translate the group identifiers once per render.
  // Treaties + Landing Rights are new — fall back to the English label
  // if a translation key isn't registered yet, so they still render.
  const groupLabel = (g: ItemGroup): string => {
    switch (g) {
      case "Navigation":
        return t("atlas.palette_group_navigation");
      case "Countries":
        return t("atlas.palette_group_countries");
      case "Sources":
        return t("atlas.palette_group_sources");
      case "Authorities":
        return t("atlas.palette_group_authorities");
      case "Treaties":
        return "Treaties";
      case "Cases":
        return t("atlas.cases") ?? "Caselaw";
      case "Landing Rights":
        return "Landing Rights";
    }
  };

  // ESC closes. Cmd+K toggle is handled by the lightweight wrapper.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Focus input on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);

  const results = useMemo(() => search(query), [query]);
  const grouped = useMemo(() => {
    const map = new Map<ItemGroup, Item[]>();
    for (const item of results) {
      const arr = map.get(item.group) ?? [];
      arr.push(item);
      map.set(item.group, arr);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
      group: g,
      items: map.get(g)!,
    }));
  }, [results]);

  const go = useCallback(
    (item: Item) => {
      onClose();
      router.push(item.href);
    },
    [router, onClose],
  );

  const onInputKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) go(item);
    }
  };

  // L11: flat index mapping for keyboard highlighting — memoised so
  // hover-to-activate updates don't rebuild the map on every render.
  const flatIndex = useMemo(() => {
    const m = new Map<string, number>();
    let idx = 0;
    for (const g of grouped) {
      for (const it of g.items) {
        m.set(it.id, idx);
        idx++;
      }
    }
    return m;
  }, [grouped]);

  // M-12: focus-trap. Without this, Tab inside the dialog escapes into
  // the page underneath — visually the lawyer is still in the modal,
  // semantically focus is on a hidden Atlas-shell button. Tab cycles
  // between the search input (start) and the last visible result-row
  // (end). Shift+Tab cycles backwards.
  const dialogRef = useRef<HTMLDivElement>(null);
  const onDialogKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [],
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm"
      onClick={() => onClose()}
      role="dialog"
      aria-label="Atlas command palette"
      aria-modal="true"
    >
      <div
        ref={dialogRef}
        onKeyDown={onDialogKeyDown}
        className="w-[640px] max-w-[92vw] max-h-[70vh] rounded-2xl bg-[var(--atlas-bg-surface)] shadow-2xl border border-[var(--atlas-border)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input — combobox pattern for screen-reader support (M14) */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-[var(--atlas-border-subtle)]">
          <Search
            size={16}
            className="text-[var(--atlas-text-faint)] flex-shrink-0"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="atlas-cmd-listbox"
            aria-autocomplete="list"
            aria-activedescendant={
              results[activeIndex]
                ? `atlas-cmd-option-${results[activeIndex].id}`
                : undefined
            }
            aria-label="Search laws, treaties, authorities, countries"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKey}
            placeholder={t("atlas.palette_placeholder")}
            className="flex-1 bg-transparent outline-none text-[14px] text-[var(--atlas-text-primary)] placeholder:text-[var(--atlas-text-faint)]"
          />
          <kbd className="text-[10px] font-mono text-[var(--atlas-text-faint)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results — listbox role lets AT announce item count + selection */}
        <div
          id="atlas-cmd-listbox"
          role="listbox"
          aria-label="Search results"
          className="flex-1 overflow-y-auto py-2"
        >
          {grouped.length === 0 ? (
            <div className="px-4 py-10 text-center text-[12px] text-[var(--atlas-text-muted)]">
              {t("atlas.palette_no_matches")} &ldquo;{query}&rdquo;.
            </div>
          ) : (
            grouped.map(({ group, items }) => (
              <div
                key={group}
                className="mb-2"
                role="group"
                aria-label={groupLabel(group)}
              >
                <div className="px-4 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--atlas-text-faint)]">
                  {groupLabel(group)}
                </div>
                {items.map((item) => {
                  const isActive = flatIndex.get(item.id) === activeIndex;
                  const Icon = item.icon;
                  const snippet = extractMatchSnippet(item, query);
                  return (
                    <button
                      key={item.id}
                      id={`atlas-cmd-option-${item.id}`}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => go(item)}
                      onMouseEnter={() =>
                        setActiveIndex(flatIndex.get(item.id) ?? 0)
                      }
                      className={`w-full flex items-start gap-3 px-4 py-2 text-left transition-colors ${
                        isActive
                          ? "bg-[var(--atlas-bg-surface-muted)]"
                          : "hover:bg-[var(--atlas-bg-surface-muted)]"
                      }`}
                    >
                      <Icon
                        size={14}
                        className={`mt-0.5 flex-shrink-0 ${
                          isActive
                            ? "text-[var(--atlas-text-primary)]"
                            : "text-[var(--atlas-text-faint)]"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-[var(--atlas-text-primary)] truncate">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-[var(--atlas-text-muted)] truncate">
                          {item.subtitle}
                        </div>
                        {snippet && (
                          <div className="text-[10px] text-[var(--atlas-text-faint)] mt-0.5 italic line-clamp-2 leading-snug">
                            {snippet}
                          </div>
                        )}
                      </div>
                      {isActive && (
                        <ArrowRight
                          size={12}
                          className="text-[var(--atlas-text-faint)] mt-1 flex-shrink-0"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 h-8 border-t border-[var(--atlas-border-subtle)] bg-[var(--atlas-bg-surface-muted)] text-[10px] text-[var(--atlas-text-faint)]">
          <span>
            {results.length}{" "}
            {results.length === 1
              ? t("atlas.palette_results_count_one")
              : t("atlas.palette_results_count_other")}
          </span>
          <span className="flex items-center gap-3">
            <span>
              <kbd className="font-mono">↑↓</kbd> {t("atlas.palette_navigate")}
            </span>
            <span>
              <kbd className="font-mono">↵</kbd> {t("atlas.palette_open")}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
