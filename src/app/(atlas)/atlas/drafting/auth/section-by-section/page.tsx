"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /atlas/drafting/auth/section-by-section — Section-by-section
 * authorization workspace (Bundle 35, S5).
 *
 * Instead of asking the model to dump a 9-section authorization
 * scaffold in one shot, the lawyer steps through each section:
 *   1. Generate (opens AI Mode with a section-specific prompt)
 *   2. Paste the AI response into the section textarea
 *   3. Tweak it
 *   4. Accept (or skip)
 *   5. Move to next section
 *
 * The compounding result is a partner-quality draft Marie can defend
 * section-by-section, with the per-section state persisted in
 * localStorage so a browser refresh doesn't lose work.
 *
 * The workspace reads jurisdiction + operator-type from URL search
 * params (set by the auth tile's "Section-by-section mode" link) and
 * reads mandate intake from the same localStorage as the studio.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  PenSquare,
  ArrowLeft,
  Sparkles,
  Check,
  X,
  Copy,
  Trash2,
  Layers,
  CheckCircle2,
  Circle,
  XCircle,
  Edit3,
  RefreshCw,
  Download,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { openAIMode } from "@/components/atlas/AIModeLauncher";
import { AUTH_SECTIONS, type SectionStatus } from "@/lib/atlas/auth-sections";
import {
  getWorkspaceFor,
  saveWorkspace,
  deleteWorkspace,
  createWorkspace,
  composeFullDraft,
  type SectionWorkspace,
} from "@/lib/atlas/section-by-section-store";
import { EMPTY_INTAKE, type MandateIntake } from "@/lib/atlas/mandate-intake";
import { getMandateStore, type Mandate } from "@/lib/atlas/mandate-store";

const OPERATOR_LABELS: Record<string, { de: string; en: string }> = {
  satellite_operator: { de: "Satellitenbetreiber", en: "Satellite operator" },
  launch_provider: { de: "Startanbieter", en: "Launch provider" },
  ground_segment: {
    de: "Bodensegment-Betreiber",
    en: "Ground-segment operator",
  },
  data_provider: { de: "Datenanbieter", en: "Data provider" },
  in_orbit_services: {
    de: "Im-Orbit-Dienstleistungen",
    en: "In-orbit services",
  },
  constellation_operator: {
    de: "Konstellations-Betreiber",
    en: "Constellation operator",
  },
  space_resource_operator: {
    de: "Weltraum-Ressourcen-Betreiber",
    en: "Space-resource operator",
  },
};

function StatusBadge({
  status,
  isDe,
}: {
  status: SectionStatus;
  isDe: boolean;
}) {
  if (status === "accepted")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
        <CheckCircle2 size={9} strokeWidth={2} aria-hidden="true" />
        {isDe ? "Akzeptiert" : "Accepted"}
      </span>
    );
  if (status === "generated")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200">
        <Edit3 size={9} strokeWidth={2} aria-hidden="true" />
        {isDe ? "Entwurf" : "Draft"}
      </span>
    );
  if (status === "skipped")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--atlas-bg-surface-muted)] text-[var(--atlas-text-muted)]">
        <XCircle size={9} strokeWidth={2} aria-hidden="true" />
        {isDe ? "Übersprungen" : "Skipped"}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded text-[var(--atlas-text-faint)]">
      <Circle size={9} strokeWidth={2} aria-hidden="true" />
      {isDe ? "Offen" : "Pending"}
    </span>
  );
}

