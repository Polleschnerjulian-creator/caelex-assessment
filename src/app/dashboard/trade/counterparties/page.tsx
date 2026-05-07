/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /dashboard/trade/counterparties — Wave A list view
 *
 * Lists TradeParty records for the active organization with screening
 * status badges, country flags, and risk markers. Inline create form
 * for adding new counterparties; clicking a row opens the detail view
 * where on-demand screening lives.
 *
 * Pattern matches /dashboard/trade/items: client component, fetches via
 * /api/trade/parties, force-dynamic via parent layout's force-dynamic.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Globe,
  ChevronRight,
  X,
} from "lucide-react";

interface PartyRow {
  id: string;
  legalName: string;
  tradeName: string | null;
  countryCode: string;
  status: "ACTIVE" | "ARCHIVED" | "BLOCKED";
  screeningStatus:
    | "NOT_SCREENED"
    | "CLEAR"
    | "POTENTIAL_MATCH"
    | "CONFIRMED_HIT"
    | "STALE";
  isUSPerson: boolean;
  isHighRiskCountry: boolean;
  lastScreenedAt: string | null;
  createdAt: string;
}

const SANS =
  'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
const DISPLAY =
  'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "NOT_SCREENED", label: "Not screened" },
  { key: "POTENTIAL_MATCH", label: "Potential" },
  { key: "CONFIRMED_HIT", label: "Confirmed" },
  { key: "CLEAR", label: "Clear" },
] as const;

