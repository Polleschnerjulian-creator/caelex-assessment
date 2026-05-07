"use client";

/**
 * Sprint Mission-3 — new-mission form.
 *
 * Posts to /api/missions, then router.push('/dashboard/missions/<id>')
 * on success. Errors are surfaced inline.
 *
 * Defaults match the most common case for a new operator: PHASE_A
 * (concept studies), PLANNED, EARTH_OBSERVATION. The user can change
 * any of these after creation; "name" is the only required field.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

const MISSION_TYPES = [
  "EARTH_OBSERVATION",
  "COMMUNICATIONS",
  "NAVIGATION",
  "SCIENCE",
  "IOD",
  "TECH_DEMO",
  "HUMAN_SPACEFLIGHT",
  "OOS_ADR",
  "LAUNCH",
  "OTHER",
] as const;

const PROGRAM_PHASES = [
  "PHASE_A",
  "PHASE_B",
  "PHASE_C",
  "PHASE_D",
  "PHASE_E",
  "PHASE_F",
] as const;

const STATUSES = ["PLANNED", "ACTIVE", "PAUSED"] as const;

export function NewMissionForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [missionType, setMissionType] =
    React.useState<(typeof MISSION_TYPES)[number]>("EARTH_OBSERVATION");
  const [programPhase, setProgramPhase] =
    React.useState<(typeof PROGRAM_PHASES)[number]>("PHASE_A");
  const [status, setStatus] =
    React.useState<(typeof STATUSES)[number]>("PLANNED");
  const [primaryEndUser, setPrimaryEndUser] = React.useState("");
  const [primaryEndUserCountryCode, setPrimaryEndUserCountryCode] =
    React.useState("");
  const [plannedStartAt, setPlannedStartAt] = React.useState("");
  const [refsText, setRefsText] = React.useState("");

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
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
            throw new Error(
              body?.error ?? `Create failed (HTTP ${res.status})`,
            );
          }
          const json = (await res.json()) as { mission: { id: string } };
          router.push(`/dashboard/missions/${json.mission.id}`);
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Create failed");
          setBusy(false);
        }
      }}
      className="space-y-6"
    >
      {error ? (
        <div className="inline-flex items-center gap-2 rounded-md border-l-2 border-rose-500/60 bg-rose-500/[0.05] px-3 py-2 text-xs text-rose-300">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </div>
      ) : null}

      <Section title="Identity">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name" required full>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              required
              placeholder="e.g. ICEYE Constellation Phase 2"
              className={inputClass}
              autoFocus
            />
          </Field>
          <Field label="Reference">
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={100}
              placeholder="e.g. ICEYE-FY26-OPS"
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="Description" full>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={3}
              placeholder="Short overview: scope, customer, key deliverables."
              className={`${inputClass} resize-y`}
            />
          </Field>
        </div>
      </Section>

      <Section title="Classification">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Mission type">
            <select
              value={missionType}
              onChange={(e) =>
                setMissionType(e.target.value as (typeof MISSION_TYPES)[number])
              }
              className={inputClass}
            >
              {MISSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ").toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Program phase">
            <select
              value={programPhase}
              onChange={(e) =>
                setProgramPhase(
                  e.target.value as (typeof PROGRAM_PHASES)[number],
                )
              }
              className={inputClass}
            >
              {PROGRAM_PHASES.map((p) => (
                <option key={p} value={p}>
                  {p.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as (typeof STATUSES)[number])
              }
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Customer / authority">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Primary end-user" full>
            <input
              value={primaryEndUser}
              onChange={(e) => setPrimaryEndUser(e.target.value)}
              maxLength={200}
              placeholder="e.g. ESA EOP-S, BMVg / Bundeswehr"
              className={inputClass}
            />
          </Field>
          <Field label="End-user country (ISO-2)">
            <input
              value={primaryEndUserCountryCode}
              onChange={(e) =>
                setPrimaryEndUserCountryCode(e.target.value.toUpperCase())
              }
              maxLength={2}
              placeholder="DE"
              className={`${inputClass} font-mono uppercase`}
            />
          </Field>
          <Field label="Authority references (one per line)" full>
            <textarea
              value={refsText}
              onChange={(e) => setRefsText(e.target.value)}
              rows={2}
              placeholder={"BAFA-EXP-12345\nFCC-IBFS-987"}
              className={`${inputClass} font-mono resize-y`}
            />
          </Field>
        </div>
      </Section>

      <Section title="Timeline">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

      <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
        <Link
          href="/dashboard/missions"
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] text-slate-300 ring-1 ring-inset ring-white/[0.08] transition hover:bg-white/[0.04]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Cancel
        </Link>
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-4 py-2 text-[13px] font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          {busy ? "Creating…" : "Create mission"}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300">
        {title}
      </h2>
      <div className="rounded-md p-4 ring-1 ring-inset ring-white/[0.06]">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-full" : ""}`}>
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
        {label}
        {required ? <span className="ml-1 text-rose-400">*</span> : null}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "rounded-md bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-slate-100 ring-1 ring-inset ring-white/[0.08] transition focus:outline-none focus:ring-emerald-500/40";

async function safeJson(res: Response): Promise<{ error?: string } | null> {
  try {
    return (await res.json()) as { error?: string };
  } catch {
    return null;
  }
}
