import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  ShieldCheck,
  FileQuestion,
  BellRing,
  MessageSquarePlus,
  User as UserIcon,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import {
  getComplianceItemById,
  getItemDetailExtras,
} from "@/lib/comply-v2/compliance-item.server";
import { getProvenanceTimeline } from "@/lib/comply-v2/provenance.server";
import { ProvenanceTimeline } from "@/components/dashboard/v2/ProvenanceTimeline";
import {
  REGULATIONS,
  REGULATION_LABELS,
  type RegulationKey,
  type ComplianceStatus,
} from "@/lib/comply-v2/types";
import { Badge } from "@/components/ui/v2/badge";
import { Button } from "@/components/ui/v2/button";
import {
  snoozeAction,
  unsnoozeAction,
  addNoteAction,
  markAttestedAction,
  requestEvidenceAction,
} from "./server-actions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ regulation: string; rowId: string }>;
}

const STATUS_LABELS: Record<ComplianceStatus, string> = {
  PENDING: "Pending",
  DRAFT: "Draft",
  EVIDENCE_REQUIRED: "Evidence req.",
  UNDER_REVIEW: "Under review",
  ATTESTED: "Attested",
  EXPIRED: "Expired",
  NOT_APPLICABLE: "N/A",
};

function statusVariant(status: ComplianceStatus) {
  switch (status) {
    case "PENDING":
      return "pending";
    case "DRAFT":
      return "draft";
    case "EVIDENCE_REQUIRED":
      return "evidenceRequired";
    case "UNDER_REVIEW":
      return "underReview";
    case "ATTESTED":
      return "attested";
    case "EXPIRED":
      return "expired";
    case "NOT_APPLICABLE":
      return "outline";
    default:
      return "default";
  }
}

/**
 * Per-Item detail page — full-page drilldown of a ComplianceItem.
 *
 * Two-column layout:
 *   - Left (sidebar): metadata + action panel with inline forms
 *     (snooze, mark-attested, request-evidence — no window.prompt)
 *   - Right (main): notes timeline (newest first) + add-note composer
 *
 * Accessed from /dashboard/today, /dashboard/triage (later), and
 * /dashboard/proposals (the proposed-item link). Cards on Today
 * link here for full context.
 */
