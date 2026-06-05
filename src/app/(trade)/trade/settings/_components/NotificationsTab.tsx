"use client";

import { useState, useTransition } from "react";
import { Save, CheckCircle2, AlertCircle } from "lucide-react";
import type { TradeNotificationPreferencesView } from "@/lib/trade/settings/notification-preferences-service";
import { updateNotifications } from "@/lib/trade/settings/settings-actions";

interface Props {
  preferences: TradeNotificationPreferencesView;
}

/**
 * Caelex Trade — Settings: Notifications tab.
 *
 * Eight email-notification toggles, one per Trade-specific event type.
 * All default-on — operators are opted in to expiry / sanctions alerts
 * at sign-up; this tab lets them opt out per category.
 */

interface ToggleDef {
  key: keyof Pick<
    TradeNotificationPreferencesView,
    | "notifyLicenseExpiry"
    | "notifyEucExpiry"
    | "notifyReexportConsentExpiry"
    | "notifySanctionsHit"
    | "notifyCatchAllTrigger"
    | "notifySupplement2Reminder"
    | "notifySammelgenehmigungExpiry"
    | "notifyVsdDeadline"
  >;
  label: string;
  description: string;
}

const TOGGLES: ToggleDef[] = [
  {
    key: "notifyLicenseExpiry",
    label: "License expiry",
    description:
      "BIS / BAFA / DDTC / ECJU license approaching its end date — 90, 30, 7 day reminders.",
  },
  {
    key: "notifyEucExpiry",
    label: "EUC expiry",
    description:
      "End-Use Certificate expiry warning. EUCs typically run 12 months from validation.",
  },
  {
    key: "notifyReexportConsentExpiry",
    label: "Re-export consent expiry",
    description:
      "Re-export consent letter approaching expiry — usually 24 months from issuance.",
  },
  {
    key: "notifySanctionsHit",
    label: "Sanctions screening hit",
    description:
      "Counterparty matched an OFAC / EU / UK / UN list during automated screening.",
  },
  {
    key: "notifyCatchAllTrigger",
    label: "Catch-all triggered",
    description:
      "EAR § 744 / EU 2021/821 catch-all clause fired — operation needs review before shipping.",
  },
  {
    key: "notifySupplement2Reminder",
    label: "Supplement No. 2 reminder",
    description:
      "Semi-annual 15 CFR Part 743 Supp. No. 2 report due (Jan 1 and Jul 1 drafts).",
  },
  {
    key: "notifySammelgenehmigungExpiry",
    label: "Sammelgenehmigung expiry",
    description:
      "BAFA bulk-authorization approaching expiry or volume exhaustion.",
  },
  {
    key: "notifyVsdDeadline",
    label: "VSD filing deadline",
    description:
      "Voluntary Self-Disclosure mitigation window closing — file before the 180-day cap.",
  },
];

export function NotificationsTab({ preferences }: Props) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { kind: "ok" } | { kind: "error"; message: string } | null
  >(null);

  // Local state so toggles feel snappy — the server action revalidates
  // on save but we want immediate optimistic feedback on click.
  const [state, setState] = useState(() => ({
    notifyLicenseExpiry: preferences.notifyLicenseExpiry,
    notifyEucExpiry: preferences.notifyEucExpiry,
    notifyReexportConsentExpiry: preferences.notifyReexportConsentExpiry,
    notifySanctionsHit: preferences.notifySanctionsHit,
    notifyCatchAllTrigger: preferences.notifyCatchAllTrigger,
    notifySupplement2Reminder: preferences.notifySupplement2Reminder,
    notifySammelgenehmigungExpiry: preferences.notifySammelgenehmigungExpiry,
    notifyVsdDeadline: preferences.notifyVsdDeadline,
  }));

  function toggle(key: ToggleDef["key"]) {
    setState((s) => ({ ...s, [key]: !s[key] }));
    setFeedback(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateNotifications(state);
      if (result.ok) {
        setFeedback({ kind: "ok" });
      } else {
        setFeedback({ kind: "error", message: result.error });
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-6"
      aria-busy={isPending}
    >
      {/* WCAG SC 1.3.1 — checkboxes grouped via fieldset/legend so
          screen-reader users hear "Email notifications, group, 7
          checkboxes" instead of just an unstructured list of toggles. */}
      <fieldset className="space-y-2 border-0 p-0">
        <legend className="mb-2 block">
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            Email notifications
          </h2>
          <p className="mt-0.5 text-[12px] text-trade-text-muted">
            Per-event-type opt-out. All categories default to on; flipping a
            toggle stops the matching cron from sending you e-mail for it.
          </p>
        </legend>

        {TOGGLES.map((t) => (
          <label
            key={t.key}
            className="flex cursor-pointer items-start gap-4 rounded-md border border-trade-border-subtle bg-trade-bg-page px-4 py-3 hover:border-trade-border-strong"
          >
            <input
              type="checkbox"
              checked={state[t.key]}
              onChange={() => toggle(t.key)}
              className="mt-0.5 h-4 w-4 accent-trade-accent"
            />
            <div className="flex-1">
              <div className="text-[13px] font-medium text-trade-text-primary">
                {t.label}
              </div>
              <div className="mt-0.5 text-[12px] text-trade-text-muted">
                {t.description}
              </div>
            </div>
          </label>
        ))}
      </fieldset>

      <div className="flex items-center justify-between border-t border-trade-border-subtle pt-4">
        <div className="text-[12px]">
          {feedback?.kind === "ok" && (
            <span className="inline-flex items-center gap-1.5 text-trade-accent-success">
              <CheckCircle2 size={14} />
              Preferences saved
            </span>
          )}
          {feedback?.kind === "error" && (
            <span className="inline-flex items-center gap-1.5 text-trade-accent-danger">
              <AlertCircle size={14} />
              {feedback.message}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-trade-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-trade-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save size={14} />
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
