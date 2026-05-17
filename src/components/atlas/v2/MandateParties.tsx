"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Strukturierte Mandate Parties section.
 *
 * Renders parties grouped by type (Mandant, Gegner, Behörde, Co-Counsel,
 * Sonstige). Each party row shows name + role + a compact metadata bar
 * (contact, address, reference, notes — only the non-empty ones). The
 * lawyer can add a new party via a contextual + button per group, edit
 * via pencil, or delete via trash icon.
 *
 * Empty state: invites the lawyer to add the first party — important
 * for new mandates where structured parties make the chat-context
 * richer immediately.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";
import {
  Briefcase,
  ScaleIcon,
  Building2,
  UserCog,
  Users2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Check,
} from "lucide-react";

type PartyType = "client" | "opponent" | "authority" | "co_counsel" | "other";

interface Party {
  id: string;
  type: PartyType;
  name: string;
  role: string | null;
  contact: string | null;
  address: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  mandateId: string;
  disabled?: boolean;
}

const GROUPS: {
  type: PartyType;
  label: string;
  Icon: typeof Briefcase;
  emptyHint: string;
}[] = [
  {
    type: "client",
    label: "Mandant",
    Icon: Briefcase,
    emptyHint: "Mandant hinzufügen",
  },
  {
    type: "opponent",
    label: "Gegner",
    Icon: ScaleIcon,
    emptyHint: "Gegner / Gegenseite hinzufügen",
  },
  {
    type: "authority",
    label: "Behörde",
    Icon: Building2,
    emptyHint: "Behörde hinzufügen (z.B. BNetzA)",
  },
  {
    type: "co_counsel",
    label: "Co-Counsel",
    Icon: UserCog,
    emptyHint: "Mitberatende Kanzlei hinzufügen",
  },
  {
    type: "other",
    label: "Sonstige",
    Icon: Users2,
    emptyHint: "Weitere Partei hinzufügen",
  },
];

const INPUT_CLASS =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[12px] text-slate-900 outline-none transition-colors focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500";

