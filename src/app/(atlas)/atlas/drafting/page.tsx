"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  PenSquare,
  FileText,
  BookOpen,
  Columns,
  ArrowRight,
  Sparkles,
  Info,
  Lock,
  Languages,
  History,
  Eye,
  EyeOff,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Wand2,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { ALL_SOURCES } from "@/data/legal-sources";
import { openAIMode } from "@/components/atlas/AIModeLauncher";
import {
  getRecentAuth,
  getRecentBrief,
  getRecentCompare,
  pushRecentAuth,
  pushRecentBrief,
  pushRecentCompare,
  pushDraftLibrary,
  type RecentAuthEntry,
  type RecentBriefEntry,
  type RecentCompareEntry,
} from "@/lib/atlas/drafting-history";
import {
  getMandateIntake,
  setMandateIntake,
  clearMandateIntake,
  isIntakeActive,
  composeMandateContext,
  EMPTY_INTAKE,
  type MandateIntake,
} from "@/lib/atlas/mandate-intake";

/* Atlas Lawyer-UX-Audit F-DRAFT-2 — Privilege-marker support.
   When the user opts in, every prompt the studio dispatches to AI
   Mode is prefixed with an instruction asking Astra to wrap the
   draft with a "PRIVILEGED & CONFIDENTIAL — Attorney-Client Work
   Product" header. Drafts marked privileged are clearly identifiable
   when shared with co-counsel and survive accidental disclosure
   (the marker is in the artifact, not in our metadata). The
   preference persists in localStorage so the lawyer doesn't have to
   re-tick it every session. */
const PRIVILEGE_STORAGE_KEY = "atlas-drafting-privileged-mode";

function buildPrivilegePrefix(language: "de" | "en" | "fr" | "es"): string {
  const headerByLocale: Record<string, string> = {
    de: 'Markiere den gesamten Entwurf oben mit "PRIVILEGIERT & VERTRAULICH — Geschütztes Anwaltsgeheimnis (LPP)" und füge unten einen Hinweis hinzu, dass das Dokument Anwaltsgeheimnis nach § 43a BRAO / Art. 2 EU-Anwaltsrichtlinie unterliegt. ',
    en: 'Mark the entire draft at the top with "PRIVILEGED & CONFIDENTIAL — Attorney-Client Work Product" and add a footer note that the document is subject to legal professional privilege. ',
    fr: 'Marque l\'ensemble du brouillon en haut avec "PRIVILÉGIÉ & CONFIDENTIEL — Produit de travail avocat-client" et ajoute en bas une note indiquant que le document est soumis au secret professionnel. ',
    es: 'Marca el borrador completo en la parte superior con "PRIVILEGIADO Y CONFIDENCIAL — Producto del trabajo abogado-cliente" y añade al final una nota indicando que el documento está sujeto al secreto profesional. ',
  };
  return headerByLocale[language] ?? headerByLocale.en;
}

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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

/* Q1: pre-defined topic chips for the Brief tile.
   Curated from the four most-asked compliance briefs in the BHO Legal +
   Heuking Space practice (Marie's actual ticket queue, sample 2026-01).
   Click-to-fill the textarea so the lawyer doesn't re-type these every
   time. Free-text still works for everything off the list. */
