/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /assessment/full/results — the FULL obligation-map result page
 * (plan Task 3.3; §6 layout order).
 *
 * Server component, account-gated (the full tier sits behind a free account,
 * founder §11.2): unauthenticated visitors go through the existing sign-in
 * flow with a callback back here. The page resolves the signed-in user's
 * latest OperatorAssessmentProfile, loads the latest STORED FULL verdict
 * snapshot — the verdict is never recomputed from anything client-supplied —
 * and renders the §6 sections in order:
 *
 *   (1) verdict header — scope findings, regime direction + reasoning chain
 *       (the regime envelope's `why` IS the chain), the NIS2 gateway badge
 *       with the transposition suffix derived from MSTransposition data
 *       (NEVER a hardcoded member-state string), and the rulebook stamp
 *       pinned to the SEMVER with the source list in an expandable appendix
 *       (§7.3: pin to semver, never to named moving texts);
 *   (2) the obligation map by cluster (ClusterSection → FindingCards, full
 *       envelopes incl. evidence examples; per-cluster readiness bands);
 *   (3) prioritized unknowns with "what answering it would change";
 *   (4) the credit map ("what you already hold counts");
 *   (5) the dated roadmap — contested items render the COLLAPSED flux chip
 *       (founder §11.4) and the pre-application-engagement note ships as
 *       roadmap COPY (§7.3 — Q5.3 was cut);
 *   (6) the FACTUAL jurisdiction comparison — rendered ONLY when Q4.5 was
 *       answered; no favorability number, no recommended jurisdiction;
 *   (7) the short scope-limiting disclaimer at the point of action with the
 *       full text one click away.
 *
 * HONESTY INVARIANTS: no overall score anywhere (invariant #6 — per-cluster
 * counts and N-of-M bands only); incomplete finding envelopes are withheld
 * by FindingCard with the named missing fields (invariant #5); an
 * unrecognizable stored result redirects to the wizard — an honest restart,
 * never a fabricated verdict.
 *
 * DEVIATION NOTE (plan vs real module): the plan reads the transposition
 * suffix "from nis2Gateway.transpositions", but the REAL stored
 * `ObligationMapResult.nis2Gateway` is the finding ENVELOPE
 * (AssessmentFinding<NIS2GatewayClassification>) — the pipeline does not
 * persist the gateway's `transpositions` array. The real file wins: the page
 * derives the SAME `MSTransposition[]` from the stored profile answers
 * through the gateway's own exported classifier (Rule 7 is
 * classification-independent and pure), so the rendering rules stay exactly
 * as planned: in_force → act name, unverified → "transposition status
 * unverified", empty → no suffix.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  CalendarClock,
  Scale,
  ShieldQuestion,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import RulebookStamp from "@/components/assessment/spine/RulebookStamp";
import { hasLivingTierEntitlement } from "@/lib/assessment/living-entitlement.server";
import FindingCard, {
  FluxChip,
} from "@/components/assessment/spine/FindingCard";
import { nis2TranspositionSuffix } from "@/components/assessment/spine/nis2-suffix";
import ClusterSection from "@/components/assessment/spine/ClusterSection";
import UnknownsList, {
  type UnknownItem,
} from "@/components/assessment/spine/UnknownsList";
import JurisdictionMatrix from "@/components/assessment/spine/JurisdictionMatrix";
import SaveToDashboardButton from "@/components/assessment/spine/SaveToDashboardButton";
import {
  classifyNIS2Gateway,
  gatewayInputFromAnswers,
  type MSTransposition,
} from "@/lib/assessment/nis2-gateway.server";
import {
  PRE_APPLICATION_ENGAGEMENT_NOTE,
  type RoadmapItem,
} from "@/lib/assessment/roadmap.server";
import type { ObligationMapResult } from "@/lib/assessment/verdict-pipeline.server";
import type { ClusterReadiness } from "@/lib/assessment/readiness.server";
import type { CreditMapping } from "@/lib/assessment/credit-map.server";
import type { AnswerMap } from "@/lib/assessment/answers";

export const dynamic = "force-dynamic";

// ─── Label maps (spine design language — QuickResultPanel parity) ───────────

const NIS2_BADGE: Record<string, { label: string; className: string }> = {
  essential: {
    label: "NIS2: essential entity",
    className: "bg-red-500/[0.12] border-red-500/25 text-red-300",
  },
  important: {
    label: "NIS2: important entity",
    className: "bg-amber-500/[0.12] border-amber-500/25 text-amber-300",
  },
  out_of_scope: {
    label: "NIS2: out of scope on your answers",
    className: "bg-white/[0.06] border-white/[0.12] text-white/60",
  },
  needs_clarification: {
    label: "NIS2: needs clarification",
    className: "bg-amber-500/[0.12] border-amber-500/25 text-amber-300",
  },
};

const REGIME_DIRECTION: Record<string, string> = {
  eligible: "Light regime: eligible on your answers",
  likely_eligible_verify: "Likely light regime — verify group structure",
  not_eligible: "Standard regime applies",
};

// §6 (7) — scope-limiting, not confidence-retracting (short version at the
// point of action; the full text lives one click away on the legal pages).
const SCOPE_DISCLAIMER =
  "This maps the obligations that attach to the facts you provided; it is general information, not legal advice on your specific situation, and does not prove compliance.";

// ─── Tolerant snapshot reader (unrecognizable → honest restart) ─────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Minimal structural validation of the stored FULL ObligationMapResult.
 * Anything unrecognizable returns null → the page redirects to the wizard
 * (never a guessed verdict). Per-finding completeness is enforced again at
 * the render boundary by FindingCard (defence in depth on deserialized
 * payloads).
 */
function readFullResult(raw: unknown): ObligationMapResult | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.rulebookVersion !== "string" || raw.rulebookVersion === "") {
    return null;
  }
  if (typeof raw.computedAt !== "string" || raw.computedAt === "") return null;
  if (!Array.isArray(raw.scope)) return null;
  if (!Array.isArray(raw.clusters)) return null;
  if (!Array.isArray(raw.unknowns)) return null;
  if (!isRecord(raw.nis2Gateway)) return null;
  if (!isRecord(raw.regime)) return null;
  return raw as unknown as ObligationMapResult;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
}

