"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /atlas/drafting/plan/[planId] — Plan workspace (Bundle 43).
 *
 * Steps Marie through every draft in a plan template (e.g. "Full DE
 * Authorization Package" = auth + cover + brief + NDA), with per-item
 * status tracking, paste-back textareas, accept/regenerate, and a
 * combined Markdown export at the end.
 *
 * Same pattern as /atlas/drafting/auth/section-by-section but for a
 * paket of multiple drafts instead of N sections of a single auth.
 *
 * Workspace is keyed by (planId, mandateId) — see plan-workspace-store
 * — so a Sky-Sat DE-Auth workspace and an Aero-Partners ITU-Filing
 * workspace coexist without clobbering each other.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
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
  Briefcase,
  FileText,
  BookOpen,
  Columns,
  FileSignature,
  Mail,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { openAIMode } from "@/components/atlas/AIModeLauncher";
import {
  getPlanTemplate,
  substituteTemplate,
  type PlanItem,
  type PlanItemDefaults,
} from "@/lib/atlas/plan-templates";
import {
  getPlanWorkspace,
  savePlanWorkspace,
  deletePlanWorkspace,
  createPlanWorkspace,
  composePlanDraft,
  type PlanWorkspace,
  type PlanItemState,
  type PlanItemStatus,
} from "@/lib/atlas/plan-workspace-store";
import { getMandateStore, type Mandate } from "@/lib/atlas/mandate-store";
import { composeMandateContext } from "@/lib/atlas/mandate-intake";
import {
  buildAuthPrompt,
  buildBriefPrompt,
  buildNdaPrompt,
  buildCoverPrompt,
  type OperatorType,
} from "@/lib/atlas/prompt-builders";
import { pushDraftLibrary, type DraftKind } from "@/lib/atlas/drafting-history";

function kindIcon(kind: DraftKind) {
  switch (kind) {
    case "auth":
      return (
        <FileText size={12} strokeWidth={1.8} className="text-emerald-600" />
      );
    case "brief":
      return <BookOpen size={12} strokeWidth={1.8} className="text-blue-600" />;
    case "compare":
      return (
        <Columns size={12} strokeWidth={1.8} className="text-violet-600" />
      );
    case "nda":
      return (
        <FileSignature size={12} strokeWidth={1.8} className="text-amber-600" />
      );
    case "cover":
      return <Mail size={12} strokeWidth={1.8} className="text-cyan-600" />;
  }
}

function StatusBadge({
  status,
  isDe,
}: {
  status: PlanItemStatus;
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

/**
 * Build the dispatch prompt for a single plan item, given the plan-
 * template defaults + mandate context + per-item overrides + outputLang.
 */
function buildItemPrompt(
  item: PlanItem,
  mandate: Mandate | null,
  overrides: Partial<PlanItemDefaults> | undefined,
  outputLang: "de" | "en",
): string {
  const intake = mandate?.intake;
  const mandateCtx = mandate
    ? composeMandateContext(mandate.intake, outputLang)
    : "";

  /* Apply per-item overrides on top of template defaults. We merge by
     kind because overrides only make sense within the same kind. */
  const effective = { ...item.defaults, ...overrides } as PlanItemDefaults;

  switch (effective.kind) {
    case "auth": {
      /* Compose mission from intake when missionFromIntake is true. */
      const mission =
        effective.missionFromIntake && intake
          ? [
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
              .join(", ")
          : "";
      return buildAuthPrompt({
        jurisdiction: effective.jurisdiction,
        operatorType: effective.operatorType as OperatorType,
        mission,
        authorityId: effective.authorityId,
        outputLang,
      });
    }
    case "brief": {
      const topic = substituteTemplate(effective.topicTemplate, {
        client: intake?.client,
        jurisdiction: intake?.primaryJurisdiction,
        operator: intake?.operatorType,
      });
      return buildBriefPrompt({
        topic,
        mandateContext: mandateCtx,
        outputLang,
      });
    }
    case "compare":
      return ""; /* Plan items don't currently use compare-kind, but the
                    branch keeps the type-narrowing exhaustive. */
    case "nda":
      return buildNdaPrompt({
        ndaType: effective.ndaType,
        partyA: effective.partyA.trim() || intake?.client?.trim() || "",
        partyB: effective.partyB,
        jurisdiction: effective.jurisdiction,
        termYears: effective.termYears,
        mandateContext: mandateCtx,
        outputLang,
      });
    case "cover":
      return buildCoverPrompt({
        filingType: effective.filingType,
        authority: effective.authority,
        reference: effective.reference,
        authorityId: effective.authorityId,
        mandateContext: mandateCtx,
        outputLang,
      });
  }
}

export default function PlanWorkspacePage() {
  const { language } = useLanguage();
  const isDe = language === "de";
  const params = useParams<{ planId: string }>();
  const search = useSearchParams();
  const planId = params?.planId ?? "";
  const urlMandateId = search?.get("m") ?? null;
  const urlLang = (search?.get("lang") ?? (isDe ? "de" : "en")) as "de" | "en";

  const plan = useMemo(() => getPlanTemplate(planId), [planId]);

  const [workspace, setWorkspace] = useState<PlanWorkspace | null>(null);
  const [mandate, setMandate] = useState<Mandate | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);

  /* Hydrate. Resolves mandate (URL → active fallback → null), then
     looks up or creates the workspace. */
  useEffect(() => {
    if (!plan) {
      setHydrated(true);
      return;
    }
    const store = getMandateStore();
    const m =
      (urlMandateId
        ? (store.mandates.find((mm) => mm.id === urlMandateId) ?? null)
        : null) ??
      store.mandates.find((mm) => mm.id === store.activeMandateId) ??
      null;
    setMandate(m);

    const itemIds = plan.items.map((i) => i.id);
    const existing = getPlanWorkspace(plan.id, m?.id ?? null);
    if (existing && itemIds.every((id) => id in existing.items)) {
      setWorkspace(existing);
    } else {
      const fresh = createPlanWorkspace({
        planId: plan.id,
        mandateId: m?.id ?? null,
        outputLang: urlLang,
        itemIds,
      });
      setWorkspace(fresh);
    }
    setHydrated(true);
  }, [plan, urlMandateId, urlLang]);

  const updateItem = (
    itemId: string,
    patch: Partial<{
      status: PlanItemStatus;
      body: string;
      overrides: Partial<PlanItemDefaults>;
    }>,
  ) => {
    setWorkspace((cur) => {
      if (!cur) return cur;
      const prev: PlanItemState = cur.items[itemId] ?? {
        status: "pending",
        body: "",
        ts: 0,
      };
      const next: PlanWorkspace = {
        ...cur,
        items: {
          ...cur.items,
          [itemId]: {
            status: patch.status ?? prev.status,
            body: patch.body ?? prev.body,
            overrides: patch.overrides ?? prev.overrides,
            ts: Date.now(),
          },
        },
        updatedAt: Date.now(),
      };
      savePlanWorkspace(next);
      return next;
    });
  };

  const dispatchItem = (item: PlanItem) => {
    if (!workspace) return;
    const overrides = workspace.items[item.id]?.overrides;
    const prompt = buildItemPrompt(item, mandate, overrides, urlLang);
    if (!prompt.trim()) return;
    openAIMode({ prompt });
    updateItem(item.id, { status: "generated" });
    /* Also archive into the My-Drafts library so the prompt history
       isn't lost when the workspace is deleted. */
    pushDraftLibrary({
      kind: item.kind,
      title: `[Plan: ${plan?.name[urlLang] ?? plan?.id ?? "Plan"}] ${item.label[urlLang]}`,
      prompt,
      outputLocale: urlLang,
      privileged: false,
      mandateId: mandate?.id,
      mandateName: mandate?.name,
    });
  };

  const handleAccept = (id: string) => updateItem(id, { status: "accepted" });
  const handleSkip = (id: string) => updateItem(id, { status: "skipped" });
  const handleReset = (id: string) =>
    updateItem(id, { status: "pending", body: "" });

  const handleResetWorkspace = () => {
    if (!workspace || !plan) return;
    deletePlanWorkspace(workspace.id);
    const fresh = createPlanWorkspace({
      planId: plan.id,
      mandateId: mandate?.id ?? null,
      outputLang: urlLang,
      itemIds: plan.items.map((i) => i.id),
    });
    setWorkspace(fresh);
  };

  const handleExport = async () => {
    if (!workspace || !plan) return;
    const titles: Record<string, string> = {};
    for (const i of plan.items) titles[i.id] = i.label[urlLang];
    const md = composePlanDraft(workspace, titles);
    if (!md.trim()) return;
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — silent. */
    }
  };

  /* Aggregate progress for the header chip. */
  const progress = useMemo(() => {
    if (!workspace || !plan)
      return { accepted: 0, total: plan?.items.length ?? 0 };
    let accepted = 0;
    for (const i of plan.items) {
      if (workspace.items[i.id]?.status === "accepted") accepted++;
    }
    return { accepted, total: plan.items.length };
  }, [workspace, plan]);

  /* Plan not found — show error with link back. */
  if (hydrated && !plan) {
    return (
      <div className="flex flex-col h-full min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-4">
        <header className="flex items-center gap-3 max-w-3xl">
          <Link
            href="/atlas/drafting"
            className="inline-flex items-center gap-1 text-[11px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] transition-colors"
          >
            <ArrowLeft size={11} strokeWidth={1.8} aria-hidden="true" />
            {isDe ? "Drafting Studio" : "Drafting Studio"}
          </Link>
        </header>
        <div className="flex flex-col items-center text-center max-w-md mx-auto mt-12 gap-3">
          <AlertCircle
            size={36}
            strokeWidth={1.2}
            aria-hidden="true"
            className="text-[var(--atlas-text-faint)]"
          />
          <p className="text-[14px] font-medium text-[var(--atlas-text-primary)]">
            {isDe ? "Plan nicht gefunden" : "Plan not found"}
          </p>
          <p className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed">
            {isDe
              ? `Die Plan-ID „${planId}" existiert nicht im Katalog.`
              : `The plan id "${planId}" doesn't exist in the catalog.`}
          </p>
        </div>
      </div>
    );
  }

  if (!plan || !workspace) return null;

  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-4">
      <header className="flex items-center justify-between flex-wrap gap-2 max-w-4xl">
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
            {plan.name[urlLang]}
          </h1>
          {mandate && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">
              <Briefcase size={9} strokeWidth={1.8} aria-hidden="true" />
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
                ? "Akzeptierte Items als Markdown in Zwischenablage"
                : "Copy accepted items as markdown to clipboard"
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
                {isDe ? "Paket kopieren" : "Copy package"}
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

      <p className="text-[12.5px] text-[var(--atlas-text-secondary)] leading-relaxed max-w-4xl">
        {plan.description[urlLang]}
      </p>

      {!mandate && (
        <div className="rounded-md border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 max-w-4xl">
          <p className="text-[10.5px] text-amber-800 dark:text-amber-200 leading-relaxed">
            <AlertCircle
              size={11}
              strokeWidth={1.8}
              aria-hidden="true"
              className="inline-block mr-1 -mt-0.5"
            />
            {isDe
              ? "Kein aktiver Mandant — Drafts werden mit Platzhaltern generiert. Wechsle im Drafting Studio zu einem Mandanten, dann öffne den Plan erneut für vollständigen Kontext."
              : "No active mandate — drafts will be generated with placeholders. Switch to a mandate in the Drafting Studio, then re-open this plan for full context."}
          </p>
        </div>
      )}

      {/* Plan items list */}
      <ol className="flex flex-col gap-3 max-w-4xl">
        {plan.items.map((item, idx) => {
          const state = workspace.items[item.id];
          const status = state?.status ?? "pending";
          const previewPrompt = buildItemPrompt(
            item,
            mandate,
            state?.overrides,
            urlLang,
          );
          return (
            <li
              key={item.id}
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
                  <h2 className="text-[13px] font-semibold text-[var(--atlas-text-primary)] flex items-center gap-1.5">
                    {kindIcon(item.kind)}
                    {item.label[urlLang]}
                  </h2>
                  {item.description && (
                    <p className="text-[11.5px] text-[var(--atlas-text-muted)] leading-relaxed">
                      {item.description[urlLang]}
                    </p>
                  )}
                </div>
                <StatusBadge status={status} isDe={isDe} />
              </div>

              {/* Prompt preview — collapsed by default */}
              <details>
                <summary className="cursor-pointer text-[10.5px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)]">
                  {isDe ? "Prompt-Vorschau" : "Prompt preview"}
                </summary>
                <pre className="mt-1.5 text-[10.5px] text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded p-2 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                  {previewPrompt}
                </pre>
              </details>

              {/* Body textarea — visible after Generate */}
              {(status === "generated" || status === "accepted") && (
                <textarea
                  value={state?.body ?? ""}
                  onChange={(e) =>
                    updateItem(item.id, {
                      body: e.target.value,
                      /* Editing reverts an accepted item to draft so
                         partner-review state is honest. */
                      status: status === "accepted" ? "generated" : status,
                    })
                  }
                  rows={status === "accepted" ? 4 : 8}
                  placeholder={
                    isDe
                      ? "AI-Antwort hier einfügen, dann anpassen…"
                      : "Paste AI response here, then tweak…"
                  }
                  className="w-full rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] outline-none resize-y font-mono placeholder:text-[var(--atlas-text-faint)]"
                />
              )}

              {/* Actions */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10.5px] text-[var(--atlas-text-faint)]">
                  {idx + 1} / {plan.items.length}
                </span>
                <div className="flex items-center gap-1">
                  {status === "pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => dispatchItem(item)}
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
                        onClick={() => handleSkip(item.id)}
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
                        onClick={() => dispatchItem(item)}
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
                        onClick={() => handleAccept(item.id)}
                        disabled={!state?.body.trim()}
                        className="inline-flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-medium px-2.5 py-1 transition-colors"
                      >
                        <Check size={11} strokeWidth={1.8} aria-hidden="true" />
                        {isDe ? "Akzeptieren" : "Accept"}
                      </button>
                    </>
                  )}
                  {status === "accepted" && (
                    <button
                      type="button"
                      onClick={() => handleReset(item.id)}
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
                      onClick={() => handleReset(item.id)}
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

      <p className="text-[10.5px] text-[var(--atlas-text-faint)] italic max-w-4xl">
        {isDe
          ? "Hinweis: AI Mode antwortet im rechten Slide-over. Antwort kopieren und in das Textfeld des Items einfügen."
          : "Tip: AI Mode replies in the right-hand slide-over. Copy the answer and paste it into the item's textarea."}
      </p>
    </div>
  );
}
