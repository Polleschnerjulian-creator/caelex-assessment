/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas Settings · AVV / DPA — Download + status surface for the
 * customer-facing DPA execution flow. Compliance-Audit 2026-05.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { DPA_TEMPLATE_VERSION } from "@/lib/pdf/dpa-cover/template";
import { computeDpaContentHash } from "@/lib/pdf/dpa-cover/render";

export const dynamic = "force-dynamic";

export default async function AtlasDpaPage() {
  const atlas = await getAtlasAuth();
  if (!atlas) redirect("/atlas-signin");

  /* Find or create (server component idempotently bootstraps the
     execution record so the download-button always has something to
     reference). */
  const dpaContentHash = await computeDpaContentHash();
  let execution = await prisma.organizationDPAExecution.findUnique({
    where: {
      organizationId_dpaVersion: {
        organizationId: atlas.organizationId,
        dpaVersion: DPA_TEMPLATE_VERSION,
      },
    },
  });
  if (!execution) {
    execution = await prisma.organizationDPAExecution.create({
      data: {
        organizationId: atlas.organizationId,
        dpaVersion: DPA_TEMPLATE_VERSION,
        dpaContentHash,
        status: "PENDING",
      },
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 text-[var(--atlas-text-primary)]">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--atlas-text-muted)]">
          Compliance · DSGVO Art. 28
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Auftragsverarbeitungsvertrag (AVV / DPA)
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--atlas-text-muted)]">
          Diese Seite stellt Ihnen das vollziehbare AVV-Deckblatt für{" "}
          <strong className="text-[var(--atlas-text-primary)]">
            {atlas.organizationName}
          </strong>{" "}
          bereit. Der vollständige Vertragstext steht unter{" "}
          <Link
            href="/legal/dpa"
            className="underline hover:text-[var(--atlas-text-primary)]"
          >
            /legal/dpa
          </Link>{" "}
          und ist Bestandteil der Vereinbarung.
        </p>
      </header>

      <section className="mb-8 rounded-lg border border-[var(--atlas-border-subtle)] bg-[var(--atlas-surface-elevated)] p-6">
        <h2 className="mb-3 text-sm font-semibold">Aktueller Status</h2>
        <dl className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-[180px_1fr]">
          <dt className="text-[var(--atlas-text-muted)]">Status</dt>
          <dd>
            <StatusBadge status={execution.status} />
          </dd>
          <dt className="text-[var(--atlas-text-muted)]">DPA-Version</dt>
          <dd className="font-mono text-xs">{execution.dpaVersion}</dd>
          <dt className="text-[var(--atlas-text-muted)]">
            Vertragstext-Prüfsumme
          </dt>
          <dd className="font-mono break-all text-xs">
            {execution.dpaContentHash.slice(0, 32)}…
          </dd>
          <dt className="text-[var(--atlas-text-muted)]">Angefordert am</dt>
          <dd>{execution.requestedAt.toLocaleDateString("de-DE")}</dd>
          {execution.downloadedAt ? (
            <>
              <dt className="text-[var(--atlas-text-muted)]">
                Heruntergeladen am
              </dt>
              <dd>{execution.downloadedAt.toLocaleDateString("de-DE")}</dd>
            </>
          ) : null}
          {execution.executedAt ? (
            <>
              <dt className="text-[var(--atlas-text-muted)]">
                Gegengezeichnet am
              </dt>
              <dd>{execution.executedAt.toLocaleDateString("de-DE")}</dd>
            </>
          ) : null}
        </dl>
      </section>

      <section className="mb-8 space-y-4">
        <h2 className="text-sm font-semibold">Schritte</h2>
        <ol className="space-y-3 text-sm">
          <li className="rounded border border-[var(--atlas-border-subtle)] p-4">
            <span className="mr-2 font-mono text-xs text-emerald-500">1.</span>
            <strong>Deckblatt herunterladen</strong> — wird in einer Datei
            zusammen mit dem Verweis auf den vollständigen Vertragstext
            ausgegeben.
            <div className="mt-3">
              <a
                href="/api/atlas/organization/dpa?download=cover"
                className="inline-flex items-center rounded bg-emerald-500 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-600"
              >
                Deckblatt PDF herunterladen
              </a>
            </div>
          </li>
          <li className="rounded border border-[var(--atlas-border-subtle)] p-4">
            <span className="mr-2 font-mono text-xs text-emerald-500">2.</span>
            <strong>Unterschreiben</strong> — durch eine zeichnungsberechtigte
            Person Ihrer Kanzlei.
          </li>
          <li className="rounded border border-[var(--atlas-border-subtle)] p-4">
            <span className="mr-2 font-mono text-xs text-emerald-500">3.</span>
            <strong>Zurücksenden</strong> — gegengezeichnetes Deckblatt an{" "}
            <a
              href="mailto:legal@caelex.eu"
              className="underline hover:text-[var(--atlas-text-primary)]"
            >
              legal@caelex.eu
            </a>{" "}
            (verschlüsselt) oder über einen sicheren Kanal (Signal / S/MIME).
          </li>
        </ol>
      </section>

      <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5 text-sm">
        <h3 className="mb-2 font-semibold text-amber-200">
          Berufsgeheimnis-Annex (§ 10a)
        </h3>
        <p className="text-amber-100/80">
          Der DPA enthält in § 10a einen verbindlichen Annex zum Schutz der
          anwaltlichen Verschwiegenheit (§ 43e BRAO · § 203 StGB · § 62a
          StBerG). Auf Anfrage stellen wir Ihnen die unterzeichneten
          Verpflichtungserklärungen aller mitwirkenden Personen über{" "}
          <a href="mailto:legal@caelex.eu" className="underline">
            legal@caelex.eu
          </a>{" "}
          zur Verfügung.
        </p>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "EXECUTED") {
    return (
      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
        Vollzogen
      </span>
    );
  }
  if (status === "DOWNLOADED") {
    return (
      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
        Heruntergeladen — wartet auf Gegenzeichnung
      </span>
    );
  }
  return (
    <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-3 py-1 text-xs font-medium text-slate-300">
      Ausstehend
    </span>
  );
}
