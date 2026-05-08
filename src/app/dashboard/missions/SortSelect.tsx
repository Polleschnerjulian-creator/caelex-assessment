"use client";

/**
 * Sprint UF51 (P1-M1) — sort-dropdown client island.
 *
 * Auto-submits the parent form on change so the operator picks a sort
 * key and the URL updates immediately. Tiny client component because
 * the parent missions page is RSC and can't carry inline event handlers.
 *
 * Hidden inputs for `q` + `status` are owned by the parent form so
 * we don't need to thread them through here — the form submission
 * picks them up.
 */

import * as React from "react";

interface SortOption {
  value: string;
  label: string;
}

export function SortSelect({
  defaultValue,
  options,
}: {
  defaultValue: string;
  options: SortOption[];
}) {
  return (
    <select
      name="sort"
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.submit()}
      aria-label="Sort missions"
      className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11.5px] font-medium text-slate-300 transition hover:border-white/[0.12] focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          Sort: {opt.label}
        </option>
      ))}
    </select>
  );
}
