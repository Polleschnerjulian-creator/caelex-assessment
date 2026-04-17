"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const REGIONS = [
  { value: "all", label: "All regions" },
  { value: "eu", label: "EU/EFTA" },
  { value: "non-eu", label: "Non-EU" },
];

const DEPTHS = [
  { value: "all", label: "All depth" },
  { value: "deep", label: "Deep" },
  { value: "standard", label: "Standard" },
  { value: "stub", label: "Stub" },
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
  const depth = params?.get("depth") ?? "all";

  return (
    <aside className="flex flex-col gap-4 p-4 rounded-xl bg-white border border-gray-100">
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-2">
          Region
        </label>
        <select
          value={region}
          onChange={(e) => setParam("region", e.target.value)}
          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-[13px]"
        >
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-2">
          Coverage depth
        </label>
        <select
          value={depth}
          onChange={(e) => setParam("depth", e.target.value)}
          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-[13px]"
        >
          {DEPTHS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
}
