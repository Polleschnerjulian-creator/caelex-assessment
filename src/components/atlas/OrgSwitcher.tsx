"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react";

/**
 * Atlas org-switcher dropdown. Mounted inside AccountBanner.
 *
 * Without this UI the `atlas_active_org` cookie was read by
 * getAtlasAuth() but written nowhere — users who belonged to two
 * Atlas orgs were silently scoped to whichever joined first. The
 * resulting "I can't find my matters" support tickets were the most
 * common Atlas complaint.
 *
 * Behaviour:
 *   - Caller's own memberships render first; super-admins see every
 *     other LAW_FIRM/BOTH org as a "platform admin view" tier below.
 *   - Filter input is keyboard-only; focus on open. No virtual list
 *     yet because we cap at ~200 rows server-side.
 *   - Switching is a POST + full reload — easier than threading
 *     org-specific React Query keys through every page.
 */

interface OrgEntry {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  orgType: string;
  isMember: boolean;
  role: string | null;
}

interface OrgsResponse {
  organizations: OrgEntry[];
  activeOrgId: string | null;
}

export function OrgSwitcher({ currentOrgName }: { currentOrgName: string }) {
  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState<OrgEntry[] | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [switching, setSwitching] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lazy-fetch the orgs list — only when the dropdown opens. Saves
  // the 50-row scan on every settings-page load for users who never
  // need to switch.
  useEffect(() => {
    if (!open || orgs !== null) return;
    let cancelled = false;
    fetch("/api/atlas/settings/organizations")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: OrgsResponse) => {
        if (cancelled) return;
        setOrgs(data.organizations);
        setActiveOrgId(data.activeOrgId);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("Couldn't load organisations.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, orgs]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Auto-focus filter input when dropdown opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setFilter("");
    }
  }, [open]);

  const handleSwitch = async (orgId: string) => {
    if (switching) return;
    setSwitching(orgId);
    try {
      const res = await fetch("/api/atlas/settings/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      });
      if (!res.ok) {
        setSwitching(null);
        return;
      }
      // Hard reload — every page in Atlas reads the active org via
      // server-side getAtlasAuth(), so a router refresh isn't enough.
      window.location.assign("/atlas");
    } catch {
      setSwitching(null);
    }
  };

  const filtered = orgs
    ? orgs.filter((o) =>
        filter.trim()
          ? o.name.toLowerCase().includes(filter.trim().toLowerCase()) ||
            o.id.toLowerCase().includes(filter.trim().toLowerCase())
          : true,
      )
    : null;

  const memberOrgs = filtered?.filter((o) => o.isMember) ?? [];
  const adminOrgs = filtered?.filter((o) => !o.isMember) ?? [];
  const showSwitcher = (orgs?.length ?? 0) > 1 || adminOrgs.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] px-2 py-1 text-[11px] font-medium text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] hover:border-[var(--atlas-border-strong)] transition-colors"
        aria-label="Switch organisation"
        aria-expanded={open}
      >
        Switch
        <ChevronDown
          size={11}
          strokeWidth={1.5}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-[320px] rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-lg z-50 overflow-hidden">
          {/* Filter input — only when there's enough rows to bother */}
          {(orgs?.length ?? 0) > 5 && (
            <div className="flex items-center gap-1.5 border-b border-[var(--atlas-border)] px-3 py-2">
              <Search
                size={12}
                strokeWidth={1.5}
                className="text-[var(--atlas-text-faint)]"
              />
              <input
                ref={inputRef}
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter organisations…"
                className="flex-1 bg-transparent text-[12px] text-[var(--atlas-text-primary)] outline-none placeholder:text-[var(--atlas-text-faint)]"
              />
            </div>
          )}

          <div className="max-h-[420px] overflow-y-auto">
            {orgs === null && !loadError && (
              <div className="flex items-center justify-center gap-2 p-4 text-[12px] text-[var(--atlas-text-muted)]">
                <Loader2 size={12} className="animate-spin" />
                Loading…
              </div>
            )}

            {loadError && (
              <div className="p-4 text-[12px] text-red-600">{loadError}</div>
            )}

            {orgs && filtered && filtered.length === 0 && (
              <div className="p-4 text-[12px] text-[var(--atlas-text-muted)]">
                {filter
                  ? "No matching organisations."
                  : "You don't belong to any other organisation yet."}
              </div>
            )}

            {memberOrgs.length > 0 && (
              <div>
                {!showSwitcher && (
                  <div className="px-3 pt-3 pb-1.5 text-[10px] font-semibold tracking-wider text-[var(--atlas-text-muted)] uppercase">
                    Your organisation
                  </div>
                )}
                {showSwitcher && (
                  <div className="px-3 pt-3 pb-1.5 text-[10px] font-semibold tracking-wider text-[var(--atlas-text-muted)] uppercase">
                    Your organisations
                  </div>
                )}
                {memberOrgs.map((o) => {
                  const isActive = o.id === activeOrgId;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => !isActive && handleSwitch(o.id)}
                      disabled={!!switching || isActive}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[var(--atlas-bg-surface-muted)] transition-colors ${
                        isActive ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--atlas-bg-inset)] text-[var(--atlas-text-secondary)] flex-shrink-0">
                        <Building2 size={13} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium text-[var(--atlas-text-primary)] truncate">
                          {o.name}
                        </div>
                        <div className="text-[10px] text-[var(--atlas-text-muted)] truncate">
                          {o.role && (
                            <span className="lowercase capitalize">
                              {o.role.toLowerCase()} ·{" "}
                            </span>
                          )}
                          <span className="font-mono">{o.id.slice(0, 12)}</span>
                        </div>
                      </div>
                      {switching === o.id ? (
                        <Loader2
                          size={12}
                          className="text-[var(--atlas-text-faint)] animate-spin flex-shrink-0"
                        />
                      ) : isActive ? (
                        <Check
                          size={12}
                          strokeWidth={2}
                          className="text-emerald-600 flex-shrink-0"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}

            {adminOrgs.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-3 pt-3 pb-1.5 text-[10px] font-semibold tracking-wider text-purple-700 dark:text-purple-300 uppercase">
                  <ShieldCheck size={10} strokeWidth={2} />
                  Platform admin view
                </div>
                {adminOrgs.slice(0, 50).map((o) => {
                  const isActive = o.id === activeOrgId;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => !isActive && handleSwitch(o.id)}
                      disabled={!!switching || isActive}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[var(--atlas-bg-surface-muted)] transition-colors ${
                        isActive ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300 flex-shrink-0">
                        <Building2 size={13} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium text-[var(--atlas-text-primary)] truncate">
                          {o.name}
                        </div>
                        <div className="text-[10px] text-[var(--atlas-text-muted)] truncate font-mono">
                          {o.id.slice(0, 12)}
                        </div>
                      </div>
                      {switching === o.id ? (
                        <Loader2
                          size={12}
                          className="text-[var(--atlas-text-faint)] animate-spin flex-shrink-0"
                        />
                      ) : isActive ? (
                        <Check
                          size={12}
                          strokeWidth={2}
                          className="text-emerald-600 flex-shrink-0"
                        />
                      ) : null}
                    </button>
                  );
                })}
                {adminOrgs.length > 50 && (
                  <div className="px-3 py-2 text-[10px] text-[var(--atlas-text-muted)]">
                    Showing first 50 — refine filter to narrow.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--atlas-border)] px-3 py-1.5 text-[10px] text-[var(--atlas-text-faint)] truncate">
            Currently in:{" "}
            <span className="text-[var(--atlas-text-secondary)]">
              {currentOrgName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
