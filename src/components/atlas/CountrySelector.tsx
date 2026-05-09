"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Check } from "lucide-react";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import type { SpaceLawCountryCode } from "@/lib/space-law-types";
import { EU_MEMBER_STATES } from "@/lib/space-law-types";

/* BUG-A2 + B2: was 5. Cross-border partners routinely brief 6-8
   jurisdictions for FDI/Series-A panels, and ComparatorExport already
   handles 6+ in landscape mode (line 503). Bumped to 8 — the export
   stays clean, and the table's horizontal-scroll handles overflow. */
const MAX_SELECTIONS = 8;

/* BUG-A2: the local EU_COUNTRY_CODES list was missing 8 EU member
   states (EE/RO/HU/SI/LV/LT/SK/HR) — clicking the "EU" button silently
   excluded them. Now imported from the canonical
   `EU_MEMBER_STATES` so this list always matches what the
   ComparisonTable + forecast-engine consider EU. */
const EU_COUNTRY_CODES: readonly SpaceLawCountryCode[] = EU_MEMBER_STATES;

interface CountrySelectorProps {
  selected: SpaceLawCountryCode[];
  onChange: (countries: SpaceLawCountryCode[]) => void;
}

export default function CountrySelector({
  selected,
  onChange,
}: CountrySelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allCountries = Array.from(JURISDICTION_DATA.entries());

  const toggle = (code: SpaceLawCountryCode) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else if (selected.length < MAX_SELECTIONS) {
      onChange([...selected, code]);
    }
  };

  /* BUG-A3: was a destructive overwrite — Marie built "FR + UK + CH",
     clicked EU, lost everything except the first 5 EU codes. Now we
     MERGE the user's existing selection with EU members, preserving
     non-EU choices first (so the user's intentional picks survive),
     then top up with EU codes the user didn't already pick, until the
     cap. If the cap is hit before we exhaust EU members, we don't
     silently truncate — return what we got and let the count-indicator
     speak for itself. */
  const selectAllEU = () => {
    const merged: SpaceLawCountryCode[] = [...selected];
    for (const code of EU_COUNTRY_CODES) {
      if (merged.length >= MAX_SELECTIONS) break;
      if (!merged.includes(code)) merged.push(code);
    }
    onChange(merged);
  };

  const clearAll = () => onChange([]);

  return (
    <div ref={ref} className="relative">
      {/* Selected countries bar */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {selected.map((code) => {
          const data = JURISDICTION_DATA.get(code);
          if (!data) return null;
          return (
            <button
              key={code}
              onClick={() => toggle(code)}
              className="
                flex items-center gap-1.5 rounded px-2 py-1
                bg-[var(--atlas-bg-inset)] border-0
                text-[11px] font-medium text-[var(--atlas-text-primary)]
                hover:bg-[var(--atlas-bg-inset)] transition-colors duration-150
                group
              "
            >
              <span className=" tracking-wide">{code}</span>
              <X className="h-3 w-3 text-[var(--atlas-text-faint)] group-hover:text-[var(--atlas-text-secondary)] transition-colors" />
            </button>
          );
        })}

        {/* Add button */}
        <button
          onClick={() => setOpen(!open)}
          disabled={selected.length >= MAX_SELECTIONS}
          className={`
            flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium
            transition-colors duration-150
            ${
              selected.length >= MAX_SELECTIONS
                ? "text-[var(--atlas-text-faint)] cursor-not-allowed bg-[var(--atlas-bg-surface-muted)]"
                : "text-[var(--atlas-text-secondary)] hover:text-[var(--atlas-text-primary)] bg-[var(--atlas-bg-surface-muted)] hover:bg-[var(--atlas-bg-inset)] cursor-pointer"
            }
          `}
        >
          <span>
            {selected.length >= MAX_SELECTIONS
              ? `${MAX_SELECTIONS} max`
              : `Add country`}
          </span>
          <ChevronDown
            className={`h-3 w-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* Quick actions */}
        <div className="flex items-center gap-1 ml-1">
          <button
            onClick={selectAllEU}
            className="
              px-2 py-1 text-[10px] font-medium tracking-wider uppercase
              text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)]
              transition-colors duration-150
            "
          >
            EU
          </button>
          <button
            onClick={clearAll}
            className="
              px-2 py-1 text-[10px] font-medium tracking-wider uppercase
              text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)]
              transition-colors duration-150
            "
          >
            Clear
          </button>
        </div>

        {/* Count indicator */}
        <span className="text-[10px] text-[var(--atlas-text-faint)]  ml-auto">
          {selected.length}/{MAX_SELECTIONS}
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="
            absolute z-50 top-full left-0 mt-1.5 w-full max-w-[640px] max-h-[320px]
            overflow-y-auto rounded-xl border border-[var(--atlas-border)]
            bg-[var(--atlas-bg-surface)] backdrop-blur-xl shadow-xl
          "
        >
          <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-0.5">
            {allCountries.map(([code, data]) => {
              const isSelected = selected.includes(code);
              const isDisabled =
                !isSelected && selected.length >= MAX_SELECTIONS;

              return (
                <button
                  key={code}
                  onClick={() => !isDisabled && toggle(code)}
                  disabled={isDisabled}
                  className={`
                    flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left
                    transition-colors duration-100
                    ${
                      isSelected
                        ? "bg-[var(--atlas-bg-inset)] text-[var(--atlas-text-primary)]"
                        : isDisabled
                          ? "opacity-30 cursor-not-allowed text-[var(--atlas-text-faint)]"
                          : "hover:bg-[var(--atlas-bg-surface-muted)] text-[var(--atlas-text-secondary)]"
                    }
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-medium truncate block">
                      {data.countryName}
                    </span>
                    <span className="text-[9px]  text-[var(--atlas-text-faint)]">
                      {code}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="h-3 w-3 text-[var(--atlas-text-secondary)] flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
