"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * MatterStatusBanner — explains why chat is disabled when a matter
 * is not in ACTIVE state, and points the user to the next action.
 *
 * Triggered most prominently after Atlas's `create_matter_invite`
 * tool runs: the lawyer navigates into the freshly-created matter
 * which sits in PENDING_INVITE, expecting to chat — but the message
 * route returns 409. Without this banner the failure mode was a
 * post-submit error toast with no clear next step. Now we explain
 * up-front and give the right action.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import {
  Clock,
  AlertTriangle,
  PauseCircle,
  Send,
  Inbox,
  ArrowRight,
} from "lucide-react";

interface MatterStatusBannerProps {
  status: string;
  /** For PENDING_CONSENT we link to the inbox (the firm needs to
   *  counter-sign). For other states the matter detail page is the
   *  better landing. */
  matterId: string;
  /** Display name of the counter-party — used in the copy
   *  ("Operator hat noch nicht angenommen" → who is the operator). */
  counterpartyName: string;
  /** Which side is viewing the workspace. Affects pronouns + which
   *  party is "the other side". */
  viewerSide: "ATLAS" | "CAELEX";
  /** Aufgerufen wenn der User „In echtes Mandat umwandeln" klickt.
   *  Parent öffnet das Promote-Form. Optional — Banner rendert
   *  Button nur wenn callback gesetzt ist. */
  onPromoteClick?: () => void;
}

interface StatusConfig {
  icon: typeof Clock;
  /** Tailwind text + ring colour for the icon halo. */
  tone: string;
  /** One-line title — shown bold. */
  title: string;
  /** Body copy — shown smaller below the title. */
  body: string;
  /** Optional CTA: `(matterId) => { href, label }` */
  cta?: (
    matterId: string,
    viewerSide: "ATLAS" | "CAELEX",
  ) => { href: string; label: string; icon: typeof ArrowRight };
}

const CONFIG: Record<string, StatusConfig> = {
  PENDING_INVITE: {
    icon: Send,
    tone: "text-amber-300 ring-amber-500/30 bg-amber-500/10",
    title: "Einladung versendet — Operator hat noch nicht zugestimmt",
    body: "Sobald die andere Seite die Mandatsanfrage akzeptiert, wechselt der Status auf ACTIVE und der Chat öffnet sich. Die Einladung wurde per E-Mail verschickt.",
  },
  PENDING_CONSENT: {
    icon: Send,
    tone: "text-blue-300 ring-blue-500/30 bg-blue-500/10",
    title: "Anpassung wartet auf deine Gegenzeichnung",
    body: "Die andere Seite hat den Scope angepasst. Bitte im Posteingang prüfen — entweder gegenzeichnen (→ aktiv) oder ablehnen (→ geschlossen).",
    cta: () => ({
      href: "/dashboard/network/inbox",
      label: "Posteingang öffnen",
      icon: Inbox,
    }),
  },
  SUSPENDED: {
    icon: PauseCircle,
    tone: "text-slate-300 ring-slate-500/30 bg-slate-500/10",
    title: "Mandat ist pausiert",
    body: "Der Operator hat den Zugriff vorübergehend gestoppt. Der Audit-Log und die Pinboard-Karten bleiben einsehbar, aber neue Datennutzung + Chat sind blockiert.",
    cta: (matterId, side) => ({
      href:
        side === "ATLAS"
          ? `/atlas/network/${matterId}`
          : `/dashboard/network/legal-counsel/${matterId}`,
      label: "Mandatsdetails",
      icon: ArrowRight,
    }),
  },
  REVOKED: {
    icon: AlertTriangle,
    tone: "text-red-300 ring-red-500/30 bg-red-500/10",
    title: "Mandat wurde beendet",
    body: "Eine Seite hat das Mandat widerrufen. Der hash-chained Audit-Log bleibt einsehbar, neue Aktivität ist nicht mehr möglich.",
    cta: (matterId, side) => ({
      href:
        side === "ATLAS"
          ? `/atlas/network/${matterId}`
          : `/dashboard/network/legal-counsel/${matterId}`,
      label: "Audit-Log einsehen",
      icon: ArrowRight,
    }),
  },
  CLOSED: {
    icon: AlertTriangle,
    tone: "text-slate-400 ring-slate-500/30 bg-slate-500/10",
    title: "Mandat ist geschlossen",
    body: "Die Anfrage wurde nicht zu einem aktiven Mandat. Der Audit-Log bleibt einsehbar.",
    cta: (matterId, side) => ({
      href:
        side === "ATLAS"
          ? `/atlas/network/${matterId}`
          : `/dashboard/network/legal-counsel/${matterId}`,
      label: "Audit-Log einsehen",
      icon: ArrowRight,
    }),
  },
};

export function MatterStatusBanner({
  status,
  matterId,
  counterpartyName,
  viewerSide,
  onPromoteClick,
}: MatterStatusBannerProps) {
  if (status === "STANDALONE") {
    return (
      <div className="px-6 pt-5">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-xl">
          <Inbox
            size={16}
            strokeWidth={1.5}
            className="text-amber-400 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-amber-200">
              Privater Workspace
            </div>
            <p className="text-[12px] text-amber-100/70 mt-0.5 leading-relaxed">
              Dieser Workspace ist nur für dich sichtbar. Mandant einladen →
              wird zum echten Mandat.
            </p>
          </div>
          {onPromoteClick && (
            <button
              type="button"
              onClick={onPromoteClick}
              className="text-xs px-3 h-8 rounded-md bg-amber-500 hover:bg-amber-400 text-amber-950 font-medium flex-shrink-0 transition"
            >
              In echtes Mandat umwandeln
            </button>
          )}
        </div>
      </div>
    );
  }

  const config = CONFIG[status];
  if (!config) return null;

  const Icon = config.icon;
  const cta = config.cta?.(matterId, viewerSide);
  const CtaIcon = cta?.icon;

  // Substitute counter-party name into copy where useful.
  const body = config.body.replace(
    "Der Operator",
    viewerSide === "ATLAS" ? counterpartyName : "Die Kanzlei",
  );

  return (
    <div className="px-6 pt-5">
      <div
        className={`rounded-2xl border ring-1 ${config.tone} backdrop-blur-xl px-5 py-4`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-8 h-8 rounded-lg ring-1 ${config.tone} flex items-center justify-center flex-shrink-0`}
          >
            <Icon size={14} strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-medium text-white">
              {config.title}
            </h3>
            <p className="text-[12px] text-white/70 leading-relaxed mt-1">
              {body}
            </p>
            {cta && CtaIcon && (
              <Link
                href={cta.href}
                className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-white/85 hover:text-white border border-white/[0.12] hover:border-white/25 rounded-md px-2.5 py-1 transition"
              >
                <CtaIcon size={11} strokeWidth={1.8} />
                {cta.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Helper for the parent to know whether to render the banner at all. */
export function shouldShowStatusBanner(status: string): boolean {
  return status === "STANDALONE" || (status !== "ACTIVE" && status in CONFIG);
}
