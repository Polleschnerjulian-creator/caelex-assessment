"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * LegislativeTimeline — vertical chronological timeline of a law's
 * full legislative lifecycle. Renders the
 * `LegalSource.legislative_history` field as a stack of dated
 * milestones, each with an icon, type label, issuing body,
 * official-document reference (if any), Caelex description (if any),
 * and a deep-link to the canonical record.
 *
 * Why this matters: lawyers argue from legislative intent. A teleo­
 * logical interpretation of NIS2 Art. 21 needs to know what the
 * Council general approach said vs. what the trilogue changed vs.
 * what the final OJ text reads. This component makes that history
 * one click away from the source-detail page, instead of forcing
 * a side-trip to EUR-Lex's procedure-tracker.
 *
 * Visual chassis: vertical line with circular markers. Markers are
 * tinted by stage:
 *   - grey  → pre-adoption (proposal, readings, committees, trilogue)
 *   - amber → adoption + promulgation (the law-becomes-law moments)
 *   - emerald → in-force / transition
 *   - blue  → amendments + consolidations + treaty ratifications
 *   - red   → repeal / supersession / sunset
 *
 * Caelex-curated descriptions carry an explicit "Caelex"-prefix in
 * a muted tone so the lawyer can distinguish official records
 * (linked via `source_url`) from editorial commentary.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { ExternalLink, Clock, ShieldCheck, ShieldAlert } from "lucide-react";
import type {
  LegislativeMilestone,
  LegislativeMilestoneType,
} from "@/data/legal-sources/types";
import type { Language } from "@/lib/i18n";

// ─── Type → label / tone mapping ─────────────────────────────────────

interface TypeMeta {
  /** Tailwind-token-pair for the marker dot — first is bg, second is
   *  ring/border. Drives the tone communicated to the lawyer at a
   *  glance. */
  dot: string;
  /** Localised short label rendered above the body line. */
  label: { de: string; en: string };
}

const TYPE_META: Record<LegislativeMilestoneType, TypeMeta> = {
  // Pre-adoption — grey
  proposal: {
    dot: "bg-slate-400 dark:bg-slate-500 ring-slate-300 dark:ring-slate-600",
    label: { de: "Vorschlag", en: "Proposal" },
  },
  first_reading: {
    dot: "bg-slate-400 dark:bg-slate-500 ring-slate-300 dark:ring-slate-600",
    label: { de: "Erste Lesung", en: "First reading" },
  },
  committee_review: {
    dot: "bg-slate-400 dark:bg-slate-500 ring-slate-300 dark:ring-slate-600",
    label: { de: "Ausschussberatung", en: "Committee review" },
  },
  council_position: {
    dot: "bg-slate-400 dark:bg-slate-500 ring-slate-300 dark:ring-slate-600",
    label: {
      de: "Allgemeine Ausrichtung (Rat)",
      en: "Council general approach",
    },
  },
  second_reading: {
    dot: "bg-slate-400 dark:bg-slate-500 ring-slate-300 dark:ring-slate-600",
    label: { de: "Zweite Lesung", en: "Second reading" },
  },
  trilogue: {
    dot: "bg-slate-400 dark:bg-slate-500 ring-slate-300 dark:ring-slate-600",
    label: { de: "Trilog", en: "Trilogue" },
  },
  interservice: {
    dot: "bg-slate-400 dark:bg-slate-500 ring-slate-300 dark:ring-slate-600",
    label: { de: "Ressortabstimmung", en: "Interservice consultation" },
  },
  consultation: {
    dot: "bg-slate-400 dark:bg-slate-500 ring-slate-300 dark:ring-slate-600",
    label: { de: "Konsultation", en: "Consultation" },
  },
  // Adoption — amber
  adoption: {
    dot: "bg-amber-500 dark:bg-amber-400 ring-amber-300 dark:ring-amber-700",
    label: { de: "Verabschiedung", en: "Adoption" },
  },
  presidential_signature: {
    dot: "bg-amber-500 dark:bg-amber-400 ring-amber-300 dark:ring-amber-700",
    label: { de: "Ausfertigung", en: "Presidential signature" },
  },
  promulgation: {
    dot: "bg-amber-500 dark:bg-amber-400 ring-amber-300 dark:ring-amber-700",
    label: { de: "Verkündung", en: "Promulgation" },
  },
  // In force — emerald
  in_force: {
    dot: "bg-emerald-500 dark:bg-emerald-400 ring-emerald-300 dark:ring-emerald-700",
    label: { de: "Inkrafttreten", en: "Entry into force" },
  },
  transition_phase: {
    dot: "bg-emerald-500/70 dark:bg-emerald-400/70 ring-emerald-300 dark:ring-emerald-700",
    label: { de: "Übergangsphase", en: "Transition phase" },
  },
  // Post-adoption changes — blue
  amendment: {
    dot: "bg-blue-500 dark:bg-blue-400 ring-blue-300 dark:ring-blue-700",
    label: { de: "Änderung", en: "Amendment" },
  },
  consolidation: {
    dot: "bg-blue-500 dark:bg-blue-400 ring-blue-300 dark:ring-blue-700",
    label: { de: "Konsolidierung", en: "Consolidation" },
  },
  implementation_act: {
    dot: "bg-blue-500 dark:bg-blue-400 ring-blue-300 dark:ring-blue-700",
    label: { de: "Umsetzungsakt", en: "Implementation act" },
  },
  // Treaty milestones — blue (treat like amendments tone-wise)
  signed: {
    dot: "bg-blue-500 dark:bg-blue-400 ring-blue-300 dark:ring-blue-700",
    label: { de: "Zur Unterzeichnung aufgelegt", en: "Opened for signature" },
  },
  ratification: {
    dot: "bg-blue-500 dark:bg-blue-400 ring-blue-300 dark:ring-blue-700",
    label: { de: "Ratifikation", en: "Ratification" },
  },
  deposit: {
    dot: "bg-blue-500 dark:bg-blue-400 ring-blue-300 dark:ring-blue-700",
    label: { de: "Hinterlegung", en: "Deposit of instrument" },
  },
  entry_into_force_treaty: {
    dot: "bg-emerald-500 dark:bg-emerald-400 ring-emerald-300 dark:ring-emerald-700",
    label: {
      de: "Inkrafttreten (völkerrechtlich)",
      en: "Entry into force (international)",
    },
  },
  // Termination — red
  repeal: {
    dot: "bg-red-500 dark:bg-red-400 ring-red-300 dark:ring-red-700",
    label: { de: "Aufhebung", en: "Repeal" },
  },
  supersession: {
    dot: "bg-red-500 dark:bg-red-400 ring-red-300 dark:ring-red-700",
    label: { de: "Ablösung", en: "Supersession" },
  },
  sunset: {
    dot: "bg-red-500 dark:bg-red-400 ring-red-300 dark:ring-red-700",
    label: { de: "Außerkrafttreten", en: "Sunset" },
  },
};

