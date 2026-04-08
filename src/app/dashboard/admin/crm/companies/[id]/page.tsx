"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Building2,
  Rocket,
  Loader2,
  Heart,
} from "lucide-react";
import LeadScoreBadge from "@/components/crm/LeadScoreBadge";
import { LifecycleBadge, DealStageBadge } from "@/components/crm/StageBadge";
import ActivityTimeline from "@/components/crm/ActivityTimeline";
import NotesPanel from "@/components/crm/NotesPanel";
import AiResearchCard from "@/components/crm/AiResearchCard";
import { OPERATOR_TYPE_LABELS } from "@/lib/crm/types";
import type {
  CrmDealStage,
  CrmLifecycleStage,
  CrmOperatorType,
} from "@prisma/client";

interface CompanyDetail {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
  description: string | null;
  operatorType: CrmOperatorType | null;
  jurisdictions: string[];
  spacecraftCount: number | null;
  plannedSpacecraft: number | null;
  fundingStage: string | null;
  isRaising: boolean | null;
  nextLaunchDate: string | null;
  licenseExpiryDate: string | null;
  leadScore: number;
  scoreBreakdown: {
    total: number;
    grade: "A" | "B" | "C" | "D" | "F";
    signals: Array<{
      key: string;
      label: string;
      points: number;
      reason?: string;
    }>;
  } | null;
  lifecycleStage: CrmLifecycleStage;
  contacts: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    title: string | null;
    leadScore: number;
    lifecycleStage: CrmLifecycleStage;
  }>;
  deals: Array<{
    id: string;
    title: string;
    stage: CrmDealStage;
    status: string;
    valueCents: number | null;
    currency: string;
    expectedCloseDate: string | null;
    probability: number;
  }>;
  organization: {
    id: string;
    name: string;
    plan: string;
    subscription: {
      status: string;
      plan: string;
      currentPeriodEnd: string | null;
    } | null;
    healthScore: {
      score: number;
      riskLevel: string;
      trend: string;
    } | null;
  } | null;
  createdAt: string;
}

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activities, setActivities] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/companies/${id}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setCompany(data.company);
        setActivities(data.activities);
        setNotes(data.notes);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--text-tertiary)]">
        <Loader2 size={16} className="animate-spin mr-2" />
        Loading company…
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-24">
        <p className="text-body text-[var(--text-secondary)]">
          Company not found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/admin/crm?tab=companies"
        className="inline-flex items-center gap-1 text-small text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={12} /> Back to companies
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-primary-soft)" }}
          >
            <Building2 size={22} className="text-[var(--accent-primary)]" />
          </div>
          <div>
            <h1 className="text-display-sm font-semibold text-[var(--text-primary)]">
              {company.name}
            </h1>
            {company.domain && (
              <a
                href={`https://${company.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-body text-[var(--text-secondary)] hover:text-[var(--accent-primary)] flex items-center gap-1"
              >
                <Globe size={12} />
                {company.domain}
              </a>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <LifecycleBadge stage={company.lifecycleStage} />
              <LeadScoreBadge
                score={company.leadScore}
                breakdown={company.scoreBreakdown}
              />
              {company.operatorType && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    background: "var(--surface-sunken)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {OPERATOR_TYPE_LABELS[company.operatorType]}
                </span>
              )}
              {company.jurisdictions.map((j) => (
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
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Main */}
        <div className="space-y-6">
          {/* Description */}
          {company.description && (
            <section
              className="rounded-xl border p-5"
              style={{
                background: "var(--surface-raised)",
                borderColor: "var(--border-default)",
              }}
            >
              <p className="text-body text-[var(--text-secondary)]">
                {company.description}
              </p>
            </section>
          )}

          {/* Regulatory profile */}
          <section
            className="rounded-xl border p-5"
            style={{
              background: "var(--surface-raised)",
              borderColor: "var(--border-default)",
            }}
          >
            <h2 className="text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3 flex items-center gap-2">
              <Rocket size={12} /> Regulatory profile
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-body">
              <Field
                label="Operator type"
                value={
                  company.operatorType
                    ? OPERATOR_TYPE_LABELS[company.operatorType]
                    : "—"
                }
              />
              <Field
                label="Spacecraft in orbit"
                value={company.spacecraftCount?.toString() || "—"}
              />
              <Field
                label="Planned spacecraft"
                value={company.plannedSpacecraft?.toString() || "—"}
              />
              <Field
                label="Funding stage"
                value={company.fundingStage || "—"}
              />
              <Field
                label="Next launch"
                value={
                  company.nextLaunchDate
                    ? new Date(company.nextLaunchDate).toLocaleDateString()
                    : "—"
                }
              />
              <Field
                label="License expiry"
                value={
                  company.licenseExpiryDate
                    ? new Date(company.licenseExpiryDate).toLocaleDateString()
                    : "—"
                }
              />
              <Field
                label="Raising capital"
                value={company.isRaising ? "Yes" : "No"}
              />
              <Field
                label="Jurisdictions"
                value={company.jurisdictions.join(", ") || "—"}
              />
            </div>
          </section>

          {/* Contacts */}
          {company.contacts.length > 0 && (
            <section
              className="rounded-xl border p-5"
              style={{
                background: "var(--surface-raised)",
                borderColor: "var(--border-default)",
              }}
            >
              <h2 className="text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
                Contacts ({company.contacts.length})
              </h2>
              <div className="space-y-2">
                {company.contacts.map((c) => {
                  const name =
                    [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                    c.email;
                  return (
                    <Link
                      key={c.id}
                      href={`/dashboard/admin/crm/contacts/${c.id}`}
                      className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-[var(--surface-sunken)]"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-body text-[var(--text-primary)] truncate">
                          {name}
                        </p>
                        {c.title && (
                          <p className="text-caption text-[var(--text-tertiary)] truncate">
                            {c.title}
                          </p>
                        )}
                      </div>
                      <LifecycleBadge stage={c.lifecycleStage} size="sm" />
                      <LeadScoreBadge score={c.leadScore} size="sm" />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Deals */}
          {company.deals.length > 0 && (
            <section
              className="rounded-xl border p-5"
              style={{
                background: "var(--surface-raised)",
                borderColor: "var(--border-default)",
              }}
            >
              <h2 className="text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
                Deals ({company.deals.length})
              </h2>
              <div className="space-y-2">
                {company.deals.map((d) => (
                  <Link
                    key={d.id}
                    href={`/dashboard/admin/crm/deals/${d.id}`}
                    className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-[var(--surface-sunken)]"
                  >
                    <p className="text-body text-[var(--text-primary)] truncate flex-1">
                      {d.title}
                    </p>
                    <DealStageBadge stage={d.stage} size="sm" />
                    {d.valueCents && (
                      <span className="text-small text-[var(--text-secondary)] font-medium flex-shrink-0">
                        €{(d.valueCents / 100).toLocaleString("de-DE")}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Activity */}
          <section
            className="rounded-xl border p-5"
            style={{
              background: "var(--surface-raised)",
              borderColor: "var(--border-default)",
            }}
          >
            <h2 className="text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
              Activity
            </h2>
            <ActivityTimeline activities={activities} />
          </section>

          {/* Notes */}
          <section
            className="rounded-xl border p-5"
            style={{
              background: "var(--surface-raised)",
              borderColor: "var(--border-default)",
            }}
          >
            <h2 className="text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
              Notes
            </h2>
            <NotesPanel notes={notes} companyId={company.id} />
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <AiResearchCard companyId={company.id} onComplete={load} />

          {company.organization && (
            <div
              className="rounded-xl border p-4"
              style={{
                background: "var(--surface-raised)",
                borderColor: "var(--border-default)",
              }}
            >
              <p className="text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                Active Customer
              </p>
              <p className="text-body text-[var(--text-primary)] mb-1">
                Plan: {company.organization.plan}
              </p>
              {company.organization.subscription && (
                <p className="text-caption text-[var(--text-secondary)] mb-2">
                  Status: {company.organization.subscription.status}
                </p>
              )}
              {company.organization.healthScore && (
                <div className="flex items-center gap-2 mt-3">
                  <Heart size={12} className="text-[var(--accent-success)]" />
                  <span className="text-small text-[var(--text-primary)]">
                    Health: {company.organization.healthScore.score}/100 (
                    {company.organization.healthScore.riskLevel})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption text-[var(--text-tertiary)] mb-0.5">{label}</p>
      <p className="text-body text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
