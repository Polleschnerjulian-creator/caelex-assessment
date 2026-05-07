"use client";

/**
 * Sprint Mission-3 — interactive island for the mission detail page.
 *
 * Renders the action toolbar (Edit · Assign spacecraft · Archive),
 * the inline edit form, the spacecraft picker, and per-row detach
 * handlers (which target buttons rendered by the server-side table
 * via `data-detach-assignment="..."`).
 *
 * All mutations call /api/missions/* then `router.refresh()` to
 * re-render the parent server component with fresh data — Next 15
 * pattern, no client-side cache invalidation needed.
 *
 * Per-row detach uses event delegation: server renders the buttons
 * with `data-detach-assignment={id}`, this component listens once on
 * the document and dispatches when it sees one. Avoids prop-drilling
 * a handler into every server-rendered <td>.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Archive,
  Plus,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { SpacecraftStatus } from "@prisma/client";

interface AvailableSpacecraft {
  id: string;
  name: string;
  status: SpacecraftStatus;
  cosparId: string | null;
  noradId: string | null;
  orbitType: string;
  altitudeKm: number | null;
}

interface AssignedSpacecraftLite {
  assignmentId: string;
  spacecraftName: string;
  role: string;
}

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

const STATUSES = [
  "PLANNED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
] as const;

const ROLE_OPTIONS = [
  "primary",
  "backup",
  "constellation_member",
  "drone",
  "rideshare",
] as const;

interface Props {
  missionId: string;
  currentName: string;
  currentReference: string | null;
  currentDescription: string | null;
  currentMissionType: string;
  currentProgramPhase: string;
  currentStatus: string;
  currentPrimaryEndUser: string | null;
  currentPrimaryEndUserCountryCode: string | null;
  currentPlannedStartAt: string | null; // YYYY-MM-DD or null
  currentStartedAt: string | null;
  currentEndedAt: string | null;
  currentAuthorityRefs: string[];
  availableSpacecraft: AvailableSpacecraft[];
  assignedSpacecraft: AssignedSpacecraftLite[];
}

type Mode = "view" | "edit" | "assign" | "archive";

export function MissionDetailActions(props: Props) {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("view");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Event-delegated detach handler. Listens once for clicks on
  // server-rendered detach buttons (data-detach-assignment="...").
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const btn = target.closest<HTMLElement>("[data-detach-assignment]");
      if (!btn) return;
      e.preventDefault();
      const assignmentId = btn.getAttribute("data-detach-assignment");
      if (!assignmentId) return;
      const assignment = props.assignedSpacecraft.find(
        (a) => a.assignmentId === assignmentId,
      );
      if (
        !window.confirm(
          `Detach ${assignment?.spacecraftName ?? "this spacecraft"} from this mission? The assignment will be marked ended (history preserved).`,
        )
      ) {
        return;
      }
      void handleDetach(assignmentId);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.assignedSpacecraft, props.missionId]);

  async function handleDetach(assignmentId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/missions/${props.missionId}/spacecraft/${assignmentId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(body?.error ?? `Detach failed (HTTP ${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Detach failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Action toolbar above the FactsCard */}
      <div className="mb-5 flex items-center gap-2">
        <ToolbarButton
          icon={Pencil}
          label="Edit"
          onClick={() => {
            setError(null);
            setMode("edit");
          }}
        />
        <ToolbarButton
          icon={Plus}
          label="Assign spacecraft"
          onClick={() => {
            setError(null);
            setMode("assign");
          }}
        />
        <ToolbarButton
          icon={Archive}
          label="Archive"
          onClick={() => {
            setError(null);
            setMode("archive");
          }}
          tone="rose"
        />
      </div>

      {error ? (
        <div className="mb-4 inline-flex items-center gap-2 rounded-md border-l-2 border-rose-500/60 bg-rose-500/[0.05] px-3 py-2 text-xs text-rose-300">
          <AlertTriangle className="h-3.5 w-3.5" />
          {error}
        </div>
      ) : null}

      {mode === "edit" ? (
        <EditPanel
          {...props}
          busy={busy}
          onCancel={() => setMode("view")}
          onSubmit={async (patch) => {
            setBusy(true);
            setError(null);
            try {
              const res = await fetch(`/api/missions/${props.missionId}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(patch),
              });
              if (!res.ok) {
                const body = await safeJson(res);
                throw new Error(
                  body?.error ?? `Update failed (HTTP ${res.status})`,
                );
              }
              setMode("view");
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Update failed");
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}

      {mode === "assign" ? (
        <AssignPanel
          missionId={props.missionId}
          available={props.availableSpacecraft}
          busy={busy}
          onCancel={() => setMode("view")}
          onSubmit={async (input) => {
            setBusy(true);
            setError(null);
            try {
              const res = await fetch(
                `/api/missions/${props.missionId}/spacecraft`,
                {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(input),
                },
              );
              if (!res.ok) {
                const body = await safeJson(res);
                throw new Error(
                  body?.error ?? `Assign failed (HTTP ${res.status})`,
                );
              }
              setMode("view");
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Assign failed");
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}

      {mode === "archive" ? (
        <ArchivePanel
          missionName={props.currentName}
          busy={busy}
          onCancel={() => setMode("view")}
          onConfirm={async () => {
            setBusy(true);
            setError(null);
            try {
              const res = await fetch(`/api/missions/${props.missionId}`, {
                method: "DELETE",
              });
              if (!res.ok) {
                const body = await safeJson(res);
                throw new Error(
                  body?.error ?? `Archive failed (HTTP ${res.status})`,
                );
              }
              setMode("view");
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Archive failed");
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}

      {busy ? (
        <div className="mb-4 inline-flex items-center gap-2 text-[11px] text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Working…
        </div>
      ) : null}
    </>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  tone?: "rose";
}) {
  const colors =
    tone === "rose"
      ? "ring-rose-500/30 text-rose-300 hover:bg-rose-500/10"
      : "ring-white/[0.08] text-slate-200 hover:bg-white/[0.04]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium ring-1 ring-inset transition ${colors}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function PanelShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="mb-5 rounded-md p-4 ring-1 ring-inset ring-emerald-500/30">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-300">
          {title}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 transition hover:bg-white/[0.05]"
          aria-label="Close panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
    </div>
  );
}

function EditPanel({
  busy,
  onCancel,
  onSubmit,
  ...props
}: Props & {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = React.useState(props.currentName);
  const [reference, setReference] = React.useState(
    props.currentReference ?? "",
  );
  const [description, setDescription] = React.useState(
    props.currentDescription ?? "",
  );
  const [missionType, setMissionType] = React.useState(
    props.currentMissionType,
  );
  const [programPhase, setProgramPhase] = React.useState(
    props.currentProgramPhase,
  );
  const [status, setStatus] = React.useState(props.currentStatus);
  const [primaryEndUser, setPrimaryEndUser] = React.useState(
    props.currentPrimaryEndUser ?? "",
  );
  const [primaryEndUserCountryCode, setPrimaryEndUserCountryCode] =
    React.useState(props.currentPrimaryEndUserCountryCode ?? "");
  const [plannedStartAt, setPlannedStartAt] = React.useState(
    props.currentPlannedStartAt ?? "",
  );
  const [startedAt, setStartedAt] = React.useState(
    props.currentStartedAt ?? "",
  );
  const [endedAt, setEndedAt] = React.useState(props.currentEndedAt ?? "");
  const [refsText, setRefsText] = React.useState(
    props.currentAuthorityRefs.join("\n"),
  );

  return (
    <PanelShell title="Edit mission" onClose={onCancel}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const patch: Record<string, unknown> = {
            name: name.trim(),
            reference: reference.trim() || null,
            description: description.trim() || null,
            missionType,
            programPhase,
            status,
            primaryEndUser: primaryEndUser.trim() || null,
            primaryEndUserCountryCode: primaryEndUserCountryCode.trim() || null,
            plannedStartAt: plannedStartAt || null,
            startedAt: startedAt || null,
            endedAt: endedAt || null,
            authorityRefs: refsText
              .split("\n")
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
              .slice(0, 50),
          };
          void onSubmit(patch);
        }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <Field label="Name" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            required
            className={inputClass}
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
        <Field label="Mission type">
          <select
            value={missionType}
            onChange={(e) => setMissionType(e.target.value)}
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
            onChange={(e) => setProgramPhase(e.target.value)}
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
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.toLowerCase()}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Primary end-user">
          <input
            value={primaryEndUser}
            onChange={(e) => setPrimaryEndUser(e.target.value)}
            maxLength={200}
            placeholder="e.g. ESA EOP-S, BMVg"
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
            pattern="^[A-Z]{2}$"
            placeholder="DE"
            className={`${inputClass} font-mono uppercase`}
          />
        </Field>
        <Field label="Planned start (YYYY-MM-DD)">
          <input
            type="date"
            value={plannedStartAt}
            onChange={(e) => setPlannedStartAt(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Started">
          <input
            type="date"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Ended">
          <input
            type="date"
            value={endedAt}
            onChange={(e) => setEndedAt(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Description" full>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            rows={3}
            className={`${inputClass} resize-y`}
          />
        </Field>
        <Field label="Authority references (one per line)" full>
          <textarea
            value={refsText}
            onChange={(e) => setRefsText(e.target.value)}
            rows={3}
            placeholder={"BAFA-EXP-12345\nFCC-IBFS-987"}
            className={`${inputClass} font-mono resize-y`}
          />
        </Field>
        <div className="flex items-center justify-end gap-2 sm:col-span-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md px-3 py-1.5 text-[12px] text-slate-300 ring-1 ring-inset ring-white/[0.08] transition hover:bg-white/[0.04] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-[12px] font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </form>
    </PanelShell>
  );
}

function AssignPanel({
  missionId: _missionId,
  available,
  busy,
  onCancel,
  onSubmit,
}: {
  missionId: string;
  available: AvailableSpacecraft[];
  busy: boolean;
  onCancel: () => void;
  onSubmit: (input: Record<string, unknown>) => Promise<void>;
}) {
  const [spacecraftId, setSpacecraftId] = React.useState(
    available[0]?.id ?? "",
  );
  const [role, setRole] =
    React.useState<(typeof ROLE_OPTIONS)[number]>("primary");
  const [slot, setSlot] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");

  return (
    <PanelShell title="Assign spacecraft" onClose={onCancel}>
      {available.length === 0 ? (
        <p className="text-xs text-slate-400">
          No spacecraft available in your organization. Register one in the
          Registration module first.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit({
              spacecraftId,
              role,
              constellationSlot: slot ? parseInt(slot, 10) : null,
              notes: notes.trim() || null,
            });
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <Field label="Spacecraft" full>
            <select
              value={spacecraftId}
              onChange={(e) => setSpacecraftId(e.target.value)}
              required
              className={inputClass}
            >
              {available.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.cosparId ? ` · ${s.cosparId}` : ""}
                  {` · ${s.orbitType}`}
                  {s.altitudeKm ? ` · ${Math.round(s.altitudeKm)} km` : ""}
                  {` · ${s.status}`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Role">
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as (typeof ROLE_OPTIONS)[number])
              }
              className={inputClass}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Constellation slot (optional)">
            <input
              type="number"
              min={1}
              max={10000}
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Notes" full>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              rows={2}
              placeholder="e.g. Primary until Phase E starts, then backup."
              className={`${inputClass} resize-y`}
            />
          </Field>
          <div className="flex items-center justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-md px-3 py-1.5 text-[12px] text-slate-300 ring-1 ring-inset ring-white/[0.08] transition hover:bg-white/[0.04] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !spacecraftId}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-[12px] font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Assign
            </button>
          </div>
        </form>
      )}
    </PanelShell>
  );
}

function ArchivePanel({
  missionName,
  busy,
  onCancel,
  onConfirm,
}: {
  missionName: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <PanelShell title="Archive mission" onClose={onCancel}>
      <p className="mb-3 text-xs text-slate-300">
        Archiving sets the status to <strong>CANCELLED</strong> and ends every
        active spacecraft assignment. The mission stays on record (5+ year
        retention requirement under §22 AWV / 15 CFR 762) — you can still view
        it on the list under <em>Completed / Cancelled</em>.
      </p>
      <p className="mb-4 text-[11px] text-rose-400">
        Are you sure you want to archive <strong>{missionName}</strong>?
      </p>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-md px-3 py-1.5 text-[12px] text-slate-300 ring-1 ring-inset ring-white/[0.08] transition hover:bg-white/[0.04] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void onConfirm()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-rose-500 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-rose-400 disabled:opacity-50"
        >
          <Archive className="h-3.5 w-3.5" />
          Archive
        </button>
      </div>
    </PanelShell>
  );
}

// ─── Tiny shared form parts ────────────────────────────────────────────────

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
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
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