export default function SectionBySectionPage() {
  const { language } = useLanguage();
  const isDe = language === "de";
  const params = useSearchParams();

  /* Read URL params on mount — they're the workspace's identity. */
  const urlJurisdiction = params.get("j") || "DE";
  const urlOperator = params.get("op") || "satellite_operator";
  const urlLang = (params.get("lang") || (isDe ? "de" : "en")) as "de" | "en";
  /* Bundle 42: mandate id from URL. Falls back to "use the active
     mandate at hydration time", or null if there's no active. */
  const urlMandateId = params.get("m");

  const [workspace, setWorkspace] = useState<SectionWorkspace | null>(null);
  const [mandate, setMandate] = useState<Mandate | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);

  /* On mount: resolve the mandate (from URL, then active fallback),
     then look up the matching workspace OR create a fresh one. The
     workspace is keyed by (mandateId, jurisdiction, operator, lang)
     so switching any of those four loads a different workspace
     instead of clobbering the current one. */
  useEffect(() => {
    const store = getMandateStore();
    const m =
      (urlMandateId
        ? (store.mandates.find((mm) => mm.id === urlMandateId) ?? null)
        : null) ??
      store.mandates.find((mm) => mm.id === store.activeMandateId) ??
      null;
    setMandate(m);

    const sectionIds = AUTH_SECTIONS.map((s) => s.id);
    const existing = getWorkspaceFor({
      mandateId: m?.id ?? null,
      jurisdiction: urlJurisdiction,
      operatorType: urlOperator,
      outputLang: urlLang,
    });

    if (existing && sectionIds.every((id) => id in existing.sections)) {
      setWorkspace(existing);
    } else {
      const fresh = createWorkspace({
        mandateId: m?.id ?? null,
        jurisdiction: urlJurisdiction,
        operatorType: urlOperator,
        outputLang: urlLang,
        sectionIds,
      });
      setWorkspace(fresh);
    }
    setHydrated(true);
  }, [urlJurisdiction, urlOperator, urlLang, urlMandateId]);

  const intake: MandateIntake = mandate?.intake ?? EMPTY_INTAKE;

  const operatorLabel = OPERATOR_LABELS[urlOperator]?.[urlLang] ?? urlOperator;

  const updateSection = (
    id: string,
    patch: Partial<{ status: SectionStatus; body: string }>,
  ) => {
    setWorkspace((cur) => {
      if (!cur) return cur;
      const next: SectionWorkspace = {
        ...cur,
        sections: {
          ...cur.sections,
          [id]: {
            status: patch.status ?? cur.sections[id]?.status ?? "pending",
            body: patch.body ?? cur.sections[id]?.body ?? "",
            ts: Date.now(),
          },
        },
        updatedAt: Date.now(),
      };
      saveWorkspace(next);
      return next;
    });
  };

  const generateSection = (sectionId: string) => {
    const section = AUTH_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;
    const prompt = section.buildPrompt({
      intake,
      jurisdiction: urlJurisdiction,
      operatorType: urlOperator,
      operatorLabel,
      lang: urlLang,
    });
    openAIMode({ prompt });
    /* Mark as "generated" once the prompt fires — Marie pastes the AI
       response into the textarea below and clicks Accept. */
    updateSection(sectionId, { status: "generated" });
  };

  const acceptSection = (sectionId: string) => {
    updateSection(sectionId, { status: "accepted" });
  };

  const skipSection = (sectionId: string) => {
    updateSection(sectionId, { status: "skipped" });
  };

  const resetSection = (sectionId: string) => {
    updateSection(sectionId, { status: "pending", body: "" });
  };

  const handleResetWorkspace = () => {
    /* Bundle 42: only delete THIS workspace, not all of them. The
       other (mandate, jurisdiction, op, lang) workspaces stay put. */
    if (workspace) deleteWorkspace(workspace.id);
    const fresh = createWorkspace({
      mandateId: mandate?.id ?? null,
      jurisdiction: urlJurisdiction,
      operatorType: urlOperator,
      outputLang: urlLang,
      sectionIds: AUTH_SECTIONS.map((s) => s.id),
    });
    setWorkspace(fresh);
  };

  const handleExport = async () => {
    if (!workspace) return;
    const titles: Record<string, string> = {};
    for (const s of AUTH_SECTIONS) titles[s.id] = s.title[urlLang];
    const md = composeFullDraft(workspace, titles);
    if (!md.trim()) return;
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — silent. Could fall back to file download. */
    }
  };

  /* Aggregate progress for the header chip. */
  const progress = useMemo(() => {
    if (!workspace) return { accepted: 0, total: AUTH_SECTIONS.length };
    let accepted = 0;
    for (const s of AUTH_SECTIONS) {
      if (workspace.sections[s.id]?.status === "accepted") accepted++;
    }
    return { accepted, total: AUTH_SECTIONS.length };
  }, [workspace]);

  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
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
              ? "Genehmigung — Abschnitt für Abschnitt"
              : "Authorization — section by section"}
          </h1>
          <span className="inline-flex items-center rounded-md bg-[var(--atlas-bg-surface-muted)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)]">
            {urlJurisdiction} · {operatorLabel}
          </span>
          {/* Bundle 42: surface which mandate this workspace belongs
              to. Without it, Marie can't tell at a glance whether
              she's in the Sky-Sat workspace or the Aero-Partners one. */}
          {mandate && (
            <span className="inline-flex items-center rounded-md bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">
              {mandate.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--atlas-text-muted)]">
            {progress.accepted} / {progress.total}{" "}
            {isDe ? "akzeptiert" : "accepted"}
          </span>
          <button
            type="button"
            onClick={handleExport}
            disabled={progress.accepted === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--atlas-action-text)] text-[11.5px] font-medium px-3 py-1.5 transition-colors"
            title={
              isDe
                ? "Akzeptierte Abschnitte als Markdown in Zwischenablage"
                : "Copy accepted sections as markdown to clipboard"
            }
          >
            {copied ? (
              <>
                <Check size={11} strokeWidth={1.8} aria-hidden="true" />
                {isDe ? "Kopiert" : "Copied"}
              </>
            ) : (
              <>
                <Copy size={11} strokeWidth={1.8} aria-hidden="true" />
                {isDe ? "Kopieren" : "Copy"}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleResetWorkspace}
            title={isDe ? "Workspace zurücksetzen" : "Reset workspace"}
            className="inline-flex items-center gap-1 text-[11px] text-[var(--atlas-text-muted)] hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 size={11} strokeWidth={1.8} aria-hidden="true" />
            {isDe ? "Reset" : "Reset"}
          </button>
        </div>
      </header>

      <p className="text-[12.5px] text-[var(--atlas-text-secondary)] leading-relaxed max-w-3xl">
        {isDe
          ? `Generiere jeden Abschnitt einzeln, prüfe ihn, akzeptiere — dann der nächste. Jede Änderung wird automatisch lokal gespeichert. Klicke "Kopieren" oben rechts, um alle akzeptierten Abschnitte als ein Dokument zu exportieren.`
          : `Generate each section in turn, review it, accept it, then move on. Every change is auto-saved locally. Click "Copy" at the top to export all accepted sections as one document.`}
      </p>

      {/* Sections list */}
      {hydrated && workspace && (
        <ol className="flex flex-col gap-3 max-w-3xl">
          {AUTH_SECTIONS.map((section, idx) => {
            const state = workspace.sections[section.id];
            const status = state?.status ?? "pending";
            return (
              <li
                key={section.id}
                className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors ${
                  status === "accepted"
                    ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-500/5"
                    : status === "skipped"
                      ? "border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] opacity-60"
                      : "border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <h2 className="text-[13px] font-semibold text-[var(--atlas-text-primary)]">
                      {section.title[urlLang]}
                    </h2>
                    <p className="text-[11.5px] text-[var(--atlas-text-muted)] leading-relaxed">
                      {section.description[urlLang]}
                    </p>
                  </div>
                  <StatusBadge status={status} isDe={isDe} />
                </div>

                {/* Generation textarea — visible once user clicks Generate. */}
                {(status === "generated" || status === "accepted") && (
                  <textarea
                    value={state?.body ?? ""}
                    onChange={(e) =>
                      updateSection(section.id, {
                        body: e.target.value,
                        /* Editing reverts an accepted section to "generated"
                           so partner-review state is honest. */
                        status: status === "accepted" ? "generated" : status,
                      })
                    }
                    rows={status === "accepted" ? 6 : 10}
                    placeholder={
                      isDe
                        ? "AI-Antwort hier einfügen, dann anpassen…"
                        : "Paste AI response here, then tweak…"
                    }
                    className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none resize-y font-mono placeholder:text-[var(--atlas-text-faint)]"
                  />
                )}

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[10.5px] text-[var(--atlas-text-faint)]">
                    {idx + 1} / {AUTH_SECTIONS.length}
                  </span>
                  <div className="flex items-center gap-1">
                    {status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => generateSection(section.id)}
                          className="inline-flex items-center gap-1.5 rounded bg-[var(--atlas-action-bg)] hover:bg-[var(--atlas-action-bg-hover)] text-[var(--atlas-action-text)] text-[11px] font-medium px-2.5 py-1 transition-colors"
                        >
                          <Sparkles
                            size={11}
                            strokeWidth={1.8}
                            aria-hidden="true"
                          />
                          {isDe ? "Generieren" : "Generate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => skipSection(section.id)}
                          className="inline-flex items-center gap-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors px-2 py-1"
                        >
                          <X size={10} strokeWidth={1.8} aria-hidden="true" />
                          {isDe ? "Überspringen" : "Skip"}
                        </button>
                      </>
                    )}
                    {status === "generated" && (
                      <>
                        <button
                          type="button"
                          onClick={() => generateSection(section.id)}
                          className="inline-flex items-center gap-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors px-2 py-1"
                        >
                          <RefreshCw
                            size={10}
                            strokeWidth={1.8}
                            aria-hidden="true"
                          />
                          {isDe ? "Neu" : "Regen"}
                        </button>
                        <button
                          type="button"
                          onClick={() => acceptSection(section.id)}
                          disabled={!state?.body.trim()}
                          className="inline-flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-medium px-2.5 py-1 transition-colors"
                        >
                          <Check
                            size={11}
                            strokeWidth={1.8}
                            aria-hidden="true"
                          />
                          {isDe ? "Akzeptieren" : "Accept"}
                        </button>
                      </>
                    )}
                    {status === "accepted" && (
                      <button
                        type="button"
                        onClick={() => resetSection(section.id)}
                        className="inline-flex items-center gap-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors px-2 py-1"
                      >
                        <RefreshCw
                          size={10}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                        {isDe ? "Erneut bearbeiten" : "Re-open"}
                      </button>
                    )}
                    {status === "skipped" && (
                      <button
                        type="button"
                        onClick={() => resetSection(section.id)}
                        className="inline-flex items-center gap-1 text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors px-2 py-1"
                      >
                        <RefreshCw
                          size={10}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                        {isDe ? "Wieder aufnehmen" : "Re-add"}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Footer hint */}
      {hydrated && workspace && (
        <p className="text-[10.5px] text-[var(--atlas-text-faint)] italic max-w-3xl">
          {isDe
            ? "Hinweis: AI Mode antwortet im rechten Slide-over. Antwort kopieren und in das Textfeld des Abschnitts einfügen."
            : "Tip: AI Mode replies in the right-hand slide-over. Copy the answer and paste it into the section's textarea."}
        </p>
      )}
    </div>
  );
}
