import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import {
  getFaaAstLicense,
  calculateEcCompliance,
  EC_THRESHOLD_PER_MISSION,
} from "@/lib/trade/faa-ast/faa-ast-service";
import { FaaAstStatusActions } from "../_components/FaaAstStatusActions";
import {
  LICENSE_TYPE_LABELS,
  VEHICLE_TYPE_LABELS,
  FIN_RESP_LABELS,
  STATUS_LABELS,
} from "../_components/FaaAstListPanel";

export const metadata = {
  title: "FAA AST Licence — Caelex Trade",
};

interface DetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * /trade/faa-ast/[id] — FAA AST licence detail (Z38-US, Tier 4).
 *
 * Server component — fetches the row, renders summary panels +
 * lifecycle controls + § 450.101 Ec compliance status. Lifecycle
 * transitions delegate to server actions via FaaAstStatusActions.
 */
export default async function FaaAstDetailPage({ params }: DetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/trade-login?callbackUrl=%2Ftrade%2Ffaa-ast");
  }

  const { orgId, canEdit } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  const { id } = await params;
  const license = await getFaaAstLicense(orgId, id);
  if (!license) notFound();

  const ec = license.maximumProbabilityOfCasualtyEc;
  const ecCheck = ec !== null ? calculateEcCompliance({ ec }) : null;

  const cap = license.thirdPartyLiabilityCapUsdCents;
  const capUsdLabel =
    cap !== null
      ? `$${(Number(cap) / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : "—";

  return (
    <div className="space-y-5 px-8 py-10">
      <Link
        href="/trade/faa-ast"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-trade-text-muted hover:text-trade-text-primary"
      >
        <ArrowLeft size={12} />
        Back to list
      </Link>

      <header className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
            FAA AST · {LICENSE_TYPE_LABELS[license.licenseType]}
          </p>
          <h1 className="mt-2 text-[26px] font-bold tracking-tight text-trade-text-primary">
            {license.faaReference ?? `(draft) ${license.id.slice(-8)}`}
          </h1>
          <p className="mt-1 text-[13px] text-trade-text-secondary">
            Operator: <strong>{license.operatorName}</strong> · Vehicle:{" "}
            <strong>{license.vehicleName}</strong>
          </p>
        </div>
        <span className="rounded-full bg-trade-bg-page px-3 py-1 text-[12px] font-semibold text-trade-text-primary">
          Status: {STATUS_LABELS[license.status]}
        </span>
      </header>

      {ecCheck && (
        <section
          className={`rounded-xl border p-5 ${
            ecCheck.compliant
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-trade-text-muted">
            § 450.101 Ec compliance
          </h2>
          <p
            className={`text-[14px] font-semibold ${
              ecCheck.compliant ? "text-emerald-800" : "text-red-800"
            }`}
          >
            {ecCheck.compliant
              ? "COMPLIANT"
              : "NON-COMPLIANT — refine flight-safety analysis"}
          </p>
          <p className="mt-1 text-[12.5px] text-trade-text-secondary">
            Ec ={" "}
            <code className="rounded bg-white px-1.5 py-0.5">
              {ecCheck.ec.toExponential(2)}
            </code>{" "}
            · Threshold ={" "}
            <code className="rounded bg-white px-1.5 py-0.5">
              {EC_THRESHOLD_PER_MISSION.toExponential(2)}
            </code>{" "}
            · Margin ratio ={" "}
            <code className="rounded bg-white px-1.5 py-0.5">
              {ecCheck.marginRatio.toFixed(3)}
            </code>
          </p>
          <p className="mt-1 text-[12px] text-trade-text-muted">
            {ecCheck.reason}
          </p>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Licence scope">
          <Row label="Type">{LICENSE_TYPE_LABELS[license.licenseType]}</Row>
          <Row label="Vehicle type">
            {VEHICLE_TYPE_LABELS[license.vehicleType]}
          </Row>
          <Row label="Vehicle">{license.vehicleName}</Row>
          <Row label="Launch site">{license.launchSite}</Row>
        </Panel>

        <Panel title="Operator">
          <Row label="Name">{license.operatorName}</Row>
          <Row label="Address">{license.operatorAddress}</Row>
        </Panel>

        <Panel title="Safety (§ 450.101)">
          <Row label="Max Pc (Ec)">
            {ec !== null ? (
              <code className="rounded bg-trade-bg-page px-1.5 py-0.5 text-[12px]">
                {ec.toExponential(2)}
              </code>
            ) : (
              "(not yet computed)"
            )}
          </Row>
          <Row label="Threshold">
            <code className="rounded bg-trade-bg-page px-1.5 py-0.5 text-[12px]">
              {EC_THRESHOLD_PER_MISSION.toExponential(2)}
            </code>
          </Row>
        </Panel>

        <Panel title="Financial responsibility (§ 440)">
          <Row label="Type">
            {license.financialResponsibilityType
              ? FIN_RESP_LABELS[license.financialResponsibilityType]
              : "(not yet determined)"}
          </Row>
          <Row label="Liability cap">{capUsdLabel}</Row>
        </Panel>

        <Panel title="Validity">
          <Row label="From">
            {license.validFrom?.toISOString().slice(0, 10) ?? "—"}
          </Row>
          <Row label="Until">
            {license.validUntil?.toISOString().slice(0, 10) ?? "—"}
          </Row>
          <Row label="FAA reference">{license.faaReference ?? "—"}</Row>
        </Panel>

        <Panel title="Audit">
          <Row label="Created">
            {license.createdAt.toISOString().slice(0, 10)}
          </Row>
          <Row label="Updated">
            {license.updatedAt.toISOString().slice(0, 10)}
          </Row>
          <Row label="Created by">
            {license.createdBy?.name ?? license.createdBy?.email ?? "—"}
          </Row>
        </Panel>
      </div>

      {license.notes && (
        <Panel title="Notes">
          <pre className="whitespace-pre-wrap text-[12.5px] text-trade-text-secondary">
            {license.notes}
          </pre>
        </Panel>
      )}

      {canEdit && (
        <FaaAstStatusActions
          licenseId={license.id}
          currentStatus={license.status}
          faaReferenceSet={!!license.faaReference}
        />
      )}
    </div>
  );
}

interface PanelProps {
  title: string;
  children: React.ReactNode;
}

function Panel({ title, children }: PanelProps) {
  return (
    <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated p-5">
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-trade-text-muted">
        {title}
      </h2>
      <div className="space-y-1.5 text-[12.5px]">{children}</div>
    </section>
  );
}

interface RowProps {
  label: string;
  children: React.ReactNode;
}

function Row({ label, children }: RowProps) {
  return (
    <div className="flex items-start gap-3">
      <span className="min-w-32 text-[11.5px] font-medium uppercase tracking-wide text-trade-text-muted">
        {label}
      </span>
      <span className="flex-1 text-trade-text-secondary">{children}</span>
    </div>
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
