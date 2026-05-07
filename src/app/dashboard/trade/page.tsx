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

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Trade Operations — Caelex Comply",
  description:
    "Klassifizieren, screenen, lizenzieren — der operations-layer für Export-Kontrolle.",
};

/**
 * Trade Operations — overview / landing page.
 *
 * Sprint B1 stub upgraded by Sprint B7: now links to the live Item
 * Classification list (/dashboard/trade/items). Wave A adds the
 * Counterparty-Screening list; Wave C adds the Operations-Lifecycle.
 *
 * Strategischer Kontext: docs/COMPLY-EXPORT-CONTROL-CONCEPT.md
 * Operativer Sprint-Plan: docs/COMPLY-EXPORT-CONTROL-PLAN.md
 *
 * Two-Layer-Split (siehe Konzept § 2):
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

  const sansFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
  const displayFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

  return (
    <div
      className="mx-auto max-w-screen-2xl px-8 py-8"
      style={{ fontFamily: sansFont, letterSpacing: "-0.005em" }}
    >
      <header
        className="mb-7 flex items-end justify-between gap-6 pb-5"
        style={{ borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)" }}
      >
        <div className="min-w-0">
          <h1
            className="text-[28px] font-semibold text-white"
            style={{
              fontFamily: displayFont,
              letterSpacing: "-0.022em",
              lineHeight: 1.15,
            }}
          >
            Trade Operations
          </h1>
          <p
            className="mt-1.5 max-w-2xl text-[14px]"
            style={{ color: "rgba(255, 255, 255, 0.55)" }}
          >
            Klassifizieren, screenen, lizenzieren — der Operations-Layer neben
            deinem Export-Control-Posture.
          </p>
        </div>
      </header>

      {/* Quick-access to live sections */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          {
            href: "/dashboard/trade/items",
            label: "Item Classification",
            sublabel: "Classify BoM items across 5 jurisdictions",
            live: true,
          },
          {
            href: "/dashboard/trade/counterparties",
            label: "Counterparty Screening",
            sublabel: "OFAC, BIS, DDTC fuzzy-match — Wave A",
            live: true,
          },
          {
            href: "#",
            label: "Operations Lifecycle",
            sublabel: "License stack per shipment — Wave C",
            live: false,
          },
        ].map((card) => (
          <Link key={card.href} href={card.href}>
            <div
              className="group flex items-center gap-3 rounded-2xl px-4 py-4 transition-all"
              style={{
                background: card.live
                  ? "rgba(16, 185, 129, 0.06)"
                  : "rgba(255,255,255,0.025)",
                boxShadow: card.live
                  ? "inset 0 0 0 0.5px rgba(16,185,129,0.20)"
                  : "inset 0 0 0 0.5px rgba(255,255,255,0.07)",
                cursor: card.live ? "pointer" : "default",
                pointerEvents: card.live ? "auto" : "none",
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[13px] font-semibold"
                    style={{
                      color: card.live
                        ? "rgba(255,255,255,0.92)"
                        : "rgba(255,255,255,0.55)",
                    }}
                  >
                    {card.label}
                  </span>
                  {card.live && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                      style={{
                        background: "rgba(16,185,129,0.15)",
                        color: "rgb(52,211,153)",
                      }}
                    >
                      Live
                    </span>
                  )}
                </div>
                <p
                  className="mt-0.5 text-[11px]"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {card.sublabel}
                </p>
              </div>
              {card.live && (
                <ArrowRight
                  className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: "rgba(16,185,129,0.8)" }}
                />
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Roadmap */}
      <div
        className="max-w-3xl rounded-2xl p-8"
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          boxShadow:
            "inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
        }}
      >
        <div
          className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            boxShadow:
              "inset 0 1px 0 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 0 rgba(0, 0, 0, 0.25)",
          }}
        >
          <Globe2
            className="h-[18px] w-[18px]"
            strokeWidth={1.75}
            style={{ color: "rgba(255, 255, 255, 0.85)" }}
          />
        </div>
        <h2
          className="mb-1.5 text-[17px] font-semibold text-white"
          style={{ letterSpacing: "-0.018em" }}
        >
          Trade-Layer im Aufbau
        </h2>
        <p
          className="mb-6 text-[13px] leading-relaxed"
          style={{ color: "rgba(255, 255, 255, 0.65)" }}
        >
          Diese Surface bringt Caelex Comply auf die zweite Compliance- Ebene:
          pro Sendung, pro Counterparty, pro BoM-Zeile. Der Posture-Layer
          (ICP-Reife, AV-Bestellung, Schulungen) bleibt unter{" "}
          <Link
            href="/dashboard/modules/export-control"
            className="underline decoration-dotted underline-offset-2 hover:text-white"
            style={{ color: "rgba(255, 255, 255, 0.85)" }}
          >
            Export Control
          </Link>{" "}
          erreichbar.
        </p>

        <div
          className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "rgba(255, 255, 255, 0.45)" }}
        >
          Roadmap
        </div>
        <ul className="space-y-3">
          <RoadmapRow
            icon={ScanSearch}
            label="Wave B — Item-Klassifikation"
            description="ECCN, USML, MTCR, AL — parallel-Klassifikation mit Astra-Vorschlag und Property-Trigger-Override."
            tone="active"
          />
          <RoadmapRow
            icon={FileSearch}
            label="Wave A — Sanctions-Screening"
            description="OFAC SDN live mit Jaro-Winkler-Fuzzy-Match. Daily-Cron mit Snapshot-Hash für Audit. BIS/DDTC/EU/UK/UN folgen via trade.gov consolidated CSV (A4)."
            tone="active"
          />
          <RoadmapRow
            icon={ListChecks}
            label="Wave C — Operations-Lifecycle"
            description="TradeOperation als atomarer Liefer-Vorgang mit License-Stack und BAFA-ELAN-K2-Vorbereitung."
            tone="planned"
          />
        </ul>
      </div>

      {/* Disclaimer — Pflicht auf jeder Trade-Page (Plan § 6). */}
      <p
        className="mt-8 max-w-3xl text-[11px] leading-relaxed"
        style={{ color: "rgba(255, 255, 255, 0.4)" }}
      >
        Caelex Comply Trade ist ein Compliance-Werkzeug, kein Counsel. Vor jeder
        Export-Entscheidung mit qualifizierter Exportkontroll- Rechtsberatung
        verifizieren. Verstöße gegen AWG/EAR/ITAR können zu Freiheitsstrafen bis
        zu 10/20 Jahren und Bußen bis zu 40 Mio. € (DE) bzw. USD 1 Mio. (US)
        führen.
      </p>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────

