"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /atlas/drafting/auth/parallel — Multi-jurisdiction parallel draft
 * (Bundle 41, B6).
 *
 * Sky-Sat needs an authorization in DE + FR + UK simultaneously. Pre-
 * B6, Marie dispatched three separate auth-tile drafts and tried to
 * keep them in sync mentally. This workspace generates them as a
 * linked set:
 *
 *   1. Pick the operator type + mission profile (shared across the set).
 *   2. Pick 2-N jurisdictions to file in.
 *   3. For each jurisdiction, click "Generate" — fires AI Mode with
 *      the per-jurisdiction prompt and creates a tagged library entry.
 *   4. All entries share a parallelSetId so the My Drafts view groups
 *      them and each is labeled with its jurisdiction.
 *
 * The set-id + per-jurisdiction tagging means partner Klaus can later
 * pull up "show me the Sky-Sat parallel set" and see every variant in
 * one filtered view.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  PenSquare,
  ArrowLeft,
  Sparkles,
  Layers,
  Check,
  CheckCircle2,
  Circle,
  Briefcase,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { ALL_SOURCES } from "@/data/legal-sources";
import { openAIMode } from "@/components/atlas/AIModeLauncher";
import { pushDraftLibrary } from "@/lib/atlas/drafting-history";
import { getActiveMandate, type Mandate } from "@/lib/atlas/mandate-store";
import { composeMandateContext } from "@/lib/atlas/mandate-intake";

const OPERATOR_TYPES = [
  "satellite_operator",
  "launch_provider",
  "ground_segment",
  "data_provider",
  "in_orbit_services",
  "constellation_operator",
  "space_resource_operator",
] as const;

const OPERATOR_LABELS: Record<
  (typeof OPERATOR_TYPES)[number],
  { en: string; de: string }
> = {
  satellite_operator: { en: "Satellite operator", de: "Satellitenbetreiber" },
  launch_provider: { en: "Launch provider", de: "Startanbieter" },
  ground_segment: {
    en: "Ground-segment operator",
    de: "Bodensegment-Betreiber",
  },
  data_provider: { en: "Data provider", de: "Datenanbieter" },
  in_orbit_services: {
    en: "In-orbit services",
    de: "Im-Orbit-Dienstleistungen",
  },
  constellation_operator: {
    en: "Constellation operator",
    de: "Konstellations-Betreiber",
  },
  space_resource_operator: {
    en: "Space-resource operator",
    de: "Weltraum-Ressourcen-Betreiber",
  },
};

