"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Check } from "lucide-react";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import type { SpaceLawCountryCode } from "@/lib/space-law-types";

const MAX_SELECTIONS = 5;

const EU_COUNTRY_CODES: SpaceLawCountryCode[] = [
  "FR",
  "DE",
  "IT",
  "LU",
  "NL",
  "BE",
  "ES",
  "AT",
  "PL",
  "DK",
  "SE",
  "FI",
  "PT",
  "GR",
  "CZ",
  "IE",
];

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

  const selectAllEU = () => {
    // Pick the first 5 EU countries as a sensible default set
    onChange(EU_COUNTRY_CODES.slice(0, MAX_SELECTIONS));
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
                bg-emerald-500/[0.08] border border-emerald-500/20
                text-[11px] font-medium text-emerald-400
                hover:bg-emerald-500/[0.15] transition-colors duration-150
                group
              "
            >
              <span className="text-[13px] leading-none">{data.flagEmoji}</span>
              <span className="font-mono tracking-wide">{code}</span>
              <X className="h-3 w-3 text-emerald-500/50 group-hover:text-emerald-400 transition-colors" />
            </button>
          );
        })}

        {/* Add button */}
        <button
          onClick={() => setOpen(!open)}
          disabled={selected.length >= MAX_SELECTIONS}
          className={`
            flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium
            border transition-colors duration-150
            ${
              selected.length >= MAX_SELECTIONS
                ? "border-white/[0.04] text-slate-600 cursor-not-allowed bg-white/[0.02]"
                : "border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.12] bg-white/[0.03] cursor-pointer"
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
              rounded px-2 py-1 text-[10px] font-medium tracking-wider uppercase
              text-slate-500 hover:text-emerald-400 border border-white/[0.06]
              hover:border-emerald-500/20 bg-white/[0.02] hover:bg-emerald-500/[0.06]
              transition-colors duration-150
            "
          >
            EU
          </button>
          <button
            onClick={clearAll}
            className="
              rounded px-2 py-1 text-[10px] font-medium tracking-wider uppercase
              text-slate-500 hover:text-red-400 border border-white/[0.06]
              hover:border-red-500/20 bg-white/[0.02] hover:bg-red-500/[0.06]
              transition-colors duration-150
            "
          >
            Clear
          </button>
        </div>

        {/* Count indicator */}
        <span className="text-[10px] text-slate-600 font-mono ml-auto">
          {selected.length}/{MAX_SELECTIONS}
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="
            absolute z-50 top-full left-0 mt-1.5 w-full max-w-[640px] max-h-[320px]
            overflow-y-auto rounded-lg border border-white/[0.08]
            bg-[#0F172A]/95 backdrop-blur-xl shadow-2xl
            glass-floating
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
                        ? "bg-emerald-500/[0.12] border border-emerald-500/25 text-emerald-300"
                        : isDisabled
                          ? "opacity-30 cursor-not-allowed text-slate-500"
                          : "hover:bg-white/[0.06] text-slate-300 border border-transparent"
                    }
                  `}
                >
                  <span className="text-[14px] leading-none flex-shrink-0">
                    {data.flagEmoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-medium truncate block">
                      {data.countryName}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {code}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" />
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
