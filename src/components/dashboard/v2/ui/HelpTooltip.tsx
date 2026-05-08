"use client";

/**
 * Sprint UF1 — Help tooltip primitive.
 *
 * Hover/focus-triggered explanation for opaque domain terms in the
 * platform. Built on Radix HoverCard (already in deps via Sprint 5)
 * because content is richer than a single sentence — definitions,
 * abbreviation expansions, links to deep-dive pages.
 *
 * Usage:
 *
 *   <HelpTooltip
 *     term="Posture"
 *     definition="Executive overview of where you stand…"
 *     learnMoreHref="/dashboard/posture"
 *   >
 *     <span>Posture</span>
 *   </HelpTooltip>
 *
 * Accessibility:
 *   - Trigger element gets `aria-describedby` pointing at the popover
 *   - Keyboard: focus the trigger, ESC closes
 *   - The wrapped child becomes the visual element; tooltip is
 *     decorative (no interaction needed for understanding)
 *
 * Glossary lookups are static — see GLOSSARY below. Adding a term =
 * one entry there + use <HelpTooltip term="X"> sites.
 */

import * as React from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { HelpCircle } from "lucide-react";
import Link from "next/link";

export interface GlossaryEntry {
  /** One-sentence definition. */
  short: string;
  /** Optional 2-3 sentence longer body (rendered as paragraph below short). */
  body?: string;
  /** Optional href for "Learn more" link inside the popover. */
  learnMoreHref?: string;
  /** Optional acronym expansion shown in mono text below short. */
  acronym?: string;
}

/**
 * Static glossary of every opaque term used across the V2 sidebar +
 * page-chrome. Keep in sync with V2Sidebar items + key page labels.
 *
 * Adding a term: add an entry here, then use <HelpTooltip term="X">
 * anywhere. Misspelt term key → `null` glossary entry → tooltip
 * silently skipped (no broken UI in production).
 */
