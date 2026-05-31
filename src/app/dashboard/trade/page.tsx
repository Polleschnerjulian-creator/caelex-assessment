import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Globe2,
  FileSearch,
  ScanSearch,
  ListChecks,
  ArrowRight,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import {
  PageContainer,
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  StatusPill,
} from "@/components/dashboard/v2/ui/PageChrome";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Trade Operations — Caelex Comply",
  description:
    "Klassifizieren, screenen, lizenzieren — der operations-layer für Export-Kontrolle.",
};

/**
 * Trade Operations — overview / landing page.
 *
 * @deprecated LEGACY SURFACE. The canonical Trade UI is the standalone
 *   route group `src/app/(trade)/trade/**` (served at `/trade`), which the
 *   active product work — incl. the Ausfuhrvorgang-Assistent — builds on.
 *   This `/dashboard/trade/**` surface (7 pages) is retained ONLY because it
 *   is still reachable (V2Sidebar links here, no redirect yet) and because
 *   `src/components/trade/*` is SHARED between both surfaces (e.g.
 *   ClassificationPanel, BafaPdfButton are imported by `(trade)/trade/**`
 *   too). Removing it is a product/deprecation decision (Sprint F / F1),
 *   NOT a safe mechanical delete: it requires (1) repointing
 *   V2Sidebar.tsx → `/trade`, (2) a `/dashboard/trade/* → /trade` redirect,
 *   (3) deleting only the LEGACY-ONLY panels (Operation*Panel,
 *   UboResolvedChip, BeneficialOwnersPanel) while KEEPING the shared ones,
 *   and (4) e2e verification. Do not delete piecemeal.
 *
 * Two-Layer-Split (Plan § 2):
 *   - Layer 1 (Posture, existiert): /dashboard/modules/export-control
 *     beantwortet "Wie reif ist unser ICP?"
 *   - Layer 2 (Operations, hier): /dashboard/trade beantwortet
 *     "Was darf ich mit DIESER Sendung an DIESE Firma morgen tun?"
 */
export default async function TradeOverviewPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/trade");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  const liveCards = [
    {
      href: "/dashboard/trade/items",
      label: "Item Classification",
      sublabel: "Classify BoM items across 5 jurisdictions",
    },
    {
      href: "/dashboard/trade/counterparties",
      label: "Counterparty Screening",
      sublabel: "OFAC, BIS, DDTC fuzzy-match — Wave A",
    },
    {
      href: "/dashboard/trade/operations",
      label: "Operations Lifecycle",
      sublabel: "Items × Counterparty × Route × License — Wave C",
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Trade operations"
        eyebrowIcon={Globe2}
        title="Trade Operations"
        description="Klassifizieren, screenen, lizenzieren — der Operations-Layer neben deinem Export-Control-Posture."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {liveCards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group block overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.05] to-emerald-500/[0.012] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-emerald-500/40 hover:from-emerald-500/[0.08]"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-slate-100">
                    {c.label}
                  </span>
                  <StatusPill tone="emerald" size="sm">
                    Live
                  </StatusPill>
                </div>
                <p className="mt-0.5 text-[11.5px] text-slate-400">
                  {c.sublabel}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-emerald-300/0 transition group-hover:text-emerald-300" />
            </div>
          </Link>
        ))}
      </div>

      <Card className="max-w-3xl">
        <CardHeader
          icon={Globe2}
          title="Trade-Layer im Aufbau"
          subtitle={
            <>
              Diese Surface bringt Caelex Comply auf die zweite Compliance-
              Ebene: pro Sendung, pro Counterparty, pro BoM-Zeile. Der
              Posture-Layer (ICP-Reife, AV-Bestellung, Schulungen) bleibt unter{" "}
              <Link
                href="/dashboard/modules/export-control"
                className="font-medium text-emerald-300 underline-offset-4 transition hover:text-emerald-200 hover:underline"
              >
                Export Control
              </Link>{" "}
              erreichbar.
            </>
          }
        />
        <CardBody>
          <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Roadmap
          </div>
          <ul className="space-y-2.5">
            <RoadmapRow
              icon={ScanSearch}
              label="Wave B — Item-Klassifikation"
              description="ECCN, USML, MTCR, AL — parallel-Klassifikation mit Astra-Vorschlag und Property-Trigger-Override."
              status="active"
            />
            <RoadmapRow
              icon={FileSearch}
              label="Wave A — Sanctions-Screening"
              description="OFAC SDN live mit Jaro-Winkler-Fuzzy-Match. Daily-Cron mit Snapshot-Hash für Audit. BIS/DDTC/EU/UK/UN folgen via trade.gov consolidated CSV."
              status="active"
            />
            <RoadmapRow
              icon={ListChecks}
              label="Wave C — Operations-Lifecycle"
              description="TradeOperation als atomarer Liefer-Vorgang mit License-Stack. C1 (schema), C2 (list+detail+create) live. C3 (status transitions, lines mgmt, drawdown engine) und C4 (BAFA-ELAN-K2 PDF prefill) folgen."
              status="active"
            />
          </ul>
        </CardBody>
      </Card>

      <p className="mt-8 max-w-3xl text-[11.5px] leading-relaxed text-slate-500">
        Caelex Comply Trade ist ein Compliance-Werkzeug, kein Counsel. Vor jeder
        Export-Entscheidung mit qualifizierter Exportkontroll-Rechtsberatung
        verifizieren. Verstöße gegen AWG/EAR/ITAR können zu Freiheitsstrafen bis
        zu 10/20 Jahren und Bußen bis zu 40 Mio. € (DE) bzw. USD 1 Mio. (US)
        führen.
      </p>
    </PageContainer>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────

function RoadmapRow({
  icon: Icon,
  label,
  description,
  status,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  description: string;
  status: "active" | "planned";
}) {
  const isActive = status === "active";
  return (
    <li className="flex items-start gap-3 rounded-lg bg-white/[0.025] p-3 ring-1 ring-inset ring-white/[0.05]">
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${
          isActive
            ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
            : "bg-white/[0.04] text-slate-400 ring-white/[0.06]"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-slate-100">{label}</div>
        <p className="mt-0.5 text-[12px] leading-relaxed text-slate-400">
          {description}
        </p>
      </div>
      <StatusPill tone={isActive ? "emerald" : "slate"} size="sm">
        {isActive ? "In progress" : "Planned"}
      </StatusPill>
    </li>
  );
}
