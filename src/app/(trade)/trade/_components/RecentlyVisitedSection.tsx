"use client";

/**
 * RecentlyVisitedSection — sidebar block surfacing the user's last 5
 * routes inside Caelex Trade.
 *
 * Why this exists (U-MED-7):
 *   Operators jump back and forth between detail pages (Items / Parties /
 *   Operations) all day. A persistent "Recent" list saves them the
 *   sidebar-navigation round-trip + memory load. localStorage-backed
 *   so it survives reloads but doesn't roundtrip to the server.
 *
 * Rendering rules:
 *   - Only renders if the recent list has ≥1 entry. New users see
 *     nothing extra in the sidebar.
 *   - Labels are derived from the URL pathname via a static map.
 *     Unknown paths fall back to a humanised slug ("operations/abc-123"
 *     → "Operations / abc-123").
 *   - Active row (matches current pathname) gets the same accent fill
 *     as the main nav items for consistency.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock,
  Package,
  Users,
  Workflow,
  FileCheck,
  FileSignature,
  Layers,
  AlertOctagon,
  Rocket,
  ScanSearch,
  Settings,
  UserCog,
  BookOpen,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useRecentlyVisited } from "./useRecentlyVisited";

interface RouteMeta {
  /** Visible label in the row. */
  label: string;
  icon: LucideIcon;
}

/** Map known route prefixes to display metadata. Longest prefix wins. */
const ROUTE_PREFIXES: ReadonlyArray<{ prefix: string; meta: RouteMeta }> = [
  { prefix: "/trade/items", meta: { label: "Items", icon: Package } },
  { prefix: "/trade/parties", meta: { label: "Counterparties", icon: Users } },
  {
    prefix: "/trade/operations",
    meta: { label: "Pipeline", icon: Workflow },
  },
  { prefix: "/trade/licenses", meta: { label: "Licenses", icon: FileCheck } },
  {
    prefix: "/trade/classify",
    meta: { label: "Classify", icon: ScanSearch },
  },
  { prefix: "/trade/euc", meta: { label: "EUCs", icon: FileSignature } },
  {
    prefix: "/trade/reexport-consents",
    meta: { label: "Re-Export", icon: FileSignature },
  },
  { prefix: "/trade/vsd", meta: { label: "VSDs", icon: AlertOctagon } },
  {
    prefix: "/trade/sammelgenehmigungen",
    meta: { label: "Sammelg", icon: Layers },
  },
  {
    prefix: "/trade/france-los",
    meta: { label: "France LOS", icon: Rocket },
  },
  {
    prefix: "/trade/uk-ecju",
    meta: { label: "UK ECJU", icon: FileCheck },
  },
  {
    prefix: "/trade/faa-ast",
    meta: { label: "FAA AST", icon: Rocket },
  },
  {
    prefix: "/trade/deemed-exports",
    meta: { label: "Deemed Exp.", icon: UserCog },
  },
  {
    prefix: "/trade/program",
    meta: { label: "Program", icon: ShieldCheck },
  },
  {
    prefix: "/trade/research",
    meta: { label: "Training Corpus", icon: BookOpen },
  },
  {
    prefix: "/trade/settings",
    meta: { label: "Settings", icon: Settings },
  },
];

interface Resolved {
  meta: RouteMeta;
  /** Optional trailing detail ID rendered after the label ("Items / abc-12"). */
  detail?: string;
}

function resolveRoute(pathname: string): Resolved {
  // Longest-prefix-match for the most specific route metadata.
  const candidates = ROUTE_PREFIXES.filter((r) =>
    pathname.startsWith(r.prefix),
  );
  const best = candidates.sort((a, b) => b.prefix.length - a.prefix.length)[0];
  if (!best) {
    return {
      meta: { label: pathname.replace("/trade/", ""), icon: Clock },
    };
  }
  // Detail-page detection: if there's still path-tail after the prefix
  // ("/trade/items/abc-12" → detail "abc-12"), surface it.
  const tail = pathname.slice(best.prefix.length).replace(/^\//, "");
  return {
    meta: best.meta,
    detail: tail.length > 0 ? tail : undefined,
  };
}

export function RecentlyVisitedSection() {
  const entries = useRecentlyVisited();
  const pathname = usePathname();

  if (entries.length === 0) return null;

  return (
    <section className="mt-5">
      <h3
        className="mb-1 flex items-center gap-1.5 px-2.5 text-[10.5px] font-semibold uppercase"
        style={{
          color: "rgba(255, 255, 255, 0.62)",
          letterSpacing: "0.08em",
        }}
      >
        <Clock className="h-3 w-3" aria-hidden="true" strokeWidth={2} />
        Recent
      </h3>
      <ul className="flex flex-col gap-0.5">
        {entries.map((href) => {
          const { meta, detail } = resolveRoute(href);
          const active = href === pathname;
          const Icon = meta.icon;
          return (
            <li key={href}>
              <Link
                href={href}
                prefetch={true}
                title={href}
                className="group flex items-center gap-3 rounded-md px-2.5 py-1.5 transition-colors duration-150"
                style={{
                  background: active
                    ? "rgba(255, 255, 255, 0.07)"
                    : "transparent",
                  color: active
                    ? "rgba(255, 255, 255, 0.96)"
                    : "rgba(255, 255, 255, 0.58)",
                  fontSize: "12.5px",
                  fontWeight: active ? 500 : 430,
                  letterSpacing: "-0.005em",
                }}
              >
                <Icon
                  className="h-[14px] w-[14px] shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                  style={{
                    color: active
                      ? "rgba(255, 255, 255, 0.96)"
                      : "rgba(255, 255, 255, 0.58)",
                  }}
                />
                <span className="flex-1 truncate">
                  {meta.label}
                  {detail ? (
                    <span
                      className="ml-1 text-[11px]"
                      style={{ color: "rgba(255, 255, 255, 0.42)" }}
                    >
                      / {detail}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
