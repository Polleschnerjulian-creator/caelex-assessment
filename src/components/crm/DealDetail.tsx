"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  Loader2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import LeadScoreBadge from "@/components/crm/LeadScoreBadge";
import { DealStageBadge } from "@/components/crm/StageBadge";
import ActivityTimeline from "@/components/crm/ActivityTimeline";
import NotesPanel from "@/components/crm/NotesPanel";
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGE_ORDER,
  OPERATOR_TYPE_LABELS,
} from "@/lib/crm/types";
import { csrfHeaders } from "@/lib/csrf-client";
import type { CrmDealStage, CrmOperatorType } from "@prisma/client";

/** Deutsche Anzeige der KI-Dringlichkeit (API liefert low/medium/high). */
const URGENCY_LABELS: Record<"low" | "medium" | "high", string> = {
  low: "niedrig",
  medium: "mittel",
  high: "dringend",
};

interface DealDetail {
  id: string;
  title: string;
  stage: CrmDealStage;
  status: string;
  valueCents: number | null;
  currency: string;
  expectedCloseDate: string | null;
  actualCloseDate: string | null;
  probability: number;
  lossReason: string | null;
  stageChangedAt: string;
  createdAt: string;
  company: {
    id: string;
    name: string;
    domain: string | null;
    operatorType: string | null;
    jurisdictions: string[];
    spacecraftCount: number | null;
    nextLaunchDate: string | null;
    leadScore: number;
  } | null;
  primaryContact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  owner: { id: string; name: string | null; email: string } | null;
}

interface NextActionResult {
  action: string;
  reasoning: string;
  urgency: "low" | "medium" | "high";
  error?: string;
}

