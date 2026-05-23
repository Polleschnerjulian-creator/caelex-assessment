import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { getUkEcjuLicense } from "@/lib/trade/uk-ecju/uk-ecju-service";
import { lookupEuCrossReference } from "@/lib/trade/uk-ecju/uk-strategic-list-mapping";
import { UkEcjuStatusActions } from "../_components/UkEcjuStatusActions";
import {
  LICENSE_TYPE_LABELS,
  STATUS_LABELS,
} from "../_components/UkEcjuListPanel";

export const metadata = {
  title: "UK ECJU Licence — Caelex Trade",
};

interface DetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * /trade/uk-ecju/[id] — UK ECJU licence detail (Z37-UK, Tier 4).
 *
 * Server component — fetches the row, renders summary panels +
 * lifecycle controls. Lifecycle transitions delegate to server
 * actions via UkEcjuStatusActions.
 */
export default async function UkEcjuDetailPage({ params }: DetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/trade-login?callbackUrl=%2Ftrade%2Fuk-ecju");
  }

  const { orgId, canEdit } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  const { id } = await params;
  const license = await getUkEcjuLicense(orgId, id);
  if (!license) notFound();

  const pence = license.drawnDownValueGbp;
  const cap = license.capValueGbp;
  const remainingPence = cap !== null ? cap - pence : null;

  return (
    <div className="space-y-5 px-8 py-10">
      <Link
        href="/trade/uk-ecju"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-trade-text-muted hover:text-trade-text-primary"
      >
        <ArrowLeft size={12} />
        Back to list
      </Link>

      <header className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
            UK ECJU · {LICENSE_TYPE_LABELS[license.licenseType]}
          </p>
          <h1 className="mt-2 text-[26px] font-bold tracking-tight text-trade-text-primary">
            {license.ecjuReference ?? `(draft) ${license.id.slice(-8)}`}
          </h1>
          <p className="mt-1 text-[13px] text-trade-text-secondary">
            Applicant: <strong>{license.applicantName}</strong>
          </p>
        </div>
        <span className="rounded-full bg-trade-bg-page px-3 py-1 text-[12px] font-semibold text-trade-text-primary">
          Status: {STATUS_LABELS[license.status]}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Licence scope">
          <Row label="Type">{LICENSE_TYPE_LABELS[license.licenseType]}</Row>
          <Row label="Control list">
            {license.controlListEntries.length === 0
              ? "—"
              : license.controlListEntries.join(", ")}
          </Row>
          {license.controlListEntries.length > 0 && (
            <Row label="EU/Wassenaar cross-ref">
              {license.controlListEntries
                .map((e) => lookupEuCrossReference(e) ?? `(no EU map: ${e})`)
                .join(", ")}
            </Row>
          )}
          <Row label="Destinations">
            {license.destinationCountries.length === 0
              ? "—"
              : license.destinationCountries.join(", ")}
          </Row>
        </Panel>

        <Panel title="End-user">
          <Row label="Name">{license.endUserName ?? "—"}</Row>
          <Row label="Address">{license.endUserAddress ?? "—"}</Row>
          <Row label="End-use">{license.endUseDescription ?? "—"}</Row>
        </Panel>

        <Panel title="Validity">
          <Row label="From">
            {license.validFrom?.toISOString().slice(0, 10) ?? "—"}
          </Row>
          <Row label="Until">
            {license.validUntil?.toISOString().slice(0, 10) ?? "—"}
          </Row>
          <Row label="ECJU reference">{license.ecjuReference ?? "—"}</Row>
        </Panel>

        <Panel title="Draw-down">
          <Row label="Drawn (pence)">{pence.toString()}</Row>
          <Row label="Cap (pence)">{cap !== null ? cap.toString() : "—"}</Row>
          <Row label="Remaining (pence)">
            {remainingPence !== null ? remainingPence.toString() : "—"}
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
        <UkEcjuStatusActions
          licenseId={license.id}
          currentStatus={license.status}
          ecjuReferenceSet={!!license.ecjuReference}
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