export const GLOSSARY: Record<string, GlossaryEntry> = {
  // ─── Sidebar — Today's Work ──────────────────────────────────────
  Today: {
    short: "Mercury-style inbox of compliance signals needing attention.",
    body: "Three buckets: Urgent (today), This week, Watching (in flight). Items come from regulatory deadlines, expiring documents, sanctions hits, and Astra recommendations.",
  },
  Triage: {
    short: "Single keyboard-driven queue for incoming compliance signals.",
    body: "Notifications + regulatory updates + satellite alerts unified. Use J/K to navigate, A to acknowledge, D to dismiss. Linear-pattern.",
  },
  Proposals: {
    short: "Astra-proposed actions awaiting human approval.",
    body: "When Astra (or a non-OWNER user) calls a high-impact action, it queues here for your review. 4-eyes principle for write operations against compliance state.",
    learnMoreHref: "/dashboard/proposals",
  },
  Astra: {
    short: "Caelex's AI compliance copilot, powered by Claude.",
    body: "Knows your org's compliance posture, missions, regulatory state, and 119 EU Space Act articles. Tools include screening counterparties, generating reports, and proposing actions.",
  },

  // ─── Sidebar — Operations ───────────────────────────────────────
  Missions: {
    short:
      "First-class entity grouping spacecraft by program — single satellite, constellation, or launch campaign.",
    body: "Each mission has its own status, NASA program phase (A-F), customer, and authority references. Spacecraft are M:N-assigned with role + time-bounds.",
    learnMoreHref: "/dashboard/missions",
  },
  "Mission Control": {
    short: "3D fly-over of your spacecraft fleet with live orbital tracking.",
    body: "Visualizes operating spacecraft positions from CelesTrak TLE data. LEO closest, GEO farthest. Click and drag to look around.",
  },
  Ephemeris: {
    short:
      "Predictive compliance forecasting from orbital decay + fuel models.",
    body: "Projects your compliance state forward 90 days using physics-based decay, propellant depletion, and subsystem-degradation models. What-if scenarios for early-decommission decisions.",
    learnMoreHref: "/dashboard/ephemeris",
  },
  Sentinel: {
    short: "Autonomous compliance evidence agents.",
    body: "Background agents that watch for evidence-gap signals (expiring documents, missing assessments, schedule slips) and surface them as Astra proposals before they become problems.",
    acronym: "Auto-monitoring",
  },

  // ─── Sidebar — Compliance ───────────────────────────────────────
  Posture: {
    short:
      "Executive overview of where you stand right now across all regulations.",
    body: "Compliance score per regulation, status distribution donut, regulation-by-regulation table with open-work counters. The 'how good are we?' view.",
    learnMoreHref: "/dashboard/posture",
  },
  "Article Tracker": {
    short:
      "Article-level drill-down: status of every applicable EU Space Act / NIS2 / national-law article.",
    body: "Shows the 119 EU Space Act articles + 51 NIS2 requirements with per-article status (compliant / partial / non-compliant / not-assessed). The 'show me the receipts' view.",
  },
  Incidents: {
    short:
      "NIS2 / supervision incident tracking with hard-deadline reporting cadence.",
    body: "Art. 23 NIS2 24h / 72h / 1-month phase-reporting timer enforced by hourly cron. Each incident has affected assets, NCA notification status, and a workflow state machine.",
    learnMoreHref: "/dashboard/incidents",
  },
  Documents: {
    short: "Versioned document vault with expiry tracking + access control.",
    body: "Mission descriptions, debris plans, insurance certificates, NCA submissions. Per-doc audit trail, expiry alerts at 90 / 30 / 14 / 7 days, AES-256 storage on R2.",
  },
  "Regulatory Feed": {
    short:
      "Daily-polled stream of new EU / national / agency regulations affecting space ops.",
    body: "Sources include EUR-Lex, BAFA, FCC, BNetzA. Each update is severity-tagged + module-tagged so we surface what's relevant.",
  },
  Network: {
    short:
      "Stakeholder ecosystem — counsel, insurers, auditors, suppliers, NCAs.",
    body: "Manage engagements, share data rooms, track compliance attestations across your supplier + provider chain.",
  },
  Trade: {
    short:
      "Export-control operations layer — classify items, screen counterparties, license shipments.",
    body: "Operations layer (Wave A/B/C) for ECCN/USML classification, OFAC / BIS / DDTC / EU / UK / UN sanctions screening with 50%-rule cascade, and BAFA-ELAN-K2 license stack.",
    learnMoreHref: "/dashboard/trade",
  },

  // ─── Sidebar — Audit & System ───────────────────────────────────
  "Audit Center": {
    short: "Compliance evidence overview + module-by-module coverage.",
    body: "Shows which requirements have evidence attached, which are still open, and the org's overall evidence-coverage percentage. Pre-audit prep view.",
  },
  "Audit Log": {
    short:
      "Chronological filterable list of every audit event in your organization.",
    body: "Hash-chained for tamper-evidence. Filter by action / actor / entity / date range / free text. CSV export. 5+ year retention per §22 AWV / 15 CFR 762.",
  },
  "Ops Console": {
    short: "Bloomberg-Terminal-style live event feed for the whole platform.",
    body: "Real-time SSE stream of proposals, mission phase changes, Astra reasoning, trade events, and sanctions sync. Pause + resume.",
  },
  "System Health": {
    short: "Heartbeat of the data pipelines feeding your compliance posture.",
    body: "Tier-coded (green / amber / rose) status across Notifications, Audit log, Regulatory feed, Sanctions sync, Bitcoin anchor, and NIS2 phases.",
  },

  // ─── Domain abbreviations ───────────────────────────────────────
  ECCN: {
    short: "Export Control Classification Number — US Commerce CCL.",
    body: "5-character code (e.g. 9A515.a) that determines US export-license requirements under the EAR. Different ECCNs trigger different license types and end-user restrictions.",
    acronym: "ECCN = Export Control Classification Number",
  },
  USML: {
    short: "United States Munitions List — ITAR-controlled defense articles.",
    body: "21-category list under 22 CFR § 121.1 covering weapons, military electronics, satellites with classified payloads, etc. USML-listed items require ITAR licenses with much tighter end-user restrictions than EAR.",
    acronym: "USML = U.S. Munitions List · ITAR scope",
  },
  IOD: {
    short:
      "In-Orbit Demonstration — pre-operational technology validation flight.",
    body: "Typically a single satellite carrying experimental payloads to mature TRL 5-6 → TRL 8-9 in-orbit before commercial deployment.",
    acronym: "IOD = In-Orbit Demonstration",
  },
  OOS_ADR: {
    short: "On-Orbit Servicing / Active Debris Removal.",
    body: "Mission types involving rendezvous, docking, refueling, repair, or de-orbit of other satellites. Triggers additional liability + insurance requirements.",
    acronym: "OOS · ADR",
  },
  NIS2: {
    short:
      "EU Network and Information Security Directive 2 (Directive 2022/2555).",
    body: "Cybersecurity baseline for essential + important entities. Art. 23 mandates 24h / 72h / 1-month incident reporting cadence. Caelex auto-classifies your entity status + tracks the deadline cascade.",
    acronym: "NIS2 = Directive 2022/2555",
  },
  "PHASE A": {
    short:
      "Concept Studies — feasibility, mission needs, system trade studies.",
  },
  "PHASE B": {
    short:
      "Concept & Technology Development — preliminary design, key tech maturation.",
  },
  "PHASE C": {
    short:
      "Preliminary Design & Technology Completion — PDR, system design freeze.",
  },
  "PHASE D": {
    short:
      "System Assembly, Integration, Test & Launch — manufacturing through liftoff.",
  },
  "PHASE E": {
    short: "Operations & Sustainment — primary mission ops in-orbit.",
  },
  "PHASE F": {
    short: "Closeout — decommissioning, deorbit verification, archive.",
  },
};