const BRIEF_TOPIC_PRESETS: { de: string; en: string }[] = [
  {
    de: "NIS2-Compliance für Satellitenbetreiber",
    en: "NIS2 compliance for satellite operators",
  },
  {
    de: "ITU-Frequenzkoordination & BIU-Pflichten",
    en: "ITU frequency coordination & BIU obligations",
  },
  {
    de: "Re-Entry-Haftung nach Weltraumhaftungsübereinkommen",
    en: "Re-entry liability under the Liability Convention",
  },
  {
    de: "EU Space Act — Auswirkungen auf bestehende Genehmigungen",
    en: "EU Space Act — impact on existing authorizations",
  },
];

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

  /* Q4 — output-language toggle. Independent of UI language. Marie can
     work in EN-UI and still ask Astra to draft in DE for her DE
     mandate, or vice-versa. Sticky via state alone (per-session) so
     the UI doesn't override per-tile. */
  const [outputLang, setOutputLang] = useState<"de" | "en">(() =>
    isDe ? "de" : "en",
  );

  /* Q3 — prompt-preview toggle. Default OFF; click "Show prompt" on
     any tile to reveal exactly what'll be sent to Astra before
     dispatch. Transparency = trust, especially for partners auditing
     a junior's drafting workflow. */
  const [showPromptFor, setShowPromptFor] = useState<
    null | "auth" | "brief" | "compare"
  >(null);

  /* Q2 — recently-used per tile. Hydrate on mount; refresh after
     each dispatch via the push helpers. */
  const [recentAuth, setRecentAuth] = useState<RecentAuthEntry[]>([]);
  const [recentBrief, setRecentBrief] = useState<RecentBriefEntry[]>([]);
  const [recentCompare, setRecentCompare] = useState<RecentCompareEntry[]>([]);
  useEffect(() => {
    setRecentAuth(getRecentAuth());
    setRecentBrief(getRecentBrief());
    setRecentCompare(getRecentCompare());
  }, []);

  /* S1 — mandate intake. Single active mandate, persisted in
     localStorage, hydrated lazily after mount to avoid SSR drift.
     `intakeOpen` controls the panel's expand state independently of
     whether the intake has data — so the lawyer can collapse a filled
     intake and the active-mandate pill still surfaces on each tile. */
  const [intake, setIntake] = useState<MandateIntake>(EMPTY_INTAKE);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intakeHydrated, setIntakeHydrated] = useState(false);
  useEffect(() => {
    const loaded = getMandateIntake();
    setIntake(loaded);
    /* Auto-expand the panel if the user has no intake yet — they need
       to see the form. Auto-collapse if they have one — assume they
       want to focus on the tiles, not the form. */
    setIntakeOpen(!isIntakeActive(loaded));
    setIntakeHydrated(true);
  }, []);

  const updateIntake = (next: MandateIntake) => {
    setIntake(next);
    setMandateIntake(next);
  };
  const updateIntakeField = <K extends keyof MandateIntake>(
    field: K,
    value: MandateIntake[K],
  ) => {
    updateIntake({ ...intake, [field]: value });
  };
  const resetIntake = () => {
    setIntake(EMPTY_INTAKE);
    clearMandateIntake();
    setIntakeOpen(true);
  };

  const intakeActive = intakeHydrated && isIntakeActive(intake);

  /* When intake is active, compose the per-language context string
     once per render and reuse it in builders + UI hints. */
  const mandateContext = intakeActive
    ? composeMandateContext(intake, outputLang === "de" ? "de" : "en")
    : "";

  /* Auth-tile prefill from intake. Only applied when the user clicks
     the "Use mandate" button — never silently overwrites local edits. */
  const applyIntakeToAuth = () => {
    if (!intakeActive) return;
    setAuthJurisdiction(intake.primaryJurisdiction || authJurisdiction);
    if (
      OPERATOR_TYPES.includes(
        intake.operatorType as (typeof OPERATOR_TYPES)[number],
      )
    ) {
      setAuthOperator(intake.operatorType as (typeof OPERATOR_TYPES)[number]);
    }
    /* Compose mission-profile from intake fields. Marie can still edit
       the result; this is a starting point, not a lock. */
    const composedMission = [
      intake.satelliteSpecs.trim(),
      intake.missionProfile.trim(),
      intake.frequencies.trim(),
      intake.launchDate.trim(),
      intake.client.trim()
        ? outputLang === "de"
          ? `Mandant: ${intake.client.trim()}`
          : `Client: ${intake.client.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join(", ");
    setAuthMission(composedMission);
  };

  /* Compare-tile: ensure the primary jurisdiction is in the comparison
     when intake is active. Idempotent. */
  const applyIntakeToCompare = () => {
    if (!intakeActive) return;
    if (!compareJurisdictions.includes(intake.primaryJurisdiction)) {
      setCompareJurisdictions([
        intake.primaryJurisdiction,
        ...compareJurisdictions,
      ]);
    }
  };

  /* ── F-DRAFT-2: privileged-mode toggle ──
     Hydrated from localStorage so the preference sticks across page
     reloads. The two-step (default false → effect-load) avoids SSR
     hydration mismatch — server can't read localStorage. */
  const [privileged, setPrivileged] = useState(false);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PRIVILEGE_STORAGE_KEY);
      if (stored === "true") setPrivileged(true);
    } catch {
      /* private-browsing throws on getItem — non-fatal, just defaults
         to off, the user can still tick the box per session. */
    }
  }, []);
  const togglePrivileged = (next: boolean) => {
    setPrivileged(next);
    try {
      window.localStorage.setItem(PRIVILEGE_STORAGE_KEY, String(next));
    } catch {
      /* see above. */
    }
  };

  /* `withPrivilege` wraps any prompt with the privilege-marker prefix
     when the toggle is on. Centralised here so each handler stays a
     one-liner and there's a single place to update the prefix wording. */
  const withPrivilege = (prompt: string): string =>
    privileged ? buildPrivilegePrefix(language) + prompt : prompt;

  const allJurisdictions = useMemo(() => {
    const set = new Set<string>();
    for (const s of ALL_SOURCES) set.add(s.jurisdiction);
    // Drop INT/EU from the dropdown — they're not "filing" targets in
    // the same sense as a national jurisdiction.
    return Array.from(set)
      .filter((j) => j !== "INT" && j !== "EU")
      .sort();
  }, []);

  /* Q4 — outputDe is the source of truth for which language Astra
     should DRAFT in. Independent of the UI language (`isDe`). */
  const outputDe = outputLang === "de";

  /* Pure prompt-builders so Q3's "show prompt" preview can render the
     exact string that'll be dispatched. Each builder reads the same
     state the handler will read at submit-time. */
  const buildAuthPrompt = (): string => {
    const opLabel = OPERATOR_LABELS[authOperator][outputDe ? "de" : "en"];
    const baseEn = `Draft an authorization application scaffold for a ${opLabel.toLowerCase()} filing in ${authJurisdiction}.`;
    const baseDe = `Erstelle ein Genehmigungsantrag-Gerüst für einen ${opLabel} in ${authJurisdiction}.`;
    const mission = authMission.trim()
      ? outputDe
        ? ` Missionsprofil: ${authMission.trim()}.`
        : ` Mission profile: ${authMission.trim()}.`
      : "";
    return withPrivilege((outputDe ? baseDe : baseEn) + mission);
  };

  const buildBriefPrompt = (): string => {
    const base = outputDe
      ? `Erstelle ein Compliance-Briefing zum Thema: ${briefTopic.trim()}.`
      : `Draft a compliance brief on: ${briefTopic.trim()}.`;
    /* S1: mandate context appended as its own clearly-labelled line so
       the model sees it as guidance, not as part of the topic. */
    const ctx = mandateContext
      ? outputDe
        ? ` Mandanten-Kontext: ${mandateContext}.`
        : ` Mandate context: ${mandateContext}.`
      : "";
    return withPrivilege(base + ctx);
  };

  const buildComparePrompt = (): string => {
    const list = compareJurisdictions.join(", ");
    const base = outputDe
      ? `Vergleiche die folgenden Jurisdiktionen für ein Filing: ${list}. Erstelle eine Kriterien-Matrix mit zitierten ATLAS-IDs.`
      : `Compare the following jurisdictions for a filing: ${list}. Produce a criteria matrix with cited ATLAS-IDs.`;
    const ctx = mandateContext
      ? outputDe
        ? ` Mandanten-Kontext: ${mandateContext}.`
        : ` Mandate context: ${mandateContext}.`
      : "";
    return withPrivilege(base + ctx);
  };

  const handleAuthSubmit = () => {
    const prompt = buildAuthPrompt();
    openAIMode({ prompt });
    /* Q2: push to recently-used. Q6: auto-archive in library. */
    const opLabel = OPERATOR_LABELS[authOperator][outputDe ? "de" : "en"];
    const label = `${authJurisdiction} · ${opLabel}${authMission.trim() ? ` · ${authMission.trim().slice(0, 30)}…` : ""}`;
    pushRecentAuth({
      jurisdiction: authJurisdiction,
      operator: authOperator,
      mission: authMission,
      label,
    });
    setRecentAuth(getRecentAuth());
    pushDraftLibrary({
      kind: "auth",
      title: label,
      prompt,
      outputLocale: outputLang,
      privileged,
    });
  };

  const handleBriefSubmit = () => {
    if (!briefTopic.trim()) return;
    const prompt = buildBriefPrompt();
    openAIMode({ prompt });
    const label = briefTopic.trim().slice(0, 60);
    pushRecentBrief({ topic: briefTopic, label });
    setRecentBrief(getRecentBrief());
    pushDraftLibrary({
      kind: "brief",
      title: label,
      prompt,
      outputLocale: outputLang,
      privileged,
    });
  };

  const handleCompareSubmit = () => {
    if (compareJurisdictions.length < 2) return;
    const prompt = buildComparePrompt();
    openAIMode({ prompt });
    const label = `${compareJurisdictions.length} JD: ${compareJurisdictions.join(" · ")}`;
    pushRecentCompare({
      jurisdictions: compareJurisdictions,
      label,
    });
    setRecentCompare(getRecentCompare());
    pushDraftLibrary({
      kind: "compare",
      title: label,
      prompt,
      outputLocale: outputLang,
      privileged,
    });
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
        {/* Bundle 32: link to the My Drafts library. Surfaces only after
            hydration so the count badge doesn't pop in late. */}
        <Link
          href="/atlas/drafting/history"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
        >
          <History size={11} strokeWidth={1.8} aria-hidden="true" />
          {isDe ? "Meine Entwürfe" : "My Drafts"}
        </Link>
      </header>

      {/* Hero subtitle — promise + speed claim ("2 minutes instead of
          2 hours"). Uses the rewritten lawyer-workflow language. */}
      <p className="text-[13px] text-[var(--atlas-text-secondary)] leading-relaxed max-w-3xl">
        {t("atlas.drafting_subtitle")}
      </p>

      {/* "How it works" workflow-hint — explains the click→prompt→AI
          Mode handoff so the lawyer isn't surprised when the AI Mode
          panel opens after submit. New in bundle 29. */}
      <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] px-4 py-3 max-w-3xl">
        <p className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed">
          {t("atlas.drafting_workflow_hint")}
        </p>
      </div>

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

      {/* F-DRAFT-2: privileged-mode toggle. Default off — most drafts
          aren't privileged work-product, but when they are the marker
          MUST be in the artifact. The toggle is sticky (localStorage)
          and visually emphasised when on so the lawyer can't forget
          it's still active across sessions. */}
      <label className="flex items-start gap-3 max-w-3xl rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] px-4 py-3 cursor-pointer hover:border-[var(--atlas-border-strong)] transition-colors">
        <input
          type="checkbox"
          checked={privileged}
          onChange={(e) => togglePrivileged(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-emerald-600"
          aria-describedby="privilege-mode-help"
        />
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--atlas-text-primary)]">
            <Lock
              size={12}
              strokeWidth={1.8}
              className={
                privileged
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-[var(--atlas-text-faint)]"
              }
              aria-hidden="true"
            />
            {isDe
              ? "Drafts als anwaltlich privilegiert kennzeichnen"
              : "Mark drafts as attorney-client privileged"}
            {privileged && (
              <span className="ml-1 inline-flex items-center rounded-md bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">
                {isDe ? "Aktiv" : "On"}
              </span>
            )}
          </span>
          <span
            id="privilege-mode-help"
            className="block mt-1 text-[11px] text-[var(--atlas-text-muted)] leading-relaxed"
          >
            {/* Bundle 29: clearer "WHEN you'd want this" copy from
                the new drafting_privilege_when key — answers the
                lawyer's actual question ("do I need this for THIS
                draft?") instead of just describing the mechanism. */}
            {t("atlas.drafting_privilege_when")}
          </span>
        </span>
      </label>

      {/* Q4: output-language toggle. Independent of UI. Marie can
          UI in EN, draft in DE. The icon-pair pattern reads as
          "draft language" without needing a long label. */}
      <div className="flex items-center gap-2 max-w-3xl rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] px-4 py-2.5">
        <Languages
          size={14}
          strokeWidth={1.8}
          className="text-[var(--atlas-text-faint)]"
          aria-hidden="true"
        />
        <span className="text-[12px] text-[var(--atlas-text-secondary)]">
          {isDe ? "Entwurfssprache:" : "Draft language:"}
        </span>
        <div
          role="radiogroup"
          aria-label={isDe ? "Entwurfssprache" : "Draft language"}
          className="flex items-center gap-0.5 rounded-md border border-[var(--atlas-border)] p-0.5"
        >
          {(["de", "en"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              role="radio"
              aria-checked={outputLang === lang}
              onClick={() => setOutputLang(lang)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                outputLang === lang
                  ? "bg-[var(--atlas-action-bg)] text-[var(--atlas-action-text)]"
                  : "text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)]"
              }`}
            >
              {lang === "de" ? "Deutsch" : "English"}
            </button>
          ))}
        </div>
        {outputLang !== (isDe ? "de" : "en") && (
          <span className="ml-auto text-[10px] text-[var(--atlas-text-faint)] italic">
            {isDe ? `UI in DE, Entwurf in EN` : `UI in EN, draft in DE`}
          </span>
        )}
      </div>

      {/* S1 — Mandate Intake Form. Marie enters the mandate context
          ONCE and every tile inherits it (auth tile prefills via
          "Use mandate" button, brief + compare prompts get a
          "Mandate context: …" line auto-appended). Persists in
          localStorage so reload doesn't lose it. */}
      <section className="max-w-3xl rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] overflow-hidden">
        <button
          type="button"
          onClick={() => setIntakeOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
          aria-expanded={intakeOpen}
        >
          <Briefcase
            size={14}
            strokeWidth={1.8}
            className={
              intakeActive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-[var(--atlas-text-faint)]"
            }
            aria-hidden="true"
          />
          <span className="flex-1 min-w-0">
            <span className="text-[12.5px] font-medium text-[var(--atlas-text-primary)]">
              {isDe ? "Mandanten-Kontext" : "Mandate context"}
            </span>
            {intakeActive && intake.client.trim() && (
              <span className="ml-2 inline-flex items-center rounded-md bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">
                {intake.client.trim()}
              </span>
            )}
            {!intakeActive && (
              <span className="ml-2 text-[11px] text-[var(--atlas-text-muted)]">
                {isDe
                  ? "Einmal eintragen, alle Tiles ziehen daraus"
                  : "Enter once, every tile pulls from it"}
              </span>
            )}
          </span>
          {intakeOpen ? (
            <ChevronUp
              size={14}
              strokeWidth={1.8}
              className="text-[var(--atlas-text-faint)]"
              aria-hidden="true"
            />
          ) : (
            <ChevronDown
              size={14}
              strokeWidth={1.8}
              className="text-[var(--atlas-text-faint)]"
              aria-hidden="true"
            />
          )}
        </button>

        {intakeOpen && (
          <div className="border-t border-[var(--atlas-border-subtle)] p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe ? "Mandant" : "Client"}
              </label>
              <input
                type="text"
                value={intake.client}
                onChange={(e) => updateIntakeField("client", e.target.value)}
                placeholder={isDe ? "z. B. Sky-Sat GmbH" : "e.g. Sky-Sat GmbH"}
                className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none placeholder:text-[var(--atlas-text-faint)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe ? "Primäre Jurisdiktion" : "Primary jurisdiction"}
              </label>
              <select
                value={intake.primaryJurisdiction}
                onChange={(e) =>
                  updateIntakeField("primaryJurisdiction", e.target.value)
                }
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
                value={intake.operatorType}
                onChange={(e) =>
                  updateIntakeField("operatorType", e.target.value)
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
            <div className="md:col-span-2">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe ? "Satelliten-Specs" : "Satellite specs"}
              </label>
              <input
                type="text"
                value={intake.satelliteSpecs}
                onChange={(e) =>
                  updateIntakeField("satelliteSpecs", e.target.value)
                }
                placeholder={
                  isDe
                    ? "z. B. 12 LEO-Sats à 250 kg, 550 km Höhe"
                    : "e.g. 12 LEO sats × 250 kg, 550 km altitude"
                }
                className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none placeholder:text-[var(--atlas-text-faint)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe ? "Missionsprofil" : "Mission profile"}
              </label>
              <input
                type="text"
                value={intake.missionProfile}
                onChange={(e) =>
                  updateIntakeField("missionProfile", e.target.value)
                }
                placeholder={
                  isDe ? "z. B. EO optical + SAR" : "e.g. EO optical + SAR"
                }
                className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none placeholder:text-[var(--atlas-text-faint)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe ? "Frequenzen" : "Frequencies"}
              </label>
              <input
                type="text"
                value={intake.frequencies}
                onChange={(e) =>
                  updateIntakeField("frequencies", e.target.value)
                }
                placeholder={
                  isDe ? "z. B. Ka-Band 28/18 GHz" : "e.g. Ka-band 28/18 GHz"
                }
                className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none placeholder:text-[var(--atlas-text-faint)]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe ? "Launch-Fenster" : "Launch window"}
              </label>
              <input
                type="text"
                value={intake.launchDate}
                onChange={(e) =>
                  updateIntakeField("launchDate", e.target.value)
                }
                placeholder={
                  isDe ? "z. B. Q3/2027 (Ariane 6)" : "e.g. Q3/2027 (Ariane 6)"
                }
                className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none placeholder:text-[var(--atlas-text-faint)]"
              />
            </div>
            {intakeActive && (
              <div className="md:col-span-2 flex items-center justify-between gap-2 pt-1">
                <span className="text-[10.5px] text-[var(--atlas-text-muted)] italic">
                  {isDe
                    ? "Wird automatisch in Brief- und Vergleich-Prompts eingefügt."
                    : "Auto-injected into brief and compare prompts."}
                </span>
                <button
                  type="button"
                  onClick={resetIntake}
                  className="inline-flex items-center gap-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <X size={10} strokeWidth={1.8} aria-hidden="true" />
                  {isDe ? "Mandant zurücksetzen" : "Reset mandate"}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

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
            {/* "What you'll get" preview — concrete deliverable so the
                lawyer knows what lands in their inbox before clicking. */}
            <p className="mt-2 text-[10.5px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
              {t("atlas.drafting_auth_what_youll_get")}
            </p>
          </div>
          <div className="p-4 flex flex-col gap-3 flex-1">
            {/* S1: when an intake is active, surface a one-click button
                that prefills jurisdiction + operator + mission from the
                intake. Composes the mission textarea from specs +
                profile + frequencies + launch + client. */}
            {intakeActive && (
              <button
                type="button"
                onClick={applyIntakeToAuth}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                title={
                  intake.client.trim()
                    ? `${isDe ? "Vorausfüllen mit Mandant" : "Prefill with mandate"}: ${intake.client.trim()}`
                    : isDe
                      ? "Vorausfüllen mit Mandanten-Kontext"
                      : "Prefill with mandate context"
                }
              >
                <Wand2 size={11} strokeWidth={1.8} aria-hidden="true" />
                {isDe ? "Mit Mandant befüllen" : "Use mandate"}
              </button>
            )}
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
                  /* Q5: concrete example with real-Marie content
                     instead of vague "LEO-Konstellation". Helps her
                     see the level of detail she should provide. */
                  isDe
                    ? "z. B. Sky-Sat 12-Sat-Konstellation, 550 km LEO, Ka-Band Up/Down 28-29.5 GHz, Ariane 6 Launch Q3/2027, Mandant: Sky-Sat GmbH"
                    : "e.g. Sky-Sat 12-sat constellation, 550 km LEO, Ka-band up/down 28-29.5 GHz, Ariane 6 launch Q3/2027, Client: Sky-Sat GmbH"
                }
                className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none resize-none placeholder:text-[var(--atlas-text-faint)]"
              />
            </div>
            {/* Q2: recently-used chips. Click → re-fill all auth-tile
                fields. Renders only when there's history. */}
            {recentAuth.length > 0 && (
              <div>
                <label className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                  <History size={9} strokeWidth={1.8} aria-hidden="true" />
                  {isDe ? "Zuletzt verwendet" : "Recently used"}
                </label>
                <div className="flex flex-wrap gap-1">
                  {recentAuth.map((r) => (
                    <button
                      key={r.ts}
                      type="button"
                      onClick={() => {
                        setAuthJurisdiction(r.jurisdiction);
                        setAuthOperator(
                          r.operator as (typeof OPERATOR_TYPES)[number],
                        );
                        setAuthMission(r.mission);
                      }}
                      title={r.label}
                      className="text-[10.5px] font-medium px-2 py-0.5 rounded bg-[var(--atlas-bg-inset)] hover:bg-[var(--atlas-bg-surface-muted)] text-[var(--atlas-text-secondary)] hover:text-[var(--atlas-text-primary)] transition-colors max-w-full truncate"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Q3: prompt-preview reveal. Closed by default. */}
            <div>
              <button
                type="button"
                onClick={() =>
                  setShowPromptFor((cur) => (cur === "auth" ? null : "auth"))
                }
                className="inline-flex items-center gap-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
              >
                {showPromptFor === "auth" ? (
                  <EyeOff size={10} strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <Eye size={10} strokeWidth={1.8} aria-hidden="true" />
                )}
                {isDe
                  ? showPromptFor === "auth"
                    ? "Prompt verbergen"
                    : "Prompt anzeigen"
                  : showPromptFor === "auth"
                    ? "Hide prompt"
                    : "Show prompt"}
              </button>
              {showPromptFor === "auth" && (
                <pre className="mt-1.5 text-[10.5px] text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded p-2 whitespace-pre-wrap font-mono">
                  {buildAuthPrompt()}
                </pre>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleAuthSubmit}
            className="m-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] text-[var(--atlas-action-text)] text-[12px] font-medium tracking-wide px-4 py-2.5 transition-colors"
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
            <p className="mt-2 text-[10.5px] text-blue-700 dark:text-blue-400 leading-relaxed">
              {t("atlas.drafting_brief_what_youll_get")}
            </p>
          </div>
          <div className="p-4 flex flex-col gap-3 flex-1">
            {/* S1: brief tile auto-appends the mandate context to the
                prompt — Marie doesn't need a button, just confirmation
                that the context is along for the ride. */}
            {intakeActive && (
              <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 text-[10.5px] text-emerald-800 dark:text-emerald-200">
                <Briefcase size={10} strokeWidth={1.8} aria-hidden="true" />
                {isDe ? "Mandanten-Kontext aktiv" : "Mandate context active"}
                {intake.client.trim() && (
                  <span className="ml-0.5 font-semibold">
                    · {intake.client.trim()}
                  </span>
                )}
              </div>
            )}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe ? "Thema" : "Topic"}
              </label>
              <textarea
                value={briefTopic}
                onChange={(e) => setBriefTopic(e.target.value)}
                rows={6}
                placeholder={
                  /* Q5: concrete examples grounded in real Marie tickets.
                     The previous placeholder was already serviceable;
                     keep it. */
                  isDe
                    ? "z. B. Post-Mission Disposal Compliance über mehrere Jurisdiktionen, ITU-Frequenz-Lifecycle, Cross-Border Liability bei Satelliten-Kollisionen…"
                    : "e.g. post-mission disposal compliance across jurisdictions, ITU frequency lifecycle, cross-border liability for satellite collisions…"
                }
                className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none resize-none placeholder:text-[var(--atlas-text-faint)]"
              />
            </div>
            {/* Q1: topic preset-chips. Click to fill the textarea with a
                canonical phrasing of one of the four most-frequent
                compliance-brief topics. Free-text still works alongside. */}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe ? "Häufige Themen" : "Common topics"}
              </label>
              <div className="flex flex-wrap gap-1">
                {BRIEF_TOPIC_PRESETS.map((preset) => {
                  const label = isDe ? preset.de : preset.en;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setBriefTopic(label)}
                      className="text-[10.5px] font-medium px-2 py-0.5 rounded border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface-muted)] hover:bg-[var(--atlas-bg-inset)] text-[var(--atlas-text-secondary)] hover:text-[var(--atlas-text-primary)] transition-colors"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Q2: recently-used brief topics. Click → re-fill textarea. */}
            {recentBrief.length > 0 && (
              <div>
                <label className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                  <History size={9} strokeWidth={1.8} aria-hidden="true" />
                  {isDe ? "Zuletzt verwendet" : "Recently used"}
                </label>
                <div className="flex flex-wrap gap-1">
                  {recentBrief.map((r) => (
                    <button
                      key={r.ts}
                      type="button"
                      onClick={() => setBriefTopic(r.topic)}
                      title={r.topic}
                      className="text-[10.5px] font-medium px-2 py-0.5 rounded bg-[var(--atlas-bg-inset)] hover:bg-[var(--atlas-bg-surface-muted)] text-[var(--atlas-text-secondary)] hover:text-[var(--atlas-text-primary)] transition-colors max-w-full truncate"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Q3: prompt-preview reveal. Closed by default. */}
            <div>
              <button
                type="button"
                onClick={() =>
                  setShowPromptFor((cur) => (cur === "brief" ? null : "brief"))
                }
                className="inline-flex items-center gap-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
              >
                {showPromptFor === "brief" ? (
                  <EyeOff size={10} strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <Eye size={10} strokeWidth={1.8} aria-hidden="true" />
                )}
                {isDe
                  ? showPromptFor === "brief"
                    ? "Prompt verbergen"
                    : "Prompt anzeigen"
                  : showPromptFor === "brief"
                    ? "Hide prompt"
                    : "Show prompt"}
              </button>
              {showPromptFor === "brief" && (
                <pre className="mt-1.5 text-[10.5px] text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded p-2 whitespace-pre-wrap font-mono">
                  {briefTopic.trim()
                    ? buildBriefPrompt()
                    : isDe
                      ? "(Thema eingeben, um den Prompt zu sehen)"
                      : "(enter a topic to see the prompt)"}
                </pre>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={!briefTopic.trim()}
            onClick={handleBriefSubmit}
            className="m-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] disabled:opacity-50 disabled:hover:bg-[var(--atlas-action-bg)] disabled:cursor-not-allowed text-[var(--atlas-action-text)] text-[12px] font-medium tracking-wide px-4 py-2.5 transition-colors"
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
            <p className="mt-2 text-[10.5px] text-violet-700 dark:text-violet-400 leading-relaxed">
              {t("atlas.drafting_compare_what_youll_get")}
            </p>
          </div>
          <div className="p-4 flex flex-col gap-3 flex-1">
            {/* S1: when an intake is active, surface a button that
                ensures the primary jurisdiction is in the comparison
                set + the mandate context auto-injects into the prompt. */}
            {intakeActive && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1">
                <span className="inline-flex items-center gap-1.5 text-[10.5px] text-emerald-800 dark:text-emerald-200">
                  <Briefcase size={10} strokeWidth={1.8} aria-hidden="true" />
                  {isDe ? "Mandanten-Kontext aktiv" : "Mandate context active"}
                  {intake.client.trim() && (
                    <span className="ml-0.5 font-semibold">
                      · {intake.client.trim()}
                    </span>
                  )}
                </span>
                {!compareJurisdictions.includes(intake.primaryJurisdiction) && (
                  <button
                    type="button"
                    onClick={applyIntakeToCompare}
                    title={
                      isDe
                        ? `${intake.primaryJurisdiction} hinzufügen`
                        : `Add ${intake.primaryJurisdiction}`
                    }
                    className="inline-flex items-center gap-1 text-[10.5px] font-medium text-emerald-800 dark:text-emerald-200 hover:underline"
                  >
                    <Wand2 size={9} strokeWidth={1.8} aria-hidden="true" />+
                    {intake.primaryJurisdiction}
                  </button>
                )}
              </div>
            )}
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
            {/* Q2: recently-used jurisdiction-sets. Click → restore the
                whole selection (replace, not merge — Marie expects the
                chip to faithfully reproduce the prior comparison). */}
            {recentCompare.length > 0 && (
              <div>
                <label className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                  <History size={9} strokeWidth={1.8} aria-hidden="true" />
                  {isDe ? "Zuletzt verglichen" : "Recently compared"}
                </label>
                <div className="flex flex-wrap gap-1">
                  {recentCompare.map((r) => (
                    <button
                      key={r.ts}
                      type="button"
                      onClick={() => setCompareJurisdictions(r.jurisdictions)}
                      title={r.label}
                      className="text-[10.5px] font-medium px-2 py-0.5 rounded bg-[var(--atlas-bg-inset)] hover:bg-[var(--atlas-bg-surface-muted)] text-[var(--atlas-text-secondary)] hover:text-[var(--atlas-text-primary)] transition-colors max-w-full truncate"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Q3: prompt-preview reveal. Closed by default. */}
            <div>
              <button
                type="button"
                onClick={() =>
                  setShowPromptFor((cur) =>
                    cur === "compare" ? null : "compare",
                  )
                }
                className="inline-flex items-center gap-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
              >
                {showPromptFor === "compare" ? (
                  <EyeOff size={10} strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <Eye size={10} strokeWidth={1.8} aria-hidden="true" />
                )}
                {isDe
                  ? showPromptFor === "compare"
                    ? "Prompt verbergen"
                    : "Prompt anzeigen"
                  : showPromptFor === "compare"
                    ? "Hide prompt"
                    : "Show prompt"}
              </button>
              {showPromptFor === "compare" && (
                <pre className="mt-1.5 text-[10.5px] text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded p-2 whitespace-pre-wrap font-mono">
                  {compareJurisdictions.length >= 2
                    ? buildComparePrompt()
                    : isDe
                      ? "(Mindestens zwei Jurisdiktionen wählen)"
                      : "(select at least two jurisdictions)"}
                </pre>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={compareJurisdictions.length < 2}
            onClick={handleCompareSubmit}
            className="m-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] disabled:opacity-50 disabled:hover:bg-[var(--atlas-action-bg)] disabled:cursor-not-allowed text-[var(--atlas-action-text)] text-[12px] font-medium tracking-wide px-4 py-2.5 transition-colors"
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
