"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * InboxList — presents pending LegalMatterInvitations for the caller's
 * active org. Each row opens into an expanded detail view with three
 * actions:
 *
 *   • Akzeptieren  → accept as-proposed, matter transitions to ACTIVE
 *   • Anpassen     → narrow the scope (⊆ proposed), matter moves to
 *                    PENDING_CONSENT for counter-signing by inviter
 *   • Ablehnen     → reject + optional reason
 *
 * The scope-narrow UI is in-place (no modal) so the user can see
 * exactly what they're removing before submitting.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Inbox,
  Building2,
  Scale,
  Clock,
  Check,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  ScopeItem,
  ScopeCategory,
  ScopePermission,
} from "@/lib/legal-network/scope";

interface Invitation {
  id: string;
  createdAt: string;
  expiresAt: string;
  proposedScope: ScopeItem[];
  proposedDurationMonths: number;
  /** When set, this is an amendment counter-invitation — the operator
   *  narrowed the proposed scope and the lawyer must counter-sign. */
  amendmentOf: string | null;
  /** Original scope BEFORE the operator's amendment. Lets the UI
   *  highlight exactly which permissions were removed. */
  originalScope: ScopeItem[] | null;
  originalDurationMonths: number | null;
  matter: {
    id: string;
    name: string;
    reference: string | null;
    description: string | null;
    invitedFrom: "ATLAS" | "CAELEX";
  };
  lawFirm: { id: string; name: string; logoUrl: string | null; slug: string };
  client: { id: string; name: string; logoUrl: string | null; slug: string };
}

const CATEGORY_LABEL: Record<ScopeCategory, string> = {
  COMPLIANCE_ASSESSMENTS: "Compliance-Bewertungen",
  AUTHORIZATION_WORKFLOWS: "Genehmigungs-Workflows",
  DOCUMENTS: "Dokumenten-Vault",
  TIMELINE_DEADLINES: "Fristen & Zeitleiste",
  INCIDENTS: "Vorfälle & NIS2",
  SPACECRAFT_REGISTRY: "Satelliten-Registry",
  AUDIT_LOGS: "Audit-Logs",
};

const PERMISSION_LABEL: Record<ScopePermission, string> = {
  READ: "Lesen",
  READ_SUMMARY: "Übersicht",
  EXPORT: "Export",
  ANNOTATE: "Annotieren",
};

