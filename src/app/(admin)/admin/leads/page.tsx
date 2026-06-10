import { prisma } from "@/lib/prisma";
import { ConvertLeadButton } from "./ConvertLeadButton";

/**
 * /admin/leads — the captured assessment leads (the follow-up list).
 *
 * Server component; the (admin) layout already enforces the super-admin
 * gate (requireSuperAdminPage) for every page in the group, so this page
 * only reads. Unlike the PII-free analytics surfaces, this IS the CRM
 * follow-up view: leads submitted their email explicitly to receive the
 * report (EmailGate consent copy), so showing email/company here is the
 * purpose of the table, not a leak. Newest first, capped at 200.
 *
 * The `source` column carries campaign attribution (e.g. "ila2026" from
 * the booth QR) stamped onto the lead row at capture time.
 */

export const metadata = { title: "Leads — Caelex Admin" };
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminLeadsPage() {
  const now = Date.now();
  const [leads, total, last7d, bySource] = await Promise.all([
    prisma.assessmentLead.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        email: true,
        company: true,
        role: true,
        assessmentType: true,
        source: true,
        consentNewsletter: true,
        createdAt: true,
      },
    }),
    prisma.assessmentLead.count(),
    prisma.assessmentLead.count({
      where: { createdAt: { gte: new Date(now - 7 * DAY_MS) } },
    }),
    prisma.assessmentLead.groupBy({
      by: ["source"],
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Leads</h1>
        <p className="mt-1 text-[13px] opacity-70">
          Erfasste Assessment-Leads (E-Mail-Gate, mit Consent-Stand). Quelle =
          Kampagnen-Attribution von der Lande-URL (z.&nbsp;B.{" "}
          <code>ila2026</code> vom Messe-QR).
        </p>
      </header>

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Gesamt" value={String(total)} />
        <Kpi label="Letzte 7 Tage" value={String(last7d)} />
        {bySource.slice(0, 2).map((s) => (
          <Kpi
            key={s.source}
            label={`Quelle: ${s.source}`}
            value={String(s._count._all)}
          />
        ))}
      </div>

      {/* Source breakdown */}
      {bySource.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {bySource.map((s) => (
            <span
              key={s.source}
              className="rounded-full border border-current/20 px-3 py-1 text-[12px] opacity-80"
            >
              {s.source}: {s._count._all}
            </span>
          ))}
        </div>
      ) : null}

      {/* Lead table */}
      {leads.length === 0 ? (
        <p className="text-[13px] opacity-60">
          Noch keine Leads erfasst — sie erscheinen hier, sobald jemand den
          Report über das E-Mail-Gate anfordert.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-current/10">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-current/10 text-[11px] uppercase tracking-wider opacity-60">
                <th className="px-4 py-3">E-Mail</th>
                <th className="px-4 py-3">Firma</th>
                <th className="px-4 py-3">Rolle</th>
                <th className="px-4 py-3">Assessment</th>
                <th className="px-4 py-3">Quelle</th>
                <th className="px-4 py-3">Newsletter</th>
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">CRM</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-current/5">
                  <td className="px-4 py-2.5 font-medium">{lead.email}</td>
                  <td className="px-4 py-2.5 opacity-80">
                    {lead.company ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 opacity-80">{lead.role ?? "—"}</td>
                  <td className="px-4 py-2.5 opacity-70">
                    {lead.assessmentType}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full border border-current/20 px-2 py-0.5 text-[11px]">
                      {lead.source}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 opacity-70">
                    {lead.consentNewsletter ? "Opt-in" : "—"}
                  </td>
                  <td className="px-4 py-2.5 opacity-70">
                    {lead.createdAt
                      .toISOString()
                      .slice(0, 16)
                      .replace("T", " ")}
                  </td>
                  <td className="px-4 py-2.5">
                    <ConvertLeadButton leadId={lead.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-current/10 p-4">
      <div className="text-[11px] uppercase tracking-wider opacity-60">
        {label}
      </div>
      <div className="mt-1 text-[26px] font-light tabular-nums">{value}</div>
    </div>
  );
}
