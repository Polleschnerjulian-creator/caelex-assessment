/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Admin UI · § 203 StGB Verpflichtungserklärungen.
 *
 * Compliance-Audit 2026-05 makes the DPA § 10a Abs. 2 promise
 * operationally true: every Caelex-side individual with technical
 * access to mandate data has a signed, downloadable
 * Verpflichtungserklärung that the operator can present to a customer
 * on request.
 *
 * Server Component for the read path; the create form lives in a
 * sibling client island so the server-side data-fetch stays clean.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { TEMPLATE_VERSION } from "@/lib/pdf/section203/template";
import { Section203NewForm } from "./Section203NewForm";

export const dynamic = "force-dynamic";

export default async function Section203AdminPage() {
  const admin = await requirePlatformAdmin();
  if (!admin) redirect("/dashboard");

  const rows = await prisma.section203Commitment.findMany({
    orderBy: [{ revokedAt: "asc" }, { signedAt: "desc" }],
    select: {
      id: true,
      signerName: true,
      role: true,
      signerEmail: true,
      scope: true,
      signedAt: true,
      templateVersion: true,
      revokedAt: true,
      revokedReason: true,
      notes: true,
    },
  });
  const active = rows.filter((r) => !r.revokedAt);
  const revoked = rows.filter((r) => r.revokedAt);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 text-slate-100">
      <header className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
          Compliance · DPA § 10a Abs. 2 · § 203 StGB
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Verpflichtungserklärungen
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
          Append-only Audit-Trail aller § 203-StGB-Verpflichtungs­erklärungen
          für Personen mit technischem Zugriff auf Berufsgeheimnis-geschützte
          Mandantendaten. Auf Anfrage einer Kanzlei (BHO Legal etc.) erzeugt die
          PDF-Spalte ein unterschriftsfertiges Dokument.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-slate-400">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
            {active.length} aktiv
          </span>
          <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-3 py-1">
            {revoked.length} widerrufen
          </span>
          <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-3 py-1">
            Template-Version: {TEMPLATE_VERSION}
          </span>
        </div>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 text-base font-semibold text-slate-100">
          Aktive Verpflichtungen
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-slate-400">
            Noch keine aktiven Verpflichtungen. Lege als Erstes deine eigene an
            (oder nutze{" "}
            <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">
              prisma/seed-julian-section203.ts
            </code>
            ).
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/60">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-700/60 bg-slate-800/40 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-2 text-left">Person</th>
                  <th className="px-4 py-2 text-left">Funktion</th>
                  <th className="px-4 py-2 text-left">Signiert am</th>
                  <th className="px-4 py-2 text-left">Template</th>
                  <th className="px-4 py-2 text-right">PDF</th>
                </tr>
              </thead>
              <tbody>
                {active.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-700/40 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">
                        {row.signerName}
                      </div>
                      {row.signerEmail ? (
                        <div className="text-xs text-slate-500">
                          {row.signerEmail}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{row.role}</td>
                    <td className="px-4 py-3 text-slate-300 tabular-nums">
                      {row.signedAt.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {row.templateVersion}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/api/admin/section203/${row.id}/pdf`}
                        className="inline-flex items-center rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
                      >
                        Download
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {revoked.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-base font-semibold text-slate-100">
            Widerrufen / historisch
          </h2>
          <div className="overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/40">
            <table className="w-full text-sm">
              <tbody>
                {revoked.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-700/40 last:border-0"
                  >
                    <td className="px-4 py-3 text-slate-400">
                      {row.signerName} · {row.role}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      Widerrufen{" "}
                      {row.revokedAt?.toISOString().slice(0, 10) ?? "—"}
                      {row.revokedReason ? ` · ${row.revokedReason}` : ""}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/api/admin/section203/${row.id}/pdf`}
                        className="text-xs text-slate-400 underline hover:text-slate-200"
                      >
                        PDF
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-base font-semibold text-slate-100">
          Neue Verpflichtung anlegen
        </h2>
        <Section203NewForm />
      </section>
    </div>
  );
}
