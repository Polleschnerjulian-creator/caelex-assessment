"use client";

/**
 * Sprint UF12 — Compact organization indicator for V2-Topbar.
 *
 * Audit finding P0-2 (multi-tenant): the existing OrganizationSwitcher
 * is a 200-line dropdown designed for the V1 sidebar. The V2 chrome
 * had NO org-context indicator at all — a consultant with 5 client
 * orgs couldn't tell which one they were operating on. They had to
 * navigate to Settings to check.
 *
 * This is the **visibility-first** half of multi-tenant. It surfaces
 * the active org name in the topbar between breadcrumbs and command
 * palette, with a click-to-switch dropdown listing all orgs the user
 * has access to.
 *
 * # What it does NOT do (yet — see follow-up sprint)
 *
 *   - Server-side org scoping. Most page-level queries today use
 *     `getXForUser(session.user.id)` which collapses to the user's
 *     primary org. Switching here writes localStorage and reloads,
 *     which lets client surfaces (Help drawer, Today inbox via the
 *     org-aware queries that exist) re-resolve, but server pages
 *     still default to primary org.
 *   - Visual banner per page showing "active org: X" in case of
 *     mismatch.
 *
 * Both belong in the multi-week multi-tenant batch (a P0 in the
 * audit but architecture-deep). UF12's scope is: make the org
 * context VISIBLE so the consultant has a fighting chance.
 *
 * # Interop with existing OrganizationSwitcher
 *
 * Both components write the same `localStorage.currentOrgId` key
 * — so a click here is observable from the V1 sidebar's switcher
 * if the user navigates to a v1 page. Reload is the source-of-truth
 * trigger; both components do that.
 */

import * as React from "react";
import Link from "next/link";
import { Building2, ChevronDown, Check, Plus, Settings } from "lucide-react";

interface OrgListEntry {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount: number;
}

const LS_KEY = "currentOrgId";

export function TopbarOrgIndicator() {
  const [open, setOpen] = React.useState(false);
  const [orgs, setOrgs] = React.useState<OrgListEntry[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  // Load orgs on mount.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/organizations");
        if (!res.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const data = (await res.json()) as { organizations?: OrgListEntry[] };
        const list = data.organizations ?? [];
        if (cancelled) return;
        setOrgs(list);

        // Resolve active org: localStorage first, then first in list.
        const stored = window.localStorage.getItem(LS_KEY);
        const validStored = stored && list.some((o) => o.id === stored);
        setActiveId(validStored ? stored : (list[0]?.id ?? null));
      } catch {
        // Network/parse error — render the "no orgs" fallback.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on outside click.
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on ESC.
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const active = orgs.find((o) => o.id === activeId) ?? null;

  // Skip rendering entirely when the user has 0 or 1 org — switcher
  // would be noise in the chrome. The user can still create more
  // orgs from settings.
  if (loading) {
    return (
      <span
        className="hidden h-7 w-32 animate-pulse rounded-md bg-white/[0.04] md:inline-block"
        aria-hidden
      />
    );
  }
  if (orgs.length <= 1) {
    return null;
  }

  function handleSelect(orgId: string) {
    if (orgId === activeId) {
      setOpen(false);
      return;
    }
    try {
      window.localStorage.setItem(LS_KEY, orgId);
    } catch {
      // localStorage might be disabled (private mode); proceed anyway.
    }
    setActiveId(orgId);
    setOpen(false);
    // Hard reload so server-side data refetches with the new context.
    // Soft router.refresh() is not enough because most server queries
    // resolve org from session, not from localStorage.
    window.location.reload();
  }

  return (
    <div ref={wrapperRef} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Organization: ${active?.name ?? "select"}`}
        className="flex h-7 max-w-[200px] items-center gap-1.5 rounded-md bg-white/[0.04] px-2 text-[12px] font-medium text-white/85 transition hover:bg-white/[0.07]"
        style={{ letterSpacing: "-0.005em" }}
      >
        <Building2
          className="h-3 w-3 shrink-0 text-white/55"
          strokeWidth={1.8}
        />
        <span className="truncate">{active?.name ?? "No organization"}</span>
        <ChevronDown
          className="h-3 w-3 shrink-0 text-white/45"
          strokeWidth={2}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Switch organization"
          className="absolute left-0 top-9 z-50 w-72 overflow-hidden rounded-lg border border-white/[0.08] bg-[#13131A] shadow-[0_24px_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]"
        >
          <div className="border-b border-white/[0.06] px-3 py-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Switch organization
            </p>
            <p className="mt-0.5 text-[10.5px] text-slate-500">
              Reloads the dashboard with the new context.
            </p>
          </div>
          <ul className="max-h-72 overflow-auto py-1">
            {orgs.map((org) => {
              const isActive = org.id === activeId;
              return (
                <li key={org.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(org.id)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-white/[0.04]"
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-[10px] font-semibold text-slate-300"
                      aria-hidden
                    >
                      {org.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-medium text-slate-100">
                        {org.name}
                      </div>
                      <div className="truncate text-[10.5px] text-slate-500">
                        {org.role.toLowerCase()} · {org.memberCount}{" "}
                        {org.memberCount === 1 ? "member" : "members"}
                      </div>
                    </div>
                    {isActive ? (
                      <Check
                        className="h-3.5 w-3.5 shrink-0 text-emerald-300"
                        strokeWidth={2.2}
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-1 border-t border-white/[0.06] bg-white/[0.012] px-2 py-1.5">
            <Link
              href="/dashboard/organization/new"
              onClick={() => setOpen(false)}
              className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-[11.5px] font-medium text-emerald-300 transition hover:bg-white/[0.04]"
            >
              <Plus className="h-3 w-3" strokeWidth={2} />
              New organization
            </Link>
            <Link
              href="/dashboard/settings/organization"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[11.5px] font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200"
            >
              <Settings className="h-3 w-3" strokeWidth={2} />
              Manage
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
