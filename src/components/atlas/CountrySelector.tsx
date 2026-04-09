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
                bg-emerald-50 border border-emerald-200
                text-[11px] font-medium text-emerald-700
                hover:bg-emerald-100 transition-colors duration-150
                group
              "
            >
              <span className="text-[13px] leading-none">{data.flagEmoji}</span>
              <span className="font-mono tracking-wide">{code}</span>
              <X className="h-3 w-3 text-emerald-400 group-hover:text-emerald-600 transition-colors" />
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
                ? "border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50"
                : "border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 bg-white cursor-pointer"
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
              text-gray-500 hover:text-emerald-700 border border-gray-200
              hover:border-emerald-200 bg-white hover:bg-emerald-50
              transition-colors duration-150
            "
          >
            EU
          </button>
          <button
            onClick={clearAll}
            className="
              rounded px-2 py-1 text-[10px] font-medium tracking-wider uppercase
              text-gray-500 hover:text-red-600 border border-gray-200
              hover:border-red-200 bg-white hover:bg-red-50
              transition-colors duration-150
            "
          >
            Clear
          </button>
        </div>

        {/* Count indicator */}
        <span className="text-[10px] text-gray-400 font-mono ml-auto">
          {selected.length}/{MAX_SELECTIONS}
        </span>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="
            absolute z-50 top-full left-0 mt-1.5 w-full max-w-[640px] max-h-[320px]
            overflow-y-auto rounded-xl border border-gray-200
            bg-white backdrop-blur-xl shadow-xl
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
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                        : isDisabled
                          ? "opacity-30 cursor-not-allowed text-gray-400"
                          : "hover:bg-gray-50 text-gray-700 border border-transparent"
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
                    <span className="text-[9px] font-mono text-gray-400">
                      {code}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="h-3 w-3 text-emerald-600 flex-shrink-0" />
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
