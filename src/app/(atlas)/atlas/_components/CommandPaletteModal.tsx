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
  type LucideIcon,
} from "lucide-react";
import { JURISDICTION_DATA as NATIONAL_DATA } from "@/data/national-space-laws";
// Single source of truth — the barrel aggregates every jurisdiction
// module, so new countries/items (US FCC, NZ OSHAA, EE/RO/HU/…)
// automatically surface in search without having to touch this file.
import { ALL_SOURCES, ALL_AUTHORITIES } from "@/data/legal-sources";
import { slugForTreatyId } from "@/data/treaties";
import { ALL_LANDING_RIGHTS_PROFILES } from "@/data/landing-rights";

// ─── Types ────────────────────────────────────────────────────────────

type ItemGroup =
  | "Navigation"
  | "Treaties"
  | "Sources"
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
    id: "nav-eu",
    group: "Navigation",
    title: "EU Law",
    subtitle: "EU regulations & directives",
    href: "/atlas/eu",
    icon: Landmark,
    haystack: "eu european union space act nis2 cra dora",
  },
  {
    id: "nav-landing-rights",
    group: "Navigation",
    title: "Landing Rights",
    subtitle: "Market-access & data landing rights",
    href: "/atlas/landing-rights",
    icon: Ticket,
    haystack: "landing rights market access",
  },
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
  haystack:
    `${s.id} ${s.title_en} ${s.title_local ?? ""} ${s.official_reference ?? ""} ${s.un_reference ?? ""} ${s.scope_description ?? ""}`.toLowerCase(),
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

const LANDING_RIGHTS_ITEMS: Item[] = ALL_LANDING_RIGHTS_PROFILES.map((p) => ({
  id: `lr-${p.jurisdiction}`,
  group: "Landing Rights" as const,
  title: `${p.jurisdiction} — Landing Rights`,
  subtitle: `${p.overview.regime_type.replace("_", " ")} regime · ${p.depth} coverage`,
  href: `/atlas/landing-rights/${p.jurisdiction.toLowerCase()}`,
  icon: Ticket,
  haystack:
    `${p.jurisdiction} landing rights market access ${p.overview.regime_type} ${p.overview.summary}`.toLowerCase(),
}));

const ALL_ITEMS: Item[] = [
  ...NAV_ITEMS,
  ...TREATY_ITEMS,
  ...COUNTRY_ITEMS,
  ...SOURCE_ITEMS,
  ...AUTHORITY_ITEMS,
  ...LANDING_RIGHTS_ITEMS,
];

const GROUP_ORDER: ItemGroup[] = [
  "Navigation",
  "Treaties",
  "Countries",
  "Sources",
  "Authorities",
  "Landing Rights",
];

// ─── Search helper ────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm"
      onClick={() => onClose()}
      role="dialog"
      aria-label="Atlas command palette"
      aria-modal="true"
    >
      <div
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
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        isActive
                          ? "bg-[var(--atlas-bg-surface-muted)]"
                          : "hover:bg-[var(--atlas-bg-surface-muted)]"
                      }`}
                    >
                      <Icon
                        size={14}
                        className={
                          isActive
                            ? "text-[var(--atlas-text-primary)]"
                            : "text-[var(--atlas-text-faint)]"
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-[var(--atlas-text-primary)] truncate">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-[var(--atlas-text-muted)] truncate">
                          {item.subtitle}
                        </div>
                      </div>
                      {isActive && (
                        <ArrowRight
                          size={12}
                          className="text-[var(--atlas-text-faint)]"
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
