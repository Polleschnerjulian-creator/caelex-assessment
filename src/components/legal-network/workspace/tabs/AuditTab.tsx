"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * AuditTab — hash-chain-verified access log. Reuses the existing
 * /api/network/matter/:id/access-log endpoint; the chainValid flag
 * is rendered as a prominent badge so any tamper is immediately
 * visible in the workspace itself.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";

interface Entry {
  id: string;
  action: string;
  actorOrgId: string;
  actorSide: "ATLAS" | "CAELEX";
  resourceType: string;
  resourceId: string | null;
  matterScope: string;
  createdAt: string;
  previousHash: string | null;
  entryHash: string;
}

interface AuditData {
  entries: Entry[];
  chainValid: boolean;
  verifications: Array<{ id: string; valid: boolean; reason?: string }>;
}

export function AuditTab({ matterId }: { matterId: string }) {
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/network/matter/${matterId}/access-log`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Audit-Log nicht ladbar");
      setAudit(json);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [matterId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!audit)
    return (
      <div className="text-white/40 text-sm animate-pulse">Lade Audit-Log…</div>
    );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/40">
          Zugriffs-Historie · {audit.entries.length} Einträge
        </h2>
        <span
          className={`text-[10px] font-medium px-2.5 py-1 rounded-full ring-1 ${
            audit.chainValid
              ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40"
              : "bg-red-500/20 text-red-300 ring-red-500/40"
          }`}
        >
          {audit.chainValid ? "✓ Chain verifiziert" : "⚠ Chain unterbrochen"}
        </span>
      </div>

      {audit.entries.length === 0 && (
        <div className="text-center py-12 text-sm text-white/40">
          Keine Zugriffe bisher. Sobald die Kanzlei (Phase 3) auf
          Mandanten-Daten zugreift oder der Status sich ändert, landen hier
          Einträge.
        </div>
      )}

      <ol className="space-y-1">
        {audit.entries.map((entry, i) => {
          const v = audit.verifications.find((x) => x.id === entry.id);
          const valid = v?.valid ?? false;
          return (
            <li
              key={entry.id}
              className="grid grid-cols-[110px_120px_1fr_80px_80px] items-center gap-3 py-2 border-b border-white/[0.05] last:border-0 text-xs"
            >
              <span className="text-white/40 tabular-nums">
                {new Date(entry.createdAt).toLocaleString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="font-medium text-white/85">{entry.action}</span>
              <span className="text-white/50 truncate">
                {entry.resourceType}
                {entry.resourceId && (
                  <span className="text-white/30">
                    {" "}
                    · {entry.resourceId.slice(0, 12)}
                  </span>
                )}
              </span>
              <span className="text-white/40">{entry.actorSide}</span>
              <span
                className={`text-[10px] font-mono ${valid ? "text-emerald-400" : "text-red-400"}`}
                title={
                  valid
                    ? "Hash verifiziert"
                    : (v?.reason ?? "Verifikation fehlgeschlagen")
                }
              >
                {entry.entryHash.slice(0, 8)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
