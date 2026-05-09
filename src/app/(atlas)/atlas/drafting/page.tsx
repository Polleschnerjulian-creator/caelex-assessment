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
  Library,
  Tag,
  FileSignature,
  Mail,
  Layers,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { ALL_SOURCES } from "@/data/legal-sources";
import { openAIMode } from "@/components/atlas/AIModeLauncher";
import {
  getRecentAuth,
  getRecentBrief,
  getRecentCompare,
  getRecentNda,
  getRecentCover,
  pushRecentAuth,
  pushRecentBrief,
  pushRecentCompare,
  pushRecentNda,
  pushRecentCover,
  pushDraftLibrary,
  type RecentAuthEntry,
  type RecentBriefEntry,
  type RecentCompareEntry,
  type RecentNdaEntry,
  type RecentCoverEntry,
} from "@/lib/atlas/drafting-history";
import {
  isIntakeActive,
  composeMandateContext,
  EMPTY_INTAKE,
  type MandateIntake,
} from "@/lib/atlas/mandate-intake";
import {
  getMandateStore,
  setActiveMandate,
  createMandate,
  updateMandate,
  deleteMandate,
  type Mandate,
} from "@/lib/atlas/mandate-store";
import { getClauses, type Clause } from "@/lib/atlas/clause-library";
import {
  AUTHORITY_TEMPLATES,
  buildAuthorityDirective,
  listAuthoritiesForJurisdiction,
  getAuthorityTemplate,
} from "@/lib/atlas/authority-templates";
import {
  buildExtractionPrompt,
  parseExtractionResponse,
  mergeIntoIntake,
} from "@/lib/atlas/intake-extractor";

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
  /* Bundle 37: per-authority template. "" = no template (generic
     output). Auto-defaulted from jurisdiction when changed. */
  const [authAuthorityId, setAuthAuthorityId] = useState<string>("");

  // ── Brief tile state ──
  const [briefTopic, setBriefTopic] = useState("");

  // ── Compare tile state ──
  const [compareJurisdictions, setCompareJurisdictions] = useState<string[]>([
    "DE",
    "FR",
    "UK",
    "LU",
  ]);

  // ── NDA tile state (Bundle 34, S4) ──
  const [ndaType, setNdaType] = useState<"mutual" | "one_way">("mutual");
  const [ndaPartyA, setNdaPartyA] = useState("");
  const [ndaPartyB, setNdaPartyB] = useState("");
  const [ndaJurisdiction, setNdaJurisdiction] = useState("DE");
  const [ndaTermYears, setNdaTermYears] = useState("3");

  // ── Filing-Cover-Letter tile state (Bundle 34, S4) ──
  const [coverFilingType, setCoverFilingType] = useState<
    "authorization" | "notification" | "renewal" | "amendment"
  >("authorization");
  const [coverAuthority, setCoverAuthority] = useState("");
  const [coverReference, setCoverReference] = useState("");
  /* Bundle 37: cover-letter authority template. When set, the
     coverAuthority free-text gets prefilled with the template's name. */
  const [coverAuthorityId, setCoverAuthorityId] = useState<string>("");

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
    null | "auth" | "brief" | "compare" | "nda" | "cover"
  >(null);

  /* Q2 — recently-used per tile. Hydrate on mount; refresh after
     each dispatch via the push helpers. */
  const [recentAuth, setRecentAuth] = useState<RecentAuthEntry[]>([]);
  const [recentBrief, setRecentBrief] = useState<RecentBriefEntry[]>([]);
  const [recentCompare, setRecentCompare] = useState<RecentCompareEntry[]>([]);
  const [recentNda, setRecentNda] = useState<RecentNdaEntry[]>([]);
  const [recentCover, setRecentCover] = useState<RecentCoverEntry[]>([]);
  useEffect(() => {
    setRecentAuth(getRecentAuth());
    setRecentBrief(getRecentBrief());
    setRecentCompare(getRecentCompare());
    setRecentNda(getRecentNda());
    setRecentCover(getRecentCover());
  }, []);

  /* S1+B1 — multi-mandate store. The active mandate's intake is the
     shape used by the existing tiles; mandates beyond the active one
     stay quiet in storage but show up in the switcher dropdown.
     Hydrated after mount to avoid SSR drift; the legacy single-intake
     localStorage key is migrated on first read inside getMandateStore. */
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [activeMandateId, setActiveMandateIdState] = useState<string | null>(
    null,
  );
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intakeHydrated, setIntakeHydrated] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  /* Pull the active mandate's intake (or EMPTY_INTAKE when none active)
     so the existing tile UI keeps using the same shape. */
  const activeMandate = useMemo(
    () => mandates.find((m) => m.id === activeMandateId) ?? null,
    [mandates, activeMandateId],
  );
  const intake: MandateIntake = activeMandate?.intake ?? EMPTY_INTAKE;

  const refreshMandates = () => {
    const store = getMandateStore();
    setMandates(store.mandates);
    setActiveMandateIdState(store.activeMandateId);
  };

  useEffect(() => {
    const store = getMandateStore();
    setMandates(store.mandates);
    setActiveMandateIdState(store.activeMandateId);
    /* Auto-expand the intake panel only if there's no active mandate
       (i.e. nothing to use as a starting context). */
    const active = store.mandates.find((m) => m.id === store.activeMandateId);
    setIntakeOpen(!active || !isIntakeActive(active.intake));
    setIntakeHydrated(true);
  }, []);

  const updateIntakeField = <K extends keyof MandateIntake>(
    field: K,
    value: MandateIntake[K],
  ) => {
    if (!activeMandateId) {
      /* Without an active mandate, create one on first edit so the
         lawyer never has to think "which mandate am I in" before
         typing — the field they touch implicitly creates the mandate. */
      const m = createMandate({
        intake: { ...EMPTY_INTAKE, [field]: value },
      });
      refreshMandates();
      /* Switcher also benefits from a name update once the client name
         is known — handled via the rename-on-client-change effect below. */
      void m;
      return;
    }
    updateMandate(activeMandateId, {
      intake: { ...intake, [field]: value },
      /* If the field being edited is the client name AND the mandate's
         display name still matches the prior client, auto-rename so the
         switcher chip stays informative. */
      ...(field === "client" &&
      activeMandate &&
      (activeMandate.name === activeMandate.intake.client.trim() ||
        activeMandate.name.startsWith("Mandant "))
        ? { name: (value as string).trim() || activeMandate.name }
        : {}),
    });
    refreshMandates();
  };

  const resetIntake = () => {
    /* "Reset" in the multi-mandate world means delete the active
       mandate. Marie can always create a fresh one. */
    if (!activeMandateId) return;
    deleteMandate(activeMandateId);
    refreshMandates();
    setIntakeOpen(true);
  };

  const handleSwitchMandate = (id: string) => {
    setActiveMandate(id);
    refreshMandates();
    setSwitcherOpen(false);
  };

  const handleCreateMandate = () => {
    createMandate({});
    refreshMandates();
    setIntakeOpen(true);
    setSwitcherOpen(false);
  };

  const handleRenameMandate = (id: string, name: string) => {
    updateMandate(id, { name: name.trim() || "Mandant" });
    refreshMandates();
  };

  /* B4 — client-fact extractor state. Two textareas: paste mandant
     email → fire extraction prompt → paste back AI's JSON → apply. */
  const [extractorOpen, setExtractorOpen] = useState(false);
  const [extractorEmail, setExtractorEmail] = useState("");
  const [extractorJson, setExtractorJson] = useState("");
  const [extractorError, setExtractorError] = useState<string | null>(null);

  const handleSendExtractionPrompt = () => {
    if (!extractorEmail.trim()) return;
    const prompt = buildExtractionPrompt(
      extractorEmail,
      outputLang === "de" ? "de" : "en",
    );
    openAIMode({ prompt });
  };

  const handleApplyExtraction = () => {
    setExtractorError(null);
    const parsed = parseExtractionResponse(extractorJson);
    if (!parsed) {
      setExtractorError(
        isDe
          ? "Konnte kein JSON in der Antwort finden."
          : "Couldn't find JSON in the response.",
      );
      return;
    }
    if (Object.keys(parsed).length === 0) {
      setExtractorError(
        isDe
          ? "JSON ist leer — kein einziges Feld extrahiert."
          : "JSON is empty — no fields extracted.",
      );
      return;
    }
    /* If no active mandate, create one. Otherwise merge into the
       existing mandate's intake (extraction never erases). */
    if (!activeMandateId) {
      createMandate({ intake: parsed });
    } else {
      const merged = mergeIntoIntake(intake, parsed);
      updateMandate(activeMandateId, { intake: merged });
    }
    refreshMandates();
    /* Reset state so a successful apply doesn't keep stale text around. */
    setExtractorEmail("");
    setExtractorJson("");
    setExtractorOpen(false);
  };

  const intakeActive = intakeHydrated && isIntakeActive(intake);

  /* When intake is active, compose the per-language context string
     once per render and reuse it in builders + UI hints. */
  const mandateContext = intakeActive
    ? composeMandateContext(intake, outputLang === "de" ? "de" : "en")
    : "";

  /* S3 — Clause attachments. Session-wide (not per-tile) so Marie can
     attach the boilerplate once and dispatch any of the three tiles
     with the same clauses included. Refreshes from localStorage on
     mount + when the picker opens. */
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [attachedClauseIds, setAttachedClauseIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [clausePickerOpen, setClausePickerOpen] = useState(false);
  useEffect(() => {
    setClauses(getClauses());
  }, []);
  /* Reload clauses when the picker opens — the user may have added a
     clause on /atlas/drafting/clauses since the page first mounted. */
  useEffect(() => {
    if (clausePickerOpen) setClauses(getClauses());
  }, [clausePickerOpen]);

  const attachedClauses = useMemo(
    () => clauses.filter((c) => attachedClauseIds.has(c.id)),
    [clauses, attachedClauseIds],
  );

  const toggleAttachClause = (id: string) => {
    const next = new Set(attachedClauseIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setAttachedClauseIds(next);
  };

  /* Compose the clause-directive block. Empty string when no clauses
     attached. Builders append this at the end of every prompt so the
     model sees the boilerplate as a verbatim-include directive, not
     as suggestion to paraphrase. */
  const clauseDirective = useMemo(() => {
    if (attachedClauses.length === 0) return "";
    const heading =
      outputLang === "de"
        ? "Folgende Standard-Klauseln wortgetreu in den Entwurf einbauen:"
        : "Include the following standard clauses verbatim in the draft:";
    const blocks = attachedClauses
      .map(
        (c) =>
          `--- ${c.name}${c.jurisdiction ? ` (${c.jurisdiction})` : ""} ---\n${c.content}`,
      )
      .join("\n\n");
    return `\n\n${heading}\n\n${blocks}`;
  }, [attachedClauses, outputLang]);

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
    /* B2: authority-template directive appended after the mission.
       Empty when no authority is selected. */
    const authorityDirective = buildAuthorityDirective(
      authAuthorityId,
      outputDe ? "de" : "en",
    );
    /* S3: clause-directive appended at the end so the model sees it
       as a "include verbatim" instruction, not as part of the mission. */
    return withPrivilege(
      (outputDe ? baseDe : baseEn) +
        mission +
        authorityDirective +
        clauseDirective,
    );
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
    return withPrivilege(base + ctx + clauseDirective);
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
    return withPrivilege(base + ctx + clauseDirective);
  };

  /* Bundle 34 — NDA prompt builder. Reciprocal vs one-way changes
     the drafting style (mutual obligations vs one-direction). */
  const buildNdaPrompt = (): string => {
    const aRaw = ndaPartyA.trim();
    const bRaw = ndaPartyB.trim();
    const a = aRaw || (outputDe ? "[Partei A]" : "[Party A]");
    const b = bRaw || (outputDe ? "[Partei B]" : "[Party B]");
    const term = ndaTermYears.trim() || "3";
    const baseDe =
      ndaType === "mutual"
        ? `Erstelle einen wechselseitigen NDA (Mutual Non-Disclosure Agreement) zwischen ${a} und ${b}. Geltendes Recht: ${ndaJurisdiction}. Laufzeit: ${term} Jahre.`
        : `Erstelle einen einseitigen NDA (One-Way Non-Disclosure Agreement) — ${a} als Disclosing Party, ${b} als Receiving Party. Geltendes Recht: ${ndaJurisdiction}. Laufzeit: ${term} Jahre.`;
    const baseEn =
      ndaType === "mutual"
        ? `Draft a mutual non-disclosure agreement between ${a} and ${b}. Governing law: ${ndaJurisdiction}. Term: ${term} years.`
        : `Draft a one-way non-disclosure agreement — ${a} as disclosing party, ${b} as receiving party. Governing law: ${ndaJurisdiction}. Term: ${term} years.`;
    const ctx = mandateContext
      ? outputDe
        ? ` Mandanten-Kontext: ${mandateContext}.`
        : ` Mandate context: ${mandateContext}.`
      : "";
    return withPrivilege((outputDe ? baseDe : baseEn) + ctx + clauseDirective);
  };

  /* Bundle 34 — Filing-Cover-Letter prompt builder. */
  const buildCoverPrompt = (): string => {
    const filingTypeLabelsDe: Record<typeof coverFilingType, string> = {
      authorization: "Erstantrag (Genehmigung)",
      notification: "Notifikation",
      renewal: "Verlängerung",
      amendment: "Änderung",
    };
    const filingTypeLabelsEn: Record<typeof coverFilingType, string> = {
      authorization: "initial authorization application",
      notification: "notification",
      renewal: "renewal",
      amendment: "amendment",
    };
    const fLabel = outputDe
      ? filingTypeLabelsDe[coverFilingType]
      : filingTypeLabelsEn[coverFilingType];
    const auth =
      coverAuthority.trim() || (outputDe ? "[Behörde]" : "[Authority]");
    const ref = coverReference.trim()
      ? outputDe
        ? ` Aktenzeichen: ${coverReference.trim()}.`
        : ` Reference: ${coverReference.trim()}.`
      : "";
    const baseEn = `Draft a cover letter for a ${fLabel} filing addressed to ${auth}.${ref} Include standard salutation, identifying section, list of enclosed documents placeholder, and closing block.`;
    const baseDe = `Erstelle ein Anschreiben für eine ${fLabel} an ${auth}.${ref} Inklusive Standard-Anrede, Identifikations-Block, Anlagen-Verzeichnis-Platzhalter und Abschlussblock.`;
    const ctx = mandateContext
      ? outputDe
        ? ` Mandanten-Kontext: ${mandateContext}.`
        : ` Mandate context: ${mandateContext}.`
      : "";
    /* B2: authority-template directive appended for cover letters too —
       this is the tile where house-style mismatch is most visible. */
    const authorityDirective = buildAuthorityDirective(
      coverAuthorityId,
      outputDe ? "de" : "en",
    );
    return withPrivilege(
      (outputDe ? baseDe : baseEn) + ctx + authorityDirective + clauseDirective,
    );
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
      mandateId: activeMandate?.id,
      mandateName: activeMandate?.name,
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
      mandateId: activeMandate?.id,
      mandateName: activeMandate?.name,
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
      mandateId: activeMandate?.id,
      mandateName: activeMandate?.name,
    });
  };

  const toggleCompareJurisdiction = (j: string) => {
    setCompareJurisdictions((prev) =>
      prev.includes(j) ? prev.filter((p) => p !== j) : [...prev, j],
    );
  };

  /* Bundle 34 — NDA dispatch handler. */
  const handleNdaSubmit = () => {
    /* Allow dispatch with placeholder party names so a partner can
       review the structure before plugging client names — but if a
       lawyer typed something, store it for "recently used". */
    const prompt = buildNdaPrompt();
    openAIMode({ prompt });
    const a = ndaPartyA.trim() || (outputDe ? "[A]" : "[A]");
    const b = ndaPartyB.trim() || (outputDe ? "[B]" : "[B]");
    const typeLabel =
      ndaType === "mutual"
        ? outputDe
          ? "wechselseitig"
          : "mutual"
        : outputDe
          ? "einseitig"
          : "one-way";
    const label = `${typeLabel} · ${a} ↔ ${b} · ${ndaJurisdiction} · ${ndaTermYears}J`;
    pushRecentNda({
      ndaType,
      partyA: ndaPartyA,
      partyB: ndaPartyB,
      jurisdiction: ndaJurisdiction,
      termYears: ndaTermYears,
      label,
    });
    setRecentNda(getRecentNda());
    pushDraftLibrary({
      kind: "nda",
      title: label,
      prompt,
      outputLocale: outputLang,
      privileged,
      mandateId: activeMandate?.id,
      mandateName: activeMandate?.name,
    });
  };

  /* Bundle 34 — Filing-Cover-Letter dispatch handler. */
  const handleCoverSubmit = () => {
    if (!coverAuthority.trim()) return;
    const prompt = buildCoverPrompt();
    openAIMode({ prompt });
    const fLabelDe: Record<typeof coverFilingType, string> = {
      authorization: "Genehmigung",
      notification: "Notifikation",
      renewal: "Verlängerung",
      amendment: "Änderung",
    };
    const fLabelEn: Record<typeof coverFilingType, string> = {
      authorization: "Authorization",
      notification: "Notification",
      renewal: "Renewal",
      amendment: "Amendment",
    };
    const fLabel = (outputDe ? fLabelDe : fLabelEn)[coverFilingType];
    const label = `${fLabel} → ${coverAuthority.trim()}${coverReference.trim() ? ` · ${coverReference.trim()}` : ""}`;
    pushRecentCover({
      filingType: coverFilingType,
      authority: coverAuthority,
      reference: coverReference,
      label,
    });
    setRecentCover(getRecentCover());
    pushDraftLibrary({
      kind: "cover",
      title: label,
      prompt,
      outputLocale: outputLang,
      privileged,
      mandateId: activeMandate?.id,
      mandateName: activeMandate?.name,
    });
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
        <div className="flex items-center gap-3">
          {/* Bundle 33: clause-library shortcut. Same lightweight link
              treatment as the My Drafts entry. */}
          <Link
            href="/atlas/drafting/clauses"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
          >
            <Library size={11} strokeWidth={1.8} aria-hidden="true" />
            {isDe ? "Klauseln" : "Clauses"}
          </Link>
          {/* Bundle 32: link to the My Drafts library. Surfaces only
              after hydration so the count badge doesn't pop in late. */}
          <Link
            href="/atlas/drafting/history"
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
          >
            <History size={11} strokeWidth={1.8} aria-hidden="true" />
            {isDe ? "Meine Entwürfe" : "My Drafts"}
          </Link>
        </div>
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

      {/* S1+B1 — Mandate context panel. Now backed by the multi-
          mandate store: a switcher chip in the header lets Marie
          flip between saved mandates without losing any of them. */}
      <section className="max-w-3xl rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5">
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
          <span className="flex-shrink-0 text-[12.5px] font-medium text-[var(--atlas-text-primary)]">
            {isDe ? "Mandant" : "Mandate"}
          </span>

          {/* Switcher chip — opens a popover listing all mandates
              + "create new" CTA. */}
          <div className="relative flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setSwitcherOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface-muted)] px-2 py-1 text-[11.5px] text-[var(--atlas-text-primary)] hover:border-[var(--atlas-border-strong)] transition-colors max-w-full"
              aria-expanded={switcherOpen}
              aria-haspopup="listbox"
            >
              <span className="truncate">
                {activeMandate
                  ? activeMandate.name
                  : isDe
                    ? "Kein Mandant aktiv"
                    : "No active mandate"}
              </span>
              <ChevronDown
                size={11}
                strokeWidth={1.8}
                aria-hidden="true"
                className="text-[var(--atlas-text-faint)]"
              />
            </button>
            {switcherOpen && (
              <div
                role="listbox"
                className="absolute left-0 top-full mt-1 z-10 w-72 rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-lg overflow-hidden"
              >
                <div className="max-h-56 overflow-y-auto">
                  {mandates.length === 0 && (
                    <div className="px-3 py-2 text-[11px] text-[var(--atlas-text-muted)] italic">
                      {isDe ? "Noch keine Mandate" : "No mandates yet"}
                    </div>
                  )}
                  {mandates.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="option"
                      aria-selected={m.id === activeMandateId}
                      onClick={() => handleSwitchMandate(m.id)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-[11.5px] transition-colors ${
                        m.id === activeMandateId
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                          : "text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-surface-muted)]"
                      }`}
                    >
                      <span className="truncate">{m.name}</span>
                      {m.id === activeMandateId && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider">
                          {isDe ? "Aktiv" : "Active"}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleCreateMandate}
                  className="w-full flex items-center gap-1.5 px-3 py-2 text-[11.5px] font-medium text-emerald-700 dark:text-emerald-400 border-t border-[var(--atlas-border-subtle)] hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
                >
                  <Wand2 size={11} strokeWidth={1.8} aria-hidden="true" />
                  {isDe ? "Neuer Mandant" : "New mandate"}
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIntakeOpen((o) => !o)}
            className="ml-auto inline-flex items-center justify-center w-7 h-7 rounded text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-primary)] hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
            aria-expanded={intakeOpen}
            aria-label={
              intakeOpen
                ? isDe
                  ? "Panel einklappen"
                  : "Collapse panel"
                : isDe
                  ? "Panel ausklappen"
                  : "Expand panel"
            }
          >
            {intakeOpen ? (
              <ChevronUp size={14} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
            )}
          </button>
        </div>

        {intakeOpen && (
          <div className="border-t border-[var(--atlas-border-subtle)] p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* B4: client-fact extractor row. Spans both columns at the
                top of the panel so it's the first thing Marie sees when
                a new mandate email lands. */}
            <div className="md:col-span-2 -m-1 mb-2 rounded-md border border-[var(--atlas-border-subtle)] bg-[var(--atlas-bg-surface-muted)]">
              <button
                type="button"
                onClick={() => {
                  setExtractorOpen((o) => !o);
                  setExtractorError(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[var(--atlas-bg-inset)] transition-colors text-[11.5px] text-[var(--atlas-text-secondary)]"
                aria-expanded={extractorOpen}
              >
                <Wand2
                  size={11}
                  strokeWidth={1.8}
                  aria-hidden="true"
                  className="text-emerald-600"
                />
                {isDe
                  ? "Aus Mandant-E-Mail extrahieren"
                  : "Extract from client email"}
                {extractorOpen ? (
                  <ChevronUp
                    size={11}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className="ml-auto text-[var(--atlas-text-faint)]"
                  />
                ) : (
                  <ChevronDown
                    size={11}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className="ml-auto text-[var(--atlas-text-faint)]"
                  />
                )}
              </button>
              {extractorOpen && (
                <div className="border-t border-[var(--atlas-border-subtle)] p-3 flex flex-col gap-2">
                  <p className="text-[10.5px] text-[var(--atlas-text-muted)] leading-relaxed">
                    {isDe
                      ? `1. Mandant-E-Mail unten einfügen → 2. "An Astra senden" → 3. Astras JSON-Antwort kopieren → 4. Hier einfügen → 5. "Anwenden".`
                      : `1. Paste the client email below → 2. Click "Send to Astra" → 3. Copy Astra's JSON response → 4. Paste here → 5. Click "Apply".`}
                  </p>
                  <textarea
                    value={extractorEmail}
                    onChange={(e) => setExtractorEmail(e.target.value)}
                    rows={4}
                    placeholder={
                      isDe
                        ? "Hier den E-Mail-Text vom Mandanten einfügen…"
                        : "Paste the client email here…"
                    }
                    className="w-full rounded bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2 py-1.5 text-[11.5px] text-[var(--atlas-text-primary)] outline-none resize-y placeholder:text-[var(--atlas-text-faint)]"
                  />
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleSendExtractionPrompt}
                      disabled={!extractorEmail.trim()}
                      className="inline-flex items-center gap-1.5 rounded bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--atlas-action-text)] text-[11px] font-medium px-3 py-1 transition-colors"
                    >
                      <Sparkles
                        size={10}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                      {isDe ? "An Astra senden" : "Send to Astra"}
                    </button>
                  </div>
                  <textarea
                    value={extractorJson}
                    onChange={(e) => {
                      setExtractorJson(e.target.value);
                      setExtractorError(null);
                    }}
                    rows={4}
                    placeholder={
                      isDe
                        ? "Astras JSON-Antwort hier einfügen…"
                        : "Paste Astra's JSON response here…"
                    }
                    className="w-full rounded bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2 py-1.5 text-[11.5px] text-[var(--atlas-text-primary)] outline-none resize-y font-mono placeholder:text-[var(--atlas-text-faint)]"
                  />
                  {extractorError && (
                    <p className="text-[10.5px] text-red-700 dark:text-red-400 italic">
                      {extractorError}
                    </p>
                  )}
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleApplyExtraction}
                      disabled={!extractorJson.trim()}
                      className="inline-flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-medium px-3 py-1 transition-colors"
                    >
                      <Wand2 size={10} strokeWidth={1.8} aria-hidden="true" />
                      {isDe ? "Anwenden" : "Apply"}
                    </button>
                  </div>
                </div>
              )}
            </div>
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

      {/* S3 — Clause attachment panel. Session-wide. The same set of
          attached clauses is appended to every dispatched prompt
          (auth / brief / compare) as a verbatim-include directive.
          Only renders the toggle when there are saved clauses to pick
          from; otherwise nudges Marie toward /atlas/drafting/clauses. */}
      <section className="max-w-3xl rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] overflow-hidden">
        <button
          type="button"
          onClick={() => setClausePickerOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
          aria-expanded={clausePickerOpen}
        >
          <Library
            size={14}
            strokeWidth={1.8}
            className={
              attachedClauses.length > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-[var(--atlas-text-faint)]"
            }
            aria-hidden="true"
          />
          <span className="flex-1 min-w-0">
            <span className="text-[12.5px] font-medium text-[var(--atlas-text-primary)]">
              {isDe ? "Standard-Klauseln" : "Standard clauses"}
            </span>
            {attachedClauses.length > 0 ? (
              <span className="ml-2 inline-flex items-center rounded-md bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">
                {attachedClauses.length}
                {isDe ? " angeheftet" : " attached"}
              </span>
            ) : (
              <span className="ml-2 text-[11px] text-[var(--atlas-text-muted)]">
                {isDe
                  ? "Boilerplate auswählen, die jeder Entwurf verbatim enthalten soll"
                  : "Pick boilerplate every draft should include verbatim"}
              </span>
            )}
          </span>
          {clausePickerOpen ? (
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

        {clausePickerOpen && (
          <div className="border-t border-[var(--atlas-border-subtle)] p-4 flex flex-col gap-2">
            {clauses.length === 0 ? (
              <div className="flex flex-col items-center text-center gap-2 py-4">
                <p className="text-[12px] text-[var(--atlas-text-muted)]">
                  {isDe
                    ? "Du hast noch keine Klauseln gespeichert."
                    : "You haven't saved any clauses yet."}
                </p>
                <Link
                  href="/atlas/drafting/clauses"
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  <Library size={11} strokeWidth={1.8} aria-hidden="true" />
                  {isDe
                    ? "Erste Klausel anlegen →"
                    : "Create your first clause →"}
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                  {clauses.map((c) => {
                    const attached = attachedClauseIds.has(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleAttachClause(c.id)}
                        title={c.content.slice(0, 200)}
                        className={`text-[11px] font-medium px-2 py-1 rounded border transition-colors flex items-center gap-1 ${
                          attached
                            ? "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-400/40 text-emerald-800 dark:text-emerald-200"
                            : "bg-[var(--atlas-bg-surface-muted)] border-[var(--atlas-border)] text-[var(--atlas-text-secondary)] hover:text-[var(--atlas-text-primary)]"
                        }`}
                      >
                        {attached && (
                          <Tag size={9} strokeWidth={1.8} aria-hidden="true" />
                        )}
                        {c.name}
                        {c.jurisdiction && (
                          <span className="opacity-70 text-[9.5px]">
                            · {c.jurisdiction}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[10.5px] text-[var(--atlas-text-muted)] italic">
                    {attachedClauses.length === 0
                      ? isDe
                        ? "Klick eine Klausel an, um sie an den nächsten Entwurf anzuhängen."
                        : "Click a clause to attach it to the next dispatched draft."
                      : isDe
                        ? `Wird in jeden Entwurf wortgetreu eingebaut.`
                        : `Will be included verbatim in every dispatched draft.`}
                  </span>
                  <Link
                    href="/atlas/drafting/clauses"
                    className="text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
                  >
                    {isDe ? "Klauseln verwalten →" : "Manage clauses →"}
                  </Link>
                </div>
              </>
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
            {/* B2: authority-template selector. Optional. Filtered to
                authorities matching the selected jurisdiction first;
                falls back to "all" so cross-border filings work too. */}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe
                  ? "Behörden-Template (optional)"
                  : "Authority template (optional)"}
              </label>
              <select
                value={authAuthorityId}
                onChange={(e) => setAuthAuthorityId(e.target.value)}
                className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none cursor-pointer"
              >
                <option value="">
                  {isDe ? "— Generisch —" : "— Generic —"}
                </option>
                {(() => {
                  const matching =
                    listAuthoritiesForJurisdiction(authJurisdiction);
                  const others = AUTHORITY_TEMPLATES.filter(
                    (a) => a.jurisdiction !== authJurisdiction,
                  );
                  return (
                    <>
                      {matching.length > 0 && (
                        <optgroup
                          label={
                            isDe
                              ? `Für ${authJurisdiction}`
                              : `For ${authJurisdiction}`
                          }
                        >
                          {matching.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label={isDe ? "Andere" : "Other"}>
                        {others.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.jurisdiction})
                          </option>
                        ))}
                      </optgroup>
                    </>
                  );
                })()}
              </select>
              {authAuthorityId && (
                <p className="mt-1 text-[10px] text-[var(--atlas-text-muted)] leading-relaxed italic">
                  {(() => {
                    const tpl = getAuthorityTemplate(authAuthorityId);
                    return tpl ? (isDe ? tpl.scope.de : tpl.scope.en) : "";
                  })()}
                </p>
              )}
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
          <div className="m-4 mt-0 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleAuthSubmit}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] text-[var(--atlas-action-text)] text-[12px] font-medium tracking-wide px-4 py-2.5 transition-colors"
            >
              <Sparkles className="h-3 w-3" strokeWidth={1.8} />
              {t("atlas.drafting_open_in_ai")}
              <ArrowRight className="h-3 w-3" strokeWidth={1.8} />
            </button>
            {/* Bundle 35 — section-by-section route. Same auth tile,
                stepwise generation. URL params carry the current
                jurisdiction + operator + lang. */}
            <Link
              href={`/atlas/drafting/auth/section-by-section?j=${authJurisdiction}&op=${authOperator}&lang=${outputLang}`}
              className="inline-flex items-center justify-center gap-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
            >
              <Layers size={10} strokeWidth={1.8} aria-hidden="true" />
              {isDe
                ? "oder Abschnitt für Abschnitt →"
                : "or step section by section →"}
            </Link>
          </div>
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

        {/* ── Tile 4: NDA (Bundle 34, S4) ── */}
        <article className="flex flex-col rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--atlas-border-subtle)]">
            <div className="flex items-center gap-2 mb-2">
              <FileSignature
                className="h-4 w-4 text-amber-600"
                strokeWidth={1.5}
              />
              <h2 className="text-[14px] font-semibold text-[var(--atlas-text-primary)]">
                {isDe ? "NDA-Entwurf" : "NDA draft"}
              </h2>
            </div>
            <p className="text-[11px] text-[var(--atlas-text-muted)] leading-relaxed">
              {isDe
                ? "Wechselseitiger oder einseitiger Geheimhaltungsvertrag — Standardstruktur, dein Wording."
                : "Mutual or one-way non-disclosure agreement — standard structure, your wording."}
            </p>
            <p className="mt-2 text-[10.5px] text-amber-700 dark:text-amber-400 leading-relaxed">
              {isDe
                ? "Liefert: Präambel, Definitionen, Geheimhaltungspflichten, Ausnahmen, Laufzeit, Salvatorische, Gerichtsstand."
                : "Returns: preamble, definitions, confidentiality obligations, exceptions, term, severability, jurisdiction."}
            </p>
          </div>
          <div className="p-4 flex flex-col gap-3 flex-1">
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
                {isDe ? "Typ" : "Type"}
              </label>
              <div
                role="radiogroup"
                aria-label={isDe ? "NDA-Typ" : "NDA type"}
                className="flex items-center gap-0.5 rounded-md border border-[var(--atlas-border)] p-0.5"
              >
                {(["mutual", "one_way"] as const).map((typ) => (
                  <button
                    key={typ}
                    type="button"
                    role="radio"
                    aria-checked={ndaType === typ}
                    onClick={() => setNdaType(typ)}
                    className={`flex-1 px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                      ndaType === typ
                        ? "bg-[var(--atlas-action-bg)] text-[var(--atlas-action-text)]"
                        : "text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)]"
                    }`}
                  >
                    {typ === "mutual"
                      ? isDe
                        ? "Wechselseitig"
                        : "Mutual"
                      : isDe
                        ? "Einseitig"
                        : "One-way"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {ndaType === "mutual"
                  ? isDe
                    ? "Partei A"
                    : "Party A"
                  : isDe
                    ? "Disclosing Party"
                    : "Disclosing party"}
              </label>
              <input
                type="text"
                value={ndaPartyA}
                onChange={(e) => setNdaPartyA(e.target.value)}
                placeholder={isDe ? "z. B. Sky-Sat GmbH" : "e.g. Sky-Sat GmbH"}
                className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none placeholder:text-[var(--atlas-text-faint)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {ndaType === "mutual"
                  ? isDe
                    ? "Partei B"
                    : "Party B"
                  : isDe
                    ? "Receiving Party"
                    : "Receiving party"}
              </label>
              <input
                type="text"
                value={ndaPartyB}
                onChange={(e) => setNdaPartyB(e.target.value)}
                placeholder={
                  isDe
                    ? "z. B. Aerospace Partners SARL"
                    : "e.g. Aerospace Partners SARL"
                }
                className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none placeholder:text-[var(--atlas-text-faint)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                  {isDe ? "Geltendes Recht" : "Governing law"}
                </label>
                <select
                  value={ndaJurisdiction}
                  onChange={(e) => setNdaJurisdiction(e.target.value)}
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
                  {isDe ? "Laufzeit (Jahre)" : "Term (years)"}
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={ndaTermYears}
                  onChange={(e) => setNdaTermYears(e.target.value)}
                  className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none"
                />
              </div>
            </div>
            {recentNda.length > 0 && (
              <div>
                <label className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                  <History size={9} strokeWidth={1.8} aria-hidden="true" />
                  {isDe ? "Zuletzt verwendet" : "Recently used"}
                </label>
                <div className="flex flex-wrap gap-1">
                  {recentNda.map((r) => (
                    <button
                      key={r.ts}
                      type="button"
                      onClick={() => {
                        setNdaType(r.ndaType);
                        setNdaPartyA(r.partyA);
                        setNdaPartyB(r.partyB);
                        setNdaJurisdiction(r.jurisdiction);
                        setNdaTermYears(r.termYears);
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
            <div>
              <button
                type="button"
                onClick={() =>
                  setShowPromptFor((cur) => (cur === "nda" ? null : "nda"))
                }
                className="inline-flex items-center gap-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
              >
                {showPromptFor === "nda" ? (
                  <EyeOff size={10} strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <Eye size={10} strokeWidth={1.8} aria-hidden="true" />
                )}
                {isDe
                  ? showPromptFor === "nda"
                    ? "Prompt verbergen"
                    : "Prompt anzeigen"
                  : showPromptFor === "nda"
                    ? "Hide prompt"
                    : "Show prompt"}
              </button>
              {showPromptFor === "nda" && (
                <pre className="mt-1.5 text-[10.5px] text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded p-2 whitespace-pre-wrap font-mono">
                  {buildNdaPrompt()}
                </pre>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleNdaSubmit}
            className="m-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] text-[var(--atlas-action-text)] text-[12px] font-medium tracking-wide px-4 py-2.5 transition-colors"
          >
            <Sparkles className="h-3 w-3" strokeWidth={1.8} />
            {t("atlas.drafting_open_in_ai")}
            <ArrowRight className="h-3 w-3" strokeWidth={1.8} />
          </button>
        </article>

        {/* ── Tile 5: Filing Cover Letter (Bundle 34, S4) ── */}
        <article className="flex flex-col rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--atlas-border-subtle)]">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-cyan-600" strokeWidth={1.5} />
              <h2 className="text-[14px] font-semibold text-[var(--atlas-text-primary)]">
                {isDe ? "Behörden-Anschreiben" : "Filing cover letter"}
              </h2>
            </div>
            <p className="text-[11px] text-[var(--atlas-text-muted)] leading-relaxed">
              {isDe
                ? "Formell, kurz, mit allen Pflicht-Identifikatoren — bereit zum Anhängen an dein Filing-Paket."
                : "Formal, terse, with every mandatory identifier — ready to staple onto your filing package."}
            </p>
            <p className="mt-2 text-[10.5px] text-cyan-700 dark:text-cyan-400 leading-relaxed">
              {isDe
                ? "Liefert: Anrede, Betreff mit Aktenzeichen, Identifikations-Block, Anlagen-Verzeichnis, Schlussformel."
                : "Returns: salutation, subject line w/ reference, identifying block, enclosures list, closing block."}
            </p>
          </div>
          <div className="p-4 flex flex-col gap-3 flex-1">
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
                {isDe ? "Filing-Typ" : "Filing type"}
              </label>
              <select
                value={coverFilingType}
                onChange={(e) =>
                  setCoverFilingType(e.target.value as typeof coverFilingType)
                }
                className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none cursor-pointer"
              >
                <option value="authorization">
                  {isDe
                    ? "Genehmigung (Erstantrag)"
                    : "Authorization (initial)"}
                </option>
                <option value="notification">
                  {isDe ? "Notifikation" : "Notification"}
                </option>
                <option value="renewal">
                  {isDe ? "Verlängerung" : "Renewal"}
                </option>
                <option value="amendment">
                  {isDe ? "Änderungsantrag" : "Amendment"}
                </option>
              </select>
            </div>
            {/* B2: authority-template selector for cover letters.
                Picking a template prefills the Authority free-text and
                attaches the formatting directive to the prompt. */}
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe
                  ? "Behörden-Template (optional)"
                  : "Authority template (optional)"}
              </label>
              <select
                value={coverAuthorityId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCoverAuthorityId(id);
                  if (id) {
                    const tpl = getAuthorityTemplate(id);
                    if (tpl) setCoverAuthority(tpl.name);
                  }
                }}
                className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none cursor-pointer"
              >
                <option value="">
                  {isDe ? "— Generisch —" : "— Generic —"}
                </option>
                {AUTHORITY_TEMPLATES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.jurisdiction})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe ? "Behörde" : "Authority"}
              </label>
              <input
                type="text"
                value={coverAuthority}
                onChange={(e) => setCoverAuthority(e.target.value)}
                placeholder={
                  isDe
                    ? "z. B. Bundesnetzagentur, Mainz"
                    : "e.g. Bundesnetzagentur, Mainz"
                }
                className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none placeholder:text-[var(--atlas-text-faint)]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                {isDe ? "Aktenzeichen (optional)" : "Reference (optional)"}
              </label>
              <input
                type="text"
                value={coverReference}
                onChange={(e) => setCoverReference(e.target.value)}
                placeholder={
                  isDe
                    ? "z. B. BNetzA-2026-Sky-Sat-001"
                    : "e.g. BNetzA-2026-Sky-Sat-001"
                }
                className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none placeholder:text-[var(--atlas-text-faint)]"
              />
            </div>
            {recentCover.length > 0 && (
              <div>
                <label className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] mb-1">
                  <History size={9} strokeWidth={1.8} aria-hidden="true" />
                  {isDe ? "Zuletzt verwendet" : "Recently used"}
                </label>
                <div className="flex flex-wrap gap-1">
                  {recentCover.map((r) => (
                    <button
                      key={r.ts}
                      type="button"
                      onClick={() => {
                        setCoverFilingType(r.filingType);
                        setCoverAuthority(r.authority);
                        setCoverReference(r.reference);
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
            <div>
              <button
                type="button"
                onClick={() =>
                  setShowPromptFor((cur) => (cur === "cover" ? null : "cover"))
                }
                className="inline-flex items-center gap-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
              >
                {showPromptFor === "cover" ? (
                  <EyeOff size={10} strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <Eye size={10} strokeWidth={1.8} aria-hidden="true" />
                )}
                {isDe
                  ? showPromptFor === "cover"
                    ? "Prompt verbergen"
                    : "Prompt anzeigen"
                  : showPromptFor === "cover"
                    ? "Hide prompt"
                    : "Show prompt"}
              </button>
              {showPromptFor === "cover" && (
                <pre className="mt-1.5 text-[10.5px] text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded p-2 whitespace-pre-wrap font-mono">
                  {coverAuthority.trim()
                    ? buildCoverPrompt()
                    : isDe
                      ? "(Behörde eingeben, um den Prompt zu sehen)"
                      : "(enter an authority to see the prompt)"}
                </pre>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={!coverAuthority.trim()}
            onClick={handleCoverSubmit}
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
