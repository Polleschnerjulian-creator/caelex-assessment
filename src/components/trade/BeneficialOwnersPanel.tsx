/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * BeneficialOwnersPanel — manages TradePartyOwnership edges where the
 * subject party is the OWNED entity. Drives the 50%-rule cascade
 * engine in Sprint A6.
 *
 * UX:
 *  - Lists current owners with their screening status badge
 *  - Inline "Add owner" form: typeahead search of existing parties
 *    + percent input + control-type selector
 *  - Per-row delete button
 *  - Surfaces cascade total: when any owner is sanctioned (CONFIRMED_HIT
 *    or BLOCKED), show a banner that explains the OFAC 50%-rule risk
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  X,
  Trash2,
  Building2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Shield,
  AlertTriangle,
} from "lucide-react";

interface OwnerEdge {
  id: string;
  percent: number;
  controlType: string;
  notes: string | null;
  createdAt: string;
  owner: {
    id: string;
    legalName: string;
    countryCode: string;
    screeningStatus:
      | "NOT_SCREENED"
      | "CLEAR"
      | "POTENTIAL_MATCH"
      | "CONFIRMED_HIT"
      | "STALE";
    status: "ACTIVE" | "ARCHIVED" | "BLOCKED";
    isHighRiskCountry: boolean;
  };
}

interface PartySearchResult {
  id: string;
  legalName: string;
  countryCode: string;
  screeningStatus: OwnerEdge["owner"]["screeningStatus"];
  status: OwnerEdge["owner"]["status"];
  isHighRiskCountry: boolean;
}

