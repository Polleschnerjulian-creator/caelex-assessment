"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Security Settings Section.
 *
 * Mounts MFA, Passkeys, and active-session management for the Atlas settings hub.
 * Relevant compliance context: §43e BRAO (berufsrechtliche Sorgfaltspflichten),
 * §203 StGB (anwaltliche Schweigepflicht), DSGVO Art. 32 (technisch-organisatorische
 * Maßnahmen), NIS2-Richtlinie (Zugangskontrolle Kritische Infrastruktur).
 *
 * Toast note: MfaSetupCard and PasskeyManagementCard both call useToast().
 * Atlas's layout tree does NOT mount a ToastProvider, so this section wraps
 * its children in one. The ToastContainer is rendered inline — toast messages
 * appear within the settings panel rather than at the root of the document.
 *
 * Security log: The /atlas/settings/security-log page is not yet built.
 * A placeholder link is rendered as a follow-up hook (see TODO below).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { Shield, ChevronRight, FileText } from "lucide-react";
import { ToastProvider } from "@/components/ui/Toast";
import { MfaSetupCard } from "@/components/settings/MfaSetupCard";
import { PasskeyManagementCard } from "@/components/settings/PasskeyManagementCard";
import { ActiveSessionsCard } from "@/components/settings/ActiveSessionsCard";

/** Thin section-header matching the Atlas V2 settings aesthetic. */
function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider px-1 mb-1">
        {title}
      </p>
      {description && (
        <p className="text-[13px] text-slate-400 dark:text-white/30 px-1">
          {description}
        </p>
      )}
    </div>
  );
}

/** Divider between subsections — matches Atlas card spacing. */
function SubDivider() {
  return <div className="h-px bg-black/[0.04] dark:bg-white/[0.06] my-8" />;
}

/**
 * SecuritySection — drop-in Atlas settings section.
 *
 * Renders three security subsections in a stacked layout:
 *   1. Zwei-Faktor-Authentifizierung (MfaSetupCard)
 *   2. Passkeys / Sicherheitsschlüssel (PasskeyManagementCard)
 *   3. Aktive Sitzungen (ActiveSessionsCard)
 *   4. Sicherheitsprotokoll (link card → /atlas/settings/security-log, TODO)
 *
 * Wrapped in <ToastProvider> because MfaSetupCard + PasskeyManagementCard +
 * ActiveSessionsCard all call useToast(), and the Atlas shell does not
 * provide a ToastProvider at the layout level.
 */
export function SecuritySection() {
  return (
    /* ToastProvider is required here because Atlas layout does not mount one.
       Without it, useToast() inside the three cards throws:
         "useToast must be used within a ToastProvider"  */
    <ToastProvider>
      <section aria-label="Sicherheitseinstellungen">
        {/* ── Page-level header ── */}
        <div className="mb-8 flex items-center gap-2">
          <Shield
            className="h-4 w-4 text-slate-400 dark:text-slate-500"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
            Sicherheit
          </h2>
        </div>

        {/* ── Contextual intro blurb ── */}
        <div className="mb-8 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-white/[0.04] dark:bg-white/[0.02]">
          <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400">
            Schütze deinen Atlas-Account gemäß{" "}
            <strong className="font-medium text-slate-700 dark:text-slate-300">
              §43e BRAO
            </strong>
            ,{" "}
            <strong className="font-medium text-slate-700 dark:text-slate-300">
              §203 StGB
            </strong>{" "}
            und{" "}
            <strong className="font-medium text-slate-700 dark:text-slate-300">
              DSGVO Art. 32
            </strong>
            . Aktiviere Zwei-Faktor-Authentifizierung und Passkeys als zweite
            Verteidigungslinie gegen unbefugten Zugriff auf Mandantendaten.
          </p>
        </div>

        {/* ── 1. Zwei-Faktor-Authentifizierung ── */}
        <div>
          <SectionHeader
            title="Zwei-Faktor-Authentifizierung"
            description="Schütze deinen Account mit einem TOTP-Authenticator (Google Authenticator, Authy, 1Password u. a.)."
          />
          <MfaSetupCard />
        </div>

        <SubDivider />

        {/* ── 2. Passkeys / Sicherheitsschlüssel ── */}
        <div>
          <SectionHeader
            title="Passkeys / Sicherheitsschlüssel"
            description="Melde dich passwortlos an — mit Face ID, Touch ID oder einem Hardware-Schlüssel (FIDO2/WebAuthn)."
          />
          <PasskeyManagementCard />
        </div>

        <SubDivider />

        {/* ── 3. Aktive Sitzungen ── */}
        <div>
          <SectionHeader
            title="Aktive Sitzungen"
            description="Übersicht aller aktiven Anmeldungen. Beende einzelne Sitzungen oder alle anderen auf einen Schlag."
          />
          <ActiveSessionsCard />
        </div>

        <SubDivider />

        {/* ── 4. Sicherheitsprotokoll (TODO: build /atlas/settings/security-log) ── */}
        <div>
          <SectionHeader
            title="Sicherheitsprotokoll"
            description="Audit-Trail für Anmeldungen, 2FA-Änderungen und Passkey-Verwaltung."
          />
          {/* TODO: Build /atlas/settings/security-log page (not yet implemented).
              When ready, replace this link card with the actual SecurityLogCard
              component. The route is pre-wired here so settings hub wiring
              (settings/page.tsx) can reference it immediately. */}
          <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
            <Link
              href="/atlas/settings/security-log"
              className="flex items-center justify-between px-5 py-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-[18px] h-[18px] text-slate-500 dark:text-white/50" />
                <div>
                  <span className="text-[15px] text-slate-900 dark:text-white">
                    Sicherheitsprotokoll anzeigen
                  </span>
                  <p className="text-[12px] text-slate-400 dark:text-white/30 mt-0.5">
                    Noch nicht verfügbar — wird in einem zukünftigen Update
                    bereitgestellt
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-white/25 flex-shrink-0" />
            </Link>
          </div>
        </div>
      </section>
    </ToastProvider>
  );
}