export default function ParallelDraftPage() {
  const { language } = useLanguage();
  const isDe = language === "de";

  /* Active mandate hydrated once for context-injection. */
  const [activeMandate, setActiveMandate] = useState<Mandate | null>(null);
  useEffect(() => {
    setActiveMandate(getActiveMandate());
  }, []);

  /* Set state. The parallelSetId is generated once per session. */
  const [setId] = useState<string>(
    () => `parset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  const [operator, setOperator] =
    useState<(typeof OPERATOR_TYPES)[number]>("satellite_operator");
  const [mission, setMission] = useState("");
  const [outputLang, setOutputLang] = useState<"de" | "en">(() =>
    isDe ? "de" : "en",
  );

  /* Selected jurisdictions. Default = three common European filings. */
  const [jurisdictions, setJurisdictions] = useState<string[]>([
    "DE",
    "FR",
    "UK",
  ]);

  /* Track which jurisdictions have been dispatched so far. Cleared
     when the user changes anything (operator / mission) so re-fires
     are intentional. */
  const [dispatched, setDispatched] = useState<Set<string>>(new Set());

  const allJurisdictions = useMemo(() => {
    const set = new Set<string>();
    for (const s of ALL_SOURCES) set.add(s.jurisdiction);
    return Array.from(set)
      .filter((j) => j !== "INT" && j !== "EU")
      .sort();
  }, []);

  /* If mandate has primary jurisdiction, prefill it first in the set. */
  useEffect(() => {
    if (
      activeMandate?.intake.primaryJurisdiction &&
      !jurisdictions.includes(activeMandate.intake.primaryJurisdiction)
    ) {
      setJurisdictions((prev) => [
        activeMandate.intake.primaryJurisdiction,
        ...prev,
      ]);
    }
  }, [activeMandate, jurisdictions]);

  const toggleJurisdiction = (j: string) => {
    setJurisdictions((prev) =>
      prev.includes(j) ? prev.filter((p) => p !== j) : [...prev, j],
    );
    setDispatched(new Set());
  };

  /* Build the per-jurisdiction prompt. Same shape as the studio's
     buildAuthPrompt but parameterized over the jurisdiction. */
  const buildJurisdictionPrompt = (j: string): string => {
    const outputDe = outputLang === "de";
    const opLabel = OPERATOR_LABELS[operator][outputDe ? "de" : "en"];
    const baseEn = `Draft an authorization application scaffold for a ${opLabel.toLowerCase()} filing in ${j}.`;
    const baseDe = `Erstelle ein Genehmigungsantrag-Gerüst für einen ${opLabel} in ${j}.`;
    const missionPart = mission.trim()
      ? outputDe
        ? ` Missionsprofil: ${mission.trim()}.`
        : ` Mission profile: ${mission.trim()}.`
      : "";
    const ctx = activeMandate
      ? composeMandateContext(activeMandate.intake, outputDe ? "de" : "en")
      : "";
    const ctxLine = ctx
      ? outputDe
        ? ` Mandanten-Kontext: ${ctx}.`
        : ` Mandate context: ${ctx}.`
      : "";
    return (outputDe ? baseDe : baseEn) + missionPart + ctxLine;
  };

  const handleDispatchOne = (j: string) => {
    const prompt = buildJurisdictionPrompt(j);
    openAIMode({ prompt });
    const opLabel =
      OPERATOR_LABELS[operator][outputLang === "de" ? "de" : "en"];
    const title = `[Parallel] ${j} · ${opLabel}${mission.trim() ? ` · ${mission.trim().slice(0, 30)}…` : ""}`;
    pushDraftLibrary({
      kind: "auth",
      title,
      prompt,
      outputLocale: outputLang,
      privileged: false,
      mandateId: activeMandate?.id,
      mandateName: activeMandate?.name,
      parallelSetId: setId,
      jurisdiction: j,
    });
    setDispatched((prev) => {
      const next = new Set(prev);
      next.add(j);
      return next;
    });
  };

  const handleDispatchAll = () => {
    /* Sequential dispatch — AI Mode is single-pane. The user steps
       through them by clicking Send in AI Mode for each. */
    for (const j of jurisdictions) {
      if (!dispatched.has(j)) handleDispatchOne(j);
    }
  };

  /* Reset when operator or mission changes — assume the lawyer wants
     to re-dispatch with the new context. */
  useEffect(() => {
    setDispatched(new Set());
  }, [operator, mission]);

  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-4">
      <header className="flex items-center justify-between flex-wrap gap-2 max-w-3xl">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/atlas/drafting"
            className="inline-flex items-center gap-1 text-[11px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
          >
            <ArrowLeft size={11} strokeWidth={1.8} aria-hidden="true" />
            {isDe ? "Drafting Studio" : "Drafting Studio"}
          </Link>
          <span className="text-[var(--atlas-text-faint)]">·</span>
          <Layers className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-[var(--atlas-text-primary)]">
            {isDe
              ? "Parallel-Draft (Multi-Jurisdiktion)"
              : "Parallel draft (multi-jurisdiction)"}
          </h1>
        </div>
        <span className="inline-flex items-center rounded-md bg-[var(--atlas-bg-surface-muted)] px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-[var(--atlas-text-muted)]">
          set: {setId.slice(-8)}
        </span>
      </header>

      <p className="text-[12.5px] text-[var(--atlas-text-secondary)] leading-relaxed max-w-3xl">
        {isDe
          ? `Eine Genehmigung — gleichzeitig in mehreren Jurisdiktionen einreichen. Wähle Operator + Mission + Jurisdiktionen, dann generiere alle Varianten in einem Set. Jede Variante landet automatisch in "Meine Entwürfe" mit gemeinsamem Set-Label.`
          : `One authorization — filed in several jurisdictions at once. Pick operator + mission + jurisdictions, then generate every variant as a linked set. Each variant lands in "My Drafts" with a shared set label.`}
      </p>

      {/* Active-mandate badge */}
      {activeMandate && (
        <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-800 dark:text-emerald-200 max-w-3xl">
          <Briefcase size={11} strokeWidth={1.8} aria-hidden="true" />
          {isDe
            ? `Mandanten-Kontext: ${activeMandate.name}`
            : `Mandate context: ${activeMandate.name}`}
        </div>
      )}

      {/* Shared inputs */}
      <section className="max-w-3xl rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
            {isDe ? "Betreiber-Typ" : "Operator type"}
          </label>
          <select
            value={operator}
            onChange={(e) =>
              setOperator(e.target.value as (typeof OPERATOR_TYPES)[number])
            }
            className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none cursor-pointer"
          >
            {OPERATOR_TYPES.map((op) => (
              <option key={op} value={op}>
                {isDe ? OPERATOR_LABELS[op].de : OPERATOR_LABELS[op].en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
            {isDe ? "Entwurfssprache" : "Output language"}
          </label>
          <select
            value={outputLang}
            onChange={(e) => setOutputLang(e.target.value as "de" | "en")}
            className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none cursor-pointer"
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
            {isDe ? "Missionsprofil (optional)" : "Mission profile (optional)"}
          </label>
          <textarea
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            rows={3}
            placeholder={
              isDe
                ? "z. B. Sky-Sat 12-Sat-Konstellation, 550 km LEO, Ka-Band 28-29.5 GHz, Ariane 6 Q3/2027"
                : "e.g. Sky-Sat 12-sat constellation, 550 km LEO, Ka-band 28-29.5 GHz, Ariane 6 Q3/2027"
            }
            className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none resize-none placeholder:text-[var(--atlas-text-faint)]"
          />
        </div>
      </section>

      {/* Jurisdiction multi-select */}
      <section className="max-w-3xl rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)]">
            {isDe
              ? `Jurisdiktionen (${jurisdictions.length})`
              : `Jurisdictions (${jurisdictions.length})`}
          </label>
          <button
            type="button"
            onClick={handleDispatchAll}
            disabled={jurisdictions.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--atlas-action-text)] text-[11.5px] font-medium tracking-wide px-3 py-1.5 transition-colors"
          >
            <Sparkles size={11} strokeWidth={1.8} aria-hidden="true" />
            {isDe ? "Alle generieren" : "Generate all"}
          </button>
        </div>
        <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {allJurisdictions.map((j) => {
            const selected = jurisdictions.includes(j);
            return (
              <button
                key={j}
                type="button"
                onClick={() => toggleJurisdiction(j)}
                className={`text-[11px] font-mono px-1.5 py-1 rounded border transition-colors ${
                  selected
                    ? "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-400/40 text-emerald-800 dark:text-emerald-200"
                    : "bg-[var(--atlas-bg-surface-muted)] border-[var(--atlas-border)] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)]"
                }`}
              >
                {j}
              </button>
            );
          })}
        </div>
      </section>

      {/* Per-jurisdiction dispatch row */}
      {jurisdictions.length > 0 && (
        <section className="max-w-3xl rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-4 flex flex-col gap-2">
          <h2 className="text-[12px] font-semibold text-[var(--atlas-text-primary)]">
            {isDe ? "Set-Status" : "Set status"}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {jurisdictions.map((j) => {
              const isDispatched = dispatched.has(j);
              return (
                <li
                  key={j}
                  className="flex items-center justify-between gap-2 rounded border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface-muted)] px-2 py-1.5"
                >
                  <span className="inline-flex items-center gap-2 text-[12px]">
                    {isDispatched ? (
                      <CheckCircle2
                        size={12}
                        strokeWidth={1.8}
                        aria-hidden="true"
                        className="text-emerald-600"
                      />
                    ) : (
                      <Circle
                        size={12}
                        strokeWidth={1.8}
                        aria-hidden="true"
                        className="text-[var(--atlas-text-faint)]"
                      />
                    )}
                    <span className="font-mono font-semibold text-[var(--atlas-text-primary)]">
                      {j}
                    </span>
                    <span className="text-[10.5px] text-[var(--atlas-text-muted)]">
                      {isDispatched
                        ? isDe
                          ? "dispatched"
                          : "dispatched"
                        : isDe
                          ? "ausstehend"
                          : "pending"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDispatchOne(j)}
                    className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-1 rounded bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] text-[var(--atlas-action-text)] transition-colors"
                  >
                    {isDispatched ? (
                      <Check size={10} strokeWidth={1.8} aria-hidden="true" />
                    ) : (
                      <Sparkles
                        size={10}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    )}
                    {isDispatched
                      ? isDe
                        ? "Erneut"
                        : "Re-fire"
                      : isDe
                        ? "Generieren"
                        : "Generate"}
                  </button>
                </li>
              );
            })}
          </ul>
          {dispatched.size > 0 && (
            <Link
              href={`/atlas/drafting/history?set=${setId}`}
              className="inline-flex items-center gap-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors mt-1"
            >
              {isDe
                ? `Set in "Meine Entwürfe" anzeigen →`
                : "View this set in My Drafts →"}
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