export function BeneficialOwnersPanel({
  partyId,
  partyName,
}: {
  partyId: string;
  partyName: string;
}) {
  const [owners, setOwners] = useState<OwnerEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Per-row confirm state: holds the edge id currently awaiting deletion
  // confirmation. Only one row can be in confirming state at a time.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/trade/parties/${partyId}/owners`);
      const data = await res.json();
      if (res.ok) setOwners(data.owners ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId]);

  async function deleteOwner(ownershipId: string) {
    setError(null);
    try {
      const res = await fetch(
        `/api/trade/parties/${partyId}/owners/${ownershipId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to delete");
        return;
      }
      setOwners((prev) => prev.filter((o) => o.id !== ownershipId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setConfirmingId(null);
    }
  }

  // ── Cascade summary (computed client-side from owners list) ──
  // Sum of direct ownership percentages from sanctioned owners.
  // This is a SIMPLIFIED preview — true cascade is computed server-side
  // during screenParty(). UI just gives the operator an early heads-up.
  const directSanctionedSum = owners
    .filter(
      (o) =>
        o.controlType !== "control_no_equity" &&
        (o.owner.screeningStatus === "CONFIRMED_HIT" ||
          o.owner.status === "BLOCKED"),
    )
    .reduce((sum, o) => sum + o.percent, 0);
  const directCascadeHit = directSanctionedSum >= 0.5;

  return (
    <section
      className="rounded-2xl"
      style={{ boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.07)" }}
    >
      <div
        className="flex items-center justify-between border-b px-5 py-3"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div>
          <h2
            className="text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Beneficial Owners
          </h2>
          <p
            className="mt-0.5 text-[11px]"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Drives the 50%-rule cascade during screening
          </p>
        </div>
        <button
          onClick={() => setShowAddForm((s) => !s)}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all"
          style={{
            background: showAddForm
              ? "rgba(239,68,68,0.12)"
              : "rgba(16,185,129,0.12)",
            color: showAddForm ? "rgb(248,113,113)" : "rgb(52,211,153)",
            boxShadow: showAddForm
              ? "inset 0 0 0 0.5px rgba(239,68,68,0.3)"
              : "inset 0 0 0 0.5px rgba(16,185,129,0.3)",
          }}
        >
          {showAddForm ? (
            <>
              <X className="h-3 w-3" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-3 w-3" /> Add owner
            </>
          )}
        </button>
      </div>

      {/* 50%-rule cascade preview banner */}
      {directCascadeHit && (
        <div
          className="border-b px-5 py-3"
          style={{
            borderColor: "rgba(239,68,68,0.25)",
            background: "rgba(239,68,68,0.10)",
          }}
        >
          <div
            className="flex items-start gap-2 text-[12px]"
            style={{ color: "rgb(248,113,113)" }}
          >
            <ShieldAlert
              className="mt-0.5 h-4 w-4 shrink-0"
              strokeWidth={1.75}
            />
            <div>
              <strong>50%-rule cascade triggered.</strong>{" "}
              {(directSanctionedSum * 100).toFixed(1)}% direct ownership by
              sanctioned/blocked entities. Per 31 CFR § 510, this party is
              treated as sanctioned regardless of own screening result. Run a
              fresh screening to record the cascade in the audit trail.
            </div>
          </div>
        </div>
      )}
      {!directCascadeHit && directSanctionedSum > 0 && (
        <div
          className="border-b px-5 py-3"
          style={{
            borderColor: "rgba(251,191,36,0.25)",
            background: "rgba(251,191,36,0.06)",
          }}
        >
          <div
            className="flex items-start gap-2 text-[12px]"
            style={{ color: "rgb(251,191,36)" }}
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0"
              strokeWidth={1.75}
            />
            <div>
              {(directSanctionedSum * 100).toFixed(1)}% sanctioned ownership
              detected (below 50% threshold). Indirect-cascade aggregation may
              still push this over — run a fresh screening for the full graph
              traversal.
            </div>
          </div>
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <AddOwnerForm
          partyId={partyId}
          excludeIds={[partyId, ...owners.map((o) => o.owner.id)]}
          onAdded={(newEdge) => {
            setOwners((prev) =>
              [newEdge, ...prev].sort((a, b) => b.percent - a.percent),
            );
            setShowAddForm(false);
          }}
        />
      )}

      {error && (
        <div
          className="px-5 py-2 text-[12px]"
          style={{
            background: "rgba(239,68,68,0.08)",
            color: "rgb(248,113,113)",
          }}
        >
          {error}
        </div>
      )}

      {/* Owners list */}
      {loading ? (
        <div
          className="px-5 py-6 text-center text-[12px]"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          Loading owners…
        </div>
      ) : owners.length === 0 ? (
        <div
          className="px-5 py-6 text-center text-[12px]"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          No beneficial owners recorded for {partyName}. Add owners so the
          50%-rule cascade can detect indirect sanctions exposure.
        </div>
      ) : (
        <ul>
          {owners.map((edge) => (
            <li
              key={edge.id}
              className="flex items-center gap-3 border-b px-5 py-3 last:border-0"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <OwnerStatusIcon status={edge.owner.screeningStatus} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="truncate text-[13px] font-semibold"
                    style={{ color: "rgba(255,255,255,0.92)" }}
                  >
                    {edge.owner.legalName}
                  </span>
                  {edge.owner.status === "BLOCKED" && (
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                      style={{
                        background: "rgba(239,68,68,0.15)",
                        color: "rgb(248,113,113)",
                      }}
                    >
                      Blocked
                    </span>
                  )}
                </div>
                <div
                  className="mt-0.5 flex items-center gap-2 text-[11px]"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  <span>{edge.owner.countryCode}</span>
                  {edge.owner.isHighRiskCountry && (
                    <span style={{ color: "rgb(251,191,36)" }}>
                      · high-risk
                    </span>
                  )}
                  <span>·</span>
                  <span style={{ color: "rgba(255,255,255,0.65)" }}>
                    {(edge.percent * 100).toFixed(1)}% ownership
                  </span>
                  {edge.controlType !== "economic" && (
                    <span>· {edge.controlType.replace("_", " ")}</span>
                  )}
                </div>
              </div>
              {confirmingId === edge.id ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => deleteOwner(edge.id)}
                    className="rounded-md px-2 py-1 text-[11px] font-semibold transition-all"
                    style={{
                      background: "rgba(239,68,68,0.18)",
                      color: "rgb(248,113,113)",
                      boxShadow: "inset 0 0 0 0.5px rgba(239,68,68,0.35)",
                    }}
                    aria-label="Confirm removal"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    className="rounded-md px-2 py-1 text-[11px] font-semibold transition-all"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.55)",
                      boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.12)",
                    }}
                    aria-label="Cancel removal"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingId(edge.id)}
                  className="shrink-0 rounded-md p-1.5 transition-colors"
                  style={{
                    color: "rgba(255,255,255,0.4)",
                  }}
                  title="Remove ownership edge"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────

function OwnerStatusIcon({
  status,
}: {
  status: OwnerEdge["owner"]["screeningStatus"];
}) {
  const common = { className: "h-4 w-4 shrink-0", strokeWidth: 1.75 };
  if (status === "CONFIRMED_HIT")
    return <ShieldAlert {...common} style={{ color: "rgb(248,113,113)" }} />;
  if (status === "POTENTIAL_MATCH")
    return <AlertTriangle {...common} style={{ color: "rgb(251,191,36)" }} />;
  if (status === "CLEAR")
    return <ShieldCheck {...common} style={{ color: "rgb(52,211,153)" }} />;
  return <Shield {...common} style={{ color: "rgba(255,255,255,0.3)" }} />;
}

function AddOwnerForm({
  partyId,
  excludeIds,
  onAdded,
}: {
  partyId: string;
  excludeIds: string[];
  onAdded: (e: OwnerEdge) => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PartySearchResult[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<PartySearchResult | null>(
    null,
  );
  const [percent, setPercent] = useState(50);
  const [controlType, setControlType] = useState<
    "economic" | "voting" | "control_no_equity"
  >("economic");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (!search || selectedOwner) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      fetch(`/api/trade/parties?q=${encodeURIComponent(search)}&limit=10`)
        .then((r) => r.json())
        .then((data) => {
          const filtered = (data.parties ?? []).filter(
            (p: PartySearchResult) => !excludeIds.includes(p.id),
          );
          setResults(filtered);
        })
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [search, selectedOwner, excludeIds]);

  async function submit() {
    if (!selectedOwner) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/trade/parties/${partyId}/owners`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ownerId: selectedOwner.id,
          percent: percent / 100,
          controlType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to add owner");
        return;
      }
      onAdded(data.edge);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="border-b px-5 py-4"
      style={{
        borderColor: "rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.20)",
      }}
    >
      {!selectedOwner ? (
        <>
          <label
            className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Search existing counterparties
          </label>
          <div
            className="flex items-center gap-2 rounded-md px-3 py-2"
            style={{
              background: "rgba(0,0,0,0.30)",
              boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.10)",
            }}
          >
            <Search
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: "rgba(255,255,255,0.4)" }}
            />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search counterparties to add as owner…"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-white/30"
              style={{ color: "rgba(255,255,255,0.92)" }}
            />
          </div>
          {results.length > 0 && (
            <ul
              className="mt-2 overflow-hidden rounded-md"
              style={{ boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.07)" }}
            >
              {results.map((p) => (
                <li
                  key={p.id}
                  onClick={() => setSelectedOwner(p)}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                  }}
                >
                  <Building2
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-[12px] font-medium"
                      style={{ color: "rgba(255,255,255,0.85)" }}
                    >
                      {p.legalName}
                    </div>
                    <div
                      className="text-[10px]"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      {p.countryCode} ·{" "}
                      {p.screeningStatus.replace("_", " ").toLowerCase()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {search && results.length === 0 && (
            <p
              className="mt-2 text-[11px]"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              No matching counterparties. Create the owner counterparty first
              via the main list, then return here to add it.
            </p>
          )}
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <span
              className="text-[12px]"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Owner:
            </span>
            <span
              className="text-[13px] font-semibold"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              {selectedOwner.legalName}
            </span>
            <button
              onClick={() => setSelectedOwner(null)}
              className="ml-auto text-[11px]"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Change
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Ownership %
              </label>
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={percent}
                onChange={(e) => setPercent(parseFloat(e.target.value) || 0)}
                className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
                style={{
                  background: "rgba(0,0,0,0.30)",
                  boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.92)",
                }}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Control type
              </label>
              <select
                value={controlType}
                onChange={(e) =>
                  setControlType(
                    e.target.value as
                      | "economic"
                      | "voting"
                      | "control_no_equity",
                  )
                }
                className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
                style={{
                  background: "rgba(0,0,0,0.30)",
                  boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                <option value="economic">Economic (equity)</option>
                <option value="voting">Voting rights</option>
                <option value="control_no_equity">
                  Control without equity (trustee)
                </option>
              </select>
            </div>
          </div>
          {err && (
            <div
              className="mt-2 text-[11px]"
              style={{ color: "rgb(248,113,113)" }}
            >
              {err}
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <button
              onClick={submit}
              disabled={submitting || percent <= 0 || percent > 100}
              className="rounded-md px-4 py-1.5 text-[12px] font-semibold transition-all disabled:opacity-50"
              style={{
                background: "rgba(16,185,129,0.18)",
                color: "rgb(52,211,153)",
                boxShadow: "inset 0 0 0 0.5px rgba(16,185,129,0.4)",
              }}
            >
              {submitting ? "Adding…" : "Add ownership edge"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
