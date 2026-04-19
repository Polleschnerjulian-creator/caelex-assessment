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
  type LucideIcon,
} from "lucide-react";
import { JURISDICTION_DATA as NATIONAL_DATA } from "@/data/national-space-laws";
import type { LegalSource, Authority } from "@/data/legal-sources";
import { LEGAL_SOURCES_INT } from "@/data/legal-sources/sources/intl";
import { LEGAL_SOURCES_EU } from "@/data/legal-sources/sources/eu";
import { LEGAL_SOURCES_DE } from "@/data/legal-sources/sources/de";
import { LEGAL_SOURCES_FR } from "@/data/legal-sources/sources/fr";
import { LEGAL_SOURCES_UK } from "@/data/legal-sources/sources/uk";
import { LEGAL_SOURCES_IT } from "@/data/legal-sources/sources/it";
import { LEGAL_SOURCES_LU } from "@/data/legal-sources/sources/lu";
import { LEGAL_SOURCES_NL } from "@/data/legal-sources/sources/nl";
import { LEGAL_SOURCES_BE } from "@/data/legal-sources/sources/be";
import { LEGAL_SOURCES_ES } from "@/data/legal-sources/sources/es";
import { LEGAL_SOURCES_NO } from "@/data/legal-sources/sources/no";
import { LEGAL_SOURCES_SE } from "@/data/legal-sources/sources/se";
import { LEGAL_SOURCES_FI } from "@/data/legal-sources/sources/fi";
import { LEGAL_SOURCES_DK } from "@/data/legal-sources/sources/dk";
import { LEGAL_SOURCES_AT } from "@/data/legal-sources/sources/at";
import { LEGAL_SOURCES_CH } from "@/data/legal-sources/sources/ch";
import { LEGAL_SOURCES_PT } from "@/data/legal-sources/sources/pt";
import { LEGAL_SOURCES_IE } from "@/data/legal-sources/sources/ie";
import { LEGAL_SOURCES_GR } from "@/data/legal-sources/sources/gr";
import { LEGAL_SOURCES_CZ } from "@/data/legal-sources/sources/cz";
import { LEGAL_SOURCES_PL } from "@/data/legal-sources/sources/pl";
import { AUTHORITIES_INT } from "@/data/legal-sources/sources/intl";
import { AUTHORITIES_EU } from "@/data/legal-sources/sources/eu";

// ─── Types ────────────────────────────────────────────────────────────

type ItemGroup = "Navigation" | "Sources" | "Authorities" | "Countries";

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

const ALL_SOURCES: LegalSource[] = [
  ...LEGAL_SOURCES_INT,
  ...LEGAL_SOURCES_EU,
  ...LEGAL_SOURCES_DE,
  ...LEGAL_SOURCES_FR,
  ...LEGAL_SOURCES_UK,
  ...LEGAL_SOURCES_IT,
  ...LEGAL_SOURCES_LU,
  ...LEGAL_SOURCES_NL,
  ...LEGAL_SOURCES_BE,
  ...LEGAL_SOURCES_ES,
  ...LEGAL_SOURCES_NO,
  ...LEGAL_SOURCES_SE,
  ...LEGAL_SOURCES_FI,
  ...LEGAL_SOURCES_DK,
  ...LEGAL_SOURCES_AT,
  ...LEGAL_SOURCES_CH,
  ...LEGAL_SOURCES_PT,
  ...LEGAL_SOURCES_IE,
  ...LEGAL_SOURCES_GR,
  ...LEGAL_SOURCES_CZ,
  ...LEGAL_SOURCES_PL,
];

const ALL_AUTHORITIES: Authority[] = [...AUTHORITIES_INT, ...AUTHORITIES_EU];

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

const SOURCE_ITEMS: Item[] = ALL_SOURCES.map((s) => ({
  id: `source-${s.id}`,
  group: "Sources" as const,
  title: s.title_en,
  subtitle: `${s.id} · ${s.jurisdiction}${s.official_reference ? ` · ${s.official_reference}` : ""}`,
  href: `/atlas/jurisdictions/${s.jurisdiction.toLowerCase()}`,
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

const ALL_ITEMS: Item[] = [
  ...NAV_ITEMS,
  ...COUNTRY_ITEMS,
  ...SOURCE_ITEMS,
  ...AUTHORITY_ITEMS,
];

const GROUP_ORDER: ItemGroup[] = [
  "Navigation",
  "Countries",
  "Sources",
  "Authorities",
];

// ─── Search helper ────────────────────────────────────────────────────

function search(query: string, limit = 40): Item[] {
  const q = query.trim().toLowerCase();
  if (!q) return NAV_ITEMS; // empty state = show nav

  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: { item: Item; score: number }[] = [];

  for (const item of ALL_ITEMS) {
    let score = 0;
    let allMatch = true;
    for (const token of tokens) {
      const idx = item.haystack.indexOf(token);
      if (idx === -1) {
        allMatch = false;
        break;
      }
      // Earlier match = higher score; exact title-start = bonus
      score += 100 - Math.min(idx, 100);
      if (item.title.toLowerCase().startsWith(token)) score += 50;
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

  // M12: translate the four group identifiers once per render.
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
        className="w-[640px] max-w-[92vw] max-h-[70vh] rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input — combobox pattern for screen-reader support (M14) */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-gray-100">
          <Search
            size={16}
            className="text-gray-400 flex-shrink-0"
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
            className="flex-1 bg-transparent outline-none text-[14px] text-gray-900 placeholder:text-gray-400"
          />
          <kbd className="text-[10px] font-mono text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
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
            <div className="px-4 py-10 text-center text-[12px] text-gray-500">
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
                <div className="px-4 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-gray-400">
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
                        isActive ? "bg-gray-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <Icon
                        size={14}
                        className={isActive ? "text-gray-900" : "text-gray-400"}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-gray-900 truncate">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                      {isActive && (
                        <ArrowRight size={12} className="text-gray-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 h-8 border-t border-gray-100 bg-gray-50 text-[10px] text-gray-400">
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