function formatDate(iso: string, language: Language): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return language === "de" ? `${dd}.${mm}.${yyyy}` : `${yyyy}-${mm}-${dd}`;
}

interface LegislativeTimelineProps {
  milestones: LegislativeMilestone[];
  language: Language;
}

export function LegislativeTimeline({
  milestones,
  language,
}: LegislativeTimelineProps) {
  if (!milestones || milestones.length === 0) return null;

  const isDe = language === "de";

  // Sort chronologically ascending — readers expect "first → last"
  // when scanning the legislative path. Caller may pre-sort but we
  // re-sort defensively.
  const sorted = [...milestones].sort((a, b) => a.date.localeCompare(b.date));

  // Verification telemetry — drives the disclosure banner above the
  // timeline. Explicit disclosure of the verification gap is the
  // honest posture regulators and pilot customers expect.
  const verifiedCount = sorted.filter((m) => m.verified === true).length;
  const totalCount = sorted.length;
  const allVerified = verifiedCount === totalCount;
  const noneVerified = verifiedCount === 0;

  return (
    <section
      aria-labelledby="legislative-history-heading"
      className="mt-8 max-w-4xl"
    >
      <header className="flex items-center gap-2 mb-4">
        <Clock
          className="h-3.5 w-3.5 text-[var(--atlas-text-muted)]"
          strokeWidth={1.6}
          aria-hidden="true"
        />
        <h2
          id="legislative-history-heading"
          className="text-[13px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)]"
        >
          {isDe ? "Gesetzgebungsverlauf" : "Legislative history"}
        </h2>
        <span className="text-[10px] text-[var(--atlas-text-faint)] tabular-nums">
          {sorted.length}{" "}
          {isDe
            ? sorted.length === 1
              ? "Eintrag"
              : "Einträge"
            : sorted.length === 1
              ? "milestone"
              : "milestones"}
        </span>
      </header>

      {/* Verification-state disclosure. Three modes:
            - all verified  → green confirmation, lawyer can rely
            - none verified → red warning, demo-only state
            - partial       → amber, needs attention per-entry
          The per-entry state is ALSO surfaced as a badge on each
          milestone below. */}
      {allVerified ? (
        <div
          className="mb-4 flex items-start gap-2 rounded-md border border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/70 dark:bg-emerald-900/15 px-3 py-2 text-[11px] leading-relaxed text-emerald-900 dark:text-emerald-200"
          role="note"
        >
          <ShieldCheck
            className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"
            strokeWidth={1.7}
            aria-hidden="true"
          />
          <p>
            <strong>
              {isDe ? "Vollständig verifiziert. " : "Fully verified. "}
            </strong>
            {isDe
              ? "Jeder Eintrag wurde gegen die Primärquelle geprüft. Klick auf das Aktenzeichen führt zur amtlichen Quelle. Verbindlich ist allein die Originalquelle."
              : "Every entry has been checked against the primary source. Click each reference for the official record. Only the original source is authoritative."}
          </p>
        </div>
      ) : noneVerified ? (
        <div
          className="mb-4 flex items-start gap-2 rounded-md border border-red-300 dark:border-red-700/50 bg-red-50/70 dark:bg-red-900/15 px-3 py-2 text-[11px] leading-relaxed text-red-900 dark:text-red-200"
          role="note"
        >
          <ShieldAlert
            className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"
            strokeWidth={1.7}
            aria-hidden="true"
          />
          <p>
            <strong>
              {isDe
                ? "Prüfung ausstehend — Vorabansicht. "
                : "Verification pending — preview. "}
            </strong>
            {isDe
              ? "Diese Zeitstrahl-Einträge sind noch nicht gegen die Primärquellen verifiziert und dürfen nicht für rechtliche Argumentation verwendet werden. Bis zur Verifikation gilt jeder Eintrag als unverbindlicher Entwurf. Verifikationsprotokoll: docs/legal-templates/legislative-history-verification.md."
              : "These timeline entries have NOT yet been verified against the primary sources and MUST NOT be used for legal argument. Until verified, each entry is a non-binding draft. Verification protocol: docs/legal-templates/legislative-history-verification.md."}
          </p>
        </div>
      ) : (
        <div
          className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 dark:border-amber-700/50 bg-amber-50/70 dark:bg-amber-900/15 px-3 py-2 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200"
          role="note"
        >
          <ShieldAlert
            className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"
            strokeWidth={1.7}
            aria-hidden="true"
          />
          <p>
            <strong>
              {isDe
                ? `Teilweise verifiziert (${verifiedCount}/${totalCount}). `
                : `Partially verified (${verifiedCount}/${totalCount}). `}
            </strong>
            {isDe
              ? "Geprüfte Einträge tragen ein grünes Verifikations-Badge. Einträge mit amber Badge sind noch nicht final geprüft."
              : "Verified entries carry a green verification badge. Entries with an amber badge have not yet been finally checked."}
          </p>
        </div>
      )}

      <ol className="relative">
        {/* Vertical line — runs the full height behind the markers.
            Inset matches the marker centre so dots sit on the line.
            On dark mode tone it down slightly. */}
        <span
          aria-hidden="true"
          className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-800"
        />
        {sorted.map((m, i) => {
          const meta = TYPE_META[m.type];
          const isLast = i === sorted.length - 1;
          return (
            <li
              key={`${m.date}-${m.type}-${i}`}
              className={`relative pl-7 ${isLast ? "pb-0" : "pb-5"}`}
            >
              <span
                aria-hidden="true"
                className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full ring-4 ${meta.dot}`}
              />
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <time
                    dateTime={m.date}
                    className="text-[11.5px] font-mono tabular-nums text-[var(--atlas-text-secondary)]"
                  >
                    {formatDate(m.date, language)}
                  </time>
                  <span className="text-[10.5px] uppercase tracking-[0.08em] font-semibold text-[var(--atlas-text-muted)]">
                    {isDe ? meta.label.de : meta.label.en}
                  </span>
                  {/* Per-entry verification badge. Green when an
                      authorised reviewer has stamped the record;
                      amber otherwise. The reviewer details (who +
                      when) appear in a tooltip-style title attribute
                      so the surface stays compact. */}
                  {m.verified ? (
                    <span
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-700/50"
                      title={
                        m.verified_by && m.verified_at
                          ? `${isDe ? "Verifiziert von" : "Verified by"} ${m.verified_by} · ${m.verified_at}${m.verification_note ? " · " + m.verification_note : ""}`
                          : isDe
                            ? "Verifiziert"
                            : "Verified"
                      }
                    >
                      <ShieldCheck
                        className="h-2.5 w-2.5"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      {isDe ? "Verifiziert" : "Verified"}
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200/70 dark:border-amber-700/50"
                      title={
                        isDe
                          ? "Dieser Eintrag wurde noch nicht gegen die Primärquelle verifiziert und ist nicht für rechtliche Argumentation freigegeben."
                          : "This entry has not yet been verified against the primary source and is not released for legal argument."
                      }
                    >
                      <ShieldAlert
                        className="h-2.5 w-2.5"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      {isDe ? "Prüfung ausstehend" : "Pending verification"}
                    </span>
                  )}
                </div>
                {m.reference && m.source_url && (
                  <a
                    href={m.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10.5px] font-mono text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    {m.reference}
                    <ExternalLink
                      className="h-2.5 w-2.5"
                      strokeWidth={1.7}
                      aria-hidden="true"
                    />
                  </a>
                )}
                {m.reference && !m.source_url && (
                  <span className="text-[10.5px] font-mono text-[var(--atlas-text-muted)]">
                    {m.reference}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[12.5px] text-[var(--atlas-text-primary)] leading-snug">
                {m.body}
              </p>
              {m.description && (
                <p className="mt-1 text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed">
                  {m.description}
                </p>
              )}
              {m.affected_sections && m.affected_sections.length > 0 && (
                <p className="mt-1 text-[10.5px] text-[var(--atlas-text-muted)]">
                  {isDe ? "Betroffene Bestimmungen: " : "Affected provisions: "}
                  <span className="font-mono">
                    {m.affected_sections.join(", ")}
                  </span>
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
