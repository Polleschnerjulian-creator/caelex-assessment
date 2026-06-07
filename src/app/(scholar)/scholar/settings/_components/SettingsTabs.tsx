"use client";
/**
 * Caelex Scholar — Settings tabbed shell.
 *
 * Receives server-rendered panel content as React.ReactNode via the `content`
 * field on each tab definition — a valid RSC→Client boundary transfer (nodes,
 * not functions). No @/data/* imports here; all data is pre-computed by the
 * server page and passed as serialisable props or ReactNode children.
 *
 * WCAG 2.2 AA tabs pattern:
 *   - role="tablist" on the nav rail
 *   - Each tab: role="tab" aria-selected aria-controls id
 *   - Each panel: role="tabpanel" aria-labelledby tabIndex={0}
 *   - Keyboard: ArrowDown/ArrowUp (rail) + ArrowLeft/ArrowRight move focus
 *     between tabs, Home = first, End = last, Enter/Space = activate
 *   - Visible focus rings on all interactive elements
 *   - All panels rendered in the DOM; inactive ones hidden (aria-hidden +
 *     hidden class) so client-component form state is preserved across tabs
 */

import {
  useState,
  useRef,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { t } from "../../_i18n/core";
import { SETTINGS } from "../../_i18n/settings";
import { useScholarLocale } from "../../_i18n/LocaleProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TabDefinition = {
  id: string;
  label: string;
  icon: ReactNode; // pre-rendered icon element — valid across RSC boundary (not a function)
  content: ReactNode; // server-rendered panel — valid as ReactNode prop
};

type Props = {
  tabs: TabDefinition[];
  /** Optional: initialise to a specific tab id (e.g. from URL hash). */
  defaultTab?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsTabs({ tabs, defaultTab }: Props) {
  const locale = useScholarLocale();
  const [activeId, setActiveId] = useState<string>(
    () => defaultTab ?? tabs[0]?.id ?? "",
  );
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = tabs.findIndex((t) => t.id === activeId);

  const activate = useCallback(
    (index: number) => {
      const t = tabs[index];
      if (t) {
        setActiveId(t.id);
        tabRefs.current[index]?.focus();
      }
    },
    [tabs],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          activate((index + 1) % tabs.length);
          break;
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault();
          activate((index - 1 + tabs.length) % tabs.length);
          break;
        case "Home":
          e.preventDefault();
          activate(0);
          break;
        case "End":
          e.preventDefault();
          activate(tabs.length - 1);
          break;
        default:
          break;
      }
    },
    [activate, tabs.length],
  );

  return (
    <div className="flex flex-col md:flex-row gap-0 w-full max-w-5xl">
      {/* ── Left: category rail (desktop) / horizontal strip (mobile) ────── */}
      <nav
        role="tablist"
        aria-label={t(locale, SETTINGS, "tablistLabel")}
        aria-orientation="vertical"
        className={[
          // mobile: horizontal scrollable strip
          "flex flex-row md:flex-col",
          "overflow-x-auto md:overflow-x-visible",
          "gap-0.5",
          // mobile: borderless strip above panel
          "border-b border-gray-200 md:border-b-0",
          // desktop: fixed-width rail with right border
          "md:w-[200px] md:flex-shrink-0",
          "md:border-r md:border-gray-100",
          "md:pr-1 md:sticky md:top-6 md:self-start",
          "pb-0 md:pb-0",
        ].join(" ")}
      >
        {tabs.map((tab, i) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              id={`settings-tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`settings-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              onClick={() => activate(i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={[
                // base
                "flex items-center gap-2.5 rounded-lg text-left",
                // mobile: compact horizontal pill
                "px-3 py-2 md:px-3 md:py-2.5",
                "text-[12px] md:text-[13px] font-medium",
                "whitespace-nowrap md:whitespace-normal",
                "w-auto md:w-full",
                "motion-safe:transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded-lg",
                // active state
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              ].join(" ")}
            >
              {/* Left accent bar — desktop only, active tab */}
              <span
                aria-hidden="true"
                className={[
                  "hidden md:block",
                  "w-0.5 h-4 rounded-full flex-shrink-0",
                  "motion-safe:transition-colors",
                  isActive ? "bg-gray-800" : "bg-transparent",
                ].join(" ")}
              />
              <span
                aria-hidden="true"
                className={isActive ? "text-gray-800" : "text-gray-400"}
              >
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Right: panel area ────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 md:pl-8 pt-6 md:pt-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <div
              key={tab.id}
              id={`settings-panel-${tab.id}`}
              role="tabpanel"
              aria-labelledby={`settings-tab-${tab.id}`}
              tabIndex={0}
              hidden={!isActive}
              aria-hidden={!isActive}
              className={[
                "focus-visible:outline-none",
                // When panel receives focus via keyboard, show a subtle ring
                "focus-visible:ring-2 focus-visible:ring-gray-200 focus-visible:ring-offset-4 rounded",
                isActive ? "block" : "hidden",
              ].join(" ")}
            >
              {tab.content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
