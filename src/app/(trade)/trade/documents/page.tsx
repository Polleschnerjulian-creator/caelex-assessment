import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FileCheck,
  RefreshCw,
  AlertOctagon,
  Layers,
  FileText,
  ShieldCheck,
  Rocket,
  UserCheck,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { listUnifiedDocuments } from "@/lib/trade/unified-documents.server";
import { UnifiedDocumentsTable } from "./_components/UnifiedDocumentsTable";

export const metadata = { title: "Dokumente — Caelex Trade" };

const DOC_TYPES = [
  {
    icon: FileCheck,
    label: "End-Use Certificates",
    body: "EUC anfordern & gegenzeichnen lassen.",
    href: "/trade/euc",
  },
  {
    icon: RefreshCw,
    label: "Re-Export Consents",
    body: "Zustimmungen für Re-Exporte.",
    href: "/trade/reexport-consents",
  },
  {
    icon: AlertOctagon,
    label: "Voluntary Self-Disclosures",
    body: "Selbstanzeigen bei BAFA/BIS.",
    href: "/trade/vsd",
  },
  {
    icon: Layers,
    label: "Sammelgenehmigungen",
    body: "BAFA-Sammelausfuhrgenehmigungen & Kapazität.",
    href: "/trade/sammelgenehmigungen",
  },
  {
    icon: FileText,
    label: "France LOS",
    body: "Licence d'exportation (Frankreich).",
    href: "/trade/france-los",
  },
  {
    icon: ShieldCheck,
    label: "UK ECJU",
    body: "UK Strategic Export Licences (OIEL/SIEL).",
    href: "/trade/uk-ecju",
  },
  {
    icon: Rocket,
    label: "FAA AST",
    body: "US Launch/Re-entry licensing (Part 450).",
    href: "/trade/faa-ast",
  },
  {
    icon: UserCheck,
    label: "Deemed Exports",
    body: "Technologie-Zugang ausländischer Mitarbeiter.",
    href: "/trade/deemed-exports",
  },
];

/**
 * /trade/documents — Trade document hub (UI Phase 3D).
 *
 * Top: the existing type-launcher grid (unchanged) so operators can jump
 * straight into a specific document workflow.
 *
 * Below: a UNIFIED, smart-filterable table that merges every document type
 * across all 8 modules into one recency-sorted list, aggregated read-only
 * via `listUnifiedDocuments(orgId)`. Search + type pills + expiry filters
 * live in the client table; the rows are fetched once on the server.
 *
 * Read-only — the dedicated per-type pages own creation + lifecycle.
 */
export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftrade%2Fdocuments");
  }

  const orgId = await resolveOrgId(session.user.id, session.user.email);
  const { rows, summary } = await listUnifiedDocuments(orgId);

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-8">
      <h1 className="text-xl font-semibold text-trade-text-primary">
        Dokumente
      </h1>
      <p className="mt-1 text-sm text-trade-text-muted">
        Alle Genehmigungen &amp; Nachweise an einem Ort. Was du nicht brauchst,
        blendest du später aus.
      </p>

      {/* Type launcher grid (unchanged) */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {DOC_TYPES.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="rounded-xl border border-trade-border bg-trade-bg-panel p-4 transition hover:bg-trade-hover"
          >
            <d.icon className="h-5 w-5 text-trade-accent" />
            <div className="mt-2 text-sm font-medium text-trade-text-primary">
              {d.label}
            </div>
            <div className="mt-0.5 text-xs text-trade-text-muted">{d.body}</div>
          </Link>
        ))}
      </div>

      {/* Unified smart-filter table */}
      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            Alle Dokumente
          </h2>
          <p className="text-[12px] text-trade-text-muted">
            {summary.total} {summary.total === 1 ? "Dokument" : "Dokumente"}
            {summary.expiringSoon > 0 && (
              <span className="text-amber-600">
                {" · "}
                {summary.expiringSoon} bald fällig
              </span>
            )}
            {summary.expired > 0 && (
              <span className="text-red-600">
                {" · "}
                {summary.expired} abgelaufen
              </span>
            )}
          </p>
        </div>
        <UnifiedDocumentsTable rows={rows} summary={summary} />
      </section>
    </div>
  );
}

// ─── Org resolution (mirrors the per-type Trade pages) ───────────────

async function resolveOrgId(
  userId: string,
  email: string | null | undefined,
): Promise<string> {
  if (isSuperAdmin(email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return anyOrg?.id ?? "super-admin-no-org";
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organization: { select: { id: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return membership?.organization.id ?? "no-org";
}