export function MandateParties({ mandateId, disabled }: Props) {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /* `editorState`: null = no editor open; { type, id? } = create/edit
     inline form open. id present → edit mode. */
  const [editorState, setEditorState] = useState<{
    type: PartyType;
    party?: Party;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/atlas/mandate/${mandateId}/parties`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { parties: Party[] };
        setParties(data.parties ?? []);
        setError(null);
      } else {
        setError(`HTTP ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [mandateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (party: Party) => {
    if (
      !confirm(
        `Partei „${party.name}" wirklich löschen? Diese Aktion ist nicht rückgängig zu machen.`,
      )
    )
      return;
    setBusyId(party.id);
    try {
      const res = await fetch(
        `/api/atlas/mandate/${mandateId}/parties/${party.id}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setParties((prev) => prev.filter((p) => p.id !== party.id));
      } else {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error || `HTTP ${res.status}`);
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleSaved = (party: Party, mode: "create" | "edit") => {
    setParties((prev) => {
      if (mode === "create") return [...prev, party];
      return prev.map((p) => (p.id === party.id ? party : p));
    });
    setEditorState(null);
  };

  return (
    <div>
      {loading && (
        <div className="flex items-center gap-2 text-[12px] text-slate-500">
          <Loader2 size={11} className="animate-spin" /> Lädt Parteien…
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11.5px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          {GROUPS.map((group) => {
            const items = parties.filter((p) => p.type === group.type);
            const Icon = group.Icon;
            const isEditorOpenHere =
              editorState !== null && editorState.type === group.type;
            /* Hide empty "other" group to reduce visual noise — it's the
               catch-all, only worth showing when in use. */
            if (
              group.type === "other" &&
              items.length === 0 &&
              !isEditorOpenHere
            )
              return null;
            return (
              <section
                key={group.type}
                className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700/60 dark:bg-slate-900/30"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200">
                    <Icon
                      size={11}
                      className="text-slate-400 dark:text-slate-500"
                    />
                    {group.label}{" "}
                    <span className="text-slate-400">({items.length})</span>
                  </h3>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => setEditorState({ type: group.type })}
                      disabled={isEditorOpenHere}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-[10.5px] text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      <Plus size={9} />
                      Hinzufügen
                    </button>
                  )}
                </div>

                {items.length === 0 && !isEditorOpenHere && (
                  <p className="text-[11.5px] text-slate-400 dark:text-slate-500">
                    {group.emptyHint}
                  </p>
                )}

                {items.length > 0 && (
                  <ul className="space-y-2">
                    {items.map((p) => (
                      <PartyRow
                        key={p.id}
                        party={p}
                        busy={busyId === p.id}
                        disabled={disabled}
                        onEdit={() =>
                          setEditorState({ type: group.type, party: p })
                        }
                        onDelete={() => handleDelete(p)}
                      />
                    ))}
                  </ul>
                )}

                {isEditorOpenHere && (
                  <div className="mt-3">
                    <PartyForm
                      mandateId={mandateId}
                      type={editorState.type}
                      party={editorState.party}
                      onCancel={() => setEditorState(null)}
                      onSaved={handleSaved}
                    />
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── PartyRow ──────────────────────────────────────────────────────── */

function PartyRow({
  party,
  busy,
  disabled,
  onEdit,
  onDelete,
}: {
  party: Party;
  busy: boolean;
  disabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta: { label: string; value: string }[] = [];
  if (party.contact) meta.push({ label: "Kontakt", value: party.contact });
  if (party.reference)
    meta.push({ label: "Aktenzeichen", value: party.reference });
  if (party.address) meta.push({ label: "Adresse", value: party.address });

  return (
    <li className="rounded-md border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[12.5px] font-medium text-slate-800 dark:text-slate-100">
              {party.name}
            </span>
            {party.role && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                · {party.role}
              </span>
            )}
          </div>
          {meta.length > 0 && (
            <dl className="mt-1 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
              {meta.map((m) => (
                <div
                  key={m.label}
                  className="flex flex-wrap items-baseline gap-1"
                >
                  <dt className="text-slate-400 dark:text-slate-500">
                    {m.label}:
                  </dt>
                  <dd className="whitespace-pre-line">{m.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {party.notes && (
            <p className="mt-1 whitespace-pre-line text-[11px] italic text-slate-500 dark:text-slate-400">
              {party.notes}
            </p>
          )}
        </div>
        {!disabled && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              disabled={busy}
              title="Bearbeiten"
              className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Pencil size={11} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              title="Löschen"
              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              {busy ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Trash2 size={11} />
              )}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

/* ── PartyForm — inline create/edit ─────────────────────────────────── */

function PartyForm({
  mandateId,
  type,
  party,
  onCancel,
  onSaved,
}: {
  mandateId: string;
  type: PartyType;
  party?: Party;
  onCancel: () => void;
  onSaved: (party: Party, mode: "create" | "edit") => void;
}) {
  const [name, setName] = useState(party?.name ?? "");
  const [role, setRole] = useState(party?.role ?? "");
  const [contact, setContact] = useState(party?.contact ?? "");
  const [address, setAddress] = useState(party?.address ?? "");
  const [reference, setReference] = useState(party?.reference ?? "");
  const [notes, setNotes] = useState(party?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mode: "create" | "edit" = party ? "edit" : "create";

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name darf nicht leer sein.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        type,
        name: name.trim(),
        role: role.trim() || null,
        contact: contact.trim() || null,
        address: address.trim() || null,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      };
      const url = party
        ? `/api/atlas/mandate/${mandateId}/parties/${party.id}`
        : `/api/atlas/mandate/${mandateId}/parties`;
      const res = await fetch(url, {
        method: party ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error || `HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as { party: Party };
      onSaved(data.party, mode);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (Pflicht)"
          maxLength={200}
          className={INPUT_CLASS}
          autoFocus
        />
        <input
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Rolle (z.B. Geschäftsführer)"
          maxLength={120}
          className={INPUT_CLASS}
        />
        <input
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Kontakt (E-Mail / Telefon)"
          maxLength={500}
          className={INPUT_CLASS}
        />
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Aktenzeichen / Referenz"
          maxLength={120}
          className={INPUT_CLASS}
        />
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Adresse"
          maxLength={500}
          rows={2}
          className={`${INPUT_CLASS} sm:col-span-2`}
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notizen (Markdown erlaubt)"
          maxLength={4000}
          rows={2}
          className={`${INPUT_CLASS} sm:col-span-2`}
        />
      </div>
      {error && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <X size={10} />
          Abbrechen
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={10} className="animate-spin" />
          ) : (
            <Check size={10} />
          )}
          {saving ? "Speichert…" : party ? "Aktualisieren" : "Hinzufügen"}
        </button>
      </div>
    </div>
  );
}
