/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate-Vault file detail (minimal M2 view).
 *
 * Wird von search_mandate_vault Citations verlinkt:
 *   [Mandats-Datei: foo.pdf](/atlas/mandate/<id>/vault/<fileId>)
 *
 * MVP: filename + metadata + extracted-text-preview + back-link.
 * Follow-up sprints können einen echten PDF-Viewer / DOCX-Render hier
 * andocken; für jetzt reicht text + back-to-vault.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MandateVaultFilePage({
  params,
}: {
  params: Promise<{ id: string; fileId: string }>;
}) {
  const atlas = await getAtlasAuth();
  if (!atlas) redirect("/atlas/sign-in");
  const { id: mandateId, fileId } = await params;

  /* Org + member-or-owner gate via the mandate, then fetch file. */
  const file = await prisma.atlasMandateFile.findFirst({
    where: {
      id: fileId,
      mandateId,
      mandate: {
        organizationId: atlas.organizationId,
        OR: [
          { ownerUserId: atlas.userId },
          { members: { some: { userId: atlas.userId } } },
        ],
      },
    },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      sizeBytes: true,
      extractedText: true,
      createdAt: true,
      mandate: { select: { id: true, name: true } },
    },
  });
  if (!file) notFound();

  const sizeKb = Math.round(file.sizeBytes / 1024);

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <Link
        href={`/atlas/mandate/${mandateId}#vault`}
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ChevronLeft size={13} />
        Zurück zu {file.mandate.name}
      </Link>

      <div className="mb-4 border-b border-slate-200 pb-4 dark:border-white/[0.08]">
        <h1 className="text-[18px] font-medium text-slate-900 dark:text-slate-100">
          {file.filename}
        </h1>
        <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
          {file.mimeType} · {sizeKb} KB · hochgeladen{" "}
          {new Date(file.createdAt).toLocaleDateString("de-DE")}
        </p>
      </div>

      {file.extractedText ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Extrahierter Text
          </h2>
          <pre className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-300">
            {file.extractedText}
          </pre>
        </div>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-[12.5px] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-400">
          Diese Datei enthält keinen extrahierbaren Text (z.B. ein Bild oder
          unsupported Format). Volltextsuche ist daher nicht verfügbar.
        </p>
      )}
    </div>
  );
}
