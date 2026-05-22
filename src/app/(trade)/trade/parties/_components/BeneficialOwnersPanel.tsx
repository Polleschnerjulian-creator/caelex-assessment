"use client";

/**
 * BeneficialOwnersPanel — Trade light-theme variant (Sprint A2).
 *
 * Light-Indigo port of `src/components/trade/BeneficialOwnersPanel.tsx`.
 * Same data shape, same behaviour (50%-rule cascade preview, typeahead
 * owner search, percent/control-type form, per-row delete) — re-tokenised
 * against the `--trade-*` palette so it renders correctly inside
 * `.trade-themed`. Universal compliance signals (red/amber/emerald)
 * stay on raw Tailwind hues for legibility across theme modes.
 *
 * Same migration rationale as the ClassificationPanel split: legacy
 * Welt-A dark variant stays untouched until the dashboard route is
 * sunset, at which point the two files can collapse.
 */

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
    }
  }

  // 50%-rule cascade preview (client-side; server runs the full graph
  // during screenParty()). Operator-facing early warning only.
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
    <section className="rounded-md border border-trade-border-subtle bg-trade-bg-panel">
      <div className="flex items-center justify-between border-b border-trade-border-subtle px-5 py-3">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
            Beneficial Owners
          </h2>
          <p className="mt-0.5 text-[11px] text-trade-text-muted">
            Drives the 50%-rule cascade during screening
          </p>
        </div>
        <button
          onClick={() => setShowAddForm((s) => !s)}
          className={
            showAddForm
              ? "flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 transition hover:bg-red-100"
              : "flex items-center gap-1.5 rounded-md bg-trade-accent px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-trade-accent-strong"
          }
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

      {directCascadeHit && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3">
          <div className="flex items-start gap-2 text-[12px] text-red-700">
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
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3">
          <div className="flex items-start gap-2 text-[12px] text-amber-700">
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
        <div className="border-b border-red-200 bg-red-50 px-5 py-2 text-[12px] text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="px-5 py-6 text-center text-[12px] text-trade-text-muted">
          Loading owners…
        </div>
      ) : owners.length === 0 ? (
        <div className="px-5 py-6 text-center text-[12px] text-trade-text-muted">
          No beneficial owners recorded for {partyName}. Add owners so the
          50%-rule cascade can detect indirect sanctions exposure.
        </div>
      ) : (
        <ul>
          {owners.map((edge) => (
            <li
              key={edge.id}
              className="flex items-center gap-3 border-b border-trade-border-subtle px-5 py-3 last:border-0"
            >
              <OwnerStatusIcon status={edge.owner.screeningStatus} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-trade-text-primary">
                    {edge.owner.legalName}
                  </span>
                  {edge.owner.status === "BLOCKED" && (
                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-red-700 ring-1 ring-red-200">
                      Blocked
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-trade-text-muted">
                  <span>{edge.owner.countryCode}</span>
                  {edge.owner.isHighRiskCountry && (
                    <span className="text-amber-600">· high-risk</span>
                  )}
                  <span>·</span>
                  <span className="text-trade-text-secondary">
                    {(edge.percent * 100).toFixed(1)}% ownership
                  </span>
                  {edge.controlType !== "economic" && (
                    <span>· {edge.controlType.replace("_", " ")}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteOwner(edge.id)}
                className="shrink-0 rounded-md p-1.5 text-trade-text-muted transition hover:bg-red-50 hover:text-red-700"
                title="Remove ownership edge"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
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
  const className = "h-4 w-4 shrink-0";
  if (status === "CONFIRMED_HIT") {
    return (
      <ShieldAlert className={`${className} text-red-600`} strokeWidth={1.75} />
    );
  }
  if (status === "POTENTIAL_MATCH") {
    return (
      <AlertTriangle
        className={`${className} text-amber-500`}
        strokeWidth={1.75}
      />
    );
  }
  if (status === "CLEAR") {
    return (
      <ShieldCheck
        className={`${className} text-emerald-600`}
        strokeWidth={1.75}
      />
    );
  }
  return (
    <Shield
      className={`${className} text-trade-text-muted`}
      strokeWidth={1.75}
    />
  );
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

  const inputClass =
    "w-full rounded-md border border-trade-border bg-trade-bg-panel px-3 py-2 text-[13px] text-trade-text-primary outline-none transition focus:border-trade-accent focus:ring-2 focus:ring-trade-accent/30";

  return (
    <div className="border-b border-trade-border-subtle bg-trade-bg-subtle px-5 py-4">
      {!selectedOwner ? (
        <>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
            Search existing counterparties
          </label>
          <div className="flex items-center gap-2 rounded-md border border-trade-border bg-trade-bg-panel px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-trade-text-muted" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search counterparties to add as owner…"
              className="w-full bg-transparent text-[13px] text-trade-text-primary outline-none placeholder:text-trade-text-muted"
            />
          </div>
          {results.length > 0 && (
            <ul className="mt-2 overflow-hidden rounded-md border border-trade-border-subtle">
              {results.map((p) => (
                <li
                  key={p.id}
                  onClick={() => setSelectedOwner(p)}
                  className="flex cursor-pointer items-center gap-3 border-t border-trade-border-subtle bg-trade-bg-panel px-3 py-2 transition hover:bg-trade-hover first:border-t-0"
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-trade-text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium text-trade-text-primary">
                      {p.legalName}
                    </div>
                    <div className="text-[10px] text-trade-text-muted">
                      {p.countryCode} ·{" "}
                      {p.screeningStatus.replace("_", " ").toLowerCase()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {search && results.length === 0 && (
            <p className="mt-2 text-[11px] text-trade-text-muted">
              No matching counterparties. Create the owner counterparty first
              via the main list, then return here to add it.
            </p>
          )}
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[12px] text-trade-text-secondary">
              Owner:
            </span>
            <span className="text-[13px] font-semibold text-trade-text-primary">
              {selectedOwner.legalName}
            </span>
            <button
              onClick={() => setSelectedOwner(null)}
              className="ml-auto text-[11px] text-trade-text-secondary transition hover:text-trade-text-primary"
            >
              Change
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
                Ownership %
              </label>
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={percent}
                onChange={(e) => setPercent(parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
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
                className={inputClass}
              >
                <option value="economic">Economic (equity)</option>
                <option value="voting">Voting rights</option>
                <option value="control_no_equity">
                  Control without equity (trustee)
                </option>
              </select>
            </div>
          </div>
          {err && <div className="mt-2 text-[11px] text-red-600">{err}</div>}
          <div className="mt-3 flex justify-end">
            <button
              onClick={submit}
              disabled={submitting || percent <= 0 || percent > 100}
              className="rounded-md bg-trade-accent px-4 py-1.5 text-[12px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Adding…" : "Add ownership edge"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