export function InboxList() {
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/network/invitations", {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Posteingang nicht ladbar");
      setInvitations(json.invitations);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !invitations) {
    return (
      <div className="rounded-xl border border-red-200/60 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10 p-6 text-sm text-red-700 dark:text-red-300">
        {error}
      </div>
    );
  }

  if (!invitations) {
    return (
      <div className="text-center py-16 text-sm text-slate-500 animate-pulse">
        Lade Posteingang…
      </div>
    );
  }

  if (invitations.length === 0) {
    return <EmptyInbox />;
  }

  return (
    <ul className="space-y-3">
      {invitations.map((inv) => (
        <InboxCard key={inv.id} invitation={inv} onAction={load} />
      ))}
    </ul>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────

function EmptyInbox() {
  return (
    <div className="text-center py-16">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto mb-4 flex items-center justify-center text-slate-400">
        <Inbox size={20} strokeWidth={1.5} />
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300 mb-1 font-medium">
        Keine offenen Einladungen
      </p>
      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
        Hier erscheinen Mandatsanfragen die dir per E-Mail oder direkt über
        Atlas geschickt wurden.
      </p>
    </div>
  );
}

// ─── One invitation card ─────────────────────────────────────────────

function InboxCard({
  invitation,
  onAction,
}: {
  invitation: Invitation;
  onAction: () => Promise<void>;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState<
    "ACCEPT" | "REJECT" | "AMEND" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  // Amendment state — populated from proposedScope on "Anpassen" click,
  // then narrowed down in-place via per-permission checkboxes.
  const [amending, setAmending] = useState(false);
  const [amendedScope, setAmendedScope] = useState<ScopeItem[]>([]);
  const [amendedDuration, setAmendedDuration] = useState(
    invitation.proposedDurationMonths,
  );
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Figure out direction — for ORIGINALS the requester is the inviter,
  // for AMENDMENTS the "requester" (counter-signer-target) is actually
  // the original RECIPIENT who narrowed the scope and now wants
  // counter-signature. Either way we show "the other side".
  const isAmendment = invitation.amendmentOf !== null;
  const otherSide = isAmendment
    ? invitation.matter.invitedFrom === "ATLAS"
      ? invitation.client // operator narrowed the firm's invite
      : invitation.lawFirm // firm narrowed the operator's invite
    : invitation.matter.invitedFrom === "ATLAS"
      ? invitation.lawFirm
      : invitation.client;
  const requester = otherSide;
  const RequesterIcon = isAmendment
    ? SlidersHorizontal
    : invitation.matter.invitedFrom === "ATLAS"
      ? Scale
      : Building2;

  const submit = useCallback(
    async (
      action: "ACCEPT" | "REJECT",
      opts?: { amendedScope?: ScopeItem[]; amendedDurationMonths?: number },
    ) => {
      setSubmitting(opts?.amendedScope ? "AMEND" : action);
      setError(null);
      try {
        const res = await fetch(`/api/network/invitations/${invitation.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            amendedScope: opts?.amendedScope,
            amendedDurationMonths: opts?.amendedDurationMonths,
            reason: action === "REJECT" ? rejectReason || undefined : undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Aktion fehlgeschlagen");
          return;
        }
        // Refresh the list (this invitation is now consumed)
        await onAction();
        // On accept-and-active → navigate into the matter detail page
        if (action === "ACCEPT" && !json.counterToken) {
          setTimeout(() => {
            router.push(
              `/dashboard/network/legal-counsel/${invitation.matter.id}`,
            );
          }, 600);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSubmitting(null);
      }
    },
    [invitation.id, invitation.matter.id, onAction, rejectReason, router],
  );

  const startAmend = () => {
    setAmending(true);
    setExpanded(true);
    // Initialise amendedScope as a deep copy of proposed
    setAmendedScope(
      invitation.proposedScope.map((s) => ({
        ...s,
        permissions: [...s.permissions],
      })),
    );
  };

  const cancelAmend = () => {
    setAmending(false);
    setAmendedScope([]);
  };

  const togglePermission = (
    category: ScopeCategory,
    permission: ScopePermission,
  ) => {
    setAmendedScope((prev) =>
      prev
        .map((s) =>
          s.category === category
            ? {
                ...s,
                permissions: s.permissions.includes(permission)
                  ? s.permissions.filter((p) => p !== permission)
                  : [...s.permissions, permission],
              }
            : s,
        )
        // Drop categories where all permissions were removed
        .filter((s) => s.permissions.length > 0),
    );
  };

  const dropCategory = (category: ScopeCategory) => {
    setAmendedScope((prev) => prev.filter((s) => s.category !== category));
  };

  return (
    <li className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-5 py-4 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition text-left"
      >
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isAmendment
              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          }`}
        >
          <RequesterIcon size={16} strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
            {isAmendment && (
              <span className="text-[10px] tracking-wide uppercase font-medium px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                Anpassung
              </span>
            )}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {requester.name}
            </span>
            <span>·</span>
            <span>
              {isAmendment
                ? "hat deinen Scope-Vorschlag angepasst"
                : invitation.matter.invitedFrom === "ATLAS"
                  ? "Kanzlei → Operator"
                  : "Operator → Kanzlei"}
            </span>
          </div>
          <h3 className="text-base font-medium text-slate-900 dark:text-slate-100 truncate">
            {invitation.matter.name}
          </h3>
          {invitation.matter.reference && (
            <div className="text-xs text-slate-500 mt-0.5">
              Ref. {invitation.matter.reference}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] tracking-wide uppercase text-slate-400">
              Läuft ab in
            </div>
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 tabular-nums">
              <ExpiryCountdown expiresAt={invitation.expiresAt} />
            </div>
          </div>
          {expanded ? (
            <ChevronUp size={16} strokeWidth={1.8} className="text-slate-400" />
          ) : (
            <ChevronDown
              size={16}
              strokeWidth={1.8}
              className="text-slate-400"
            />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4">
          {invitation.matter.description && (
            <div className="mb-4">
              <div className="text-[10px] tracking-[0.18em] uppercase text-slate-500 mb-1">
                Beschreibung
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {invitation.matter.description}
              </p>
            </div>
          )}

          {/* Amendment banner — explains what's at stake before the
              scope diff is rendered. The amender already narrowed the
              scope to what THEY want; the lawyer either accepts that
              narrowing or rejects (no further amend per spec). */}
          {isAmendment && !amending && (
            <div className="mb-4 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3">
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                <strong>{requester.name}</strong> hat den vorgeschlagenen Scope
                angepasst. Wenn du zustimmst, wird das Mandat mit dem
                reduzierten Umfang aktiviert. Eine weitere Runde Anpassung ist
                nicht möglich (1-Round-Limit).
              </p>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] tracking-[0.18em] uppercase text-slate-500">
                {amending
                  ? `Scope-Anpassung — entfernte Permissions werden dem Anfragenden zur Gegenbestätigung geschickt`
                  : isAmendment
                    ? "Angepasster Scope (wird aktiviert)"
                    : "Vorgeschlagener Scope"}
              </div>
              {!amending && !isAmendment && (
                <button
                  onClick={startAmend}
                  className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                >
                  <SlidersHorizontal size={10} strokeWidth={1.8} />
                  Anpassen
                </button>
              )}
            </div>
            <ul className="space-y-1.5">
              {(amending ? amendedScope : invitation.proposedScope).map(
                (item) => (
                  <ScopeRow
                    key={item.category}
                    item={item}
                    amending={amending}
                    showDiff={isAmendment && !amending}
                    originalPermissions={
                      // Edit mode: original is the proposedScope (pre-edit
                      // copy). Diff/review mode: original is the FIRST
                      // proposal (the lawyer's invite, before operator
                      // narrowed). View mode: original = current scope.
                      isAmendment && invitation.originalScope
                        ? (invitation.originalScope.find(
                            (p) => p.category === item.category,
                          )?.permissions ??
                          invitation.proposedScope.find(
                            (p) => p.category === item.category,
                          )?.permissions ??
                          [])
                        : (invitation.proposedScope.find(
                            (p) => p.category === item.category,
                          )?.permissions ?? [])
                    }
                    onToggle={(p) => togglePermission(item.category, p)}
                    onDrop={() => dropCategory(item.category)}
                  />
                ),
              )}
              {/* Show categories that were dropped entirely during amend */}
              {amending &&
                invitation.proposedScope
                  .filter(
                    (p) => !amendedScope.find((a) => a.category === p.category),
                  )
                  .map((item) => (
                    <li
                      key={item.category}
                      className="flex items-center justify-between px-3 py-2 rounded-md bg-slate-100/50 dark:bg-slate-800/30 border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-500 line-through"
                    >
                      <span>{CATEGORY_LABEL[item.category]}</span>
                      <button
                        onClick={() =>
                          setAmendedScope((prev) => [
                            ...prev,
                            {
                              ...item,
                              permissions: [...item.permissions],
                            },
                          ])
                        }
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white no-underline"
                      >
                        wiederherstellen
                      </button>
                    </li>
                  ))}
              {/* Amendment review: categories the operator dropped entirely */}
              {isAmendment &&
                !amending &&
                invitation.originalScope &&
                invitation.originalScope
                  .filter(
                    (p) =>
                      !invitation.proposedScope.find(
                        (a) => a.category === p.category,
                      ),
                  )
                  .map((item) => (
                    <li
                      key={item.category}
                      className="flex items-center justify-between px-3 py-2 rounded-md bg-amber-50/60 dark:bg-amber-950/15 border border-dashed border-amber-300 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300 line-through"
                    >
                      <span>{CATEGORY_LABEL[item.category]}</span>
                      <span className="text-[10px] no-underline tracking-wide uppercase">
                        entfernt
                      </span>
                    </li>
                  ))}
            </ul>
          </div>

          {/* Duration — editable during amend */}
          <div className="mb-4 flex items-center gap-3">
            <Clock size={12} strokeWidth={1.8} className="text-slate-400" />
            {amending ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Laufzeit:
                </span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={amendedDuration}
                  onChange={(e) =>
                    setAmendedDuration(Math.max(1, Number(e.target.value)))
                  }
                  className="w-16 px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm tabular-nums"
                />
                <span className="text-slate-600 dark:text-slate-400">
                  Monate
                </span>
                <span className="text-xs text-slate-400 ml-auto">
                  (Original: {invitation.proposedDurationMonths} M.)
                </span>
              </div>
            ) : (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-900 dark:text-slate-200">
                  {invitation.proposedDurationMonths} Monate
                </span>{" "}
                Laufzeit
              </div>
            )}
          </div>

          {error && (
            <div className="mb-3 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Reject reason — appears only when user clicks Reject */}
          {showRejectForm && !amending && (
            <div className="mb-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Grund für die Ablehnung (optional, wird dem Anfragenden mitgeteilt)"
                rows={2}
                maxLength={500}
                className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {amending ? (
              <>
                <button
                  onClick={cancelAmend}
                  disabled={submitting !== null}
                  className="px-4 h-9 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-sm font-medium"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() =>
                    submit("ACCEPT", {
                      amendedScope,
                      amendedDurationMonths: amendedDuration,
                    })
                  }
                  disabled={submitting !== null || amendedScope.length === 0}
                  className="px-4 h-9 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium inline-flex items-center gap-2"
                >
                  <Check size={12} strokeWidth={2.2} />
                  {submitting === "AMEND" ? "Sende…" : "Angepasst zustimmen"}
                </button>
                <span className="text-[11px] text-slate-500 ml-auto self-center">
                  Geht zum Gegenzeichnen an {requester.name}
                </span>
              </>
            ) : showRejectForm ? (
              <>
                <button
                  onClick={() => setShowRejectForm(false)}
                  disabled={submitting !== null}
                  className="px-4 h-9 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-sm font-medium"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => submit("REJECT")}
                  disabled={submitting !== null}
                  className="px-4 h-9 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-sm font-medium inline-flex items-center gap-2"
                >
                  <X size={12} strokeWidth={2.2} />
                  {submitting === "REJECT" ? "Sende…" : "Ablehnen bestätigen"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={submitting !== null}
                  className="px-4 h-9 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-sm font-medium"
                >
                  Ablehnen
                </button>
                {/* Anpassen is hidden for amendment-reviews — spec says
                    1 round of amendment max, the lawyer can only accept
                    or reject the operator's narrowing. */}
                {!isAmendment && (
                  <button
                    onClick={startAmend}
                    disabled={submitting !== null}
                    className="px-4 h-9 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-sm font-medium"
                  >
                    Anpassen
                  </button>
                )}
                <button
                  onClick={() => submit("ACCEPT")}
                  disabled={submitting !== null}
                  className="ml-auto px-4 h-9 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium inline-flex items-center gap-2"
                >
                  <Check size={12} strokeWidth={2.2} />
                  {submitting === "ACCEPT"
                    ? "Sende…"
                    : isAmendment
                      ? "Angepasst akzeptieren"
                      : "Akzeptieren"}
                </button>
              </>
            )}
          </div>

          {/* Audit promise — same copy as ConsentCard for consistency */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Jeder Zugriff wird mit Hash-Chain signiert und ist im{" "}
              <Link
                href={`/dashboard/network/legal-counsel/${invitation.matter.id}`}
                className="underline hover:text-slate-700 dark:hover:text-slate-300"
              >
                Audit-Log
              </Link>{" "}
              nachvollziehbar.
            </p>
          </div>
        </div>
      )}
    </li>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────

function ScopeRow({
  item,
  amending,
  showDiff,
  originalPermissions,
  onToggle,
  onDrop,
}: {
  item: ScopeItem;
  /** True when the operator is editing the scope (live narrowing). */
  amending: boolean;
  /** True when the lawyer is reviewing an amendment (read-only diff). */
  showDiff?: boolean;
  /** The full proposed-permission list for this category — used both
   *  by amending mode (toggle source) and showDiff mode (diff source). */
  originalPermissions: ScopePermission[];
  onToggle: (p: ScopePermission) => void;
  onDrop: () => void;
}) {
  // In showDiff mode we still iterate over `originalPermissions` so
  // dropped permissions render with strike-through. In normal view
  // we only show the active permissions.
  const permissionsToRender =
    amending || showDiff ? originalPermissions : item.permissions;
  return (
    <li className="px-3 py-2.5 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {CATEGORY_LABEL[item.category]}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {permissionsToRender.map((p) => {
              const enabled = item.permissions.includes(p);
              if (showDiff) {
                return (
                  <span
                    key={p}
                    className={`text-[10px] px-2 py-0.5 rounded-full ring-1 ${
                      enabled
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 ring-emerald-200/60 dark:ring-emerald-900/40"
                        : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 line-through ring-amber-200/60 dark:ring-amber-900/40"
                    }`}
                  >
                    {PERMISSION_LABEL[p]}
                  </span>
                );
              }
              return amending ? (
                <button
                  key={p}
                  onClick={() => onToggle(p)}
                  className={`text-[10px] px-2 py-0.5 rounded-full ring-1 transition ${
                    enabled
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 ring-emerald-300/60 dark:ring-emerald-700/60"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 line-through ring-slate-200 dark:ring-slate-700"
                  }`}
                >
                  {PERMISSION_LABEL[p]}
                </button>
              ) : (
                <span
                  key={p}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200/60 dark:ring-emerald-900/40"
                >
                  {PERMISSION_LABEL[p]}
                </span>
              );
            })}
          </div>
        </div>
        {amending && (
          <button
            onClick={onDrop}
            title="Kategorie ganz entfernen"
            className="text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
          >
            <X size={12} strokeWidth={2} />
          </button>
        )}
      </div>
    </li>
  );
}

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return <span className="text-red-500">abgelaufen</span>;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 24) return <span>{hours} h</span>;
  const days = Math.floor(hours / 24);
  return <span>{days} Tagen</span>;
}
