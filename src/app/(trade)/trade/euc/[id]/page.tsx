import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  FileSignature,
  ChevronLeft,
  Download,
  ShieldCheck,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { getEucRequest } from "@/lib/trade/euc-service";
import { TradeEUCFormType, TradeEUCStatus } from "@prisma/client";

export const metadata = {
  title: "EUC detail — Passage",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * /trade/euc/[id] — single EUC detail view.
 *
 * Sprint Z6 (Tier 5). Adds the "Download Annex IIIa Certificate" CTA
 * that hits the org-scoped /api/trade/euc/[id]/pdf endpoint and
 * streams the EU 2021/821 Annex IIIa PDF as an attachment.
 *
 * Server component — all data fetched on the server, org-scoped via
 * the existing euc-service helper.
 */
export default async function TradeEucDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftrade%2Feuc");
  }

  const { id } = await params;
  const { orgId } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  const euc = await getEucRequest(orgId, id);
  if (!euc) {
    notFound();
  }

  return (
    <div className="space-y-6 px-8 py-10">
      <Link
        href="/trade/euc"
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-trade-text-secondary hover:text-trade-accent-strong"
      >
        <ChevronLeft size={14} />
        Back to certificates
      </Link>

      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
            Passage — Documents
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
              <FileSignature size={16} />
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-trade-text-primary">
              {FORM_TYPE_LABELS[euc.formType]}
            </h1>
          </div>
          <p className="mt-1 text-[13px] text-trade-text-secondary">
            End-Use Certificate for{" "}
            <strong className="text-trade-text-primary">
              {euc.party.canonicalName}
            </strong>{" "}
            <span className="text-trade-text-muted">
              ({euc.party.countryCode})
            </span>
            {euc.operation ? (
              <>
                {" "}
                · operation{" "}
                <span className="font-mono text-[12px]">
                  {euc.operation.reference}
                </span>
              </>
            ) : (
              <> · blanket certificate</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/trade/euc/${euc.id}/pdf`}
            download
            className="inline-flex items-center gap-1.5 rounded-md bg-trade-accent px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm transition-colors hover:bg-trade-accent-strong"
          >
            <Download size={13} />
            Download Annex IIIa Certificate
          </a>
        </div>
      </header>

      <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
        <header className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-trade-text-muted">
          <ShieldCheck size={13} className="text-trade-accent-strong" />
          Lifecycle
        </header>
        <dl className="grid grid-cols-1 gap-3 text-[12.5px] sm:grid-cols-2 lg:grid-cols-4">
          <DefRow label="Status" value={STATUS_LABELS[euc.status]} />
          <DefRow label="Requested" value={formatDateTime(euc.requestedAt)} />
          <DefRow label="Sent" value={formatDateTime(euc.sentAt)} />
          <DefRow label="Received" value={formatDateTime(euc.receivedAt)} />
          <DefRow label="Validated" value={formatDateTime(euc.validatedAt)} />
          <DefRow
            label="Valid until"
            value={
              euc.validUntil
                ? new Date(euc.validUntil).toISOString().slice(0, 10)
                : "Open-ended"
            }
          />
          <DefRow label="Form type" value={FORM_TYPE_LABELS[euc.formType]} />
          <DefRow
            label="Operation"
            value={euc.operation?.reference ?? "Blanket"}
          />
        </dl>
      </section>

      <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
        <header className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-trade-text-muted">
          Annex IIIa template
        </header>
        <p className="text-[12.5px] text-trade-text-secondary">
          The downloadable PDF is generated from EU Regulation 2021/821 Annex
          IIIa. It includes the importer / end-user identification, a full
          description of the dual-use items (with EU Annex I and parallel US
          ECCN/USML classifications when known), the end-use statement, the
          no-diversion undertaking under Article 4(1)(b), the re-export
          prohibition under Article 11, and a signature block for the foreign
          counterparty. The PDF is marked DRAFT — the counterparty completes the
          open fields, signs, and returns the executed copy for upload via the
          lifecycle menu.
        </p>
        {euc.notes && (
          <div className="mt-4 rounded-md border border-trade-border bg-trade-bg-page px-3 py-2 text-[12.5px] text-trade-text-secondary">
            <strong className="block text-[11px] font-semibold uppercase tracking-wider text-trade-text-muted">
              Operator notes
            </strong>
            <p className="mt-1 whitespace-pre-wrap">{euc.notes}</p>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function DefRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-trade-text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-trade-text-primary">{value}</dd>
    </div>
  );
}

function formatDateTime(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toISOString().slice(0, 16).replace("T", " ");
}

const FORM_TYPE_LABELS: Record<TradeEUCFormType, string> = {
  BAFA_C1: "BAFA C1 (civilian)",
  BAFA_C6: "BAFA C6 (re-export)",
  BAFA_C7: "BAFA C7 (Hong Kong)",
  BIS_711: "BIS Form 711",
  DDTC_DS83: "DDTC DS-83",
  OTHER: "Other end-use certificate",
};

const STATUS_LABELS: Record<TradeEUCStatus, string> = {
  REQUESTED: "Requested",
  SENT_TO_PARTY: "Sent to counterparty",
  RECEIVED: "Received",
  VALIDATED: "Validated",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

async function resolveSessionContext(
  userId: string,
  email: string | null | undefined,
): Promise<{ orgId: string }> {
  if (isSuperAdmin(email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return { orgId: anyOrg?.id ?? "super-admin-no-org" };
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organization: { select: { id: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return {
    orgId: membership?.organization.id ?? "no-org",
  };
}
