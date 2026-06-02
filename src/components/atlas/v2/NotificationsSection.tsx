"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Notifications Settings Section.
 *
 * Wraps the platform NotificationPreferencesCard (deadline reminders +
 * regulatory alerts) for the Atlas settings hub. User-scoped — backed by
 * SupervisionConfig via /api/notifications/preferences (GET/PATCH).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { Bell } from "lucide-react";
import NotificationPreferencesCard from "@/components/settings/NotificationPreferencesCard";

interface NotificationsSectionProps {
  /** Forwarded to NotificationPreferencesCard as placeholder / default email. */
  userEmail?: string | null;
}

/**
 * NotificationsSection — drop-in Atlas settings section for notification
 * preferences. Renders a German section header and an intro blurb contextualised
 * to Atlas (Fristen-Erinnerungen für Mandate + Regulatorik-Alerts), then mounts
 * the shared NotificationPreferencesCard.
 *
 * Toast note: NotificationPreferencesCard manages its own success/error state
 * via local React state (no ToastProvider dependency). No additional provider
 * is required when mounting this section.
 */
export function NotificationsSection({ userEmail }: NotificationsSectionProps) {
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

      {/* Contextual intro blurb */}
      <div className="mb-6 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-white/[0.04] dark:bg-white/[0.02]">
        <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400">
          Steuere, wie und wann Atlas dich über bevorstehende{" "}
          <strong className="font-medium text-slate-700 dark:text-slate-300">
            Mandats-Fristen
          </strong>{" "}
          und{" "}
          <strong className="font-medium text-slate-700 dark:text-slate-300">
            Regulatorik-Alerts
          </strong>{" "}
          informiert — z. B. Einspruchsfristen, behördliche Deadlines oder
          Änderungen relevanter Vorschriften.
        </p>
      </div>

      {/* Platform card — no ToastProvider needed (uses local state) */}
      <NotificationPreferencesCard userEmail={userEmail} />
    </section>
  );
}
