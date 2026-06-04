import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  Rocket,
  ChevronLeft,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import {
  getLosAuthorisation,
  calculateCasualtyRiskCompliance,
  CASUALTY_RISK_THRESHOLD_R331_21,
} from "@/lib/trade/france-los/france-los-service";
import {
  type TradeFranceLosAuthorisationStatus,
  type TradeFranceLosAuthorisationType,
  type TradeFranceLosSpacecraftClassification,
} from "@prisma/client";

export const metadata = {
  title: "France LOS detail — Passage",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

const TYPE_LABELS: Record<TradeFranceLosAuthorisationType, string> = {
  LAUNCH: "Launch authorisation",
  OPERATION_IN_ORBIT: "In-orbit operation",
  CONTROLLED_RETURN: "Controlled return",
  RE_ENTRY_FROM_THIRD_PARTY: "Third-party re-entry",
};

const CLASSIFICATION_LABELS: Record<
  TradeFranceLosSpacecraftClassification,
  string
> = {
  NON_OPERATIONAL: "Non-operational",
  OPERATIONAL_GOV_DEFENSE: "Gov / Defence",
  OPERATIONAL_COMMERCIAL: "Commercial",
  OPERATIONAL_SCIENTIFIC: "Scientific",
};

const STATUS_LABELS: Record<TradeFranceLosAuthorisationStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted to CNES",
  UNDER_REVIEW: "Under CNES review",
  AUTHORISED: "Authorised",
  REFUSED: "Refused",
  REVOKED: "Revoked",
  COMPLETED: "Completed (post de-orbit)",
};

const STATUS_TONE: Record<TradeFranceLosAuthorisationStatus, string> = {
  DRAFT: "trade-chip-neutral",
  SUBMITTED: "trade-chip-info",
  UNDER_REVIEW: "trade-chip-warn",
  AUTHORISED: "trade-chip-success",
  REFUSED: "trade-chip-danger",
  REVOKED: "trade-chip-danger",
  COMPLETED: "trade-chip-neutral",
};

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

/**
 * /trade/france-los/[id] — France LOS detail (Z34-FR, Tier 4).
 *
 * Server component renders every field from the schema, plus the
 * casualty-risk compliance verdict computed from the JSON re-entry
 * blob. Lifecycle-action buttons are wired to server actions in a
 * follow-up sprint; this MVP focuses on read-only audit-grade
 * display.
 */
