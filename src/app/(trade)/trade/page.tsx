import Link from "next/link";
import {
  Package,
  Users,
  FileCheck,
  Workflow,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

export const metadata = {
  title: "Caelex Trade — Dashboard",
};

/**
 * Caelex Trade — Welcome dashboard (Sprint T2 skeleton).
 *
 * Hero + four KPI tiles (all empty in T2 — real counts wire up once
 * the org-scoped TradeItem/TradeParty/TradeOperation/TradeLicense
 * aggregates are exposed by a future sprint) + a single CTA pointing
 * to the Classification placeholder.
 *
 * Server component — pure presentation, no data fetching yet.
 */
export default function TradeDashboardPage() {
  return (
    <div className="px-8 py-10">
      {/* Hero */}
      <section className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-trade-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-trade-accent-strong">
          <span className="h-1.5 w-1.5 rounded-full bg-trade-accent" />
          Coming online
        </div>
        <h1 className="mt-4 text-[40px] font-bold leading-tight tracking-tight text-trade-text-primary">
          Caelex Trade
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-trade-text-secondary">
          Klassifizieren. Lizenzieren. Liefern. Export-Compliance für Operatoren
          im Weltraumsektor — ITAR, EAR, EU Dual-Use, Wassenaar, MTCR und
          nationale Behörden in einem Workspace.
        </p>
      </section>

      {/* KPI tiles */}
      <section className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiTile
          icon={Package}
          label="Trade Items"
          hint="ECCN / USML / EU Annex I"
        />
        <KpiTile
          icon={Users}
          label="Counterparties"
          hint="Screened against 5 lists"
        />
        <KpiTile
          icon={FileCheck}
          label="Active Licenses"
          hint="BIS / DDTC / BAFA"
        />
        <KpiTile
          icon={Workflow}
          label="Open Operations"
          hint="Pipeline + Lifecycle"
        />
      </section>

      {/* CTA */}
      <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated p-6">
        <h2 className="text-[18px] font-semibold text-trade-text-primary">
          Erste Items klassifizieren
        </h2>
        <p className="mt-1 text-[13px] text-trade-text-secondary">
          Starte mit der Klassifizierung deiner Trade-Items gegen
          US&nbsp;CCL/USML und EU Annex I. Die echte UI wird in Wave B
          freigeschaltet — vorerst zeigt die Seite einen Platzhalter.
        </p>
        <Link
          href="/trade/items"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-trade-accent px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-trade-accent-strong"
        >
          Zur Klassifizierung
          <ArrowRight size={14} />
        </Link>
      </section>
    </div>
  );
}

interface KpiTileProps {
  icon: LucideIcon;
  label: string;
  hint: string;
}

function KpiTile({ icon: Icon, label, hint }: KpiTileProps) {
  return (
    <div className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-4 py-4">
      <div className="flex items-center gap-2 text-trade-text-muted">
        <Icon size={14} />
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="mt-3 text-[28px] font-bold leading-none text-trade-text-primary">
        —
      </div>
      <p className="mt-1 text-[11px] text-trade-text-muted">{hint}</p>
    </div>
  );
}
