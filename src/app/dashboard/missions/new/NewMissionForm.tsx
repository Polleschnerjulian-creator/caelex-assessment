"use client";

/**
 * Sprint Mission-3.5 — new-mission form (UI overhaul).
 *
 * Layout:
 *   - 2/3 form column · 1/3 contextual help rail (sticky on desktop)
 *   - Help text adapts to whichever section the user is editing
 *   - Sticky footer action bar with primary CTA disabled until valid
 *   - Card-style sections with proper inner highlight (ios-elevated)
 *   - Consistent labels (small-caps) + values (natural case)
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Rocket,
  Tag,
  Users,
  CalendarDays,
  Info,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

const MISSION_TYPES = [
  { value: "EARTH_OBSERVATION", label: "Earth observation" },
  { value: "COMMUNICATIONS", label: "Communications" },
  { value: "NAVIGATION", label: "Navigation" },
  { value: "SCIENCE", label: "Science" },
  { value: "IOD", label: "In-orbit demonstration" },
  { value: "TECH_DEMO", label: "Technology demo" },
  { value: "HUMAN_SPACEFLIGHT", label: "Human spaceflight" },
  { value: "OOS_ADR", label: "On-orbit servicing / ADR" },
  { value: "LAUNCH", label: "Launch" },
  { value: "OTHER", label: "Other" },
] as const;

const PROGRAM_PHASES = [
  { value: "PHASE_A", label: "Phase A · Concept studies" },
  { value: "PHASE_B", label: "Phase B · Concept development" },
  { value: "PHASE_C", label: "Phase C · Preliminary design" },
  { value: "PHASE_D", label: "Phase D · Build & launch" },
  { value: "PHASE_E", label: "Phase E · Operations" },
  { value: "PHASE_F", label: "Phase F · Closeout" },
] as const;

const STATUSES = [
  { value: "PLANNED", label: "Planned" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
] as const;

type MissionTypeValue = (typeof MISSION_TYPES)[number]["value"];
type ProgramPhaseValue = (typeof PROGRAM_PHASES)[number]["value"];
type StatusValue = (typeof STATUSES)[number]["value"];

type FocusedSection =
  | "identity"
  | "classification"
  | "customer"
  | "timeline"
  | null;

export function NewMissionForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [missionType, setMissionType] =
    React.useState<MissionTypeValue>("EARTH_OBSERVATION");
  const [programPhase, setProgramPhase] =
    React.useState<ProgramPhaseValue>("PHASE_A");
  const [status, setStatus] = React.useState<StatusValue>("PLANNED");
  const [primaryEndUser, setPrimaryEndUser] = React.useState("");
  const [primaryEndUserCountryCode, setPrimaryEndUserCountryCode] =
    React.useState("");
  const [plannedStartAt, setPlannedStartAt] = React.useState("");
  const [refsText, setRefsText] = React.useState("");
  const [focused, setFocused] = React.useState<FocusedSection>(null);

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (busy) return;
      setBusy(true);
      setError(null);
      const payload: Record<string, unknown> = {
        name: name.trim(),
        reference: reference.trim() || null,
        description: description.trim() || null,
        missionType,
        programPhase,
        status,
        primaryEndUser: primaryEndUser.trim() || null,
        primaryEndUserCountryCode:
          primaryEndUserCountryCode.trim().toUpperCase() || null,
        plannedStartAt: plannedStartAt || null,
        authorityRefs: refsText
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .slice(0, 50),
      };
      try {
        const res = await fetch("/api/missions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await safeJson(res);
          throw new Error(body?.error ?? `Create failed (HTTP ${res.status})`);
        }
        const json = (await res.json()) as { mission: { id: string } };
        router.push(`/dashboard/missions/${json.mission.id}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Create failed");
        setBusy(false);
      }
    },
    [
      busy,
      name,
      reference,
      description,
      missionType,
      programPhase,
      status,
      primaryEndUser,
      primaryEndUserCountryCode,
      plannedStartAt,
      refsText,
      router,
    ],
  );

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* ── Form (2/3) ─────────────────────────────────────────── */}
      <div className="space-y-5 lg:col-span-2">
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-[13px] text-rose-300"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <Section
          icon={Rocket}
          title="Identity"
          subtitle="What this mission is called and how you reference it internally."
          onFocusEnter={() => setFocused("identity")}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Name" required full>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
                required
                placeholder="ICEYE Constellation Phase 2"
                className={inputClass}
                autoFocus
              />
            </Field>
            <Field
              label="Reference"
              hint="Internal program code. Must be unique in your organization."
              full
            >
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={100}
                placeholder="ICEYE-FY26-OPS"
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field
              label="Description"
              hint="Short overview — scope, customer, deliverables. Markdown not supported."
              full
            >
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={5000}
                rows={3}
                placeholder="Operational SAR data delivery for European government customers, FY26 cycle. 8 satellites in two planes."
                className={`${inputClass} resize-y leading-relaxed`}
              />
            </Field>
          </div>
        </Section>

        <Section
          icon={Tag}
          title="Classification"
          subtitle="Drives the regulatory regime and surfaces phase-appropriate compliance items."
          onFocusEnter={() => setFocused("classification")}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Mission type">
              <select
                value={missionType}
                onChange={(e) =>
                  setMissionType(e.target.value as MissionTypeValue)
                }
                className={inputClass}
              >
                {MISSION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Program phase">
              <select
                value={programPhase}
                onChange={(e) =>
                  setProgramPhase(e.target.value as ProgramPhaseValue)
                }
                className={inputClass}
              >
                {PROGRAM_PHASES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusValue)}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        <Section
          icon={Users}
          title="Customer & authority"
          subtitle="Who the mission serves and which permits / licenses apply."
          onFocusEnter={() => setFocused("customer")}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Primary end-user" full>
              <input
                value={primaryEndUser}
                onChange={(e) => setPrimaryEndUser(e.target.value)}
                maxLength={200}
                placeholder="ESA EOP-S, BMVg / Bundeswehr"
                className={inputClass}
              />
            </Field>
            <Field label="End-user country" hint="ISO 3166-1 alpha-2">
              <input
                value={primaryEndUserCountryCode}
                onChange={(e) =>
                  setPrimaryEndUserCountryCode(e.target.value.toUpperCase())
                }
                maxLength={2}
                placeholder="DE"
                className={`${inputClass} font-mono uppercase tracking-widest`}
              />
            </Field>
            <Field
              label="Authority references"
              hint="One reference per line — BAFA, FCC, BNetzA permit numbers."
              full
            >
              <textarea
                value={refsText}
                onChange={(e) => setRefsText(e.target.value)}
                rows={3}
                placeholder={"BAFA-EXP-12345\nFCC-IBFS-987"}
                className={`${inputClass} font-mono leading-relaxed resize-y`}
              />
            </Field>
          </div>
        </Section>

        <Section
          icon={CalendarDays}
          title="Timeline"
          subtitle="Optional. Editable on the mission detail page."
          onFocusEnter={() => setFocused("timeline")}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Planned start date">
              <input
                type="date"
                value={plannedStartAt}
                onChange={(e) => setPlannedStartAt(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {/* Sticky footer */}
        <div className="sticky bottom-0 -mx-1 mt-2 flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#0B0D11]/80 p-3 backdrop-blur supports-[backdrop-filter]:bg-[#0B0D11]/65">
          <Link
            href="/dashboard/missions"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] text-slate-300 ring-1 ring-inset ring-white/[0.08] transition hover:bg-white/[0.04]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Cancel
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-slate-500 sm:inline">
              {name.trim() ? "Ready to create" : "Enter a name to continue"}
            </span>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-[13px] font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {busy ? "Creating…" : "Create mission"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Contextual rail (1/3) ──────────────────────────────── */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <HelpRail focused={focused} programPhase={programPhase} />
      </aside>
    </form>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
  onFocusEnter,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onFocusEnter?: () => void;
}) {
  return (
    <section
      onFocus={onFocusEnter}
      className="overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.012] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <header className="flex items-start gap-3 border-b border-white/[0.05] bg-white/[0.012] px-5 py-4">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold tracking-tight text-slate-100">
            {title}
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-400">{subtitle}</p>
        </div>
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  full,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex flex-col gap-1.5 ${full ? "sm:col-span-full" : ""}`}
    >
      <span className="flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        <span>
          {label}
          {required ? (
            <span className="ml-1 text-rose-400" aria-hidden>
              *
            </span>
          ) : null}
        </span>
      </span>
      {children}
      {hint ? (
        <span className="text-[11px] leading-relaxed text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-[13px] text-slate-100 placeholder:text-slate-600 transition outline-none hover:bg-white/[0.04] focus:border-emerald-500/40 focus:bg-white/[0.04] focus:ring-2 focus:ring-emerald-500/15";

// ─── Help rail ────────────────────────────────────────────────────────────

const PHASE_DESCRIPTIONS: Record<ProgramPhaseValue, string> = {
  PHASE_A:
    "Concept studies — feasibility assessment, mission needs, system trade studies. SRR / MDR review gates.",
  PHASE_B:
    "Concept & technology development — preliminary design, key tech maturation, PDR ahead.",
  PHASE_C:
    "Preliminary design & technology completion — system design freeze, CDR, debris-mitigation plan due.",
  PHASE_D:
    "System assembly, integration, test & launch — manufacturing, AIT, launch readiness, ORR / FRR / MRR.",
  PHASE_E:
    "Operations & sustainment — primary mission ops. Annual supervision reports, incident reporting active.",
  PHASE_F:
    "Closeout — decommissioning, deorbit verification, archive of mission data.",
};

function HelpRail({
  focused,
  programPhase,
}: {
  focused: FocusedSection;
  programPhase: ProgramPhaseValue;
}) {
  const content = (() => {
    switch (focused) {
      case "identity":
        return {
          title: "Mission identity",
          body: "The name is what shows up in the sidebar, dashboards, and audit trail. The reference is your internal program code (e.g. for cross-linking to ERP or SharePoint). Both can be edited later — there's no hard rule on naming, but consistency helps when you scale to multiple missions.",
          tips: [
            'Use a name that survives — avoid satellite-specific identifiers ("ICEYE-X14") unless this really is a single-spacecraft mission.',
            "Reference must be unique within your organization. Useful for command-line scripts and exports.",
          ],
        };
      case "classification":
        return {
          title: "Classification",
          body: "Mission type drives the applicable regulatory regime. Earth observation triggers EU Space Act § 14 (data distribution licensing); launch adds ITAR Part 121 + Outer Space Treaty registration; science has reduced frequency-coordination duties.",
          tips: [
            `${PHASE_DESCRIPTIONS[programPhase]}`,
            "Status is independent of program phase: a Phase E mission can be ACTIVE (operating normally) or PAUSED (anomaly investigation).",
          ],
        };
      case "customer":
        return {
          title: "Customer & authority",
          body: "Primary end-user feeds into counterparty screening (military-end-use keyword match) and helps populate authorization workflows. Authority references are the permit numbers that apply to the whole mission — per-spacecraft licenses go in the Spacecraft registry.",
          tips: [
            "End-user country is critical for export-control screening (BAFA / OFAC / EU sanctions).",
            "Authority references should be the human-readable permit numbers, not internal IDs. They appear in BAFA exports.",
          ],
        };
      case "timeline":
        return {
          title: "Timeline",
          body: "Planned start is just a target — when the mission actually starts (e.g. handover from Phase D to Phase E), set startedAt on the detail page. Both fields drive deadline reminders and audit reports.",
          tips: [
            "All timeline fields are optional — leave them blank if you're still in early planning.",
            "Phase F closeout is recorded by setting endedAt + status=COMPLETED.",
          ],
        };
      default:
        return {
          title: "What is a mission?",
          body: "A mission groups one or more spacecraft serving the same operational program. A constellation is one mission with N spacecraft. A launch campaign is one mission, one vehicle, repeated across flights. Pre-launch planning starts in Phase A — a mission can exist before any spacecraft hardware does.",
          tips: [
            "Constellations: assign all satellites to one mission, set role = constellation_member, use the bulk-assign tool with starting slot 1.",
            "Sequential customers on the same hardware: create a new mission, end the old assignment, create a new MissionSpacecraft row.",
            "Multi-mission spacecraft: a GEO sat at end-of-life can be moved to inclined orbit for a second mission.",
          ],
        };
    }
  })();

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.012] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <header className="flex items-center gap-2 border-b border-white/[0.05] bg-white/[0.012] px-4 py-3">
        <Info className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Context
        </span>
      </header>
      <div className="p-4">
        <h3 className="mb-1.5 text-[13px] font-semibold text-slate-100">
          {content.title}
        </h3>
        <p className="text-[12px] leading-relaxed text-slate-400">
          {content.body}
        </p>
        {content.tips.length > 0 ? (
          <ul className="mt-3 space-y-2 border-t border-white/[0.05] pt-3">
            {content.tips.map((t, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[11.5px] leading-relaxed text-slate-400"
              >
                <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400/80" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

async function safeJson(res: Response): Promise<{ error?: string } | null> {
  try {
    return (await res.json()) as { error?: string };
  } catch {
    return null;
  }
}
