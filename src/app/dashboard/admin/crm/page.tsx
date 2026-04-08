"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Users,
  Building2,
  Briefcase,
  Activity as ActivityIcon,
  LayoutGrid,
  Loader2,
  TrendingUp,
  Plus,
  Command,
  Mail,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { csrfHeaders } from "@/lib/csrf-client";
import KanbanBoard from "@/components/crm/KanbanBoard";
import CommandPalette from "@/components/crm/CommandPalette";
import LeadScoreBadge from "@/components/crm/LeadScoreBadge";
import { DealStageBadge, LifecycleBadge } from "@/components/crm/StageBadge";
import ActivityTimeline from "@/components/crm/ActivityTimeline";
import type { DealCardData } from "@/components/crm/DealCard";
import type {
  CrmDealStage,
  CrmLifecycleStage,
  CrmOperatorType,
} from "@prisma/client";

type Tab = "pipeline" | "contacts" | "companies" | "deals" | "activities";

interface Stats {
  pipelineValue: number;
  weightedPipelineValue: number;
  dealsByStage: Array<{ stage: CrmDealStage; count: number; value: number }>;
  wonCount: number;
  wonValue: number;
  lostCount: number;
  newLeadsThisWeek: number;
  newLeadsThisMonth: number;
  totalContacts: number;
  totalCompanies: number;
  recentActivityCount: number;
  topScoringContacts: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    leadScore: number;
    lifecycleStage: CrmLifecycleStage;
    company: { name: string; operatorType: string | null } | null;
  }>;
}

function formatEuro(cents: number): string {
  const value = cents / 100;
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `€${(value / 1000).toFixed(0)}k`;
  }
  return `€${value.toFixed(0)}`;
}

function CrmPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tab") as Tab) || "pipeline";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const changeTab = useCallback(
    (newTab: Tab) => {
      setTab(newTab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", newTab);
      router.replace(`/dashboard/admin/crm?${params.toString()}`);
    },
    [searchParams, router],
  );

  // Fetch stats
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatsLoading(true);
      try {
        const res = await fetch("/api/admin/crm/stats", {
          cache: "no-store",
        });
        if (res.ok && !cancelled) {
          setStats(await res.json());
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <CommandPalette />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "var(--accent-primary-soft)" }}
            >
              <Users size={18} className="text-[var(--accent-primary)]" />
            </div>
            <div>
              <h1 className="text-title font-semibold text-[var(--text-primary)]">
                CRM
              </h1>
              <p className="text-body text-[var(--text-secondary)]">
                Unified customer management
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            // Trigger Cmd+K by dispatching a keyboard event
            const e = new KeyboardEvent("keydown", {
              key: "k",
              metaKey: true,
              bubbles: true,
            });
            window.dispatchEvent(e);
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-small text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          style={{
            background: "var(--surface-raised)",
            borderColor: "var(--border-default)",
          }}
        >
          <Command size={12} />
          <span>Search</span>
          <kbd
            className="text-[10px] font-semibold border rounded px-1 py-0.5"
            style={{ borderColor: "var(--border-default)" }}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          label="Pipeline"
          value={stats ? formatEuro(stats.pipelineValue) : "—"}
          sub={
            stats
              ? `${formatEuro(stats.weightedPipelineValue)} weighted`
              : "loading..."
          }
          loading={statsLoading}
        />
        <KpiCard
          label="Closed Won"
          value={stats ? formatEuro(stats.wonValue) : "—"}
          sub={stats ? `${stats.wonCount} deals` : ""}
          loading={statsLoading}
        />
        <KpiCard
          label="Contacts"
          value={stats ? String(stats.totalContacts) : "—"}
          sub={stats ? `+${stats.newLeadsThisWeek} this week` : ""}
          loading={statsLoading}
        />
        <KpiCard
          label="Companies"
          value={stats ? String(stats.totalCompanies) : "—"}
          loading={statsLoading}
        />
        <KpiCard
          label="Activity"
          value={stats ? String(stats.recentActivityCount) : "—"}
          sub="last 7 days"
          loading={statsLoading}
        />
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 border-b"
        style={{ borderColor: "var(--border-default)" }}
      >
        <TabButton
          active={tab === "pipeline"}
          onClick={() => changeTab("pipeline")}
          icon={<LayoutGrid size={14} />}
          label="Pipeline"
        />
        <TabButton
          active={tab === "contacts"}
          onClick={() => changeTab("contacts")}
          icon={<Users size={14} />}
          label="Contacts"
        />
        <TabButton
          active={tab === "companies"}
          onClick={() => changeTab("companies")}
          icon={<Building2 size={14} />}
          label="Companies"
        />
        <TabButton
          active={tab === "deals"}
          onClick={() => changeTab("deals")}
          icon={<Briefcase size={14} />}
          label="Deals"
        />
        <TabButton
          active={tab === "activities"}
          onClick={() => changeTab("activities")}
          icon={<ActivityIcon size={14} />}
          label="Activity"
        />
      </div>

      {/* Tab content */}
      {tab === "pipeline" && <PipelineTab stats={stats} />}
      {tab === "contacts" && <ContactsTab />}
      {tab === "companies" && <CompaniesTab />}
      {tab === "deals" && <DealsTab />}
      {tab === "activities" && <ActivitiesTab />}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{
        background: "var(--surface-raised)",
        borderColor: "var(--border-default)",
      }}
    >
      <p className="text-caption font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
        {label}
      </p>
      {loading ? (
        <div
          className="h-6 w-20 rounded animate-pulse"
          style={{ background: "var(--surface-sunken)" }}
        />
      ) : (
        <>
          <p className="text-heading font-semibold text-[var(--text-primary)]">
            {value}
          </p>
          {sub && (
            <p className="text-caption text-[var(--text-tertiary)] mt-0.5">
              {sub}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-body transition-colors relative ${
        active
          ? "text-[var(--text-primary)] font-medium"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      {icon}
      {label}
      {active && (
        <div
          className="absolute bottom-[-1px] left-0 right-0 h-0.5"
          style={{ background: "var(--accent-primary)" }}
        />
      )}
    </button>
  );
}

// Pipeline tab — Kanban board
function PipelineTab({ stats }: { stats: Stats | null }) {
  const [deals, setDeals] = useState<DealCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDeals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/crm/deals?view=kanban", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  const handleStageChange = useCallback(
    async (dealId: string, newStage: CrmDealStage) => {
      const res = await fetch(`/api/admin/crm/deals/${dealId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) throw new Error("Failed to update stage");
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--text-tertiary)]">
        <Loader2 size={16} className="animate-spin mr-2" />
        Loading pipeline…
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div
        className="rounded-xl border p-12 text-center"
        style={{
          background: "var(--surface-raised)",
          borderColor: "var(--border-default)",
        }}
      >
        <TrendingUp
          size={32}
          className="mx-auto mb-3 text-[var(--text-tertiary)]"
        />
        <p className="text-body text-[var(--text-secondary)] mb-1">
          No deals in the pipeline yet.
        </p>
        <p className="text-caption text-[var(--text-tertiary)]">
          Deals are created automatically when leads book demos. Stats show{" "}
          {stats?.totalContacts || 0} contacts and {stats?.totalCompanies || 0}{" "}
          companies already tracked.
        </p>
      </div>
    );
  }

  return <KanbanBoard deals={deals} onStageChange={handleStageChange} />;
}

// Contacts tab — list
interface ContactListItem {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  title: string | null;
  leadScore: number;
  lifecycleStage: CrmLifecycleStage;
  lastTouchAt: string | null;
  createdAt: string;
  company: {
    id: string;
    name: string;
    operatorType: CrmOperatorType | null;
  } | null;
}

function ContactsTab() {
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "25",
        });
        if (search) params.set("search", search);
        const res = await fetch(`/api/admin/crm/contacts?${params}`, {
          cache: "no-store",
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setContacts(data.contacts);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const t = setTimeout(load, search ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search, page]);

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name, email, company…"
        className="w-full max-w-md rounded-lg border px-3 py-2 text-body focus:outline-none"
        style={{
          background: "var(--surface-raised)",
          borderColor: "var(--border-default)",
          color: "var(--text-primary)",
        }}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[var(--text-tertiary)]">
          <Loader2 size={16} className="animate-spin mr-2" />
          Loading contacts…
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 text-body text-[var(--text-tertiary)]">
          No contacts found
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            background: "var(--surface-raised)",
            borderColor: "var(--border-default)",
          }}
        >
          <table className="w-full">
            <thead>
              <tr
                className="border-b"
                style={{
                  background: "var(--surface-sunken)",
                  borderColor: "var(--border-default)",
                }}
              >
                <th className="text-left text-caption font-medium text-[var(--text-secondary)] uppercase tracking-wider px-4 py-2">
                  Name
                </th>
                <th className="text-left text-caption font-medium text-[var(--text-secondary)] uppercase tracking-wider px-4 py-2">
                  Company
                </th>
                <th className="text-left text-caption font-medium text-[var(--text-secondary)] uppercase tracking-wider px-4 py-2">
                  Stage
                </th>
                <th className="text-left text-caption font-medium text-[var(--text-secondary)] uppercase tracking-wider px-4 py-2">
                  Score
                </th>
                <th className="text-left text-caption font-medium text-[var(--text-secondary)] uppercase tracking-wider px-4 py-2">
                  Last Touch
                </th>
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {contacts.map((c) => {
                const name =
                  [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                  c.email;
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
                    onClick={() =>
                      (window.location.href = `/dashboard/admin/crm/contacts/${c.id}`)
                    }
                  >
                    <td className="px-4 py-3">
                      <p className="text-body font-medium text-[var(--text-primary)]">
                        {name}
                      </p>
                      <p className="text-caption text-[var(--text-tertiary)]">
                        {c.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-body text-[var(--text-secondary)]">
                        {c.company?.name || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <LifecycleBadge stage={c.lifecycleStage} />
                    </td>
                    <td className="px-4 py-3">
                      <LeadScoreBadge score={c.leadScore} />
                    </td>
                    <td className="px-4 py-3 text-caption text-[var(--text-tertiary)]">
                      {c.lastTouchAt
                        ? formatDistanceToNow(new Date(c.lastTouchAt), {
                            addSuffix: true,
                          })
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Companies tab — list
interface CompanyListItem {
  id: string;
  name: string;
  domain: string | null;
  operatorType: CrmOperatorType | null;
  leadScore: number;
  lifecycleStage: CrmLifecycleStage;
  jurisdictions: string[];
  spacecraftCount: number | null;
  _count: { contacts: number; deals: number };
}

function CompaniesTab() {
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: "1", limit: "25" });
        if (search) params.set("search", search);
        const res = await fetch(`/api/admin/crm/companies?${params}`, {
          cache: "no-store",
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setCompanies(data.companies);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const t = setTimeout(load, search ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search]);

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search company name or domain…"
        className="w-full max-w-md rounded-lg border px-3 py-2 text-body focus:outline-none"
        style={{
          background: "var(--surface-raised)",
          borderColor: "var(--border-default)",
          color: "var(--text-primary)",
        }}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[var(--text-tertiary)]">
          <Loader2 size={16} className="animate-spin mr-2" />
          Loading companies…
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-16 text-body text-[var(--text-tertiary)]">
          No companies found
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {companies.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/admin/crm/companies/${c.id}`}
              className="rounded-xl border p-4 hover:shadow-sm transition-all"
              style={{
                background: "var(--surface-raised)",
                borderColor: "var(--border-default)",
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-[var(--text-primary)] truncate">
                    {c.name}
                  </p>
                  {c.domain && (
                    <p className="text-caption text-[var(--text-tertiary)] truncate">
                      {c.domain}
                    </p>
                  )}
                </div>
                <LeadScoreBadge score={c.leadScore} />
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <LifecycleBadge stage={c.lifecycleStage} size="sm" />
                {c.operatorType && c.operatorType !== "OTHER" && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      background: "var(--surface-sunken)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {c.operatorType.toLowerCase().replace(/_/g, " ")}
                  </span>
                )}
                {c.jurisdictions.slice(0, 3).map((j) => (
                  <span
                    key={j}
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      background: "var(--accent-primary-soft)",
                      color: "var(--accent-primary)",
                    }}
                  >
                    {j}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3 text-caption text-[var(--text-tertiary)]">
                <span>{c._count.contacts} contacts</span>
                <span>·</span>
                <span>{c._count.deals} open deals</span>
                {c.spacecraftCount != null && (
                  <>
                    <span>·</span>
                    <span>{c.spacecraftCount} satellites</span>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Deals tab — list view
interface DealListItem {
  id: string;
  title: string;
  stage: CrmDealStage;
  status: string;
  valueCents: number | null;
  currency: string;
  expectedCloseDate: string | null;
  company: { id: string; name: string } | null;
  primaryContact: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
}

function DealsTab() {
  const [deals, setDeals] = useState<DealListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("OPEN");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/crm/deals?status=${statusFilter}&limit=50`,
          { cache: "no-store" },
        );
        if (res.ok && !cancelled) {
          const data = await res.json();
          setDeals(data.deals);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  return (
    <div className="space-y-3">
      <div
        className="flex items-center gap-1 p-1 rounded-lg border w-fit"
        style={{
          background: "var(--surface-raised)",
          borderColor: "var(--border-default)",
        }}
      >
        {["OPEN", "WON", "LOST", "ALL"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 text-small font-medium rounded ${
              statusFilter === s
                ? "bg-[var(--accent-primary)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[var(--text-tertiary)]">
          <Loader2 size={16} className="animate-spin mr-2" />
          Loading deals…
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-16 text-body text-[var(--text-tertiary)]">
          No deals
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            background: "var(--surface-raised)",
            borderColor: "var(--border-default)",
          }}
        >
          <table className="w-full">
            <thead>
              <tr
                className="border-b"
                style={{
                  background: "var(--surface-sunken)",
                  borderColor: "var(--border-default)",
                }}
              >
                <th className="text-left text-caption font-medium text-[var(--text-secondary)] uppercase tracking-wider px-4 py-2">
                  Deal
                </th>
                <th className="text-left text-caption font-medium text-[var(--text-secondary)] uppercase tracking-wider px-4 py-2">
                  Company
                </th>
                <th className="text-left text-caption font-medium text-[var(--text-secondary)] uppercase tracking-wider px-4 py-2">
                  Stage
                </th>
                <th className="text-right text-caption font-medium text-[var(--text-secondary)] uppercase tracking-wider px-4 py-2">
                  Value
                </th>
                <th className="text-left text-caption font-medium text-[var(--text-secondary)] uppercase tracking-wider px-4 py-2">
                  Close
                </th>
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              {deals.map((d) => (
                <tr
                  key={d.id}
                  className="hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
                  onClick={() =>
                    (window.location.href = `/dashboard/admin/crm/deals/${d.id}`)
                  }
                >
                  <td className="px-4 py-3">
                    <p className="text-body font-medium text-[var(--text-primary)]">
                      {d.title}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-body text-[var(--text-secondary)]">
                    {d.company?.name || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <DealStageBadge stage={d.stage} />
                  </td>
                  <td className="px-4 py-3 text-right text-body font-semibold text-[var(--text-primary)]">
                    {d.valueCents ? formatEuro(d.valueCents) : "—"}
                  </td>
                  <td className="px-4 py-3 text-caption text-[var(--text-tertiary)]">
                    {d.expectedCloseDate
                      ? formatDistanceToNow(new Date(d.expectedCloseDate), {
                          addSuffix: true,
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Activities tab — unified timeline
interface ActivityItem {
  id: string;
  type: string;
  source: string;
  summary: string;
  body: string | null;
  occurredAt: string;
  user: { id: string; name: string | null; email: string } | null;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  company: { id: string; name: string; domain: string | null } | null;
  deal: { id: string; title: string } | null;
}

function ActivitiesTab() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/crm/activities?limit=100", {
          cache: "no-store",
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setActivities(data.activities);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--text-tertiary)]">
        <Loader2 size={16} className="animate-spin mr-2" />
        Loading activity…
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: "var(--surface-raised)",
        borderColor: "var(--border-default)",
      }}
    >
      <ActivityTimeline
        activities={activities.map((a) => ({
          ...a,
          type: a.type as never,
        }))}
        emptyMessage="No activity in the last 100 events"
      />
    </div>
  );
}

export default function CrmPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center">Loading...</div>}>
      <CrmPageContent />
    </Suspense>
  );
}
