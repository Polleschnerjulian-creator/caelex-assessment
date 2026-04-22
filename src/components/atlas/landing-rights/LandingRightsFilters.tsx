"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const REGIONS = [
  { value: "all", label: "All regions" },
  { value: "eu", label: "EU/EFTA" },
  { value: "non-eu", label: "Non-EU" },
];

const REGIME_TYPES = [
  { value: "all", label: "All regimes" },
  { value: "two_track", label: "Two-track" },
  { value: "telecoms_only", label: "Telecoms-only" },
  { value: "space_act_only", label: "Space-act-only" },
  { value: "emerging", label: "Emerging" },
];

const DEPTHS = [
  { value: "all", label: "All depth" },
  { value: "deep", label: "Deep" },
  { value: "standard", label: "Standard" },
  { value: "stub", label: "Stub" },
];

const OPERATOR_STATUSES = [
  { value: "all", label: "Any status" },
  { value: "licensed", label: "Licensed" },
  { value: "pending", label: "Pending" },
  { value: "denied", label: "Denied" },
  { value: "sector_limited", label: "Sector-limited" },
  { value: "not_entered", label: "Not entered" },
];

const YES_NO = [
  { value: "all", label: "Either" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export function LandingRightsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params?.toString() ?? "");
    if (value === "all" || !value) next.delete(key);
    else next.set(key, value);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const region = params?.get("region") ?? "all";
  const regime = params?.get("regime") ?? "all";
  const depth = params?.get("depth") ?? "all";
  const starlink = params?.get("starlink") ?? "all";
  const kuiper = params?.get("kuiper") ?? "all";
  const oneweb = params?.get("oneweb") ?? "all";
  const securityReview = params?.get("security_review") ?? "all";
  const foreignCap = params?.get("foreign_cap") ?? "all";

  const activeCount = [
    region,
    regime,
    depth,
    starlink,
    kuiper,
    oneweb,
    securityReview,
    foreignCap,
  ].filter((v) => v !== "all").length;

  return (
    <aside className="flex flex-col gap-5 p-5 rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] sticky top-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--atlas-text-secondary)]">
          Filters
        </h3>
        {activeCount > 0 && (
          <button
            onClick={() => router.push(pathname, { scroll: false })}
            className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Reset ({activeCount})
          </button>
        )}
      </div>

      <FilterSelect
        label="Region"
        value={region}
        options={REGIONS}
        onChange={(v) => setParam("region", v)}
      />
      <FilterSelect
        label="Regime type"
        value={regime}
        options={REGIME_TYPES}
        onChange={(v) => setParam("regime", v)}
      />
      <FilterSelect
        label="Coverage depth"
        value={depth}
        options={DEPTHS}
        onChange={(v) => setParam("depth", v)}
      />

      <div className="pt-3 border-t border-[var(--atlas-border-subtle)]">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)] mb-3">
          Operator status
        </h4>
        <div className="flex flex-col gap-3">
          <FilterSelect
            label="Starlink"
            value={starlink}
            options={OPERATOR_STATUSES}
            onChange={(v) => setParam("starlink", v)}
          />
          <FilterSelect
            label="Kuiper"
            value={kuiper}
            options={OPERATOR_STATUSES}
            onChange={(v) => setParam("kuiper", v)}
          />
          <FilterSelect
            label="OneWeb"
            value={oneweb}
            options={OPERATOR_STATUSES}
            onChange={(v) => setParam("oneweb", v)}
          />
        </div>
      </div>

      <div className="pt-3 border-t border-[var(--atlas-border-subtle)]">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)] mb-3">
          Regulatory screens
        </h4>
        <div className="flex flex-col gap-3">
          <FilterSelect
            label="Security review required"
            value={securityReview}
            options={YES_NO}
            onChange={(v) => setParam("security_review", v)}
          />
          <FilterSelect
            label="Foreign-ownership cap"
            value={foreignCap}
            options={YES_NO}
            onChange={(v) => setParam("foreign_cap", v)}
          />
        </div>
      </div>
    </aside>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)] block mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-[var(--atlas-border)] px-2 py-1.5 text-[12px] bg-[var(--atlas-bg-surface)] focus:border-[var(--atlas-border-strong)] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