function readUnknowns(result: ObligationMapResult): UnknownItem[] {
  const out: UnknownItem[] = [];
  for (const u of result.unknowns ?? []) {
    if (!isRecord(u)) continue;
    if (typeof u.questionId !== "string" || typeof u.question !== "string") {
      continue;
    }
    out.push({
      questionId: u.questionId,
      question: u.question,
      whatAnsweringChanges:
        typeof u.whatAnsweringChanges === "string"
          ? u.whatAnsweringChanges
          : "",
      priority: u.priority === "high" ? "high" : "medium",
    });
  }
  return out;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function FullResultsPage() {
  // ── Account gate (founder §11.2 — the existing sign-in flow) ──
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent("/assessment/full/results")}`,
    );
  }

  const profile = await prisma.operatorAssessmentProfile.findFirst({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, version: true, answers: true },
  });
  if (!profile) {
    redirect("/assessment/full");
  }

  const snapshot = await prisma.assessmentVerdictSnapshot.findFirst({
    where: { profileId: profile.id, tier: "FULL" },
    orderBy: { createdAt: "desc" },
    select: { id: true, profileVersion: true, result: true },
  });
  if (!snapshot) {
    redirect("/assessment/full");
  }

  const result = readFullResult(snapshot.result);
  if (!result) {
    // Unrecognizable stored result: honest restart, never a guessed verdict.
    redirect("/assessment/full");
  }

  const answers = (profile.answers ?? {}) as AnswerMap;

  // ── NIS2 transposition suffix (see DEVIATION NOTE in the header) ──
  let transpositions: MSTransposition[] = [];
  try {
    transpositions = classifyNIS2Gateway(
      gatewayInputFromAnswers(answers),
    ).transpositions;
  } catch (error) {
    // Absence of a suffix is the defined empty rendering — never invented.
    logger.error("full results: transposition derivation failed", error);
  }
  const nis2Suffix = nis2TranspositionSuffix(transpositions);

  const nis2Value =
    typeof result.nis2Gateway?.value === "string"
      ? result.nis2Gateway.value
      : "";
  const nis2Badge = NIS2_BADGE[nis2Value] ?? null;

  const regimeValue =
    typeof result.regime?.value === "string" ? result.regime.value : "";
  const regimeDirection = REGIME_DIRECTION[regimeValue] ?? null;

  // ── Full-tier sections data (tolerant reads; optional on old rows) ──
  const readiness: ClusterReadiness[] = Array.isArray(result.readiness)
    ? result.readiness
    : [];
  const readinessByCluster = new Map<string, ClusterReadiness>(
    readiness.map((r) => [r.clusterId, r]),
  );
  const creditMap: CreditMapping[] = Array.isArray(result.creditMap)
    ? result.creditMap
    : [];
  const roadmap: RoadmapItem[] = Array.isArray(result.roadmap)
    ? result.roadmap
    : [];
  const unknowns = readUnknowns(result);

  // ── Jurisdiction comparison gate: ONLY when Q4.5 was ANSWERED ──
  const q45 = answers["q4_5_considered_jurisdictions"];
  const consideredCodes =
    q45?.state === "answered" ? asStringArray(q45.value) : [];
  const showJurisdictionMatrix = q45?.state === "answered";

  const answersDrifted = profile.version !== snapshot.profileVersion;
  // Founder §11.2 — the stale-verdict re-run is a paid (living-tier) action;
  // computed server-side and passed into the stamp (Task 4.4).
  const livingEntitled = await hasLivingTierEntitlement(session.user.id);

  const computedDate = (() => {
    const d = new Date(result.computedAt);
    return Number.isNaN(d.getTime()) ? result.computedAt : d.toUTCString();
  })();

  return (
    <div className="landing-page min-h-screen bg-black text-white py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <Link
            href="/assessment/full"
            className="flex items-center gap-2 text-body text-white/45 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to the full assessment
          </Link>
          <span className="text-caption font-medium text-emerald-400/60 uppercase tracking-[0.2em]">
            Caelex
          </span>
        </div>

        {/* ── 1 · Verdict header ─────────────────────────────────────────── */}
        <header className="mb-10">
          <p className="text-caption font-medium text-emerald-400/60 uppercase tracking-[0.2em] mb-3">
            Full assessment result
          </p>
          <h1 className="text-display-sm font-medium tracking-[-0.02em] text-white mb-6">
            Your obligation map
          </h1>

          {answersDrifted ? (
            <p className="mb-6 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 px-4 py-3 text-small text-amber-200/90 leading-relaxed">
              Your answers have changed since this result was computed.
              Recalculate from the full assessment to see the current picture —
              this page shows the stored verdict as computed.
            </p>
          ) : null}

          {/* Scope determination */}
          <section aria-label="Scope determination" className="mb-6">
            <h2 className="text-micro uppercase tracking-[0.15em] text-white/40 mb-3">
              Scope determination
            </h2>
            {result.scope.length > 0 ? (
              <div className="space-y-3">
                {result.scope.map((f, i) => (
                  <FindingCard key={i} finding={f} />
                ))}
              </div>
            ) : (
              <p className="text-body text-white/60 leading-relaxed">
                No scope exclusions or caveats were raised by your answers — the
                EU Space Act applicability gates passed.
              </p>
            )}
          </section>

          {/* Regime — direction + the reasoning chain (the envelope's why) */}
          <section aria-label="Regime reasoning" className="mb-6">
            <h2 className="text-micro uppercase tracking-[0.15em] text-white/40 mb-3">
              Regime
            </h2>
            {regimeDirection ? (
              <p className="text-subtitle text-white mb-3">{regimeDirection}</p>
            ) : null}
            <FindingCard finding={result.regime} />
          </section>

          {/* NIS2 gateway — badge + the data-derived transposition suffix */}
          <section aria-label="NIS2 gateway" className="mb-6">
            <h2 className="text-micro uppercase tracking-[0.15em] text-white/40 mb-3">
              NIS2 gateway
            </h2>
            {nis2Badge ? (
              <span
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-small mb-3 ${nis2Badge.className}`}
              >
                <ShieldQuestion size={12} aria-hidden="true" />
                {nis2Badge.label}
                {nis2Suffix ? <span> {nis2Suffix}</span> : null}
              </span>
            ) : null}
            {nis2Value === "needs_clarification" ? (
              <p className="text-body text-amber-200/90 leading-relaxed mb-3">
                Your NIS2 classification is an OPEN question, not a negative: it
                turns on answers you have not given yet. It is listed in your
                unknowns below — resolving it can add (never remove) an entire
                obligation set.
              </p>
            ) : null}
            <FindingCard finding={result.nis2Gateway} />
          </section>

          {/* Rulebook stamp + entitlement-gated stale CTA (Task 4.4) */}
          <RulebookStamp
            rulebookVersion={result.rulebookVersion}
            computedAtLabel={computedDate}
            livingEntitled={livingEntitled}
            profileId={profile.id}
          />

          {/* Save to dashboard (Task 3.6 — the Task 3.5 snapshot import) */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] p-5">
            <p className="text-body text-white/70 leading-relaxed max-w-md">
              Save this result to your compliance dashboard — article statuses
              and roadmap deadlines flow into the tracker and timeline.
            </p>
            <SaveToDashboardButton verdictSnapshotId={snapshot.id} />
          </div>
        </header>

        {/* ── 2 · Obligation map by cluster ──────────────────────────────── */}
        <section aria-label="Obligation map" className="mb-10">
          <h2 className="text-heading text-white mb-2">Obligation map</h2>
          <p className="text-body text-white/55 mb-6">
            Every identified obligation, fully explained: legal basis with as-of
            date, the answers that triggered it, evidence a supervisor would
            accept, and contested points shown conservatively.
          </p>
          {result.clusters.length > 0 ? (
            <div className="space-y-4">
              {result.clusters.map((c) => (
                <ClusterSection
                  key={c.id}
                  cluster={c}
                  readiness={readinessByCluster.get(c.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-body text-white/60 leading-relaxed">
              No obligation clusters were assessed on this result
              {result.scope.some((f) => f.verdict === "not_applicable")
                ? " — the assessment ended at the scope gate above."
                : "."}
            </p>
          )}

          {result.aggregationDisclosures.length > 0 ? (
            <div className="mt-4 rounded-xl bg-white/[0.02] border border-white/[0.08] p-4">
              {result.aggregationDisclosures.map((d, i) => (
                <p key={i} className="text-small text-white/55 leading-relaxed">
                  {d}
                </p>
              ))}
            </div>
          ) : null}
        </section>

        {/* ── 3 · Unknowns ───────────────────────────────────────────────── */}
        <section aria-label="Unknowns to resolve" className="mb-10">
          <h2 className="text-heading text-white mb-2">
            {unknowns.length === 1
              ? "1 unknown to resolve"
              : `${unknowns.length} unknowns to resolve`}
          </h2>
          <p className="text-body text-white/55 mb-6">
            Every &quot;I&apos;m not sure&quot; you resolve narrows your
            obligation set and raises confidence — it never gets cleaner by
            staying unknown.
          </p>
          <UnknownsList unknowns={unknowns} />
        </section>

        {/* ── 4 · Credit map ─────────────────────────────────────────────── */}
        <section aria-label="Credit map" className="mb-10">
          <h2 className="text-heading text-white mb-2">
            What you already hold counts
          </h2>
          <p className="text-body text-white/55 mb-6">
            Held certifications and existing licences mapped onto the obligation
            areas they partially evidence — partial evidence, never proof of
            compliance.
          </p>
          {creditMap.length > 0 ? (
            <div className="space-y-3">
              {creditMap.map((credit, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4"
                >
                  <p className="inline-flex items-center gap-2 text-body font-medium text-white mb-1.5">
                    <Award
                      size={14}
                      className="text-emerald-400"
                      aria-hidden="true"
                    />
                    {credit.source}
                  </p>
                  <p className="text-small text-white/60 leading-relaxed mb-2">
                    {credit.basis}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {credit.covers.map((area) => (
                      <span
                        key={area}
                        className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/[0.08] border border-emerald-500/15 text-micro text-emerald-300/90"
                      >
                        {area.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body text-white/60 leading-relaxed">
              None identified — no held certifications or existing licences were
              credited on your answers.
            </p>
          )}
        </section>

        {/* ── 5 · Roadmap ────────────────────────────────────────────────── */}
        <section aria-label="Roadmap" className="mb-10">
          <h2 className="text-heading text-white mb-2">Roadmap</h2>
          <p className="text-body text-white/55 mb-6">
            Deadline-ordered actions from your own dates and already-in-force
            duties. Items whose timing depends on contested legislation carry no
            invented date — the conservative reading is shown collapsed.
          </p>
          {roadmap.length > 0 ? (
            <ol className="space-y-3">
              {roadmap.map((item, i) => (
                <li
                  key={i}
                  className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-micro uppercase tracking-[0.12em] ${
                        item.due === "contested"
                          ? "bg-amber-500/[0.12] border-amber-500/25 text-amber-300"
                          : "bg-emerald-500/[0.10] border-emerald-500/25 text-emerald-300"
                      }`}
                    >
                      <CalendarClock size={10} aria-hidden="true" />
                      {item.due === "contested" ? "timing contested" : item.due}
                    </span>
                    <p className="text-body text-white/80 leading-relaxed">
                      {item.action}
                    </p>
                  </div>
                  {item.basis.length > 0 ? (
                    <ul className="mt-2 space-y-1 pl-1">
                      {item.basis.map((s, j) => (
                        <li
                          key={j}
                          className="text-small text-white/45 leading-relaxed"
                        >
                          <Scale
                            size={10}
                            className="inline mr-1.5 -mt-0.5"
                            aria-hidden="true"
                          />
                          {s.label} — {s.citation} (as of {s.asOf})
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {item.fluxFlag ? <FluxChip flux={item.fluxFlag} /> : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-body text-white/60 leading-relaxed">
              No roadmap items were derived — none of your answers carried a
              date and no already-in-force duty applied.
            </p>
          )}
          {/* §7.3: pre-application engagement ships as roadmap COPY. */}
          <p className="mt-4 rounded-xl bg-white/[0.02] border border-white/[0.08] p-4 text-small text-white/55 leading-relaxed">
            {PRE_APPLICATION_ENGAGEMENT_NOTE}
          </p>
        </section>

        {/* ── 6 · Jurisdiction comparison (only when Q4.5 was answered) ──── */}
        {showJurisdictionMatrix ? (
          <section aria-label="Jurisdiction comparison" className="mb-10">
            <h2 className="text-heading text-white mb-2">
              Jurisdiction comparison
            </h2>
            <p className="text-body text-white/55 mb-6">
              A factual comparison of the jurisdictions you are considering —
              timelines, insurance requirements and fees as stated in each
              national law.
            </p>
            <JurisdictionMatrix codes={consideredCodes} />
          </section>
        ) : null}

        {/* ── 7 · Disclaimer (§6 (7) — at the point of action) ──────────── */}
        <footer className="pt-6 border-t border-white/[0.08]">
          <p className="text-small text-white/45 leading-relaxed">
            {SCOPE_DISCLAIMER}{" "}
            <Link
              href="/legal/terms"
              className="underline hover:text-white/70 transition-colors"
            >
              Full terms
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
