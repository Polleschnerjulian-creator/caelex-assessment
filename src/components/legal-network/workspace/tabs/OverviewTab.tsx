"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Overview tab — matter metadata, scope breakdown, key dates.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { ScopeItem, ScopeCategory } from "@/lib/legal-network/scope";

interface OverviewMatter {
  id: string;
  name: string;
  description: string | null;
  reference: string | null;
  scope: ScopeItem[];
  acceptedAt: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  handshakeHash: string;
  lawFirmOrg: { id: string; name: string };
  clientOrg: { id: string; name: string };
  _count: { accessLogs: number; invitations: number };
}

const CATEGORY_LABEL: Record<ScopeCategory, string> = {
  COMPLIANCE_ASSESSMENTS: "Compliance-Bewertungen",
  AUTHORIZATION_WORKFLOWS: "Genehmigungs-Workflows",
  DOCUMENTS: "Dokumenten-Vault",
  TIMELINE_DEADLINES: "Fristen & Zeitleiste",
  INCIDENTS: "Vorfälle",
  SPACECRAFT_REGISTRY: "Satelliten-Registry",
  AUDIT_LOGS: "Audit-Logs",
};

export function OverviewTab({ matter }: { matter: OverviewMatter }) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {matter.description && (
        <section>
          <h2 className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/40 mb-2">
            Beschreibung
          </h2>
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
            {matter.description}
          </p>
        </section>
      )}

      {/* Parties */}
      <section className="grid grid-cols-2 gap-4">
        <PartyCard label="Mandant" name={matter.clientOrg.name} />
        <PartyCard label="Kanzlei" name={matter.lawFirmOrg.name} />
      </section>

      {/* Scope */}
      <section>
        <h2 className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/40 mb-3">
          Vereinbarter Scope
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {matter.scope.map((item, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
            >
              <div className="text-sm font-medium text-white/90 mb-1">
                {CATEGORY_LABEL[item.category]}
              </div>
              <div className="text-[10px] text-white/50">
                {item.permissions.join(" · ")}
              </div>
              {item.resourceFilter?.jurisdictions && (
                <div className="text-[10px] text-white/30 mt-1">
                  Nur {item.resourceFilter.jurisdictions.join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <h3 className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/40 mb-3">
            Zeitlinie
          </h3>
          <dl className="space-y-2 text-sm">
            {matter.acceptedAt && (
              <div className="flex justify-between">
                <dt className="text-white/50">Aktiviert</dt>
                <dd>
                  {new Date(matter.acceptedAt).toLocaleDateString("de-DE")}
                </dd>
              </div>
            )}
            {matter.effectiveFrom && (
              <div className="flex justify-between">
                <dt className="text-white/50">Gültig ab</dt>
                <dd>
                  {new Date(matter.effectiveFrom).toLocaleDateString("de-DE")}
                </dd>
              </div>
            )}
            {matter.effectiveUntil && (
              <div className="flex justify-between">
                <dt className="text-white/50">Gültig bis</dt>
                <dd>
                  {new Date(matter.effectiveUntil).toLocaleDateString("de-DE")}
                </dd>
              </div>
            )}
          </dl>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <h3 className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/40 mb-3">
            Integrität
          </h3>
          <div className="text-[10px] text-white/50 mb-1">Handshake-Hash</div>
          <div className="text-[10px] font-mono break-all text-white/80 bg-black/40 p-2 rounded">
            {matter.handshakeHash}
          </div>
          <div className="text-[10px] text-white/40 mt-2">
            {matter._count.accessLogs} Audit-Einträge ·{" "}
            {matter._count.invitations} Einladungen
          </div>
        </div>
      </section>
    </div>
  );
}

function PartyCard({ label, name }: { label: string; name: string }) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <div className="text-[10px] tracking-[0.22em] uppercase text-white/40 mb-1">
        {label}
      </div>
      <div className="text-base font-semibold text-white/95">{name}</div>
    </div>
  );
}
