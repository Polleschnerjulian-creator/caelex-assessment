"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Notifications Settings Section.
 *
 * AUDIT-FIX M-d (2026-06-11): Ehrlich gemacht. Die frühere Version
 * mountete die Plattform-NotificationPreferencesCard, deren Toggles
 * (Fristen-Erinnerungen, E-Mail-Kanal, Vorlauf-Tage) in
 * SupervisionConfig schreiben — eine Tabelle, die die Atlas-Fristen-
 * Pipeline (lib/atlas/notify.ts + atlas-deadline-reminders-Cron) NIE
 * liest. Die Karte suggerierte also Kontrolle über ein Verhalten, das
 * sie nicht beeinflusst, inklusive E-Mail-Versand, der bewusst noch
 * nicht aktiv ist (Founder-Vorgabe).
 *
 * Statt der irreführenden Toggles beschreibt die Sektion jetzt das
 * TATSÄCHLICHE Verhalten: tägliche In-App-Fristen-Warnungen unter
 * /atlas/alerts; E-Mail-Versand vorbereitet, aber deaktiviert. Die
 * Dashboard-Nutzung der NotificationPreferencesCard bleibt unberührt.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { Bell, BellRing, Mail } from "lucide-react";

interface NotificationsSectionProps {
  /** Beibehalten für Aufrufer-Kompatibilität (Settings-Hub übergibt die
   *  Profil-E-Mail). Aktuell ungenutzt, da bewusst keine E-Mail-
   *  Einstellungen angeboten werden. */
  userEmail?: string | null;
}

export function NotificationsSection(_props: NotificationsSectionProps) {
  return (
    <section>
      {/* Section header — matches LetterheadSettings / AtlasV2 style */}
      <div className="mb-4 flex items-center gap-2">
        <Bell
          className="h-4 w-4 text-slate-400 dark:text-slate-500"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Benachrichtigungen
        </h2>
      </div>

      <div className="space-y-3">
        {/* Was heute wirklich passiert: tägliche In-App-Warnungen. */}
        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-white/[0.04] dark:bg-white/[0.02]">
          <BellRing
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <div>
            <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200">
              Fristen-Warnungen — aktiv
            </p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400">
              Atlas prüft täglich alle offenen Mandats-Fristen. Sobald eine
              Frist ihr Vorwarn-Fenster erreicht, heute fällig oder überfällig
              ist, erscheint eine Warnung in den{" "}
              <Link
                href="/atlas/alerts"
                className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500 dark:text-slate-300 dark:decoration-slate-600 dark:hover:decoration-slate-400"
              >
                Hinweisen
              </Link>{" "}
              — für dich und alle Mitglieder des Mandats.
            </p>
          </div>
        </div>

        {/* Ehrlich: E-Mail ist vorbereitet, aber bewusst aus. */}
        <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-white/[0.04] dark:bg-white/[0.02]">
          <Mail
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <div>
            <p className="text-[12px] font-medium text-slate-700 dark:text-slate-200">
              E-Mail-Benachrichtigungen — noch nicht aktiv
            </p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400">
              Der E-Mail-Versand ist technisch vorbereitet, aber bewusst noch
              nicht freigeschaltet. Sobald er aktiv ist, kannst du ihn hier
              konfigurieren.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