export default async function TradeFranceLosDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftrade%2Ffrance-los");
  }

  const { id } = await params;
  const { orgId } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  const los = await getLosAuthorisation(orgId, id);
  if (!los) {
    notFound();
  }

  const casualtyRisk = calculateCasualtyRiskCompliance(
    los.reEntryRiskAssessment,
  );

  return (
    <div className="space-y-6 px-8 py-10">
      <Link
        href="/trade/france-los"
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-trade-text-secondary hover:text-trade-accent-strong"
      >
        <ChevronLeft size={14} />
        Back to LOS authorisations
      </Link>

      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
            Passage — France LOS
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
              <Rocket size={16} />
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-trade-text-primary">
              {los.missionName}
            </h1>
          </div>
          <p className="mt-1 text-[13px] text-trade-text-secondary">
            {TYPE_LABELS[los.authorisationType]} —{" "}
            {CLASSIFICATION_LABELS[los.spacecraftClassification]} —{" "}
            <strong className="text-trade-text-primary">
              {los.operatorName}
            </strong>
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-md px-3 py-1 text-[12px] font-semibold ${STATUS_TONE[los.status]}`}
        >
          {STATUS_LABELS[los.status]}
        </span>
      </header>

      {/* Casualty-risk compliance verdict */}
      <CasualtyRiskCard
        compliant={casualtyRisk.compliant}
        casualtyRisk={casualtyRisk.casualtyRisk}
        threshold={casualtyRisk.threshold}
        rationale={casualtyRisk.rationale}
      />

      {/* Core file metadata */}
      <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
        <h2 className="text-[15px] font-semibold text-trade-text-primary">
          File metadata
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-[12.5px] md:grid-cols-2">
          <Field label="CNES reference" value={los.cnesReference ?? "—"} mono />
          <Field
            label="Mission description"
            value={los.missionDescription ?? "—"}
            multiline
          />
          <Field
            label="Operator address"
            value={los.operatorAddress ?? "—"}
            multiline
          />
          <Field
            label="Launch vehicle (operation)"
            value={los.launchVehicle?.reference ?? "—"}
          />
          <Field label="Apogee (km)" value={fmtNumber(los.apogeeKm)} />
          <Field label="Perigee (km)" value={fmtNumber(los.perigeeKm)} />
          <Field
            label="Inclination (°)"
            value={fmtNumber(los.inclinationDeg)}
          />
          <Field
            label="Debris mitigation plan"
            value={los.debrisMitigationPlanRef ?? "—"}
            mono
          />
        </dl>
      </section>

      {/* Validity + lifecycle timestamps */}
      <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
        <h2 className="text-[15px] font-semibold text-trade-text-primary">
          Lifecycle timestamps
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-[12.5px] md:grid-cols-2">
          <Field label="Created" value={formatDate(los.createdAt)} />
          <Field label="Submitted" value={formatDate(los.submittedAt)} />
          <Field label="Review started" value={formatDate(los.reviewStartAt)} />
          <Field label="Decision" value={formatDate(los.decisionAt)} />
          <Field label="Valid from" value={formatDate(los.validFrom)} />
          <Field label="Valid until" value={formatDate(los.validUntil)} />
          <Field label="Completed" value={formatDate(los.completedAt)} />
          <Field
            label="Last actor"
            value={
              los.lastActionBy
                ? `${los.lastActionBy.name ?? los.lastActionBy.email ?? los.lastActionBy.id}`
                : "—"
            }
          />
        </dl>
      </section>

      {los.notes && (
        <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-trade-text-primary">
            <FileText size={14} />
            Operator notes
          </h2>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-[12.5px] text-trade-text-secondary">
            {los.notes}
          </pre>
        </section>
      )}
    </div>
  );
}

function fmtNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (!Number.isFinite(value)) return "—";
  return value.toString();
}

interface FieldProps {
  label: string;
  value: string;
  mono?: boolean;
  multiline?: boolean;
}

function Field({ label, value, mono, multiline }: FieldProps) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-trade-text-muted">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-trade-text-primary ${
          mono ? "font-mono text-[12px]" : ""
        } ${multiline ? "whitespace-pre-wrap" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

interface CasualtyRiskCardProps {
  compliant: boolean;
  casualtyRisk: number | null;
  threshold: number;
  rationale: string;
}

function CasualtyRiskCard({
  compliant,
  casualtyRisk,
  threshold,
  rationale,
}: CasualtyRiskCardProps) {
  const Icon = compliant
    ? CheckCircle2
    : casualtyRisk === null
      ? AlertTriangle
      : XCircle;
  const tone = compliant
    ? "trade-chip-success"
    : casualtyRisk === null
      ? "trade-chip-warn"
      : "trade-chip-danger";
  const iconTone = "text-current";

  return (
    <section
      className={`rounded-xl border px-6 py-5 ${tone}`}
      aria-label="Casualty-risk compliance verdict"
    >
      <header className="flex items-start gap-3">
        <Icon className={iconTone} size={20} aria-hidden="true" />
        <div className="flex-1">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-trade-text-primary">
            <ShieldCheck size={14} />
            Casualty-risk — LOS Art. R. 331-21
          </h2>
          <p className="mt-1.5 text-[12.5px] text-trade-text-secondary">
            {rationale}
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[12px] md:grid-cols-3">
            <div>
              <dt className="text-[10.5px] font-medium uppercase tracking-wider text-trade-text-muted">
                Submitted figure
              </dt>
              <dd className="mt-0.5 font-mono text-trade-text-primary">
                {casualtyRisk === null
                  ? "—"
                  : casualtyRisk === 0
                    ? "0"
                    : casualtyRisk.toExponential(2)}
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-medium uppercase tracking-wider text-trade-text-muted">
                R. 331-21 threshold
              </dt>
              <dd className="mt-0.5 font-mono text-trade-text-primary">
                {threshold.toExponential(2)} (1 in 10⁴)
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] font-medium uppercase tracking-wider text-trade-text-muted">
                Static reference
              </dt>
              <dd className="mt-0.5 font-mono text-trade-text-primary">
                {CASUALTY_RISK_THRESHOLD_R331_21.toExponential(2)}
              </dd>
            </div>
          </dl>
        </div>
      </header>
    </section>
  );
}

const EDITOR_ROLES: ReadonlyArray<string> = ["OWNER", "ADMIN", "MANAGER"];

async function resolveSessionContext(
  userId: string,
  email: string | null | undefined,
): Promise<{ orgId: string; canEdit: boolean }> {
  if (isSuperAdmin(email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return { orgId: anyOrg?.id ?? "super-admin-no-org", canEdit: true };
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organization: { select: { id: true } }, role: true },
    orderBy: { joinedAt: "asc" },
  });
  return {
    orgId: membership?.organization.id ?? "no-org",
    canEdit: membership ? EDITOR_ROLES.includes(membership.role) : false,
  };
}