export default function DealDetail({ id }: { id: string }) {
  const [deal, setDeal] = useState<DealDetail | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activities, setActivities] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextAction, setNextAction] = useState<NextActionResult | null>(null);
  const [nextActionLoading, setNextActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/deals/${id}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setDeal(data.deal);
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

  const handleStageChange = async (newStage: CrmDealStage) => {
    if (!deal || deal.stage === newStage) return;
    try {
      const res = await fetch(`/api/admin/crm/deals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ stage: newStage }),
      });
      if (res.ok) {
        await load();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextAction = async () => {
    setNextActionLoading(true);
    try {
      const res = await fetch("/api/admin/crm/ai/next-action", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ dealId: id }),
      });
      if (res.ok) {
        setNextAction(await res.json());
      }
    } finally {
      setNextActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--text-tertiary)]">
        <Loader2 size={16} className="animate-spin mr-2" />
        Deal wird geladen…
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="text-center py-24 text-body text-[var(--text-secondary)]">
        Deal nicht gefunden
      </div>
    );
  }

  const daysInStage = Math.floor(
    (Date.now() - new Date(deal.stageChangedAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return (
    <div className="space-y-6">
      <Link
        href="/admin/crm?tab=deals"
        className="inline-flex items-center gap-1 text-small text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={12} /> Zurück zu den Deals
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-display-sm font-semibold text-[var(--text-primary)]">
            {deal.title}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-body text-[var(--text-secondary)] flex-wrap">
            {deal.company && (
              <Link
                href={`/admin/crm/companies/${deal.company.id}`}
                className="flex items-center gap-1 hover:text-[var(--accent-primary)]"
              >
                <Building2 size={12} />
                {deal.company.name}
              </Link>
            )}
            {deal.primaryContact && (
              <Link
                href={`/admin/crm/contacts/${deal.primaryContact.id}`}
                className="flex items-center gap-1 hover:text-[var(--accent-primary)]"
              >
                <User size={12} />
                {[deal.primaryContact.firstName, deal.primaryContact.lastName]
                  .filter(Boolean)
                  .join(" ") || deal.primaryContact.email}
              </Link>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-display-sm font-bold text-[var(--text-primary)]">
            {deal.valueCents
              ? `€${(deal.valueCents / 100).toLocaleString("de-DE")}`
              : "—"}
          </p>
          <p className="text-caption text-[var(--text-tertiary)]">
            {deal.probability} % Wahrscheinlichkeit
          </p>
        </div>
      </div>

      {/* Stage pipeline */}
      <div className="flex flex-wrap gap-1">
        {DEAL_STAGE_ORDER.filter(
          (s) =>
            s !== "CLOSED_WON" &&
            s !== "CLOSED_LOST" &&
            s !== "ONBOARDING" &&
            s !== "ACTIVE",
        ).map((stage) => {
          const isActive = deal.stage === stage;
          const isPast =
            DEAL_STAGE_ORDER.indexOf(deal.stage) >
            DEAL_STAGE_ORDER.indexOf(stage);
          return (
            <button
              key={stage}
              onClick={() => handleStageChange(stage)}
              className={`flex-1 min-w-[100px] px-3 py-2 text-small font-medium rounded-lg transition-all ${
                isActive
                  ? "text-white"
                  : isPast
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-tertiary)]"
              }`}
              style={{
                background: isActive
                  ? "var(--accent-primary)"
                  : isPast
                    ? "var(--accent-primary-soft)"
                    : "var(--surface-raised)",
                border: `1px solid ${
                  isActive ? "var(--accent-primary)" : "var(--border-default)"
                }`,
              }}
            >
              {DEAL_STAGE_LABELS[stage]}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Main */}
        <div className="space-y-6">
          {/* Deal summary */}
          <section
            className="rounded-xl border p-5"
            style={{
              background: "var(--surface-raised)",
              borderColor: "var(--border-default)",
            }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field
                label="Phase"
                value={<DealStageBadge stage={deal.stage} />}
              />
              <Field
                label="Tage in dieser Phase"
                value={
                  <span className="text-body text-[var(--text-primary)]">
                    {daysInStage}
                  </span>
                }
              />
              <Field
                label="Geplanter Abschluss"
                value={
                  <span className="text-body text-[var(--text-primary)]">
                    {deal.expectedCloseDate
                      ? new Date(deal.expectedCloseDate).toLocaleDateString(
                          "de-DE",
                        )
                      : "—"}
                  </span>
                }
              />
              <Field
                label="Zuständig"
                value={
                  <span className="text-body text-[var(--text-primary)]">
                    {deal.owner?.name || deal.owner?.email || "—"}
                  </span>
                }
              />
            </div>
          </section>

          {/* Activity */}
          <section
            className="rounded-xl border p-5"
            style={{
              background: "var(--surface-raised)",
              borderColor: "var(--border-default)",
            }}
          >
            <h2 className="text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
              Aktivität
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
              Notizen
            </h2>
            <NotesPanel notes={notes} dealId={deal.id} />
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* AI next-action */}
          {!nextAction ? (
            <button
              onClick={handleNextAction}
              disabled={nextActionLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-colors disabled:opacity-50"
              style={{
                background: "var(--accent-primary-soft)",
                borderColor: "var(--accent-primary)",
                color: "var(--accent-primary)",
              }}
            >
              {nextActionLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              <span className="text-body font-medium">
                {nextActionLoading
                  ? "Denkt nach…"
                  : "Nächsten Schritt vorschlagen"}
              </span>
            </button>
          ) : (
            <div
              className="rounded-xl border p-4"
              style={{
                background: "var(--surface-raised)",
                borderColor: "var(--border-default)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={12} className="text-[var(--accent-info)]" />
                  <p className="text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Nächster Schritt
                  </p>
                </div>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    background:
                      nextAction.urgency === "high"
                        ? "var(--accent-danger)/15"
                        : nextAction.urgency === "medium"
                          ? "var(--accent-warning-soft)"
                          : "var(--surface-sunken)",
                    color:
                      nextAction.urgency === "high"
                        ? "var(--accent-danger)"
                        : nextAction.urgency === "medium"
                          ? "var(--accent-warning)"
                          : "var(--text-secondary)",
                  }}
                >
                  {URGENCY_LABELS[nextAction.urgency] ?? nextAction.urgency}
                </span>
              </div>
              <p className="text-body font-semibold text-[var(--text-primary)] mb-2">
                {nextAction.action}
              </p>
              <p className="text-small text-[var(--text-secondary)]">
                {nextAction.reasoning}
              </p>
              <button
                onClick={() => setNextAction(null)}
                className="text-caption text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mt-2"
              >
                Neu vorschlagen
              </button>
            </div>
          )}

          {/* Regulatory context */}
          {deal.company && (
            <div
              className="rounded-xl border p-4"
              style={{
                background: "var(--surface-raised)",
                borderColor: "var(--border-default)",
              }}
            >
              <p className="text-caption font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                Regulatorischer Kontext
              </p>
              <div className="space-y-2 text-small">
                {deal.company.operatorType && (
                  <div>
                    <p className="text-[var(--text-tertiary)]">Betreiber-Typ</p>
                    <p className="text-[var(--text-primary)]">
                      {OPERATOR_TYPE_LABELS[
                        deal.company.operatorType as CrmOperatorType
                      ] ?? deal.company.operatorType}
                    </p>
                  </div>
                )}
                {deal.company.spacecraftCount != null && (
                  <div>
                    <p className="text-[var(--text-tertiary)]">Satelliten</p>
                    <p className="text-[var(--text-primary)]">
                      {deal.company.spacecraftCount} im Orbit
                    </p>
                  </div>
                )}
                {deal.company.jurisdictions.length > 0 && (
                  <div>
                    <p className="text-[var(--text-tertiary)]">
                      Jurisdiktionen
                    </p>
                    <p className="text-[var(--text-primary)]">
                      {deal.company.jurisdictions.join(", ")}
                    </p>
                  </div>
                )}
                {deal.company.nextLaunchDate && (
                  <div className="flex items-start gap-1 text-[var(--accent-warning)]">
                    <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Start steht bevor</p>
                      <p>
                        {new Date(
                          deal.company.nextLaunchDate,
                        ).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-caption text-[var(--text-tertiary)] mb-1">{label}</p>
      <div>{value}</div>
    </div>
  );
}
