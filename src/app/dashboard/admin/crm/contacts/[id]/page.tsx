"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Linkedin,
  Loader2,
  Tag,
} from "lucide-react";
import LeadScoreBadge from "@/components/crm/LeadScoreBadge";
import { LifecycleBadge, DealStageBadge } from "@/components/crm/StageBadge";
import ActivityTimeline from "@/components/crm/ActivityTimeline";
import NotesPanel from "@/components/crm/NotesPanel";
import type {
  CrmLifecycleStage,
  CrmDealStage,
  CrmOperatorType,
} from "@prisma/client";

interface ContactDetail {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  linkedinUrl: string | null;
  avatarUrl: string | null;
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
  sourceTags: string[];
  firstTouchAt: string | null;
  lastTouchAt: string | null;
  company: {
    id: string;
    name: string;
    domain: string | null;
    operatorType: CrmOperatorType | null;
    leadScore: number;
    jurisdictions: string[];
    spacecraftCount: number | null;
    nextLaunchDate: string | null;
  } | null;
  primaryFor: Array<{
    id: string;
    title: string;
    stage: CrmDealStage;
    valueCents: number | null;
    currency: string;
    expectedCloseDate: string | null;
    probability: number;
  }>;
  createdAt: string;
}

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [contact, setContact] = useState<ContactDetail | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activities, setActivities] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/contacts/${id}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setContact(data.contact);
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
        Loading contact…
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-24">
        <p className="text-body text-[var(--text-secondary)]">
          Contact not found
        </p>
        <Link
          href="/dashboard/admin/crm"
          className="inline-flex items-center gap-1 text-small text-[var(--accent-primary)] hover:underline mt-2"
        >
          <ArrowLeft size={12} /> Back to CRM
        </Link>
      </div>
    );
  }

  const fullName =
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
    contact.email ||
    "Unknown";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/admin/crm?tab=contacts"
        className="inline-flex items-center gap-1 text-small text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={12} /> Back to contacts
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-title font-semibold"
            style={{
              background: "var(--accent-primary-soft)",
              color: "var(--accent-primary)",
            }}
          >
            {(
              contact.firstName?.[0] ||
              contact.email?.[0] ||
              "?"
            ).toUpperCase()}
          </div>
          <div>
            <h1 className="text-display-sm font-semibold text-[var(--text-primary)]">
              {fullName}
            </h1>
            {contact.title && (
              <p className="text-body text-[var(--text-secondary)]">
                {contact.title}
                {contact.company && ` · ${contact.company.name}`}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <LifecycleBadge stage={contact.lifecycleStage} />
              <LeadScoreBadge
                score={contact.leadScore}
                breakdown={contact.scoreBreakdown}
              />
              {contact.sourceTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    background: "var(--surface-sunken)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <Tag size={9} />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Main */}
        <div className="space-y-6">
          {/* Contact info */}
          <section
            className="rounded-xl border p-5"
            style={{
              background: "var(--surface-raised)",
              borderColor: "var(--border-default)",
            }}
          >
            <h2 className="text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
              Contact info
            </h2>
            <div className="grid grid-cols-2 gap-3 text-body">
              {contact.email && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Mail size={14} />
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-[var(--text-primary)] hover:text-[var(--accent-primary)]"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Phone size={14} />
                  <span className="text-[var(--text-primary)]">
                    {contact.phone}
                  </span>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Building2 size={14} />
                  <Link
                    href={`/dashboard/admin/crm/companies/${contact.company.id}`}
                    className="text-[var(--text-primary)] hover:text-[var(--accent-primary)]"
                  >
                    {contact.company.name}
                  </Link>
                </div>
              )}
              {contact.linkedinUrl && (
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Linkedin size={14} />
                  <a
                    href={contact.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--text-primary)] hover:text-[var(--accent-primary)]"
                  >
                    LinkedIn
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Activity timeline */}
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
            <NotesPanel notes={notes} contactId={contact.id} />
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {contact.company && (
            <div
              className="rounded-xl border p-4"
              style={{
                background: "var(--surface-raised)",
                borderColor: "var(--border-default)",
              }}
            >
              <p className="text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                Company
              </p>
              <Link
                href={`/dashboard/admin/crm/companies/${contact.company.id}`}
                className="text-body font-semibold text-[var(--text-primary)] hover:text-[var(--accent-primary)]"
              >
                {contact.company.name}
              </Link>
              {contact.company.domain && (
                <p className="text-caption text-[var(--text-tertiary)] mb-2">
                  {contact.company.domain}
                </p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {contact.company.jurisdictions.map((j) => (
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
              {contact.company.spacecraftCount != null && (
                <p className="text-caption text-[var(--text-secondary)] mt-2">
                  {contact.company.spacecraftCount} satellites in orbit
                </p>
              )}
              {contact.company.nextLaunchDate && (
                <p className="text-caption text-[var(--accent-warning)] mt-1">
                  Next launch:{" "}
                  {new Date(
                    contact.company.nextLaunchDate,
                  ).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {contact.primaryFor.length > 0 && (
            <div
              className="rounded-xl border p-4"
              style={{
                background: "var(--surface-raised)",
                borderColor: "var(--border-default)",
              }}
            >
              <p className="text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                Open deals
              </p>
              <div className="space-y-2">
                {contact.primaryFor.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/dashboard/admin/crm/deals/${deal.id}`}
                    className="block rounded-lg p-2 -m-2 hover:bg-[var(--surface-sunken)]"
                  >
                    <p className="text-small font-medium text-[var(--text-primary)] truncate">
                      {deal.title}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <DealStageBadge stage={deal.stage} size="sm" />
                      {deal.valueCents && (
                        <span className="text-small text-[var(--text-secondary)]">
                          €{(deal.valueCents / 100).toLocaleString("de-DE")}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div
            className="rounded-xl border p-4 text-caption text-[var(--text-tertiary)] space-y-1"
            style={{
              background: "var(--surface-raised)",
              borderColor: "var(--border-default)",
            }}
          >
            <p>
              First touch:{" "}
              {contact.firstTouchAt
                ? new Date(contact.firstTouchAt).toLocaleDateString()
                : "—"}
            </p>
            <p>
              Last touch:{" "}
              {contact.lastTouchAt
                ? new Date(contact.lastTouchAt).toLocaleDateString()
                : "—"}
            </p>
            <p>Created: {new Date(contact.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
