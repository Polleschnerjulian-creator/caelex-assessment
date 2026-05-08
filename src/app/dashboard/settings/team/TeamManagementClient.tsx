"use client";

/**
 * Sprint E3 — Team management client island.
 *
 * Renders the members table + pending invitations + invite form,
 * wires all mutations to the existing organization REST API
 * (server-side permission checks already enforced there).
 *
 * UX patterns:
 *   - Members listed sorted by role priority (OWNER → VIEWER) then
 *     join date.
 *   - Inline role-change via select; debounced confirmation modal
 *     for OWNER promotions.
 *   - Remove + revoke as confirm-modal flows (destructive operations
 *     get the explicit "yes I'm sure" gate).
 *   - Invite form lives in a dismissible card above the table.
 *
 * Permissions: caller's role gates client-side controls. The API
 * re-checks server-side; this is just to hide options the caller
 * can't use, not to enforce security.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Mail,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import {
  Card,
  CardHeader,
  StatusPill,
} from "@/components/dashboard/v2/ui/PageChrome";

type Role = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

const ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"];

const ROLE_DESCRIPTION: Record<Role, string> = {
  OWNER:
    "Full control. Can transfer ownership, delete the org, manage billing.",
  ADMIN: "Manage members, settings, and all compliance work.",
  MANAGER: "Manage compliance work (assessments, evidence, workflows).",
  MEMBER: "Operate (run assessments, upload evidence). No member management.",
  VIEWER: "Read-only access.",
};

interface MemberRow {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: Role;
  joinedAt: string;
}

interface InvitationRow {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  createdAt: string;
}

interface OrganizationLite {
  id: string;
  name: string;
  slug: string;
  maxUsers: number;
  plan: string;
}

interface Props {
  orgId: string;
  callerUserId: string;
  callerRole: Role;
  canInvite: boolean;
  organization: OrganizationLite | null;
  initialMembers: MemberRow[];
  initialInvitations: InvitationRow[];
}

export function TeamManagementClient({
  orgId,
  callerUserId,
  callerRole,
  canInvite,
  organization,
  initialMembers,
  initialInvitations,
}: Props) {
  const router = useRouter();
  const [members, setMembers] = React.useState<MemberRow[]>(initialMembers);
  const [invitations, setInvitations] =
    React.useState<InvitationRow[]>(initialInvitations);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [showInvite, setShowInvite] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState<MemberRow | null>(
    null,
  );
  const [confirmRevoke, setConfirmRevoke] =
    React.useState<InvitationRow | null>(null);

  const seatsUsed = members.length + invitations.length;
  const seatsCap = organization?.maxUsers ?? 99;
  const seatsAtLimit = seatsUsed >= seatsCap;

  function safeError(e: unknown, fallback: string): string {
    if (e instanceof Error) return e.message;
    if (typeof e === "string") return e;
    return fallback;
  }

  async function postJSON<T>(
    url: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(data?.error ?? `Request failed (HTTP ${res.status})`);
    }
    return (await res.json()) as T;
  }

  async function inviteMember(email: string, role: Role) {
    setBusy(true);
    setError(null);
    try {
      const data = await postJSON<{ invitation: InvitationRow }>(
        `/api/organizations/${orgId}/invitations`,
        "POST",
        { email, role },
      );
      setInvitations((prev) => [data.invitation, ...prev]);
      setShowInvite(false);
    } catch (e) {
      setError(safeError(e, "Invite failed"));
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(member: MemberRow, newRole: Role) {
    if (member.role === newRole) return;
    if (newRole === "OWNER") {
      const ok = window.confirm(
        `Promote ${member.email} to OWNER? They will have full control over this organization, including the ability to remove other owners.`,
      );
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    const prevRole = member.role;
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m)),
    );
    try {
      await postJSON(
        `/api/organizations/${orgId}/members/${member.userId}`,
        "PATCH",
        { role: newRole },
      );
    } catch (e) {
      // Roll back
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role: prevRole } : m)),
      );
      setError(safeError(e, "Role change failed"));
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(member: MemberRow) {
    setBusy(true);
    setError(null);
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    try {
      await postJSON(
        `/api/organizations/${orgId}/members/${member.userId}`,
        "DELETE",
      );
      setConfirmRemove(null);
    } catch (e) {
      // Roll back
      setMembers((prev) => [...prev, member].sort(byRole));
      setError(safeError(e, "Remove failed"));
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvitation(invitation: InvitationRow) {
    setBusy(true);
    setError(null);
    setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
    try {
      await postJSON(
        `/api/organizations/${orgId}/invitations/${invitation.id}`,
        "DELETE",
      );
      setConfirmRevoke(null);
    } catch (e) {
      // Roll back
      setInvitations((prev) => [invitation, ...prev]);
      setError(safeError(e, "Revoke failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-[13px] text-rose-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded p-1 text-rose-400 transition hover:bg-rose-500/10"
            aria-label="Dismiss error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {/* Seat usage + invite CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusPill tone={seatsAtLimit ? "rose" : "slate"} size="sm">
            <span className="tabular-nums">
              {seatsUsed} / {seatsCap}
            </span>{" "}
            seats
          </StatusPill>
          {seatsAtLimit ? (
            <span className="text-[11.5px] text-rose-300">
              Seat limit reached. Upgrade plan to invite more members.
            </span>
          ) : null}
        </div>
        {canInvite ? (
          <button
            type="button"
            onClick={() => setShowInvite((s) => !s)}
            disabled={seatsAtLimit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-[13px] font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-40"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite member
          </button>
        ) : null}
      </div>

      {showInvite && canInvite ? (
        <InviteForm
          callerRole={callerRole}
          busy={busy}
          onCancel={() => setShowInvite(false)}
          onSubmit={(email, role) => inviteMember(email, role)}
        />
      ) : null}

      {/* Members table */}
      <Card>
        <CardHeader
          icon={Users}
          title={`Members · ${members.length}`}
          subtitle="Listed by role priority. Use the role select inline to change a member's role; click the trash icon to remove."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.012]">
                <Th>Member</Th>
                <Th>Role</Th>
                <Th>Joined</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-white/[0.04] transition last:border-b-0 hover:bg-white/[0.015]"
                >
                  <Td className="py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar member={m} />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-100">
                          {m.name ?? m.email ?? m.userId}
                          {m.userId === callerUserId ? (
                            <span className="ml-1.5 rounded-full bg-emerald-500/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
                              you
                            </span>
                          ) : null}
                        </div>
                        {m.email ? (
                          <div className="truncate text-[11px] text-slate-500">
                            {m.email}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {canManageMember(
                      callerRole,
                      m.role,
                      m.userId,
                      callerUserId,
                    ) ? (
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m, e.target.value as Role)}
                        disabled={busy}
                        className="rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-[12px] text-slate-100 transition focus:border-emerald-500/40 focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                      >
                        {ROLES.filter((r) =>
                          // OWNER promotion only allowed by another OWNER
                          r === "OWNER" ? callerRole === "OWNER" : true,
                        ).map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <RolePill role={m.role} />
                    )}
                  </Td>
                  <Td className="tabular-nums text-slate-400">
                    {new Date(m.joinedAt).toISOString().slice(0, 10)}
                  </Td>
                  <Td>
                    {canManageMember(
                      callerRole,
                      m.role,
                      m.userId,
                      callerUserId,
                    ) ? (
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(m)}
                        disabled={busy}
                        aria-label={`Remove ${m.email ?? m.userId}`}
                        className="rounded-md p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pending invitations */}
      {invitations.length > 0 ? (
        <Card>
          <CardHeader
            icon={Mail}
            title={`Pending invitations · ${invitations.length}`}
            subtitle="Invitations expire after 7 days unless accepted. Revoke to invalidate the link."
          />
          <ul className="divide-y divide-white/[0.04]">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-slate-400 ring-1 ring-inset ring-white/[0.06]">
                    <Mail className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-medium text-slate-100">
                      {inv.email}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires{" "}
                        {new Date(inv.expiresAt).toISOString().slice(0, 10)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <RolePill role={inv.role} />
                  {canInvite ? (
                    <button
                      type="button"
                      onClick={() => setConfirmRevoke(inv)}
                      disabled={busy}
                      className="rounded-md p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
                      aria-label={`Revoke ${inv.email}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Remove member confirm */}
      {confirmRemove ? (
        <ConfirmModal
          title="Remove member?"
          body={
            <>
              <strong className="text-slate-200">
                {confirmRemove.email ?? confirmRemove.userId}
              </strong>{" "}
              will lose access to this organization immediately. Their
              assessment data + audit-log entries are kept (regulatory
              retention).
            </>
          }
          confirmLabel="Remove"
          confirmTone="rose"
          busy={busy}
          onCancel={() => setConfirmRemove(null)}
          onConfirm={() => {
            void removeMember(confirmRemove);
          }}
        />
      ) : null}

      {/* Revoke invitation confirm */}
      {confirmRevoke ? (
        <ConfirmModal
          title="Revoke invitation?"
          body={
            <>
              The link sent to{" "}
              <strong className="text-slate-200">{confirmRevoke.email}</strong>{" "}
              will stop working. They&apos;ll need a fresh invitation to join.
            </>
          }
          confirmLabel="Revoke"
          confirmTone="rose"
          busy={busy}
          onCancel={() => setConfirmRevoke(null)}
          onConfirm={() => {
            void revokeInvitation(confirmRevoke);
          }}
        />
      ) : null}
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-5 py-3 align-middle text-slate-300 ${className ?? ""}`}>
      {children}
    </td>
  );
}

function Avatar({ member }: { member: MemberRow }) {
  const initial = (member.name ?? member.email ?? "?")
    .slice(0, 1)
    .toUpperCase();
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white/[0.18] to-white/[0.06] text-[12px] font-semibold text-slate-100 ring-1 ring-inset ring-white/[0.08]"
      aria-hidden
    >
      {initial}
    </span>
  );
}

function RolePill({ role }: { role: Role }) {
  const tones: Record<Role, "emerald" | "amber" | "cyan" | "violet" | "slate"> =
    {
      OWNER: "amber",
      ADMIN: "violet",
      MANAGER: "cyan",
      MEMBER: "emerald",
      VIEWER: "slate",
    };
  return (
    <StatusPill tone={tones[role]} size="sm">
      {role.toLowerCase()}
    </StatusPill>
  );
}

function ConfirmModal({
  title,
  body,
  confirmLabel,
  confirmTone,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  confirmTone: "rose" | "emerald";
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-white/[0.08] bg-[#13131A] shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-white/[0.05] bg-white/[0.012] px-5 py-3">
          <h3 className="text-[14px] font-semibold tracking-tight text-slate-100">
            {title}
          </h3>
        </header>
        <div className="px-5 py-4 text-[13px] leading-relaxed text-slate-300">
          {body}
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-white/[0.05] bg-white/[0.012] px-5 py-3">
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
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition disabled:opacity-50 ${
              confirmTone === "rose"
                ? "bg-rose-500 text-white hover:bg-rose-400"
                : "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
            }`}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

function InviteForm({
  callerRole,
  busy,
  onCancel,
  onSubmit,
}: {
  callerRole: Role;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (email: string, role: Role) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<Role>("MEMBER");

  return (
    <Card className="border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.04] to-emerald-500/[0.012]">
      <CardHeader
        icon={UserPlus}
        title="Invite a teammate"
        subtitle={ROLE_DESCRIPTION[role]}
        trailing={
          <button
            type="button"
            onClick={onCancel}
            className="rounded p-1 text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
            aria-label="Cancel invite"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        }
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.trim()) return;
          onSubmit(email.trim().toLowerCase(), role);
        }}
        className="space-y-3 px-5 py-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="teammate@operator.com"
              className="w-full rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-600 transition outline-none hover:bg-white/[0.04] focus:border-emerald-500/40 focus:bg-white/[0.04] focus:ring-2 focus:ring-emerald-500/15"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Role
            </span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[13px] text-slate-100 transition outline-none focus:border-emerald-500/40 focus:bg-white/[0.04] focus:ring-2 focus:ring-emerald-500/15"
            >
              {ROLES.filter((r) =>
                r === "OWNER" ? callerRole === "OWNER" : true,
              ).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/[0.05] pt-3">
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
            disabled={busy || !email.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-[12px] font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            Send invitation
          </button>
        </div>
      </form>
    </Card>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

const ROLE_RANK: Record<Role, number> = {
  OWNER: 0,
  ADMIN: 1,
  MANAGER: 2,
  MEMBER: 3,
  VIEWER: 4,
};

function byRole(a: MemberRow, b: MemberRow): number {
  const r = ROLE_RANK[a.role] - ROLE_RANK[b.role];
  if (r !== 0) return r;
  return a.joinedAt.localeCompare(b.joinedAt);
}

/**
 * Can the caller manage (change role / remove) the target member?
 *
 * Rules:
 *   - You can never modify yourself (use leave-org from settings).
 *   - OWNER can manage everyone.
 *   - ADMIN can manage MANAGER / MEMBER / VIEWER but not OWNER or
 *     other ADMINs.
 *   - MANAGER+ below cannot manage members.
 */
function canManageMember(
  callerRole: Role,
  targetRole: Role,
  targetUserId: string,
  callerUserId: string,
): boolean {
  if (targetUserId === callerUserId) return false;
  if (callerRole === "OWNER") return true;
  if (callerRole === "ADMIN") {
    return targetRole !== "OWNER" && targetRole !== "ADMIN";
  }
  return false;
}

// Defensive re-export so this isn't tree-shaken when imported for
// types only. (Components above are the actual consumers.)
export const __organization_lite: OrganizationLite | null = null;