function RoadmapRow({
  icon: Icon,
  label,
  description,
  tone,
}: {
  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
    style?: React.CSSProperties;
  }>;
  label: string;
  description: string;
  tone: "active" | "planned";
}) {
  const isActive = tone === "active";
  return (
    <li
      className="flex items-start gap-3 rounded-xl p-3.5"
      style={{
        background: isActive
          ? "rgba(255, 255, 255, 0.04)"
          : "rgba(255, 255, 255, 0.02)",
        boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
      }}
    >
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: isActive
            ? "rgba(255, 255, 255, 0.08)"
            : "rgba(255, 255, 255, 0.04)",
        }}
      >
        <Icon
          className="h-3.5 w-3.5"
          strokeWidth={1.75}
          style={{
            color: isActive
              ? "rgba(255, 255, 255, 0.92)"
              : "rgba(255, 255, 255, 0.55)",
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="text-[13px] font-medium"
          style={{
            color: isActive
              ? "rgba(255, 255, 255, 0.92)"
              : "rgba(255, 255, 255, 0.7)",
          }}
        >
          {label}
        </div>
        <p
          className="mt-0.5 text-[12px] leading-relaxed"
          style={{ color: "rgba(255, 255, 255, 0.55)" }}
        >
          {description}
        </p>
      </div>
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{
          background: isActive
            ? "rgba(120, 220, 160, 0.12)"
            : "rgba(255, 255, 255, 0.04)",
          color: isActive ? "rgb(120, 220, 160)" : "rgba(255, 255, 255, 0.45)",
        }}
      >
        {isActive ? "In progress" : "Planned"}
      </span>
    </li>
  );
}
