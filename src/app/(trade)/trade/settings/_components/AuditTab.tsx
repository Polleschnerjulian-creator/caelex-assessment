"use client";

import { useState, useTransition } from "react";
import { Save, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";
import type { TradeNotificationPreferencesView } from "@/lib/trade/settings/notification-preferences-service";
import {
  MIN_RETENTION_YEARS,
  MAX_RETENTION_YEARS,
} from "@/lib/trade/settings/notification-preferences-constants";
import { updateAuditSettings } from "@/lib/trade/settings/settings-actions";

interface Props {
  preferences: TradeNotificationPreferencesView;
}

/**
 * Caelex Trade — Settings: Audit Trail tab.
 *
 * Three control clusters:
 *   1. Retention period — integer years, 1–30, default 5 (EAR/ITAR floor).
 *   2. Outbound webhook URL — optional; receives JSON-POST on enabled events.
 *   3. Per-event-type webhook toggles — granular opt-in (all default off).
 *
 * The webhook URL field is only meaningful when at least one event-type
 * toggle is on; the UI greys it out otherwise to make the dependency
 * explicit, but the server action accepts either order (toggle-first
 * or URL-first).
 */

interface WebhookEventDef {
  key: keyof Pick<
    TradeNotificationPreferencesView,
    | "auditWebhookOnClassification"
    | "auditWebhookOnLicenseDecision"
    | "auditWebhookOnScreeningHit"
    | "auditWebhookOnEucLifecycle"
    | "auditWebhookOnVsdSubmitted"
  >;
  label: string;
  description: string;
}

const WEBHOOK_EVENTS: WebhookEventDef[] = [
  {
    key: "auditWebhookOnClassification",
    label: "Classification finalized",
    description:
      "An item's ECCN / USML category is written or updated — full BOM diff sent.",
  },
  {
    key: "auditWebhookOnLicenseDecision",
    label: "License decision",
    description:
      "BIS / BAFA / DDTC / ECJU license moves to APPROVED, DENIED, RFI, or RWA.",
  },
  {
    key: "auditWebhookOnScreeningHit",
    label: "Sanctions screening hit",
    description:
      "Counterparty matches a watchlist — payload includes match score + list.",
  },
  {
    key: "auditWebhookOnEucLifecycle",
    label: "EUC lifecycle change",
    description:
      "End-Use Certificate transitions DRAFTED → SENT → RECEIVED → VALIDATED.",
  },
  {
    key: "auditWebhookOnVsdSubmitted",
    label: "VSD submitted",
    description:
      "Voluntary Self-Disclosure has been filed with the authority — locked event.",
  },
];

export function AuditTab({ preferences }: Props) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    | { kind: "ok" }
    | { kind: "error"; message: string; fields?: Record<string, string[]> }
    | null
  >(null);

  const [retentionYears, setRetentionYears] = useState(
    preferences.auditRetentionYears,
  );
  const [webhookUrl, setWebhookUrl] = useState(
    preferences.auditWebhookUrl ?? "",
  );
  const [eventToggles, setEventToggles] = useState(() => ({
    auditWebhookOnClassification: preferences.auditWebhookOnClassification,
    auditWebhookOnLicenseDecision: preferences.auditWebhookOnLicenseDecision,
    auditWebhookOnScreeningHit: preferences.auditWebhookOnScreeningHit,
    auditWebhookOnEucLifecycle: preferences.auditWebhookOnEucLifecycle,
    auditWebhookOnVsdSubmitted: preferences.auditWebhookOnVsdSubmitted,
  }));

  const anyEventEnabled = Object.values(eventToggles).some(Boolean);

  function toggleEvent(key: WebhookEventDef["key"]) {
    setEventToggles((s) => ({ ...s, [key]: !s[key] }));
    setFeedback(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateAuditSettings({
        auditRetentionYears: retentionYears,
        auditWebhookUrl: webhookUrl,
        ...eventToggles,
      });
      if (result.ok) {
        setFeedback({ kind: "ok" });
      } else {
        setFeedback({
          kind: "error",
          message: result.error,
          fields: result.fieldErrors,
        });
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-6"
      aria-busy={isPending}
    >
      <section>
        <header className="mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-trade-accent-strong" />
            <h2 className="text-[15px] font-semibold text-trade-text-primary">
              Retention period
            </h2>
          </div>
          <p className="mt-0.5 text-[12px] text-trade-text-muted">
            Years to keep export-control audit records. Default 5y matches EAR §
            762.6 and ITAR § 122.5. Caelex never auto-deletes — this value
            drives the &quot;eligible for archival&quot; flag on the Audit
            Center.
          </p>
        </header>
        <div className="max-w-[200px]">
          <label
            htmlFor="retention-years"
            className="mb-1 block text-[12px] font-medium text-trade-text-secondary"
          >
            Retention (years)
          </label>
          <input
            id="retention-years"
            type="number"
            min={MIN_RETENTION_YEARS}
            max={MAX_RETENTION_YEARS}
            value={retentionYears}
            onChange={(e) => setRetentionYears(Number(e.target.value))}
            className={`w-full rounded-md border bg-trade-bg-page px-3 py-2 text-[13px] text-trade-text-primary focus:outline-none ${
              feedback?.kind === "error" && feedback.fields?.auditRetentionYears
                ? "border-red-500 focus:border-red-500"
                : "border-trade-border-subtle focus:border-trade-accent"
            }`}
            aria-invalid={
              feedback?.kind === "error" &&
              !!feedback.fields?.auditRetentionYears
            }
            aria-describedby={
              feedback?.kind === "error" && feedback.fields?.auditRetentionYears
                ? "auditRetentionYears-error"
                : undefined
            }
          />
          {feedback?.kind === "error" &&
            feedback.fields?.auditRetentionYears && (
              <p
                id="auditRetentionYears-error"
                role="alert"
                className="mt-1 text-[11px] text-red-500"
              >
                {feedback.fields.auditRetentionYears.join(", ")}
              </p>
            )}
          <p className="mt-1 text-[11px] text-trade-text-muted">
            Range: {MIN_RETENTION_YEARS}–{MAX_RETENTION_YEARS} years.
          </p>
        </div>
      </section>

      <section>
        <header className="mb-3">
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            Audit-event webhook
          </h2>
          <p className="mt-0.5 text-[12px] text-trade-text-muted">
            POST a signed JSON envelope to your URL on selected audit events.
            Useful for SIEM ingestion or escalation pipelines.
          </p>
        </header>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="webhook-url"
              className="mb-1 block text-[12px] font-medium text-trade-text-secondary"
            >
              Webhook URL
            </label>
            <input
              id="webhook-url"
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://example.com/hooks/caelex-trade"
              disabled={!anyEventEnabled && webhookUrl === ""}
              className="w-full rounded-md border border-trade-border-subtle bg-trade-bg-page px-3 py-2 text-[13px] text-trade-text-primary placeholder:text-trade-text-muted focus:border-trade-accent focus:outline-none disabled:opacity-60"
            />
            <p className="mt-1 text-[11px] text-trade-text-muted">
              Enable at least one event type below to start dispatching.
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 block text-[12px] font-medium text-trade-text-secondary">
              Events to deliver
            </legend>
            <div className="space-y-2">
              {WEBHOOK_EVENTS.map((ev) => (
                <label
                  key={ev.key}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-trade-border-subtle bg-trade-bg-page px-3 py-2 hover:border-trade-border-strong"
                >
                  <input
                    type="checkbox"
                    checked={eventToggles[ev.key]}
                    onChange={() => toggleEvent(ev.key)}
                    className="mt-0.5 accent-trade-accent"
                  />
                  <div>
                    <div className="text-[13px] font-medium text-trade-text-primary">
                      {ev.label}
                    </div>
                    <div className="text-[12px] text-trade-text-muted">
                      {ev.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <div className="flex items-center justify-between border-t border-trade-border-subtle pt-4">
        <div className="text-[12px]">
          {feedback?.kind === "ok" && (
            <span className="inline-flex items-center gap-1.5 text-emerald-500">
              <CheckCircle2 size={14} />
              Audit settings saved
            </span>
          )}
          {feedback?.kind === "error" && !feedback.fields && (
            <span className="inline-flex items-center gap-1.5 text-red-500">
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
