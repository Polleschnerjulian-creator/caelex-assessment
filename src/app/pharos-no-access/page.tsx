/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * /pharos-no-access — friendly explainer for users who reached the
 * Pharos workspace but aren't members of an AUTHORITY org. Avoids
 * a redirect loop and gives a clear path forward.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";

export default function PharosNoAccessPage() {
  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full text-center">
        <div className="text-[10px] tracking-[0.22em] uppercase text-amber-400/70 font-semibold">
          Pharos · Aufsichtsplattform
        </div>
        <h1 className="text-3xl font-semibold mt-2">
          Pharos ist nur für Behörden zugänglich.
        </h1>
        <p className="text-sm text-slate-400 mt-3 leading-relaxed">
          Pharos ist die Aufsichts-Schnittstelle für Behörden im Weltraum-
          Sektor (BAFA, BNetzA, BSI, BMVG, ESA-Liaison, EU-Kommission, …). Dein
          Account ist aktuell nicht mit einer Behörden-Organisation verknüpft.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-sm font-medium"
          >
            Zur Caelex-Plattform
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center h-10 px-5 rounded-md border border-white/10 hover:bg-white/[0.04] text-sm"
          >
            Behörde anfragen
          </Link>
        </div>
        <p className="text-xs text-slate-500 mt-8 leading-relaxed">
          Dein Behörden-Profil noch nicht angelegt? Schreibe an{" "}
          <a
            href="mailto:pharos@caelex.com"
            className="text-amber-300 hover:underline"
          >
            pharos@caelex.com
          </a>{" "}
          — wir richten den Workspace gemeinsam mit dir ein.
        </p>
      </div>
    </div>
  );
}
