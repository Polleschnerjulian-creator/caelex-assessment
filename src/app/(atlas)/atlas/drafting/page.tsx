"use client";

import { useMemo, useState } from "react";
import {
  PenSquare,
  FileText,
  BookOpen,
  Columns,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { ALL_SOURCES } from "@/data/legal-sources";
import { openAIMode } from "@/components/atlas/AIModeLauncher";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * /atlas/drafting — Drafting Studio. Dedicated entry-point for the
 * three Astra drafting tools shipped in atlas-tool-executor.ts:
 *   - draft_authorization_application
 *   - draft_compliance_brief
 *   - compare_jurisdictions_for_filing
 *
 * Without this page the drafting tools fired only when the user
 * happened to type the right prompt into AI Mode. The studio
 * structures the inputs (jurisdiction, operator type, topic, etc.)
 * and routes the user into AI Mode with a prefilled, well-formed
 * prompt that triggers the right tool reliably.
 *
 * Architecture:
 *   - Three tiles. Each is a small form (no heavy state, no fetch
 *     until submission).
 *   - On submit: fire the global `atlas-ai-mode-open` event with a
 *     prompt string. AIModeLauncher is mounted from AtlasShell and
 *     listens — so the overlay opens with the prompt pre-filled.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

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
  satellite_operator: {
    en: "Satellite operator",
    de: "Satellitenbetreiber",
  },
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

export default function DraftingStudioPage() {
  const { t, language } = useLanguage();
  const isDe = language === "de";

  // ── Authorization tile state ──
  const [authJurisdiction, setAuthJurisdiction] = useState("DE");
  const [authOperator, setAuthOperator] =
    useState<(typeof OPERATOR_TYPES)[number]>("satellite_operator");
  const [authMission, setAuthMission] = useState("");

  // ── Brief tile state ──
  const [briefTopic, setBriefTopic] = useState("");

  // ── Compare tile state ──
  const [compareJurisdictions, setCompareJurisdictions] = useState<string[]>([
    "DE",
    "FR",
    "UK",
    "LU",
  ]);

  const allJurisdictions = useMemo(() => {
    const set = new Set<string>();
    for (const s of ALL_SOURCES) set.add(s.jurisdiction);
    // Drop INT/EU from the dropdown — they're not "filing" targets in
    // the same sense as a national jurisdiction.
    return Array.from(set)
      .filter((j) => j !== "INT" && j !== "EU")
      .sort();
  }, []);

  const handleAuthSubmit = () => {
    const opLabel = OPERATOR_LABELS[authOperator][isDe ? "de" : "en"];
    const baseEn = `Draft an authorization application scaffold for a ${opLabel.toLowerCase()} filing in ${authJurisdiction}.`;
    const baseDe = `Erstelle ein Genehmigungsantrag-Gerüst für einen ${opLabel} in ${authJurisdiction}.`;
    const mission = authMission.trim()
      ? isDe
        ? ` Missionsprofil: ${authMission.trim()}.`
        : ` Mission profile: ${authMission.trim()}.`
      : "";
    const prompt = (isDe ? baseDe : baseEn) + mission;
    openAIMode({ prompt });
  };

  const handleBriefSubmit = () => {
    if (!briefTopic.trim()) return;
    const prompt = isDe
      ? `Erstelle ein Compliance-Briefing zum Thema: ${briefTopic.trim()}.`
      : `Draft a compliance brief on: ${briefTopic.trim()}.`;
    openAIMode({ prompt });
  };

  const handleCompareSubmit = () => {
    if (compareJurisdictions.length < 2) return;
    const list = compareJurisdictions.join(", ");
    const prompt = isDe
      ? `Vergleiche die folgenden Jurisdiktionen für ein Filing: ${list}. Erstelle eine Kriterien-Matrix mit zitierten ATLAS-IDs.`
      : `Compare the following jurisdictions for a filing: ${list}. Produce a criteria matrix with cited ATLAS-IDs.`;
    openAIMode({ prompt });
  };

  const toggleCompareJurisdiction = (j: string) => {
    setCompareJurisdictions((prev) =>
      prev.includes(j) ? prev.filter((p) => p !== j) : [...prev, j],
    );
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <PenSquare className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-[var(--atlas-text-primary)]">
            {t("atlas.drafting_title")}
          </h1>
        </div>
      </header>

      <p className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed max-w-3xl">
        {t("atlas.drafting_subtitle")}
      </p>

      <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 max-w-3xl">
        <div className="flex items-start gap-2">
          <Info
            className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300 flex-shrink-0 mt-0.5"
            strokeWidth={1.8}
          />
          <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
            {t("atlas.drafting_disclaimer")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-2">
        {/* ── Tile 1: Authorization application ── */}
        <article className="flex flex-col rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--atlas-border-subtle)]">
            <div className="flex items-center gap-2 mb-2">
              <FileText
                className="h-4 w-4 text-emerald-600"
                strokeWidth={1.5}
              />
              <h2 className="text-[14px] font-semibold text-[var(--atlas-text-primary)]">
                {t("atlas.drafting_auth_title")}
              </h2>
            </div>
            <p className="text-[11px] text-[var(--atlas-text-muted)] leading-relaxed">
              {t("atlas.drafting_auth_desc")}
            </p>
          </div>
          <div className="p-4 flex flex-col gap-3 flex-1">
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe ? "Jurisdiktion" : "Jurisdiction"}
              </label>
              <select
                value={authJurisdiction}
                onChange={(e) => setAuthJurisdiction(e.target.value)}
                className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none cursor-pointer"
              >
                {allJurisdictions.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe ? "Betreiber-Typ" : "Operator type"}
              </label>
              <select
                value={authOperator}
                onChange={(e) =>
                  setAuthOperator(
                    e.target.value as (typeof OPERATOR_TYPES)[number],
                  )
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
                {isDe
                  ? "Missionsprofil (optional)"
                  : "Mission profile (optional)"}
              </label>
              <textarea
                value={authMission}
                onChange={(e) => setAuthMission(e.target.value)}
                rows={3}
                placeholder={
                  isDe
                    ? "z. B. LEO-Konstellation, Earth-Observation, Ka-Band, 12 Satelliten…"
                    : "e.g. LEO constellation, Earth observation, Ka-band, 12 satellites…"
                }
                className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none resize-none placeholder:text-[var(--atlas-text-faint)]"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleAuthSubmit}
            className="m-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0f0f12] hover:bg-[#1a1a1f] text-white text-[12px] font-medium tracking-wide px-4 py-2.5 transition-colors"
          >
            <Sparkles className="h-3 w-3" strokeWidth={1.8} />
            {t("atlas.drafting_open_in_ai")}
            <ArrowRight className="h-3 w-3" strokeWidth={1.8} />
          </button>
        </article>

        {/* ── Tile 2: Compliance brief ── */}
        <article className="flex flex-col rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--atlas-border-subtle)]">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
              <h2 className="text-[14px] font-semibold text-[var(--atlas-text-primary)]">
                {t("atlas.drafting_brief_title")}
              </h2>
            </div>
            <p className="text-[11px] text-[var(--atlas-text-muted)] leading-relaxed">
              {t("atlas.drafting_brief_desc")}
            </p>
          </div>
          <div className="p-4 flex flex-col gap-3 flex-1">
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe ? "Thema" : "Topic"}
              </label>
              <textarea
                value={briefTopic}
                onChange={(e) => setBriefTopic(e.target.value)}
                rows={6}
                placeholder={
                  isDe
                    ? "z. B. Post-Mission Disposal Compliance über mehrere Jurisdiktionen, ITU-Frequenz-Lifecycle, Cross-Border Liability bei Satelliten-Kollisionen…"
                    : "e.g. post-mission disposal compliance across jurisdictions, ITU frequency lifecycle, cross-border liability for satellite collisions…"
                }
                className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none resize-none placeholder:text-[var(--atlas-text-faint)]"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={!briefTopic.trim()}
            onClick={handleBriefSubmit}
            className="m-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0f0f12] hover:bg-[#1a1a1f] disabled:opacity-50 disabled:hover:bg-[#0f0f12] disabled:cursor-not-allowed text-white text-[12px] font-medium tracking-wide px-4 py-2.5 transition-colors"
          >
            <Sparkles className="h-3 w-3" strokeWidth={1.8} />
            {t("atlas.drafting_open_in_ai")}
            <ArrowRight className="h-3 w-3" strokeWidth={1.8} />
          </button>
        </article>

        {/* ── Tile 3: Jurisdictional comparison ── */}
        <article className="flex flex-col rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--atlas-border-subtle)]">
            <div className="flex items-center gap-2 mb-2">
              <Columns className="h-4 w-4 text-violet-600" strokeWidth={1.5} />
              <h2 className="text-[14px] font-semibold text-[var(--atlas-text-primary)]">
                {t("atlas.drafting_compare_title")}
              </h2>
            </div>
            <p className="text-[11px] text-[var(--atlas-text-muted)] leading-relaxed">
              {t("atlas.drafting_compare_desc")}
            </p>
          </div>
          <div className="p-4 flex flex-col gap-3 flex-1">
            <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
              {isDe ? "Jurisdiktionen vergleichen" : "Jurisdictions to compare"}
              <span className="ml-1 text-[var(--atlas-text-faint)] normal-case font-normal tracking-normal">
                ({compareJurisdictions.length}{" "}
                {isDe ? "ausgewählt" : "selected"})
              </span>
            </label>
            <div className="grid grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto pr-1">
              {allJurisdictions.map((j) => {
                const selected = compareJurisdictions.includes(j);
                return (
                  <button
                    key={j}
                    type="button"
                    onClick={() => toggleCompareJurisdiction(j)}
                    className={`text-[11px] font-mono px-1.5 py-1 rounded border transition-colors ${
                      selected
                        ? "bg-violet-100 dark:bg-violet-500/20 border-violet-300 dark:border-violet-400/40 text-violet-800 dark:text-violet-200"
                        : "bg-[var(--atlas-bg-surface-muted)] border-[var(--atlas-border)] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)]"
                    }`}
                  >
                    {j}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            disabled={compareJurisdictions.length < 2}
            onClick={handleCompareSubmit}
            className="m-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0f0f12] hover:bg-[#1a1a1f] disabled:opacity-50 disabled:hover:bg-[#0f0f12] disabled:cursor-not-allowed text-white text-[12px] font-medium tracking-wide px-4 py-2.5 transition-colors"
          >
            <Sparkles className="h-3 w-3" strokeWidth={1.8} />
            {t("atlas.drafting_open_in_ai")}
            <ArrowRight className="h-3 w-3" strokeWidth={1.8} />
          </button>
        </article>
      </div>
    </div>
  );
}
