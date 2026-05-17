"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate members list + add form (UI refresh, theme-aware).
 *
 * Owner-only mutations (the API enforces it; we surface the UI accordingly).
 * Add by email (must be a User in the same organisation). Remove via the X
 * button next to each non-owner member.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import { UserPlus, X, Loader2, Crown, ShieldCheck, User } from "lucide-react";
import type { MandateMemberRecord } from "./mandate-types";

interface Props {
  mandateId: string;
  members: MandateMemberRecord[];
  ownerUserId: string;
  onChanged: () => void;
}

const INPUT_CLASS =
  "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none transition-colors focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500";

export function MandateMembersList({
  mandateId,
  members,
  ownerUserId,
  onChanged,
}: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<
    "owner" | "reviewer" | "collaborator" | "viewer"
  >("collaborator");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/atlas/mandate/${mandateId}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setEmail("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setRemoving(userId);
    setError(null);
    try {
      const res = await fetch(
        `/api/atlas/mandate/${mandateId}/members?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
      <ul className="mb-3 space-y-1">
        {members.length === 0 ? (
          <li className="text-xs text-slate-500">Noch keine Mitglieder.</li>
        ) : (
          members.map((m) => {
            const isOwner = m.user.id === ownerUserId || m.role === "owner";
            return (
              <li
                key={m.id}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <RoleIcon role={m.role} isOwner={isOwner} />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-slate-800 dark:text-slate-100">
                    {m.user.name || m.user.email || "—"}
                  </div>
                  {m.user.name && m.user.email && (
                    <div className="line-clamp-1 text-[10px] text-slate-500">
                      {m.user.email}
                    </div>
                  )}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                  {m.role}
                </span>
                {!isOwner && (
                  <button
                    type="button"
                    onClick={() => handleRemove(m.user.id)}
                    disabled={removing === m.user.id}
                    className="text-slate-400 hover:text-red-600 disabled:opacity-30 dark:text-slate-500 dark:hover:text-red-400"
                    aria-label={`${m.user.email ?? "Mitglied"} entfernen`}
                  >
                    {removing === m.user.id ? (
                      <Loader2
                        size={11}
                        className="animate-spin motion-reduce:animate-none"
                      />
                    ) : (
                      <X size={11} />
                    )}
                  </button>
                )}
              </li>
            );
          })
        )}
      </ul>

      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-2 border-t border-slate-200 pt-3 dark:border-slate-700/40"
      >
        <div className="flex items-center gap-2">
          <input
            type="email"
            placeholder="E-Mail (User in deiner Org)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={adding}
            className={`flex-1 ${INPUT_CLASS}`}
          />
          <select
            value={role}
            onChange={(e) =>
              setRole(
                e.target.value as
                  | "owner"
                  | "reviewer"
                  | "collaborator"
                  | "viewer",
              )
            }
            disabled={adding}
            className={INPUT_CLASS}
          >
            {/* AUDIT-FIX H16 (2026-05-17): German labels for German UI.
                Value stays English (matches DB column + permission system). */}
            <option value="collaborator">Mitbearbeiter</option>
            <option value="reviewer">Prüfer</option>
            <option value="viewer">Beobachter</option>
          </select>
          <button
            type="submit"
            disabled={!email.trim() || adding}
            className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-30 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            {adding ? (
              <Loader2
                size={11}
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <UserPlus size={11} />
            )}
            Hinzufügen
          </button>
        </div>
        {error && (
          <p className="text-[11px] text-red-500 dark:text-red-400">{error}</p>
        )}
        <p className="text-[10px] text-slate-500">
          Nur User die schon in deiner Caelex-Organisation sind, können
          hinzugefügt werden.
        </p>
      </form>
    </div>
  );
}

function RoleIcon({ role, isOwner }: { role: string; isOwner: boolean }) {
  if (isOwner) return <Crown size={11} className="shrink-0 text-amber-500" />;
  if (role === "reviewer")
    return (
      <ShieldCheck
        size={11}
        className="shrink-0 text-emerald-600 dark:text-emerald-400"
      />
    );
  return (
    <User size={11} className="shrink-0 text-slate-400 dark:text-slate-500" />
  );
}
