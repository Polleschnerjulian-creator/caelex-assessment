"use client";

/**
 * Caelex Passage — Settings › Screening configuration tab.
 *
 * Lets OWNER/ADMIN choose which sanction lists are checked, how strict the
 * fuzzy match is, whether a confirmed hit auto-blocks the operation, and the
 * re-screen cadence. Saves via the `updateScreening` server action; the
 * service clamps/sanitises everything, so the form is forgiving.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState, useTransition } from "react";
import { Save, CheckCircle2, AlertCircle, Info, Lock } from "lucide-react";
import { updateScreening } from "@/lib/trade/settings/settings-actions";
import {
  SCREENING_LISTS,
  THRESHOLD_MIN,
  THRESHOLD_MAX,
  type ScreeningConfig,
  type ScreeningListKey,
} from "@/lib/trade/settings/screening-config";

const CADENCE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0, label: "Aus" },
  { value: 7, label: "alle 7 Tage" },
  { value: 30, label: "alle 30 Tage" },
  { value: 90, label: "alle 90 Tage" },
  { value: 180, label: "alle 180 Tage" },
];

function Switch({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition ${on ? "bg-trade-text-primary" : "bg-trade-border-strong"}`}
    >
      <span
        className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-all ${on ? "left-[18px]" : "left-[2px]"}`}
      />
    </button>
  );
}

function thresholdLabel(t: number): string {
  if (t >= 0.9) return "sehr streng";
  if (t >= 0.83) return "streng";
  if (t >= 0.76) return "ausgewogen";
  return "locker";
}

export function ScreeningTab({ config }: { config: ScreeningConfig }) {
  const [enabled, setEnabled] = useState<Set<ScreeningListKey>>(
    new Set(config.enabledLists),
  );
  const [threshold, setThreshold] = useState(config.matchThreshold);
  const [autoBlock, setAutoBlock] = useState(config.autoBlockOnConfirmedHit);
  const [cadence, setCadence] = useState<number>(
    config.reScreenIntervalDays ?? 0,
  );
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const toggleList = (k: ScreeningListKey) => {
    setStatus("idle");
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const save = () => {
    setStatus("idle");
    startTransition(async () => {
      const res = await updateScreening({
        enabledLists: [...enabled],
        matchThreshold: threshold,
        autoBlockOnConfirmedHit: autoBlock,
        reScreenIntervalDays: cadence === 0 ? null : cadence,
      });
      if (res.ok) {
        setStatus("saved");
        setError(null);
      } else {
        setStatus("error");
        setError(res.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[18px] font-semibold text-trade-text-primary">
          Screening-Konfiguration
        </h2>
        <p className="mt-1 max-w-2xl text-[13px] text-trade-text-muted">
          Welche Sanktionslisten geprüft werden, wie streng gematcht wird und
          wie oft neu gescreent wird. Gilt für alle Partner-Screenings dieser
          Org.
        </p>
      </div>

      {/* Honest scope notice — lists + threshold are wired into the engine;
          auto-block + cadence persist but their subsystems (operation policy
          + re-screen cron) aren't wired yet, so we say so precisely. */}
      <div className="flex items-start gap-2.5 rounded-lg border border-trade-border bg-trade-bg-subtle px-4 py-3 text-[12.5px] leading-relaxed text-trade-text-secondary">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <span className="font-semibold text-trade-text-primary">
            Sanktionslisten und Match-Schwelle wirken live
          </span>{" "}
          aufs Screening. Auto-Block und Re-Screening-Takt werden gespeichert;
          ihre Anbindung folgt — bis dahin gelten die Standardwerte (Auto-Block
          an, alle&nbsp;30&nbsp;Tage).
        </div>
      </div>

      {/* Sanction lists */}
      <div className="overflow-hidden rounded-xl border border-trade-border bg-trade-bg-panel shadow-[var(--trade-shadow-card)]">
        <div className="flex items-center justify-between border-b border-trade-border-subtle px-5 py-3.5">
          <div className="text-[14px] font-semibold text-trade-text-primary">
            Sanktionslisten
          </div>
          <div className="text-[12px] text-trade-text-muted">
            {SCREENING_LISTS.length} Quellen · {enabled.size} aktiv
          </div>
        </div>
        {SCREENING_LISTS.map((list) => (
          <div
            key={list.key}
            className="flex items-center justify-between gap-4 border-b border-trade-border-subtle px-5 py-3.5 last:border-b-0"
          >
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-trade-text-primary">
                {list.label}
              </div>
              <div className="mt-0.5 text-[12px] text-trade-text-muted">
                {list.authority}
              </div>
            </div>
            {list.critical ? (
              <span
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-trade-bg-subtle px-2.5 py-1 text-[11px] font-medium text-trade-text-secondary ring-1 ring-trade-border-subtle"
                title="Pflichtliste — immer aktiv (fail-closed)"
              >
                <Lock className="h-3 w-3" aria-hidden="true" /> Pflicht
              </span>
            ) : (
              <Switch
                on={enabled.has(list.key)}
                onToggle={() => toggleList(list.key)}
                label={`${list.label} ${enabled.has(list.key) ? "deaktivieren" : "aktivieren"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Match & auto-block */}
      <div className="overflow-hidden rounded-xl border border-trade-border bg-trade-bg-panel shadow-[var(--trade-shadow-card)]">
        <div className="border-b border-trade-border-subtle px-5 py-3.5 text-[14px] font-semibold text-trade-text-primary">
          Match &amp; Auto-Block
        </div>

        <div className="border-b border-trade-border-subtle px-5 py-4">
          <div className="flex items-center gap-2 text-[13px] font-medium text-trade-text-primary">
            Fuzzy-Match-Schwelle
            <span className="rounded-full bg-trade-bg-subtle px-2 py-0.5 text-[11px] font-semibold tabular-nums text-trade-text-secondary">
              {threshold.toFixed(2)} · {thresholdLabel(threshold)}
            </span>
          </div>
          <div className="mt-1 text-[12px] text-trade-text-muted">
            Jaro-Winkler-Ähnlichkeit, ab der ein Treffer angezeigt wird.
            Niedriger = mehr (aber unschärfere) Treffer.
          </div>
          <input
            type="range"
            min={THRESHOLD_MIN}
            max={THRESHOLD_MAX}
            step={0.01}
            value={threshold}
            onChange={(e) => {
              setStatus("idle");
              setThreshold(Number(e.target.value));
            }}
            aria-label="Fuzzy-Match-Schwelle"
            className="mt-3 w-full accent-trade-text-primary"
          />
          <div className="flex justify-between text-[11px] text-trade-text-muted">
            <span>{THRESHOLD_MIN.toFixed(2)} locker</span>
            <span>{THRESHOLD_MAX.toFixed(2)} exakt</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-trade-border-subtle px-5 py-3.5">
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-trade-text-primary">
              Auto-Block bei bestätigtem Treffer
            </div>
            <div className="mt-0.5 text-[12px] text-trade-text-muted">
              Vorgang automatisch blockieren, sobald ein CONFIRMED_HIT vorliegt.
            </div>
          </div>
          <Switch
            on={autoBlock}
            onToggle={() => {
              setStatus("idle");
              setAutoBlock((v) => !v);
            }}
            label="Auto-Block umschalten"
          />
        </div>

        <div className="flex items-center justify-between gap-4 px-5 py-3.5">
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-trade-text-primary">
              Automatisches Re-Screening
            </div>
            <div className="mt-0.5 text-[12px] text-trade-text-muted">
              Bestehende Partner regelmäßig neu prüfen.
            </div>
          </div>
          <select
            value={cadence}
            onChange={(e) => {
              setStatus("idle");
              setCadence(Number(e.target.value));
            }}
            aria-label="Re-Screening-Takt"
            className="rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-1.5 text-[13px] text-trade-text-primary outline-none focus:border-trade-accent"
          >
            {CADENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {status === "saved" ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-trade-accent-success">
            <CheckCircle2 className="h-4 w-4" /> Gespeichert
          </span>
        ) : null}
        {status === "error" ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-trade-accent-danger">
            <AlertCircle className="h-4 w-4" /> {error ?? "Fehler"}
          </span>
        ) : null}
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-trade-text-primary px-4 text-[13px] font-medium text-trade-bg-panel transition hover:opacity-90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Speichert…" : "Speichern"}
        </button>
      </div>
    </div>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