export default async function ItemDetailPage({ params }: PageProps) {
  const { regulation: regParam, rowId } = await params;

  // Validate regulation segment.
  const upperReg = regParam.toUpperCase();
  if (!REGULATIONS.includes(upperReg as RegulationKey)) {
    notFound();
  }
  const regulation = upperReg as RegulationKey;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?next=/dashboard/items/${regParam}/${rowId}`);
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  const item = await getComplianceItemById(regulation, rowId, session.user.id);
  if (!item) notFound();

  const extras = await getItemDetailExtras(item.id, session.user.id);
  const isSnoozed = extras.snoozedUntil !== null;

  // Sprint 10C — fetch the per-item lifecycle timeline (joined with
  // OpenTimestamps anchors via Sprint 10A's anchor-hash logic). The
  // pull is parallel to extras above; small enough to be unconditional.
  const provenance = await getProvenanceTimeline(rowId, session.user.id);

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-6">
      <div className="mb-4">
        <Link
          href="/dashboard/today"
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-slate-500 transition hover:text-emerald-400"
        >
          <ArrowLeft className="h-3 w-3" />
          BACK TO TODAY
        </Link>
      </div>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(item.status)}>
              {STATUS_LABELS[item.status]}
            </Badge>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              {item.regulation} · {item.requirementId}
            </span>
            {isSnoozed ? (
              <Badge variant="outline">
                <Clock className="mr-1 h-3 w-3" />
                Snoozed until {extras.snoozedUntil!.toLocaleDateString()}
              </Badge>
            ) : null}
          </div>
          <h1 className="font-mono text-xl font-semibold tracking-tight text-slate-100">
            {item.requirementId}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {REGULATION_LABELS[item.regulation]}
          </p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
        {/* Sidebar — metadata + actions */}
        <aside className="space-y-6">
          <Section title="Metadata">
            <Meta label="Status" value={STATUS_LABELS[item.status]} />
            <Meta
              label="Regulation"
              value={REGULATION_LABELS[item.regulation]}
            />
            <Meta label="Requirement" value={item.requirementId} mono />
            <Meta label="Priority" value={item.priority} />
            {item.targetDate ? (
              <Meta
                label="Target date"
                value={item.targetDate.toLocaleDateString()}
              />
            ) : null}
            <Meta
              label="Last updated"
              value={item.updatedAt.toLocaleString()}
            />
          </Section>

          <Section title="Actions">
            {item.status !== "ATTESTED" ? (
              <ActionForm
                action={markAttestedAction}
                itemId={item.id}
                regulation={regParam}
                rowId={rowId}
                title="Mark as attested"
                description="Requires reviewer approval. Writes a proposal queued at /dashboard/proposals."
                fields={[
                  {
                    name: "evidenceSummary",
                    label: "Evidence summary",
                    placeholder:
                      "What evidence supports this attestation? (≥10 chars)",
                    required: true,
                    minLength: 10,
                    rows: 3,
                  },
                ]}
                submitLabel="Submit for approval"
                submitIcon={ShieldCheck}
                submitVariant="emerald"
                badge="needs approval"
              />
            ) : null}

            <ActionForm
              action={requestEvidenceAction}
              itemId={item.id}
              regulation={regParam}
              rowId={rowId}
              title="Request evidence"
              description="Flags the item for re-attestation. Approval-gated."
              fields={[
                {
                  name: "reason",
                  label: "Reason",
                  placeholder:
                    "Why does this item need new evidence? (≥10 chars)",
                  required: true,
                  minLength: 10,
                  rows: 2,
                },
                {
                  name: "expectedEvidence",
                  label: "Expected evidence (optional)",
                  placeholder:
                    "What document or test result would resolve this?",
                  required: false,
                  rows: 2,
                },
              ]}
              submitLabel="Submit for approval"
              submitIcon={FileQuestion}
              submitVariant="outline"
              badge="needs approval"
            />

            {!isSnoozed ? (
              <ActionForm
                action={snoozeAction}
                itemId={item.id}
                regulation={regParam}
                rowId={rowId}
                title="Snooze"
                description="Defer this item from the Today inbox."
                fields={[
                  {
                    name: "days",
                    label: "Days",
                    placeholder: "7",
                    type: "number",
                    required: true,
                    min: 1,
                    max: 90,
                    defaultValue: "7",
                  },
                  {
                    name: "reason",
                    label: "Reason (optional)",
                    placeholder: "Waiting on counsel, blocked on supplier…",
                    required: false,
                    rows: 2,
                  },
                ]}
                submitLabel="Snooze"
                submitIcon={Clock}
                submitVariant="outline"
              />
            ) : (
              <SimpleAction
                action={unsnoozeAction}
                itemId={item.id}
                title="Wake item"
                description={
                  extras.snoozeReason
                    ? `Currently snoozed: ${extras.snoozeReason}`
                    : "Bring this item back into the active inbox."
                }
                submitLabel="Wake now"
                submitIcon={BellRing}
              />
            )}
          </Section>
        </aside>

        {/* Main — notes timeline */}
        <main>
          <Section title={`Notes (${extras.notes.length})`}>
            {/* Add-note composer */}
            <form
              action={addNoteAction}
              className="palantir-surface mb-6 rounded-md p-3"
            >
              <input type="hidden" name="itemId" value={item.id} />
              <input
                type="hidden"
                name="_redirect"
                value={`/dashboard/items/${regParam}/${rowId}`}
              />
              <label
                htmlFor="note-body"
                className="mb-1.5 block font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500"
              >
                ADD NOTE
              </label>
              <textarea
                id="note-body"
                name="body"
                rows={3}
                required
                minLength={1}
                maxLength={8000}
                placeholder="Type a note. Markdown supported. Linked to this ComplianceItem forever."
                className="w-full resize-y rounded bg-black/30 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-600 ring-1 ring-inset ring-white/[0.06] focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
              />
              <div className="mt-2 flex justify-end">
                <Button type="submit" variant="emerald" size="sm">
                  <MessageSquarePlus />
                  Add note
                </Button>
              </div>
            </form>

            {/* Timeline */}
            {extras.notes.length === 0 ? (
              <p className="palantir-surface rounded-md p-6 text-center font-mono text-[10px] uppercase tracking-wider text-slate-500">
                {"// no notes yet"}
              </p>
            ) : (
              <ol className="space-y-2">
                {extras.notes.map((note) => (
                  <li key={note.id} className="palantir-surface rounded-md p-4">
                    <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      <UserIcon className="h-3 w-3" />
                      <span className="font-medium text-slate-300">
                        {note.authorName ?? note.authorEmail ?? "Unknown user"}
                      </span>
                      <span>·</span>
                      <span
                        title={note.createdAt.toISOString()}
                        className="tabular-nums"
                      >
                        {note.createdAt.toLocaleString()}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-200">
                      {note.body}
                    </p>
                  </li>
                ))}
              </ol>
            )}

            {/* Legacy V1 notes if present */}
            {item.notes || item.evidenceNotes ? (
              <div className="palantir-surface mt-6 rounded-md p-3">
                <div className="mb-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  LEGACY V1 NOTES
                </div>
                {item.notes ? (
                  <p className="mb-2 whitespace-pre-wrap text-xs text-slate-400">
                    <strong className="text-slate-300">Notes:</strong>{" "}
                    {item.notes}
                  </p>
                ) : null}
                {item.evidenceNotes ? (
                  <p className="whitespace-pre-wrap text-xs text-slate-400">
                    <strong className="text-slate-300">Evidence notes:</strong>{" "}
                    {item.evidenceNotes}
                  </p>
                ) : null}
              </div>
            ) : null}
          </Section>

          {/* Sprint 10C — per-item provenance timeline + Bitcoin anchors */}
          <div className="mt-6">
            <ProvenanceTimeline data={provenance} />
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500">
        {title}
      </h2>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Meta({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="palantir-surface flex items-center justify-between gap-3 rounded-md px-3 py-2 text-xs">
      <span className="font-mono uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span
        className={mono ? "font-mono text-xs text-slate-200" : "text-slate-200"}
      >
        {value}
      </span>
    </div>
  );
}

interface FieldDef {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  rows?: number;
  minLength?: number;
  min?: number;
  max?: number;
  defaultValue?: string;
}

function ActionForm({
  action,
  itemId,
  regulation,
  rowId,
  title,
  description,
  fields,
  submitLabel,
  submitIcon: Icon,
  submitVariant = "default",
  badge,
}: {
  action: (formData: FormData) => Promise<void>;
  itemId: string;
  regulation: string;
  rowId: string;
  title: string;
  description: string;
  fields: FieldDef[];
  submitLabel: string;
  submitIcon: React.ComponentType<{ className?: string }>;
  submitVariant?: "default" | "emerald" | "outline";
  badge?: string;
}) {
  return (
    <form action={action} className="palantir-surface rounded-md p-3">
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="_itemId" value={itemId} />
      <input
        type="hidden"
        name="_redirect"
        value={`/dashboard/items/${regulation}/${rowId}`}
      />

      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-slate-100">{title}</h3>
        {badge ? (
          <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-amber-300 ring-1 ring-inset ring-amber-500/30">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
        {description}
      </p>

      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.name}>
            <label
              htmlFor={`${title}-${field.name}`}
              className="mb-1 block font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500"
            >
              {field.label}
            </label>
            {field.rows ? (
              <textarea
                id={`${title}-${field.name}`}
                name={field.name}
                rows={field.rows}
                required={field.required}
                minLength={field.minLength}
                placeholder={field.placeholder}
                defaultValue={field.defaultValue}
                className="w-full resize-y rounded bg-black/30 px-2.5 py-1.5 text-[12px] text-slate-100 placeholder:text-slate-600 ring-1 ring-inset ring-white/[0.06] focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
              />
            ) : (
              <input
                id={`${title}-${field.name}`}
                name={field.name}
                type={field.type ?? "text"}
                required={field.required}
                minLength={field.minLength}
                min={field.min}
                max={field.max}
                placeholder={field.placeholder}
                defaultValue={field.defaultValue}
                className="w-full rounded bg-black/30 px-2.5 py-1.5 text-[12px] text-slate-100 placeholder:text-slate-600 ring-1 ring-inset ring-white/[0.06] focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-end">
        <Button type="submit" variant={submitVariant} size="sm">
          <Icon />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function SimpleAction({
  action,
  itemId,
  title,
  description,
  submitLabel,
  submitIcon: Icon,
}: {
  action: (formData: FormData) => Promise<void>;
  itemId: string;
  title: string;
  description: string;
  submitLabel: string;
  submitIcon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <form action={action} className="palantir-surface rounded-md p-3">
      <input type="hidden" name="itemId" value={itemId} />
      <h3 className="mb-1 text-[13px] font-semibold text-slate-100">{title}</h3>
      <p className="mb-3 text-[11px] text-slate-500">{description}</p>
      <Button type="submit" variant="outline" size="sm">
        <Icon />
        {submitLabel}
      </Button>
    </form>
  );
}