export default function CounterpartiesListPage() {
  const [parties, setParties] = useState<PartyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<(typeof STATUS_TABS)[number]["key"]>("all");
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (filter !== "all") params.set("screening", filter);
    fetch(`/api/trade/parties?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setParties(data.parties ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, filter]);

  return (
    <div
      className="mx-auto max-w-screen-2xl px-8 py-8"
      style={{ fontFamily: SANS, letterSpacing: "-0.005em" }}
    >
      {/* Header */}
      <header
        className="mb-7 flex items-end justify-between gap-6 pb-5"
        style={{ borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)" }}
      >
        <div className="min-w-0">
          <div
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            <Link href="/dashboard/trade" className="hover:text-white/70">
              Trade Operations
            </Link>{" "}
            <span style={{ color: "rgba(255,255,255,0.25)" }}>/</span>{" "}
            Counterparties
          </div>
          <h1
            className="text-[28px] font-semibold text-white"
            style={{
              fontFamily: DISPLAY,
              letterSpacing: "-0.022em",
              lineHeight: 1.15,
            }}
          >
            Counterparty Screening
          </h1>
          <p
            className="mt-1.5 max-w-2xl text-[14px]"
            style={{ color: "rgba(255, 255, 255, 0.55)" }}
          >
            OFAC SDN, BIS Entity List, DDTC Debarred — fuzzy-match
            (Jaro-Winkler) mit auditierbarem Snapshot-Hash pro Screening-Lauf.
          </p>
        </div>
        <button
          onClick={() => setShowNewForm((s) => !s)}
          className="flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all"
          style={{
            background: showNewForm
              ? "rgba(239, 68, 68, 0.12)"
              : "rgba(16, 185, 129, 0.12)",
            color: showNewForm ? "rgb(248,113,113)" : "rgb(52,211,153)",
            boxShadow: showNewForm
              ? "inset 0 0 0 0.5px rgba(239,68,68,0.3)"
              : "inset 0 0 0 0.5px rgba(16,185,129,0.3)",
          }}
        >
          {showNewForm ? (
            <>
              <X className="h-3.5 w-3.5" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" /> New Counterparty
            </>
          )}
        </button>
      </header>

      {/* Inline create form */}
      {showNewForm && (
        <NewPartyForm
          onCreated={(p) => {
            setParties((prev) => [
              {
                ...p,
                lastScreenedAt: null,
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]);
            setShowNewForm(false);
          }}
        />
      )}

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors"
            style={{
              background:
                filter === tab.key
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(255,255,255,0.025)",
              color:
                filter === tab.key
                  ? "rgba(255,255,255,0.92)"
                  : "rgba(255,255,255,0.55)",
              boxShadow:
                filter === tab.key
                  ? "inset 0 0 0 0.5px rgba(255,255,255,0.18)"
                  : "inset 0 0 0 0.5px rgba(255,255,255,0.06)",
            }}
          >
            {tab.label}
          </button>
        ))}
        <div
          className="ml-auto flex items-center gap-2 rounded-lg px-3 py-1.5"
          style={{
            background: "rgba(255,255,255,0.04)",
            boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.07)",
          }}
        >
          <Search
            className="h-3.5 w-3.5"
            style={{ color: "rgba(255,255,255,0.4)" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-64 bg-transparent text-[13px] outline-none placeholder:text-white/30"
            style={{ color: "rgba(255,255,255,0.92)" }}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div
          className="rounded-2xl px-8 py-12 text-center text-[13px]"
          style={{
            background: "rgba(255,255,255,0.025)",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          Loading counterparties…
        </div>
      ) : parties.length === 0 ? (
        <EmptyState onNew={() => setShowNewForm(true)} />
      ) : (
        <div
          className="overflow-hidden rounded-2xl"
          style={{ boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.07)" }}
        >
          {parties.map((p, i) => (
            <PartyRowItem key={p.id} party={p} isFirst={i === 0} />
          ))}
        </div>
      )}

      {/* Mandatory disclaimer (Plan § 6) */}
      <p
        className="mt-8 max-w-3xl text-[11px] leading-relaxed"
        style={{ color: "rgba(255, 255, 255, 0.4)" }}
      >
        Sanctions-Screening ist ein Werkzeug zur Decision-Support, kein Counsel.
        Treffer erfordern menschliche Triage durch qualifizierten AV. Verstöße
        gegen OFAC/EU-Sanktionen können zu zivilrechtlichen Bußen bis $1.5 Mio.
        pro Vorgang (US) bzw. Freiheitsstrafen bis 10 Jahre (DE) führen.
      </p>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────

function PartyRowItem({
  party,
  isFirst,
}: {
  party: PartyRow;
  isFirst: boolean;
}) {
  return (
    <Link
      href={`/dashboard/trade/counterparties/${party.id}`}
      className="group flex items-center gap-4 px-5 py-4 transition-colors"
      style={{
        background: "rgba(255,255,255,0.025)",
        borderTop: isFirst ? "none" : "0.5px solid rgba(255, 255, 255, 0.05)",
      }}
    >
      <ScreeningBadge status={party.screeningStatus} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div
            className="truncate text-[13px] font-semibold"
            style={{ color: "rgba(255,255,255,0.92)" }}
          >
            {party.legalName}
          </div>
          {party.tradeName && (
            <span
              className="text-[11px]"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              ({party.tradeName})
            </span>
          )}
          {party.status === "BLOCKED" && (
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
          <Globe className="h-3 w-3" />
          {party.countryCode}
          {party.isHighRiskCountry && (
            <span style={{ color: "rgb(251,191,36)" }}>· high-risk</span>
          )}
          {party.isUSPerson && <span>· US person</span>}
          {party.lastScreenedAt && (
            <span>
              · screened{" "}
              {new Date(party.lastScreenedAt).toLocaleDateString("en-GB")}
            </span>
          )}
        </div>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: "rgba(255,255,255,0.4)" }}
      />
    </Link>
  );
}

function ScreeningBadge({ status }: { status: PartyRow["screeningStatus"] }) {
  if (status === "CLEAR") {
    return (
      <ShieldCheck
        className="h-5 w-5 shrink-0"
        strokeWidth={1.75}
        style={{ color: "rgb(52,211,153)" }}
      />
    );
  }
  if (status === "POTENTIAL_MATCH") {
    return (
      <AlertTriangle
        className="h-5 w-5 shrink-0"
        strokeWidth={1.75}
        style={{ color: "rgb(251,191,36)" }}
      />
    );
  }
  if (status === "CONFIRMED_HIT") {
    return (
      <ShieldAlert
        className="h-5 w-5 shrink-0"
        strokeWidth={1.75}
        style={{ color: "rgb(248,113,113)" }}
      />
    );
  }
  if (status === "STALE") {
    return (
      <Shield
        className="h-5 w-5 shrink-0"
        strokeWidth={1.75}
        style={{ color: "rgb(251,146,60)" }}
      />
    );
  }
  // NOT_SCREENED
  return (
    <Shield
      className="h-5 w-5 shrink-0"
      strokeWidth={1.5}
      style={{ color: "rgba(255,255,255,0.3)" }}
    />
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div
      className="rounded-2xl px-8 py-12 text-center"
      style={{ boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.07)" }}
    >
      <Shield
        className="mx-auto mb-3 h-8 w-8"
        strokeWidth={1.5}
        style={{ color: "rgba(255,255,255,0.3)" }}
      />
      <h3
        className="mb-1 text-[14px] font-semibold"
        style={{ color: "rgba(255,255,255,0.85)" }}
      >
        No counterparties yet
      </h3>
      <p
        className="mb-5 text-[12px]"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        Add a counterparty to screen against OFAC, BIS Entity List, and DDTC
        Debarred Parties.
      </p>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold"
        style={{
          background: "rgba(16, 185, 129, 0.12)",
          color: "rgb(52,211,153)",
          boxShadow: "inset 0 0 0 0.5px rgba(16,185,129,0.3)",
        }}
      >
        <Plus className="h-3 w-3" /> Add first counterparty
      </button>
    </div>
  );
}

interface NewPartyResp {
  id: string;
  legalName: string;
  tradeName: string | null;
  countryCode: string;
  status: "ACTIVE";
  screeningStatus: "NOT_SCREENED";
  isUSPerson: boolean;
  isHighRiskCountry: boolean;
}

function NewPartyForm({ onCreated }: { onCreated: (p: NewPartyResp) => void }) {
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/trade/parties", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          legalName,
          tradeName: tradeName || undefined,
          countryCode: countryCode.toUpperCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to create");
        return;
      }
      onCreated(data.party);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.03)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255,255,255,0.06), 0 0 0 0.5px rgba(255,255,255,0.06)",
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label
            className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Legal Name *
          </label>
          <input
            type="text"
            required
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="e.g. ICEYE Polska sp. z o.o."
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{
              background: "rgba(0,0,0,0.25)",
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
            Country (ISO 2) *
          </label>
          <input
            type="text"
            required
            value={countryCode}
            maxLength={2}
            onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
            placeholder="DE"
            className="w-full rounded-lg px-3 py-2 text-[13px] uppercase outline-none"
            style={{
              background: "rgba(0,0,0,0.25)",
              boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.92)",
            }}
          />
        </div>
        <div className="sm:col-span-3">
          <label
            className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Trade Name (optional)
          </label>
          <input
            type="text"
            value={tradeName}
            onChange={(e) => setTradeName(e.target.value)}
            placeholder="d/b/a name if different"
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{
              background: "rgba(0,0,0,0.25)",
              boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.92)",
            }}
          />
        </div>
      </div>
      {err && (
        <div
          className="mt-3 rounded-lg px-3 py-2 text-[12px]"
          style={{
            background: "rgba(239,68,68,0.10)",
            color: "rgb(248,113,113)",
          }}
        >
          {err}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={submitting || !legalName || !countryCode}
          className="rounded-lg px-4 py-2 text-[13px] font-semibold transition-all disabled:opacity-50"
          style={{
            background: "rgba(16, 185, 129, 0.18)",
            color: "rgb(52,211,153)",
            boxShadow: "inset 0 0 0 0.5px rgba(16,185,129,0.4)",
          }}
        >
          {submitting ? "Creating…" : "Create Counterparty"}
        </button>
      </div>
    </form>
  );
}
