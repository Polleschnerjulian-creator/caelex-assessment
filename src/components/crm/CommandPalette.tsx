"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  User,
  Briefcase,
  ArrowRight,
  Loader2,
} from "lucide-react";
import LeadScoreBadge from "./LeadScoreBadge";
import { DealStageBadge, LifecycleBadge } from "./StageBadge";
import type { CrmDealStage, CrmLifecycleStage } from "@prisma/client";

interface SearchResult {
  contacts: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    title: string | null;
    leadScore: number;
    lifecycleStage: CrmLifecycleStage;
    company: { name: string } | null;
  }>;
  companies: Array<{
    id: string;
    name: string;
    domain: string | null;
    operatorType: string | null;
    leadScore: number;
    lifecycleStage: CrmLifecycleStage;
  }>;
  deals: Array<{
    id: string;
    title: string;
    stage: CrmDealStage;
    valueCents: number | null;
    currency: string;
    company: { id: string; name: string } | null;
  }>;
}

interface QuickAction {
  label: string;
  hint: string;
  run: () => void;
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    if (!open) {
      setQuery("");
      setResults(null);
      setActiveIndex(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/crm/search?q=${encodeURIComponent(query)}`,
        );
        if (res.ok && !cancelled) {
          setResults(await res.json());
          setActiveIndex(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const quickActions: QuickAction[] = [
    {
      label: "Go to Pipeline",
      hint: "G P",
      run: () => router.push("/dashboard/admin/crm"),
    },
    {
      label: "Go to Contacts",
      hint: "G C",
      run: () => router.push("/dashboard/admin/crm?tab=contacts"),
    },
    {
      label: "Go to Companies",
      hint: "G O",
      run: () => router.push("/dashboard/admin/crm?tab=companies"),
    },
    {
      label: "Go to Activities",
      hint: "G A",
      run: () => router.push("/dashboard/admin/crm?tab=activities"),
    },
  ];

  // Flat navigable items for keyboard nav
  const flatItems = useCallback(() => {
    const items: Array<{ type: string; action: () => void }> = [];

    if (results) {
      results.contacts.forEach((c) => {
        items.push({
          type: "contact",
          action: () => {
            router.push(`/dashboard/admin/crm/contacts/${c.id}`);
            setOpen(false);
          },
        });
      });
      results.companies.forEach((c) => {
        items.push({
          type: "company",
          action: () => {
            router.push(`/dashboard/admin/crm/companies/${c.id}`);
            setOpen(false);
          },
        });
      });
      results.deals.forEach((d) => {
        items.push({
          type: "deal",
          action: () => {
            router.push(`/dashboard/admin/crm/deals/${d.id}`);
            setOpen(false);
          },
        });
      });
    } else {
      quickActions.forEach((qa) => {
        items.push({
          type: "action",
          action: () => {
            qa.run();
            setOpen(false);
          },
        });
      });
    }

    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = flatItems();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(items.length - 1, i + 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) item.action();
    }
  };

  if (!open) return null;

  const hasResults =
    results &&
    (results.contacts.length > 0 ||
      results.companies.length > 0 ||
      results.deals.length > 0);

  let currentIdx = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden"
        style={{
          background: "var(--surface-raised)",
          borderColor: "var(--border-default)",
        }}
      >
        {/* Input */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <Search size={16} className="text-[var(--text-tertiary)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search contacts, companies, deals... or jump to a page"
            className="flex-1 bg-transparent text-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
          />
          {loading && (
            <Loader2
              size={14}
              className="animate-spin text-[var(--text-tertiary)]"
            />
          )}
          <kbd className="text-[10px] font-semibold text-[var(--text-tertiary)] border border-[var(--border-default)] rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {!results && (
            <div className="py-2">
              <p className="px-4 py-1 text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Quick actions
              </p>
              {quickActions.map((action, idx) => {
                const isActive = idx === activeIndex;
                const thisIdx = currentIdx++;
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => {
                      action.run();
                      setOpen(false);
                    }}
                    onMouseEnter={() => setActiveIndex(thisIdx)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-left transition-colors ${
                      isActive ? "bg-[var(--surface-sunken)]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 text-body text-[var(--text-primary)]">
                      <ArrowRight
                        size={12}
                        className="text-[var(--text-tertiary)]"
                      />
                      {action.label}
                    </div>
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {action.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {results && !hasResults && !loading && (
            <div className="py-12 text-center text-body text-[var(--text-tertiary)]">
              No results for &quot;{query}&quot;
            </div>
          )}

          {results && results.contacts.length > 0 && (
            <div className="py-2">
              <p className="px-4 py-1 text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Contacts
              </p>
              {results.contacts.map((c) => {
                const name =
                  [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                  c.email;
                const thisIdx = currentIdx++;
                const isActive = thisIdx === activeIndex;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      router.push(`/dashboard/admin/crm/contacts/${c.id}`);
                      setOpen(false);
                    }}
                    onMouseEnter={() => setActiveIndex(thisIdx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      isActive ? "bg-[var(--surface-sunken)]" : ""
                    }`}
                  >
                    <User size={14} className="text-[var(--text-tertiary)]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-body text-[var(--text-primary)] truncate">
                        {name}
                      </p>
                      <p className="text-small text-[var(--text-tertiary)] truncate">
                        {c.email}
                        {c.company && ` · ${c.company.name}`}
                      </p>
                    </div>
                    <LeadScoreBadge score={c.leadScore} size="sm" />
                    <LifecycleBadge stage={c.lifecycleStage} size="sm" />
                  </button>
                );
              })}
            </div>
          )}

          {results && results.companies.length > 0 && (
            <div
              className="py-2 border-t"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <p className="px-4 py-1 text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Companies
              </p>
              {results.companies.map((c) => {
                const thisIdx = currentIdx++;
                const isActive = thisIdx === activeIndex;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      router.push(`/dashboard/admin/crm/companies/${c.id}`);
                      setOpen(false);
                    }}
                    onMouseEnter={() => setActiveIndex(thisIdx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      isActive ? "bg-[var(--surface-sunken)]" : ""
                    }`}
                  >
                    <Building2
                      size={14}
                      className="text-[var(--text-tertiary)]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-body text-[var(--text-primary)] truncate">
                        {c.name}
                      </p>
                      <p className="text-small text-[var(--text-tertiary)] truncate">
                        {c.domain || c.operatorType}
                      </p>
                    </div>
                    <LeadScoreBadge score={c.leadScore} size="sm" />
                  </button>
                );
              })}
            </div>
          )}

          {results && results.deals.length > 0 && (
            <div
              className="py-2 border-t"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <p className="px-4 py-1 text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Deals
              </p>
              {results.deals.map((d) => {
                const thisIdx = currentIdx++;
                const isActive = thisIdx === activeIndex;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      router.push(`/dashboard/admin/crm/deals/${d.id}`);
                      setOpen(false);
                    }}
                    onMouseEnter={() => setActiveIndex(thisIdx)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      isActive ? "bg-[var(--surface-sunken)]" : ""
                    }`}
                  >
                    <Briefcase
                      size={14}
                      className="text-[var(--text-tertiary)]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-body text-[var(--text-primary)] truncate">
                        {d.title}
                      </p>
                      <p className="text-small text-[var(--text-tertiary)] truncate">
                        {d.company?.name}
                        {d.valueCents &&
                          ` · €${(d.valueCents / 100).toLocaleString("de-DE")}`}
                      </p>
                    </div>
                    <DealStageBadge stage={d.stage} size="sm" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