interface HelpTooltipProps {
  /** Term key — looked up in GLOSSARY. Case-sensitive. */
  term: string;
  children: React.ReactNode;
  /** Show a small (?) icon next to the wrapped child. Defaults true. */
  showIcon?: boolean;
  /** Trigger inline-block layout (defaults true so the wrapper doesn't break flow). */
  inline?: boolean;
  /** Override the glossary lookup with explicit content. */
  explicit?: GlossaryEntry;
  /** Side of the popover relative to trigger. */
  side?: "top" | "right" | "bottom" | "left";
}

export function HelpTooltip({
  term,
  children,
  showIcon = true,
  inline = true,
  explicit,
  side = "right",
}: HelpTooltipProps) {
  const entry = explicit ?? GLOSSARY[term];

  // No glossary entry = render children plain (no tooltip). Defensive
  // so misspelt term keys don't break production UI.
  if (!entry) {
    return <>{children}</>;
  }

  const Wrapper = inline ? "span" : "div";

  return (
    <HoverCard openDelay={250} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Wrapper className="inline-flex items-center gap-1">
          {children}
          {showIcon ? (
            <HelpCircle
              className="h-3 w-3 shrink-0 text-slate-500 transition hover:text-slate-300"
              aria-hidden
            />
          ) : null}
        </Wrapper>
      </HoverCardTrigger>
      <HoverCardContent
        side={side}
        align="start"
        sideOffset={8}
        className="z-50 w-80 rounded-xl border border-white/[0.08] bg-[#13131A] p-4 text-[12.5px] shadow-[0_24px_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]"
      >
        <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
          <HelpCircle className="h-3 w-3" />
          {term}
        </h4>
        <p className="text-[12.5px] leading-relaxed text-slate-100">
          {entry.short}
        </p>
        {entry.body ? (
          <p className="mt-2 text-[11.5px] leading-relaxed text-slate-400">
            {entry.body}
          </p>
        ) : null}
        {entry.acronym ? (
          <p className="mt-2 font-mono text-[10.5px] uppercase tracking-wider text-slate-500">
            {entry.acronym}
          </p>
        ) : null}
        {entry.learnMoreHref ? (
          <Link
            href={entry.learnMoreHref}
            className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-medium text-emerald-300 transition hover:text-emerald-200"
          >
            Open {term}
            <span aria-hidden>→</span>
          </Link>
        ) : null}
      </HoverCardContent>
    </HoverCard>
  );
}
